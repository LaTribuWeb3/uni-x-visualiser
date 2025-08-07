import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSimplifiedDaemon(): Promise<void> {
  console.log('🧪 Testing Simplified Price Enrichment Daemon...');
  
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME || 'uni-x-visualiser');
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'transactions');
    
    // Find a real document with complex price data
    console.log('🔍 Looking for documents with complex price data...');
    
    const complexDataQuery = {
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
    };
    
    const existingDoc = await collection.findOne(complexDataQuery);
    
    if (!existingDoc) {
      console.log('❌ No documents with complex price data found in database');
      console.log('💡 Try running the daemon first to create some complex data');
      return;
    }
    
    console.log(`📋 Found real document with ID: ${existingDoc._id}`);
    console.log('📋 Original complex data structure:');
    console.log(JSON.stringify(existingDoc, null, 2));
    
    // Simulate the transformation logic
    const transformPriceData = (complexPriceData: any): { openPrice: number; closePrice: number } | null => {
      if (!complexPriceData) return null;
      
      if (typeof complexPriceData.openPrice === 'number' && typeof complexPriceData.closePrice === 'number') {
        return {
          openPrice: complexPriceData.openPrice,
          closePrice: complexPriceData.closePrice
        };
      }
      
      return null;
    };
    
    const transformTransaction = (transaction: any): any => {
      const simplified = {
        inputTokenAddress: transaction.inputTokenAddress,
        inputStartAmount: transaction.inputStartAmount,
        outputTokenAddress: transaction.outputTokenAddress,
        outputTokenAmountOverride: transaction.outputTokenAmountOverride,
        openPrice: 0,
        closePrice: 0
      };
      
      if (transaction.priceData) {
        const transformedPriceData = transformPriceData(transaction.priceData);
        if (transformedPriceData) {
          simplified.openPrice = transformedPriceData.openPrice;
          simplified.closePrice = transformedPriceData.closePrice;
        }
      }
      
      return simplified;
    };
    
    const simplifiedData = transformTransaction(existingDoc);
    
    console.log('\n✅ Simplified data structure:');
    console.log(JSON.stringify(simplifiedData, null, 2));
    
    console.log('\n📊 Transformation Summary:');
    console.log(`   Original fields: ${Object.keys(existingDoc).length}`);
    console.log(`   Simplified fields: ${Object.keys(simplifiedData).length}`);
    console.log(`   Data reduction: ${Math.round((1 - Object.keys(simplifiedData).length / Object.keys(existingDoc).length) * 100)}%`);
    
    // Test database operations with real data
    console.log('\n🗄️ Testing database operations on real data...');
    console.log(`🔒 Using real document ID: ${existingDoc._id}`);
    
    // Store original data for restoration
    const originalData = { ...existingDoc };
    
    try {
      // Update to simplified format
      const updateResult = await collection.updateOne(
        { _id: existingDoc._id },
        { 
          $set: { 
            ...simplifiedData,
            updatedAt: new Date()
          }
        }
      );
      
      if (updateResult.modifiedCount > 0) {
        console.log('✅ Successfully transformed document to simplified format');
        
        // Verify the transformation
        const updatedDoc = await collection.findOne({ _id: existingDoc._id });
        console.log('\n📋 Updated document structure:');
        console.log(JSON.stringify(updatedDoc, null, 2));
      } else {
        console.log('❌ Failed to transform document');
      }
      
      // Restore original data
      console.log('🔄 Restoring original data...');
      await collection.replaceOne({ _id: existingDoc._id }, originalData);
      console.log('✅ Original data restored');
      
    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError);
      console.log('🛡️ Attempting to restore original data...');
      
      try {
        await collection.replaceOne({ _id: existingDoc._id }, originalData);
        console.log('✅ Original data restored after error');
      } catch (restoreError) {
        console.error('❌ Failed to restore data:', restoreError);
        console.log('⚠️ Manual intervention may be required');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testSimplifiedDaemon().catch(console.error); 