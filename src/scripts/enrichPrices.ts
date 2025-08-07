import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import type { Transaction } from '../types/Transaction';
import priceService from '../services/priceService';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'uni-x-visualiser';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'transactions';

interface EnrichmentStats {
  total: number;
  enriched: number;
  pending: number;
  failed: number;
  skipped: number;
}

class PriceEnrichmentScript {
  private client: MongoClient | null = null;
  private collection: any = null;

  async connect() {
    try {
      console.log('🔌 Connecting to MongoDB...');
      this.client = new MongoClient(MONGODB_URI);
      await this.client.connect();
      
      const db = this.client.db(DB_NAME);
      this.collection = db.collection<Transaction>(COLLECTION_NAME);
      
      console.log('✅ Connected to MongoDB successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', (error as Error).message);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('📴 MongoDB connection closed');
    }
  }

  async getEnrichmentStats(): Promise<EnrichmentStats> {
    if (!this.collection) {
      throw new Error('Database not connected');
    }

    const [
      total,
      enriched,
      pending,
      failed,
      noPrice
    ] = await Promise.all([
      this.collection.countDocuments({}),
      this.collection.countDocuments({ 'priceData.priceStatus': 'completed' }),
      this.collection.countDocuments({ 'priceData.priceStatus': 'pending' }),
      this.collection.countDocuments({ 'priceData.priceStatus': 'failed' }),
      this.collection.countDocuments({ 
        $or: [
          { priceData: { $exists: false } },
          { priceData: { $eq: null } }
        ]
      } as any)
    ]);

    return {
      total,
      enriched,
      pending,
      failed,
      skipped: noPrice
    };
  }

  async enrichBatch(batchSize: number = 50, skip: number = 0): Promise<{
    processed: number;
    enriched: number;
    pending: number;
    failed: number;
  }> {
    if (!this.collection) {
      throw new Error('Database not connected');
    }

    console.log(`📦 Processing batch: ${batchSize} transactions (skip: ${skip})`);

    // Get transactions that need price data
    const query = {
      $or: [
        { priceData: { $exists: false } },
        { 'priceData.priceStatus': { $in: ['pending', 'failed'] } }
      ]
    };

    const transactions = await this.collection
      .find(query)
      .sort({ decayStartTimeTimestamp: -1 })
      .skip(skip)
      .limit(batchSize)
      .toArray();

    console.log(`📊 Found ${transactions.length} transactions to enrich`);

    let enrichedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const transaction of transactions) {
      try {
        const timestamp = transaction.decayStartTimeTimestamp || parseInt(transaction.decayStartTime);
        
        if (!timestamp) {
          console.warn(`⚠️ No valid timestamp for transaction ${transaction._id}`);
          continue;
        }

        const priceData = await priceService.fetchPriceData(
          transaction.inputTokenAddress,
          transaction.outputTokenAddress,
          timestamp
        );

        if (priceData) {
          // Update the transaction with price data
          await this.collection.updateOne(
            { _id: transaction._id },
            { 
              $set: { 
                priceData,
                updatedAt: new Date()
              }
            }
          );

          if (priceData.priceStatus === 'completed') {
            enrichedCount++;
            console.log(`✅ Enriched transaction ${transaction._id}`);
          } else if (priceData.priceStatus === 'pending') {
            pendingCount++;
            console.log(`⏳ Transaction ${transaction._id} price data pending`);
          } else {
            failedCount++;
            console.log(`❌ Failed to get price data for transaction ${transaction._id}`);
          }
        } else {
          failedCount++;
          console.log(`❌ No price data available for transaction ${transaction._id}`);
        }

        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ Error enriching transaction ${transaction._id}:`, error);
        failedCount++;
      }
    }

    return {
      processed: transactions.length,
      enriched: enrichedCount,
      pending: pendingCount,
      failed: failedCount
    };
  }

  async processPendingJobs(batchSize: number = 50): Promise<{
    processed: number;
    completed: number;
    stillPending: number;
    failed: number;
  }> {
    if (!this.collection) {
      throw new Error('Database not connected');
    }

    console.log(`🔄 Processing pending price jobs (batch size: ${batchSize})`);

    const pendingTransactions = await this.collection
      .find({ 'priceData.priceStatus': 'pending' })
      .limit(batchSize)
      .toArray();

    console.log(`📊 Found ${pendingTransactions.length} pending transactions`);

    let completedCount = 0;
    let stillPendingCount = 0;
    let failedCount = 0;

    for (const transaction of pendingTransactions) {
      try {
        if (transaction.priceData?.priceJobId) {
          const updatedPriceData = await priceService.checkJobStatus(transaction.priceData.priceJobId);
          
          if (updatedPriceData) {
            // Update the transaction with new price data
            await this.collection.updateOne(
              { _id: transaction._id },
              { 
                $set: { 
                  priceData: updatedPriceData,
                  updatedAt: new Date()
                }
              }
            );

            if (updatedPriceData.priceStatus === 'completed') {
              completedCount++;
              console.log(`✅ Job completed for transaction ${transaction._id}`);
            } else if (updatedPriceData.priceStatus === 'pending') {
              stillPendingCount++;
              console.log(`⏳ Job still pending for transaction ${transaction._id}`);
            } else {
              failedCount++;
              console.log(`❌ Job failed for transaction ${transaction._id}`);
            }
          } else {
            failedCount++;
            console.log(`❌ Could not check job status for transaction ${transaction._id}`);
          }
        }

        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ Error processing pending job for transaction ${transaction._id}:`, error);
        failedCount++;
      }
    }

    return {
      processed: pendingTransactions.length,
      completed: completedCount,
      stillPending: stillPendingCount,
      failed: failedCount
    };
  }

  async runEnrichment(totalLimit: number = 1000, batchSize: number = 50) {
    console.log('🚀 Starting price enrichment process...');
    console.log(`📊 Target: ${totalLimit} transactions in batches of ${batchSize}`);

    const initialStats = await this.getEnrichmentStats();
    console.log('📈 Initial stats:', initialStats);

    let totalProcessed = 0;
    let totalEnriched = 0;
    let totalPending = 0;
    let totalFailed = 0;
    let skip = 0;

    while (totalProcessed < totalLimit) {
      const currentBatchSize = Math.min(batchSize, totalLimit - totalProcessed);
      
      const batchResult = await this.enrichBatch(currentBatchSize, skip);
      
      totalProcessed += batchResult.processed;
      totalEnriched += batchResult.enriched;
      totalPending += batchResult.pending;
      totalFailed += batchResult.failed;
      skip += batchResult.processed;

      console.log(`📊 Batch result:`, batchResult);
      console.log(`📈 Running totals: Processed=${totalProcessed}, Enriched=${totalEnriched}, Pending=${totalPending}, Failed=${totalFailed}`);

      // If no more transactions to process, break
      if (batchResult.processed === 0) {
        console.log('🏁 No more transactions to process');
        break;
      }

      // Wait a bit between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Price enrichment completed!');
    console.log('📊 Final results:', {
      totalProcessed,
      totalEnriched,
      totalPending,
      totalFailed
    });

    const finalStats = await this.getEnrichmentStats();
    console.log('📈 Final stats:', finalStats);
  }

  async runPendingJobProcessing(iterations: number = 5, batchSize: number = 50) {
    console.log('🔄 Starting pending job processing...');
    console.log(`📊 Processing ${iterations} iterations with batch size ${batchSize}`);

    for (let i = 1; i <= iterations; i++) {
      console.log(`\n🔄 Iteration ${i}/${iterations}`);
      
      const result = await this.processPendingJobs(batchSize);
      console.log(`📊 Iteration ${i} result:`, result);

      if (result.processed === 0) {
        console.log('🏁 No more pending jobs to process');
        break;
      }

      // Wait between iterations
      if (i < iterations) {
        console.log('⏳ Waiting 2 seconds before next iteration...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('✅ Pending job processing completed!');
  }
}

async function main() {
  const script = new PriceEnrichmentScript();
  
  try {
    const connected = await script.connect();
    if (!connected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }

    // Get initial stats
    const initialStats = await script.getEnrichmentStats();
    console.log('📊 Initial database stats:', initialStats);

    // Run enrichment
    await script.runEnrichment(500, 25); // Process 500 transactions in batches of 25

    // Process pending jobs
    await script.runPendingJobProcessing(3, 25); // 3 iterations, batch size 25

    // Get final stats
    const finalStats = await script.getEnrichmentStats();
    console.log('📊 Final database stats:', finalStats);

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await script.disconnect();
  }
}

// Run the script if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { PriceEnrichmentScript }; 