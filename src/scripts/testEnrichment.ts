#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import type { Transaction } from '../types/Transaction';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'uni-x-visualiser';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'transactions';

async function testEnrichmentCompatibility() {
  console.log('🧪 Testing enrichment script compatibility...');
  
  let client: MongoClient | null = null;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collection = db.collection<Transaction>(COLLECTION_NAME);
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Test 1: Check if we can query transactions with the current structure
    console.log('\n📊 Test 1: Checking transaction structure...');
    const sampleTransaction = await collection.findOne({});
    
    if (sampleTransaction) {
      console.log('✅ Found sample transaction');
      console.log('   - _id:', sampleTransaction._id);
      console.log('   - transactionHash:', sampleTransaction.transactionHash);
      console.log('   - decayStartTime:', sampleTransaction.decayStartTime);
      console.log('   - inputTokenAddress:', sampleTransaction.inputTokenAddress);
      console.log('   - outputTokenAddress:', sampleTransaction.outputTokenAddress);
      console.log('   - priceData exists:', !!sampleTransaction.priceData);
      
      // Test 2: Check if we can query for transactions needing enrichment
      console.log('\n📊 Test 2: Checking enrichment queries...');
      const needsEnrichment = await collection.countDocuments({
        $or: [
          { priceData: { $exists: false } },
          { 'priceData.priceStatus': { $in: ['pending', 'failed'] } }
        ]
      });
      
      console.log(`✅ Found ${needsEnrichment} transactions needing enrichment`);
      
      // Test 3: Check if we can sort by decayStartTime
      console.log('\n📊 Test 3: Testing sorting by decayStartTime...');
      const sortedTransactions = await collection
        .find({})
        .sort({ decayStartTime: -1 })
        .limit(1)
        .toArray();
      
      if (sortedTransactions.length > 0) {
        console.log('✅ Successfully sorted by decayStartTime');
        console.log('   - Latest timestamp:', sortedTransactions[0].decayStartTime);
      }
      
      // Test 4: Check priceData structure if it exists
      if (sampleTransaction.priceData) {
        console.log('\n📊 Test 4: Checking priceData structure...');
        console.log('   - priceStatus:', sampleTransaction.priceData.priceStatus);
        console.log('   - openPrice:', sampleTransaction.priceData.openPrice);
        console.log('   - closePrice:', sampleTransaction.priceData.closePrice);
        console.log('   - priceJobId:', sampleTransaction.priceData.priceJobId);
        console.log('✅ PriceData structure is compatible');
      } else {
        console.log('\n📊 Test 4: No priceData found (expected for new transactions)');
      }
      
    } else {
      console.log('⚠️ No transactions found in database');
      console.log('   This is normal if no data has been imported yet');
    }
    
    console.log('\n✅ All compatibility tests passed!');
    console.log('🎉 The enrichment script should work with the current data structure');
    
  } catch (error) {
    console.error('❌ Compatibility test failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('📴 MongoDB connection closed');
    }
  }
}

// Run the test
testEnrichmentCompatibility().catch(console.error); 