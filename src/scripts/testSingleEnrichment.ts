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

const TEST_TRANSACTION_ID = '0x6c17f3b197bb877db08b43b1fc8b2a9e377d0024c07ad195f9d529b2e7064837';

async function testSingleEnrichment() {
  console.log('🧪 Testing enrichment script on single transaction...');
  console.log(`📋 Target transaction ID: ${TEST_TRANSACTION_ID}`);
  
  let client: MongoClient | null = null;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collection = db.collection<Transaction>(COLLECTION_NAME);
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Find the specific transaction
    console.log('\n📊 Looking for target transaction...');
    const transaction = await collection.findOne({ _id: TEST_TRANSACTION_ID });
    
    if (!transaction) {
      console.log('❌ Transaction not found in database');
      console.log('   Please make sure the transaction exists and the ID is correct');
      return;
    }
    
    console.log('✅ Found target transaction:');
    console.log('   - _id:', transaction._id);
    console.log('   - transactionHash:', transaction.transactionHash);
    console.log('   - decayStartTime:', transaction.decayStartTime);
    console.log('   - inputTokenAddress:', transaction.inputTokenAddress);
    console.log('   - outputTokenAddress:', transaction.outputTokenAddress);
    console.log('   - openPrice:', transaction.openPrice);
    console.log('   - closePrice:', transaction.closePrice);
    
    // Test the enrichment process
    console.log('\n🚀 Testing enrichment process...');
    
    const timestamp = transaction.decayStartTime;
    if (!timestamp) {
      console.log('❌ No valid timestamp found');
      return;
    }
    
    console.log(`🔍 Fetching price data for ${transaction.inputTokenAddress} -> ${transaction.outputTokenAddress} at ${timestamp}`);
    
    // Show translated token names for debugging
    const inputTokenName = priceService['getTokenName'](transaction.inputTokenAddress);
    const outputTokenName = priceService['getTokenName'](transaction.outputTokenAddress);
    console.log(`🔍 Translated tokens: ${inputTokenName} -> ${outputTokenName}`);
    
    const priceData = await priceService.fetchPriceData(
      transaction.inputTokenAddress,
      transaction.outputTokenAddress,
      timestamp
    );
    
    if (priceData) {
      console.log('✅ Price data fetched successfully:');
      console.log('   - priceStatus:', priceData.priceStatus);
      console.log('   - priceJobId:', priceData.priceJobId);
      
      if (priceData.priceStatus === 'completed') {
        // Direct completion - update with actual prices
        console.log('✅ Price data completed immediately');
        console.log('   - openPrice:', priceData.openPrice);
        console.log('   - closePrice:', priceData.closePrice);
        
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
          console.log('✅ Transaction updated with actual prices');
        } else {
          console.log('⚠️ No changes made to transaction');
        }
        
      } else if (priceData.priceStatus === 'pending') {
        // Pending job - wait for completion
        console.log('⏳ Price job is pending, waiting for completion...');
        console.log('   - Job ID:', priceData.priceJobId);
        
        let attempts = 0;
        const maxAttempts = 30; // Wait up to 5 minutes (30 * 10 seconds)
        let completedPriceData = null;
        
        while (attempts < maxAttempts) {
          attempts++;
          console.log(`🔄 Checking job status (attempt ${attempts}/${maxAttempts})...`);
          
          // Wait 10 seconds between checks
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          // Check job status
          const jobStatus = await priceService.checkJobStatus(priceData.priceJobId);
          
          if (jobStatus && jobStatus.priceStatus === 'completed') {
            completedPriceData = jobStatus;
            console.log('✅ Job completed!');
            console.log('   - openPrice:', jobStatus.openPrice);
            console.log('   - closePrice:', jobStatus.closePrice);
            break;
          } else if (jobStatus && jobStatus.priceStatus === 'failed') {
            console.log('❌ Job failed');
            break;
          } else {
            console.log('⏳ Job still pending...');
          }
        }
        
        if (completedPriceData) {
          // Update with completed prices
          const updateResult = await collection.updateOne(
            { _id: transaction._id },
            { 
              $set: { 
                openPrice: completedPriceData.openPrice,
                closePrice: completedPriceData.closePrice
              }
            }
          );
          
          if (updateResult.modifiedCount > 0) {
            console.log('✅ Transaction updated with completed prices');
          } else {
            console.log('⚠️ No changes made to transaction');
          }
        } else {
          console.log('❌ Job did not complete within timeout period');
        }
      }
      
      // Verify the final result
      console.log('\n🔍 Verifying final result...');
      const finalTransaction = await collection.findOne({ _id: TEST_TRANSACTION_ID });
      
      if (finalTransaction) {
        console.log('✅ Final transaction state:');
        console.log('   - openPrice:', finalTransaction.openPrice);
        console.log('   - closePrice:', finalTransaction.closePrice);
      }
      
    } else {
      console.log('❌ Failed to fetch price data');
      console.log('   This could be due to:');
      console.log('   - Token addresses not supported by the price API');
      console.log('   - API rate limiting or errors');
      console.log('   - Invalid timestamp');
    }
    
    console.log('\n✅ Single transaction enrichment test completed!');
    
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
testSingleEnrichment().catch(console.error); 