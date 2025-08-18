#!/usr/bin/env tsx
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import type { Transaction } from "../types/Transaction";
import priceService from "../services/priceService";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "uni-x-visualiser";
const COLLECTION_NAME = process.env.COLLECTION_NAME || "transactions";

interface EnrichmentError {
  transactionId: string;
  error: string;
  timestamp: string;
  inputToken: string;
  outputToken: string;
  decayStartTime: number;
}

async function bulkEnrichmentSimple() {
  console.log("🚀 Starting bulk enrichment script...");

  let client: MongoClient | null = null;
  const errors: EnrichmentError[] = [];
  let enriched = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = client.db(DB_NAME);
    const collection = db.collection<Transaction>(COLLECTION_NAME);

    console.log("✅ Connected to MongoDB successfully");

    // Get ALL transactions that need enrichment
    console.log("\n📊 Finding transactions that need enrichment...");
    const transactions = await collection
      .find({
        $or: [
          { openPrice: { $exists: false } },
          { closePrice: { $exists: false } },
        ],
      })
      .toArray(); // Process ALL transactions

    console.log(`📋 Found ${transactions.length} transactions to enrich`);
    
    // Wait 1 minute (1 * 60 * 1000 milliseconds)
    await new Promise((resolve) => setTimeout(resolve, 1 * 60 * 1000));

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      console.log(
        `\n🔍 Processing ${i + 1}/${transactions.length}: ${transaction._id}...`
      );
      console.log(`   Input: ${transaction.inputTokenAddress}`);
      console.log(`   Output: ${transaction.outputTokenAddress}`);
      console.log(`   Timestamp: ${transaction.decayStartTime}`);

      try {
        let priceData = await priceService.fetchPriceData(
          transaction.inputTokenAddress,
          transaction.outputTokenAddress,
          transaction.decayStartTime
        );
        
        while (priceData && priceData.priceStatus === "pending") {
          console.log(`⏳ ${transaction._id} - Job pending, skipping for now`);
          console.log(`   - Job ID: ${priceData.priceJobId}`);
          await new Promise((resolve) => setTimeout(resolve, 500));
          priceData = await priceService.fetchPriceData(
            transaction.inputTokenAddress,
            transaction.outputTokenAddress,
            transaction.decayStartTime
          );
        }

        if (priceData && priceData.priceStatus === "completed") {
          console.log(
            `✅ ${transaction._id} - Price data available: ${priceData.openPrice}/${priceData.closePrice}`
          );

          // Update the transaction
          const updateResult = await collection.updateOne(
            { _id: transaction._id },
            {
              $set: {
                openPrice: priceData.openPrice,
                closePrice: priceData.closePrice,
              },
            }
          );

          if (updateResult.modifiedCount > 0) {
            console.log(`✅ ${transaction._id} - Updated successfully`);
            enriched++;
          } else {
            console.log(`⚠️  ${transaction._id} - No changes made`);
            skipped++;
          }
        } else {
          console.log(`❌ ${transaction._id} - No price data available`);
          failed++;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.stack || error.message : String(error);
        console.error(`❌ ${transaction._id} - Error: ${errorMessage}`);

        errors.push({
          transactionId: transaction._id,
          error: errorMessage,
          timestamp: new Date().toISOString(),
          inputToken: transaction.inputTokenAddress,
          outputToken: transaction.outputTokenAddress,
          decayStartTime: transaction.decayStartTime,
        });

        failed++;
      }

      // Small delay between transactions to avoid overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("\n✅ Bulk enrichment completed!");
    console.log("📊 Final results:", {
      total: transactions.length,
      enriched,
      failed,
      skipped,
      successRate:
        transactions.length > 0
          ? (((enriched + skipped) / transactions.length) * 100).toFixed(2) +
            "%"
          : "0%",
    });

    // Save error log
    if (errors.length > 0) {
      const errorLog = {
        timestamp: new Date().toISOString(),
        errors,
        summary: {
          total: transactions.length,
          enriched,
          failed,
          skipped,
          successRate:
            transactions.length > 0
              ? (((enriched + skipped) / transactions.length) * 100).toFixed(
                  2
                ) + "%"
              : "0%",
        },
      };

      const errorLogPath = path.join(process.cwd(), "enrichment-errors.json");
      fs.writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2));
      console.log(`📝 Error log saved to: ${errorLogPath}`);
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("📴 MongoDB connection closed");
    }
  }
}

async function runPeriodicEnrichment() {
  let iteration = 1;
  
  while (true) {
    console.log(`\n🔄 Starting enrichment iteration ${iteration}`);
    console.log(`⏰ ${new Date().toISOString()}`);
    
    try {
      await bulkEnrichmentSimple();
    } catch (error) {
      console.error(`❌ Iteration ${iteration} failed:`, error);
    }
    
    console.log(`\n⏳ Waiting 10 minutes before next iteration...`);
    console.log(`⏰ Next run at: ${new Date(Date.now() + 10 * 60 * 1000).toISOString()}`);
    
    // Wait 10 minutes (10 * 60 * 1000 milliseconds)
    await new Promise((resolve) => setTimeout(resolve, 10 * 60 * 1000));
    
    iteration++;
  }
}

// Run the periodic enrichment
runPeriodicEnrichment().catch(console.error);
