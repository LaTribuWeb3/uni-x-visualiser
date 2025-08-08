#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import type { Transaction } from '../types/Transaction';
import priceService from '../services/priceService';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'uni-x-visualiser';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'transactions';

interface EnrichmentError {
  transactionId: string;
  error: string;
  timestamp: string;
  inputToken: string;
  outputToken: string;
  decayStartTime: number;
}

interface EnrichmentStats {
  total: number;
  processed: number;
  enriched: number;
  failed: number;
  skipped: number;
  errors: EnrichmentError[];
}

class BulkEnrichmentScript {
  private client: MongoClient | null = null;
  private collection: any = null;
  private errorLogPath: string;
  private stats: EnrichmentStats;

  constructor() {
    this.errorLogPath = path.join(process.cwd(), 'enrichment-errors.json');
    this.stats = {
      total: 0,
      processed: 0,
      enriched: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
  }

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

  async getInitialStats(): Promise<{ total: number; needsEnrichment: number }> {
    if (!this.collection) {
      throw new Error('Database not connected');
    }

    const [total, needsEnrichment] = await Promise.all([
      this.collection.countDocuments({}),
      this.collection.countDocuments({
        $or: [
          { openPrice: { $exists: false } },
          { closePrice: { $exists: false } },
          { openPrice: null },
          { closePrice: null }
        ]
      })
    ]);

    return { total, needsEnrichment };
  }

  async enrichSingleTransaction(transaction: Transaction): Promise<boolean> {
    try {
      const timestamp = transaction.decayStartTime;
      if (!timestamp) {
        throw new Error('No valid timestamp found');
      }

      // Skip if already has prices
      if (transaction.openPrice !== undefined && transaction.closePrice !== undefined) {
        console.log(`⏭️  Skipping ${transaction._id} - already has prices`);
        this.stats.skipped++;
        return true;
      }

      console.log(`🔍 Processing ${transaction._id} (${transaction.inputTokenAddress} -> ${transaction.outputTokenAddress})`);

      const priceData = await priceService.fetchPriceData(
        transaction.inputTokenAddress,
        transaction.outputTokenAddress,
        timestamp
      );

      if (!priceData) {
        throw new Error('Failed to fetch price data from API');
      }

      if (priceData.priceStatus === 'completed') {
        // Direct completion - update with actual prices
        console.log(`✅ ${transaction._id} - Price completed immediately`);
        console.log(`   - openPrice: ${priceData.openPrice}`);
        console.log(`   - closePrice: ${priceData.closePrice}`);
        
        const updateResult = await this.collection.updateOne(
          { _id: transaction._id },
          { 
            $set: { 
              openPrice: priceData.openPrice,
              closePrice: priceData.closePrice
            }
          }
        );
        
        if (updateResult.modifiedCount > 0) {
          console.log(`✅ ${transaction._id} - Updated with prices: ${priceData.openPrice}/${priceData.closePrice}`);
          this.stats.enriched++;
          return true;
        } else {
          console.log(`⚠️  ${transaction._id} - No changes made`);
          return true;
        }
        
      } else if (priceData.priceStatus === 'pending') {
        // Pending job - wait for completion
        console.log(`⏳ ${transaction._id} - Job pending, waiting for completion...`);
        console.log(`   - Job ID: ${priceData.priceJobId}`);
        
        let attempts = 0;
        const maxAttempts = 30; // Wait up to 5 minutes (30 * 10 seconds)
        let completedPriceData = null;
        
        while (attempts < maxAttempts) {
          attempts++;
          console.log(`🔄 ${transaction._id} - Checking job status (${attempts}/${maxAttempts})...`);
          
          // Wait 10 seconds between checks
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          // Check job status
          const jobStatus = await priceService.checkJobStatus(priceData.priceJobId);
          
          if (jobStatus && jobStatus.priceStatus === 'completed') {
            completedPriceData = jobStatus;
            console.log(`✅ ${transaction._id} - Job completed!`);
            console.log(`   - openPrice: ${jobStatus.openPrice}`);
            console.log(`   - closePrice: ${jobStatus.closePrice}`);
            break;
          } else if (jobStatus && jobStatus.priceStatus === 'failed') {
            throw new Error('Job failed');
          } else {
            console.log(`⏳ ${transaction._id} - Job still pending...`);
          }
        }
        
        if (completedPriceData) {
          // Update with completed prices
          const updateResult = await this.collection.updateOne(
            { _id: transaction._id },
            { 
              $set: { 
                openPrice: completedPriceData.openPrice,
                closePrice: completedPriceData.closePrice
              }
            }
          );
          
          if (updateResult.modifiedCount > 0) {
            console.log(`✅ ${transaction._id} - Updated with completed prices: ${completedPriceData.openPrice}/${completedPriceData.closePrice}`);
            this.stats.enriched++;
            return true;
          } else {
            console.log(`⚠️  ${transaction._id} - No changes made`);
            return true;
          }
        } else {
          throw new Error('Job did not complete within timeout period');
        }
      } else {
        throw new Error(`Unexpected price status: ${priceData.priceStatus}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${transaction._id} - Error: ${errorMessage}`);
      
      // Log error to our stats
      this.stats.errors.push({
        transactionId: transaction._id,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        inputToken: transaction.inputTokenAddress,
        outputToken: transaction.outputTokenAddress,
        decayStartTime: transaction.decayStartTime
      });
      
      this.stats.failed++;
      return false;
    }
  }

  async processBatch(batchSize: number = 10, skip: number = 0): Promise<number> {
    if (!this.collection) {
      throw new Error('Database not connected');
    }

    console.log(`📦 Processing batch: ${batchSize} transactions (skip: ${skip})`);

    // Get transactions that need enrichment
    const query = {
      $or: [
        { openPrice: { $exists: false } },
        { closePrice: { $exists: false } },
        { openPrice: null },
        { closePrice: null }
      ]
    };

    const transactions = await this.collection
      .find(query)
      .sort({ decayStartTime: -1 })
      .skip(skip)
      .limit(batchSize)
      .toArray();

    console.log(`📊 Found ${transactions.length} transactions to enrich`);

    let processedCount = 0;

    for (const transaction of transactions) {
      try {
        const success = await this.enrichSingleTransaction(transaction);
        if (success) {
          processedCount++;
        }
        
        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Unexpected error processing ${transaction._id}:`, error);
        this.stats.failed++;
      }
    }

    this.stats.processed += processedCount;
    return processedCount;
  }

  async saveErrorLog() {
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        stats: this.stats,
        summary: {
          total: this.stats.total,
          processed: this.stats.processed,
          enriched: this.stats.enriched,
          failed: this.stats.failed,
          skipped: this.stats.skipped,
          successRate: this.stats.total > 0 ? ((this.stats.enriched + this.stats.skipped) / this.stats.total * 100).toFixed(2) + '%' : '0%'
        }
      };

      fs.writeFileSync(this.errorLogPath, JSON.stringify(errorLog, null, 2));
      console.log(`📝 Error log saved to: ${this.errorLogPath}`);
    } catch (error) {
      console.error('❌ Failed to save error log:', error);
    }
  }

  async runEnrichment(batchSize: number = 10, maxTransactions: number = 1000) {
    console.log('🚀 Starting bulk enrichment process...');
    console.log(`📊 Target: ${maxTransactions} transactions in batches of ${batchSize}`);

    // Get initial stats
    const initialStats = await this.getInitialStats();
    this.stats.total = Math.min(initialStats.needsEnrichment, maxTransactions);
    
    console.log('📈 Initial database stats:', {
      total: initialStats.total,
      needsEnrichment: initialStats.needsEnrichment,
      target: this.stats.total
    });

    let skip = 0;
    let totalProcessed = 0;

    while (totalProcessed < this.stats.total) {
      const currentBatchSize = Math.min(batchSize, this.stats.total - totalProcessed);
      
      const batchResult = await this.processBatch(currentBatchSize, skip);
      
      totalProcessed += batchResult;
      skip += batchResult;

      console.log(`📊 Batch result: Processed=${batchResult}`);
      console.log(`📈 Running totals: Processed=${totalProcessed}/${this.stats.total}, Enriched=${this.stats.enriched}, Failed=${this.stats.failed}, Skipped=${this.stats.skipped}`);

      // If no more transactions to process, break
      if (batchResult === 0) {
        console.log('🏁 No more transactions to process');
        break;
      }

      // Wait a bit between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('✅ Bulk enrichment completed!');
    console.log('📊 Final results:', {
      total: this.stats.total,
      processed: this.stats.processed,
      enriched: this.stats.enriched,
      failed: this.stats.failed,
      skipped: this.stats.skipped,
      successRate: this.stats.total > 0 ? ((this.stats.enriched + this.stats.skipped) / this.stats.total * 100).toFixed(2) + '%' : '0%'
    });

    // Save error log
    await this.saveErrorLog();
  }
}

async function main() {
  console.log('🚀 Starting bulk enrichment script...');
  
  const script = new BulkEnrichmentScript();
  
  try {
    console.log('🔌 Attempting to connect to database...');
    const connected = await script.connect();
    if (!connected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }

    console.log('✅ Database connected, starting enrichment...');
    // Run enrichment with conservative settings
    await script.runEnrichment(5, 100); // Process 100 transactions in batches of 5

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    console.log('🔌 Disconnecting from database...');
    await script.disconnect();
  }
}

// Run the script if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { BulkEnrichmentScript }; 