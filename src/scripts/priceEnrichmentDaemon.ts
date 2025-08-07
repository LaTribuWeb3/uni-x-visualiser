import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import type { Transaction } from '../types/Transaction';
import priceService from '../services/priceService';
import { getConfig, validateConfig, type DaemonConfig } from '../config/daemon.config';

// Load environment variables
dotenv.config();

// Get and validate configuration
console.log('🔧 Loading configuration...');
const config: DaemonConfig = getConfig();
console.log('✅ Configuration loaded successfully');

const configErrors = validateConfig(config);

if (configErrors.length > 0) {
  console.error('❌ Configuration errors:');
  configErrors.forEach(error => console.error(`   - ${error}`));
  process.exit(1);
}

console.log('✅ Configuration validation passed');

interface EnrichmentStats {
  total: number;
  enriched: number;
  pending: number;
  failed: number;
  skipped: number;
}

// Simplified transaction interface
interface SimplifiedTransaction {
  inputTokenAddress: string;
  inputStartAmount: string;
  outputTokenAddress: string;
  outputTokenAmountOverride: string;
  openPrice: number;
  closePrice: number;
  priceStatus?: string;
}

class PriceEnrichmentDaemon {
  private client: MongoClient | null = null;
  private collection: any = null;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private config = config;

  async connect() {
    try {
      console.log('🔌 Connecting to MongoDB...');
      this.client = new MongoClient(this.config.mongodb.uri);
      await this.client.connect();
      
      const db = this.client.db(this.config.mongodb.dbName);
      this.collection = db.collection(this.config.mongodb.collectionName);
      
      console.log('✅ Connected to MongoDB');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  /**
   * Transform complex price data to simplified format
   */
  private transformPriceData(complexPriceData: Record<string, unknown>): { openPrice: number; closePrice: number } | null {
    if (!complexPriceData) return null;

    // Handle existing complex price data structure
    if (typeof complexPriceData.openPrice === 'number' && typeof complexPriceData.closePrice === 'number') {
      return {
        openPrice: complexPriceData.openPrice,
        closePrice: complexPriceData.closePrice
      };
    }

    // Handle API response format
    if (complexPriceData.result) {
      const result = complexPriceData.result as Record<string, unknown>;
      return {
        openPrice: (result.open as number) || 0,
        closePrice: (result.close as number) || 0
      };
    }

    return null;
  }

  /**
   * Transform transaction to simplified format
   */
  private transformTransaction(transaction: Transaction): SimplifiedTransaction {
    const simplified: SimplifiedTransaction = {
      inputTokenAddress: transaction.inputTokenAddress,
      inputStartAmount: transaction.inputStartAmount,
      outputTokenAddress: transaction.outputTokenAddress,
      outputTokenAmountOverride: transaction.outputTokenAmountOverride,
      openPrice: 0,
      closePrice: 0
    };

    // Transform existing price data if available
    if (transaction.priceData) {
      const transformedPriceData = this.transformPriceData(transaction.priceData as unknown as Record<string, unknown>);
      if (transformedPriceData) {
        simplified.openPrice = transformedPriceData.openPrice;
        simplified.closePrice = transformedPriceData.closePrice;
      }
    }

    return simplified;
  }

  async getTransactionsNeedingEnrichment(limit: number, skip: number = 0): Promise<Transaction[]> {
    try {
      const query = {
        $or: [
          { priceData: { $exists: false } },
          { priceStatus: { $in: ['pending', 'failed'] } },
          { 'priceData.priceStatus': { $in: ['pending', 'failed'] } },
          // Also include transactions that have complex price data that needs transformation
          { 
            $and: [
              { 'priceData.openPrice': { $exists: true } },
              { 'priceData.closePrice': { $exists: true } },
              { 
                $or: [
                  { 'priceData.highPrice': { $exists: true } },
                  { 'priceData.lowPrice': { $exists: true } },
                  { 'priceData.volume': { $exists: true } },
                  { 'priceData.exactMatch': { $exists: true } },
                  { 'priceData.priceFetchedAt': { $exists: true } },
                  { 'priceData.priceJobId': { $exists: true } },
                  { 'priceData.priceStatus': { $exists: true } }
                ]
              }
            ]
          }
        ]
      };

      const transactions = await this.collection
        .find(query)
        .limit(limit)
        .skip(skip)
        .toArray();

      return transactions;
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      return [];
    }
  }

  async updateTransactionPriceData(transactionId: string, simplifiedData: SimplifiedTransaction, priceStatus?: string): Promise<boolean> {
    try {
      // Get the current document to preserve essential fields
      const currentDoc = await this.collection.findOne({ _id: transactionId });
      if (!currentDoc) {
        console.error(`❌ Document ${transactionId} not found`);
        return false;
      }

      // Create the clean document structure
      const cleanDocument = {
        _id: currentDoc._id,
        decayStartTime: currentDoc.decayStartTime,
        inputTokenAddress: currentDoc.inputTokenAddress,
        inputStartAmount: currentDoc.inputStartAmount,
        outputTokenAddress: currentDoc.outputTokenAddress,
        outputTokenAmountOverride: currentDoc.outputTokenAmountOverride,
        orderHash: currentDoc.orderHash,
        transactionHash: currentDoc.transactionHash,
        // Simplified price fields
        openPrice: simplifiedData.openPrice,
        closePrice: simplifiedData.closePrice,
        // Top-level price status
        priceStatus: priceStatus || simplifiedData.priceStatus || 'pending',
        // Update timestamp
        updatedAt: new Date()
      };

      // Completely replace the document with the clean structure
      const result = await this.collection.replaceOne(
        { _id: transactionId },
        cleanDocument
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error(`❌ Error updating transaction ${transactionId}:`, error);
      return false;
    }
  }

  async enrichBatch(transactions: Transaction[]): Promise<EnrichmentStats> {
    const stats: EnrichmentStats = {
      total: transactions.length,
      enriched: 0,
      pending: 0,
      failed: 0,
      skipped: 0
    };

    console.log(`\n🔄 Processing batch of ${transactions.length} transactions...`);

    for (const transaction of transactions) {
      try {
        // Check if transaction already has simplified price data
        const hasSimplifiedData = transaction.openPrice !== undefined && 
                                 transaction.closePrice !== undefined &&
                                 transaction.priceData === undefined;

        if (hasSimplifiedData) {
          stats.skipped++;
          console.log(`⏭️ Transaction ${transaction._id} already has simplified format`);
          continue;
        }

        // Transform existing complex data if available
        if (transaction.priceData) {
          const transformedData = this.transformPriceData(transaction.priceData as unknown as Record<string, unknown>);
          if (transformedData) {
            const simplifiedTransaction = this.transformTransaction(transaction);
            const priceStatus = transaction.priceData?.priceStatus;
            const updated = await this.updateTransactionPriceData(transaction._id!, simplifiedTransaction, priceStatus);
            
            if (updated) {
              stats.enriched++;
              console.log(`✅ Transformed existing price data for transaction ${transaction._id}`);
            } else {
              stats.failed++;
              console.log(`❌ Failed to transform existing data for transaction ${transaction._id}`);
            }
            continue;
          }
        }

        // Parse timestamp for new price data
        const timestamp = parseInt(transaction.decayStartTime);
        if (isNaN(timestamp)) {
          console.warn(`⚠️ Invalid timestamp for transaction ${transaction._id}`);
          stats.failed++;
          continue;
        }

        // Fetch new price data
        const priceData = await priceService.fetchPriceData(
          transaction.inputTokenAddress,
          transaction.outputTokenAddress,
          timestamp
        );

        if (priceData && priceData.priceStatus === 'completed') {
          // Transform to simplified format
          const simplifiedTransaction = this.transformTransaction(transaction);
          const transformedPriceData = this.transformPriceData(priceData as unknown as Record<string, unknown>);
          
          if (transformedPriceData) {
            simplifiedTransaction.openPrice = transformedPriceData.openPrice;
            simplifiedTransaction.closePrice = transformedPriceData.closePrice;
          }

          const updated = await this.updateTransactionPriceData(transaction._id!, simplifiedTransaction, priceData.priceStatus);
          
          if (updated) {
            stats.enriched++;
            console.log(`✅ Enriched transaction ${transaction._id} with simplified price data`);
          } else {
            stats.failed++;
            console.log(`❌ Failed to update transaction ${transaction._id}`);
          }
        } else if (priceData && priceData.priceStatus === 'pending') {
          stats.pending++;
          console.log(`⏳ Transaction ${transaction._id} price data pending`);
        } else {
          stats.failed++;
          console.log(`❌ No price data available for transaction ${transaction._id}`);
        }

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, this.config.processing.delayBetweenRequests));

      } catch (error) {
        console.error(`❌ Error processing transaction ${transaction._id}:`, error);
        stats.failed++;
      }
    }

    return stats;
  }

  async processPendingJobs(): Promise<number> {
    try {
      console.log('🔄 Processing pending jobs...');
      
      const pendingTransactions = await this.getTransactionsNeedingEnrichment(100);
      const pendingJobs = pendingTransactions.filter(t => t.priceData?.priceStatus === 'pending');
      
      if (pendingJobs.length === 0) {
        console.log('📊 No pending jobs to process');
        return 0;
      }

      console.log(`📊 Found ${pendingJobs.length} pending jobs`);
      
      // Try to process pending jobs (though this won't work due to missing endpoint)
      const updatedCount = await priceService.processPendingJobs(pendingJobs);
      
      console.log(`✅ Processed ${updatedCount} pending jobs`);
      return updatedCount;
    } catch (error) {
      console.error('❌ Error processing pending jobs:', error);
      return 0;
    }
  }

  async runEnrichmentCycle(): Promise<void> {
    try {
      console.log('\n🔄 Starting enrichment cycle...');
      
      // Get transactions that need enrichment
      const transactions = await this.getTransactionsNeedingEnrichment(this.config.processing.batchSize);
      
      if (transactions.length === 0) {
        console.log('📊 No transactions need enrichment');
        return;
      }

      // Process the batch
      const stats = await this.enrichBatch(transactions);
      
      // Log results
      console.log('\n📊 Enrichment cycle completed:');
      console.log(`   Total: ${stats.total}`);
      console.log(`   Enriched: ${stats.enriched}`);
      console.log(`   Pending: ${stats.pending}`);
      console.log(`   Failed: ${stats.failed}`);
      console.log(`   Skipped: ${stats.skipped}`);

      // Try to process pending jobs
      await this.processPendingJobs();

    } catch (error) {
      console.error('❌ Error in enrichment cycle:', error);
    }
  }

  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Daemon is already running');
      return;
    }

    console.log('🚀 Starting Price Enrichment Daemon...');
    console.log(`📊 Configuration:`);
    console.log(`   Batch Size: ${this.config.processing.batchSize}`);
    console.log(`   Interval: ${this.config.processing.intervalMs / 1000} seconds`);
    console.log(`   Max Retries: ${this.config.processing.maxRetries}`);
    console.log(`   Request Delay: ${this.config.processing.delayBetweenRequests}ms`);
    console.log(`   Data Format: Simplified (inputTokenAddress, inputStartAmount, outputTokenAddress, outputTokenAmountOverride, openPrice, closePrice)`);
  
    this.isRunning = true;

    // Run initial cycle
    this.runEnrichmentCycle();

    // Set up periodic execution
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.runEnrichmentCycle();
      }
    }, this.config.processing.intervalMs);

    console.log('✅ Daemon started successfully');
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Daemon is not running');
      return;
    }

    console.log('🛑 Stopping Price Enrichment Daemon...');
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Daemon stopped');
  }

  async run(): Promise<void> {
    try {
      // Connect to database
      const connected = await this.connect();
      if (!connected) {
        console.error('❌ Failed to connect to database');
        process.exit(1);
      }

      // Start the daemon
      this.start();

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        this.stop();
        await this.disconnect();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        this.stop();
        await this.disconnect();
        process.exit(0);
      });

      // Keep the process alive
      console.log('💤 Daemon is running. Press Ctrl+C to stop.');
      
    } catch (error) {
      console.error('❌ Fatal error in daemon:', error);
      await this.disconnect();
      process.exit(1);
    }
  }
}

// Run the daemon if this file is executed directly
console.log('🚀 Initializing Price Enrichment Daemon...');
const daemon = new PriceEnrichmentDaemon();
daemon.run().catch(error => {
  console.error('❌ Failed to start daemon:', error);
  process.exit(1);
});

export default PriceEnrichmentDaemon; 