#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import type { Transaction } from '../types/Transaction';
import priceService from '../services/priceService';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'uni-x-visualiser';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'transactions';

async function simpleEnrichment() {
  console.log('🚀 Starting simple enrichment script...');
  
  let client: MongoClient | null = null;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collection = db.collection<Transaction>(COLLECTION_NAME);
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Get transactions that need enrichment
    console.log('\n📊 Finding transactions that need enrichment...');
    const transactions = await collection
      .find({
        $or: [
          { openPrice: { $exists: false } },
          { closePrice: { $exists: false } },
          { openPrice: null },
          { closePrice: null }
        ]
      })
      .limit(3) // Only process 3 transactions for testing
      .toArray();
    
    console.log(`📋 Found ${transactions.length} transactions to enrich`);
    
    for (const transaction of transactions) {
      console.log(`\n🔍 Processing ${transaction._id}...`);
      console.log(`   Input: ${transaction.inputTokenAddress}`);
      console.log(`   Output: ${transaction.outputTokenAddress}`);
      console.log(`   Timestamp: ${transaction.decayStartTime}`);
      
      try {
        const priceData = await priceService.fetchPriceData(
          transaction.inputTokenAddress,
          transaction.outputTokenAddress,
          transaction.decayStartTime
        );
        
        if (priceData && priceData.priceStatus === 'completed') {
          console.log(`✅ ${transaction._id} - Price data available: ${priceData.openPrice}/${priceData.closePrice}`);
          
          // Update the transaction
          const updateResult = await collection.updateOne(
            { _id: transaction._id },
            { 
              $set: { 
                openPrice: priceData.openPrice,
                closePrice: priceData.closePrice
              }
            }
          );
          
          if (updateResult.modifiedCount > 0) {
            console.log(`✅ ${transaction._id} - Updated successfully`);
          } else {
            console.log(`⚠️  ${transaction._id} - No changes made`);
          }
        } else if (priceData && priceData.priceStatus === 'pending') {
          console.log(`⏳ ${transaction._id} - Job pending, skipping for now`);
        } else {
          console.log(`❌ ${transaction._id} - No price data available`);
        }
        
      } catch (error) {
        console.error(`❌ ${transaction._id} - Error:`, error);
      }
      
      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✅ Simple enrichment completed!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('📴 MongoDB connection closed');
    }
  }
}

// Run the script
simpleEnrichment().catch(console.error); 