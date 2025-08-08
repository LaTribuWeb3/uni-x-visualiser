#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import type { Transaction } from '../types/Transaction';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'uni-x-visualiser';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'transactions';

async function testBulkEnrichment() {
  console.log('🧪 Testing bulk enrichment script...');
  
  let client: MongoClient | null = null;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collection = db.collection<Transaction>(COLLECTION_NAME);
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Get initial stats
    console.log('\n📊 Getting initial stats...');
    const [total, needsEnrichment] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({
        $or: [
          { openPrice: { $exists: false } },
          { closePrice: { $exists: false } },
          { openPrice: null },
          { closePrice: null }
        ]
      })
    ]);
    
    console.log('📈 Database stats:');
    console.log('   - Total transactions:', total);
    console.log('   - Need enrichment:', needsEnrichment);
    
    // Get a sample transaction
    console.log('\n📋 Getting sample transaction...');
    const sampleTransaction = await collection.findOne({
      $or: [
        { openPrice: { $exists: false } },
        { closePrice: { $exists: false } },
        { openPrice: null },
        { closePrice: null }
      ]
    });
    
    if (sampleTransaction) {
      console.log('✅ Found sample transaction:');
      console.log('   - _id:', sampleTransaction._id);
      console.log('   - inputToken:', sampleTransaction.inputTokenAddress);
      console.log('   - outputToken:', sampleTransaction.outputTokenAddress);
      console.log('   - openPrice:', sampleTransaction.openPrice);
      console.log('   - closePrice:', sampleTransaction.closePrice);
    } else {
      console.log('⚠️ No transactions need enrichment');
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('📴 MongoDB connection closed');
    }
  }
}

// Run the test
testBulkEnrichment().catch(console.error); 