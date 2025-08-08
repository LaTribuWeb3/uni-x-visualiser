import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function clearDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'uni-x-visualiser';
  
  console.log('🗄️  Connecting to MongoDB...');
  console.log(`   URI: ${mongoUri}`);
  console.log(`   Database: ${dbName}`);
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    const db = client.db(dbName);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections:`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Drop all collections
    for (const collection of collections) {
      console.log(`🗑️  Dropping collection: ${collection.name}`);
      await db.collection(collection.name).drop();
    }
    
    console.log('✅ All collections cleared successfully!');
    
    console.log('✅ Database cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

clearDatabase().catch(console.error); 