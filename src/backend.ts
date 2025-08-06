import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, Db, Collection } from 'mongodb';
import { Transaction } from './types/Transaction';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// MongoDB connection
let client: MongoClient | null = null;
let db: Db | null = null;
let transactionsCollection: Collection<Transaction> | null = null;

async function connectToMongoDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'uni-x-visualiser';
    const collectionName = process.env.COLLECTION_NAME || 'transactions';

    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', mongoUri);
    console.log('   Database:', dbName);
    console.log('   Collection:', collectionName);

    client = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      connectTimeoutMS: 5000
    });
    
    await client.connect();
    
    // Test the connection
    await client.db("admin").command({ ping: 1 });
    
    db = client.db(dbName);
    transactionsCollection = db.collection<Transaction>(collectionName);

    console.log('✅ Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:');
    console.error('   Error:', error.message);
    console.log('');
    console.log('🔧 To fix this:');
    console.log('   1. Make sure MongoDB is installed and running');
    console.log('   2. For local MongoDB: Start the MongoDB service');
    console.log('   3. For MongoDB Atlas: Check your connection string in .env');
    console.log('   4. Verify your .env file has the correct MONGODB_URI');
    console.log('');
    console.log('📋 Current environment variables:');
    console.log('   MONGODB_URI:', process.env.MONGODB_URI || 'NOT SET');
    console.log('   DB_NAME:', process.env.DB_NAME || 'NOT SET');
    console.log('   COLLECTION_NAME:', process.env.COLLECTION_NAME || 'NOT SET');
    console.log('');
    
    // Don't exit, just return false so server can still start for health checks
    return false;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Uni-X Visualizer Backend is running',
    timestamp: new Date().toISOString(),
    mongodb: client ? 'Connected' : 'Disconnected'
  });
});

// Get all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    console.log('📡 GET /api/transactions - Request received');
    
    if (!transactionsCollection) {
      console.log('❌ Database not connected');
      return res.status(500).json({ error: 'Database not connected' });
    }

    console.log('🔍 Counting documents in collection...');
    const count = await transactionsCollection.countDocuments({});
    console.log(`📊 Found ${count} documents in collection`);
    
    if (count === 0) {
      console.log('📭 Collection is empty');
      return res.json([]);
    }

    console.log('📖 Fetching transactions with limit...');
    // Add a limit to prevent timeout with large datasets
    const transactions = await transactionsCollection
      .find({})
      .sort({ decayStartTimeTimestamp: -1 })
      .limit(1000) // Limit to 1000 records for performance
      .toArray();
    
    console.log(`✅ Retrieved ${transactions.length} transactions`);
    res.json(transactions);
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions', details: error.message });
  }
});

// Get transactions with filtering and pagination
app.get('/api/transactions/filtered', async (req, res) => {
  try {
    if (!transactionsCollection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const {
      startDate,
      endDate,
      inputTokenAddress,
      outputTokenAddress,
      limit = 50,
      skip = 0
    } = req.query;

    // Build query
    const query: Record<string, any> = {};

    if (startDate || endDate) {
      query.decayStartTimeTimestamp = {};
      if (startDate) {
        query.decayStartTimeTimestamp.$gte = new Date(startDate as string).getTime() / 1000;
      }
      if (endDate) {
        query.decayStartTimeTimestamp.$lte = new Date(endDate as string).getTime() / 1000;
      }
    }

    if (inputTokenAddress && inputTokenAddress !== 'all') {
      query.inputTokenAddress = inputTokenAddress as string;
    }

    if (outputTokenAddress && outputTokenAddress !== 'all') {
      query.outputTokenAddress = outputTokenAddress as string;
    }

    const [transactions, total] = await Promise.all([
      transactionsCollection
        .find(query)
        .sort({ decayStartTimeTimestamp: -1 })
        .skip(parseInt(skip as string))
        .limit(parseInt(limit as string))
        .toArray(),
      transactionsCollection.countDocuments(query)
    ]);

    res.json({
      transactions,
      total,
      page: Math.floor(parseInt(skip as string) / parseInt(limit as string)) + 1,
      totalPages: Math.ceil(total / parseInt(limit as string))
    });
  } catch (error) {
    console.error('Error fetching filtered transactions:', error);
    res.status(500).json({ error: 'Failed to fetch filtered transactions' });
  }
});

// Get date range
app.get('/api/transactions/date-range', async (req, res) => {
  try {
    if (!transactionsCollection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const [minResult, maxResult] = await Promise.all([
      transactionsCollection.findOne({}, { sort: { decayStartTimeTimestamp: 1 } }),
      transactionsCollection.findOne({}, { sort: { decayStartTimeTimestamp: -1 } })
    ]);

    if (!minResult || !maxResult) {
      return res.status(404).json({ error: 'No transactions found' });
    }

    res.json({
      min: new Date(minResult.decayStartTimeTimestamp! * 1000),
      max: new Date(maxResult.decayStartTimeTimestamp! * 1000)
    });
  } catch (error) {
    console.error('Error getting date range:', error);
    res.status(500).json({ error: 'Failed to get date range' });
  }
});

// Get unique tokens
app.get('/api/transactions/unique-tokens', async (req, res) => {
  try {
    if (!transactionsCollection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const [inputTokens, outputTokens] = await Promise.all([
      transactionsCollection.distinct('inputTokenAddress'),
      transactionsCollection.distinct('outputTokenAddress')
    ]);

    res.json({
      inputTokens: inputTokens.sort(),
      outputTokens: outputTokens.sort()
    });
  } catch (error) {
    console.error('Error getting unique tokens:', error);
    res.status(500).json({ error: 'Failed to get unique tokens' });
  }
});

// Insert transactions (for the import script)
app.post('/api/transactions', async (req, res) => {
  try {
    if (!transactionsCollection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { transactions } = req.body;
    
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Invalid transactions data' });
    }

    // Process transactions to add timestamps
    const processedTransactions = transactions.map(transaction => ({
      ...transaction,
      decayStartTimeTimestamp: parseInt(transaction.decayStartTime),
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await transactionsCollection.insertMany(processedTransactions);
    
    res.json({ 
      message: `Inserted ${transactions.length} transactions successfully`,
      count: transactions.length
    });
  } catch (error) {
    console.error('Error inserting transactions:', error);
    res.status(500).json({ error: 'Failed to insert transactions' });
  }
});

// Clear all transactions
app.delete('/api/transactions', async (req, res) => {
  try {
    if (!transactionsCollection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const result = await transactionsCollection.deleteMany({});
    
    res.json({ 
      message: `Cleared ${result.deletedCount} transactions`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing transactions:', error);
    res.status(500).json({ error: 'Failed to clear transactions' });
  }
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Get metadata (counts, date ranges, unique tokens)
app.get('/api/transactions/metadata', async (req, res) => {
  try {
    if (!transactionsCollection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    console.log('📊 Fetching transaction metadata...');

    // Get total count
    const totalCount = await transactionsCollection.countDocuments({});

    // Get date range
    const [minResult, maxResult] = await Promise.all([
      transactionsCollection.findOne({}, { sort: { decayStartTimeTimestamp: 1 } }),
      transactionsCollection.findOne({}, { sort: { decayStartTimeTimestamp: -1 } })
    ]);

    // Get unique tokens (using aggregation for efficiency)
    const uniqueTokens = await transactionsCollection.aggregate([
      {
        $group: {
          _id: null,
          inputTokens: { $addToSet: '$inputTokenAddress' },
          outputTokens: { $addToSet: '$outputTokenAddress' }
        }
      }
    ]).toArray();

    const metadata = {
      totalCount,
      dateRange: {
        min: minResult ? new Date(minResult.decayStartTimeTimestamp! * 1000) : null,
        max: maxResult ? new Date(maxResult.decayStartTimeTimestamp! * 1000) : null
      },
      uniqueTokens: uniqueTokens.length > 0 ? {
        inputTokens: uniqueTokens[0].inputTokens.sort(),
        outputTokens: uniqueTokens[0].outputTokens.sort()
      } : { inputTokens: [], outputTokens: [] }
    };

    console.log(`✅ Metadata: ${totalCount} transactions, ${metadata.uniqueTokens.inputTokens.length} unique input tokens, ${metadata.uniqueTokens.outputTokens.length} unique output tokens`);
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

// Get statistics without loading all data
app.get('/api/transactions/statistics', async (req, res) => {
  try {
    if (!transactionsCollection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { startDate, endDate } = req.query;
    
    // Build date filter
    interface DateFilter {
      decayStartTimeTimestamp?: {
        $gte?: number;
        $lte?: number;
      };
    }
    
    const dateFilter: DateFilter = {};
    if (startDate || endDate) {
      dateFilter.decayStartTimeTimestamp = {};
      if (startDate) {
        dateFilter.decayStartTimeTimestamp.$gte = new Date(startDate as string).getTime() / 1000;
      }
      if (endDate) {
        dateFilter.decayStartTimeTimestamp.$lte = new Date(endDate as string).getTime() / 1000;
      }
    }

    console.log('📈 Computing statistics...');

    // Get filtered count
    const filteredCount = await transactionsCollection.countDocuments(dateFilter);

    // Get token statistics using aggregation
    const tokenStats = await transactionsCollection.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalInputVolume: { $sum: { $toDouble: '$inputStartAmount' } },
          totalOutputVolume: { $sum: { $toDouble: '$outputTokenAmountOverride' } },
          uniqueInputTokens: { $addToSet: '$inputTokenAddress' },
          uniqueOutputTokens: { $addToSet: '$outputTokenAddress' }
        }
      }
    ]).toArray();

    // Get top tokens by transaction count
    const topInputTokens = await transactionsCollection.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$inputTokenAddress',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    const topOutputTokens = await transactionsCollection.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$outputTokenAddress',
          count: { $sum: 1 },
          totalVolume: { $sum: { $toDouble: '$outputTokenAmountOverride' } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    const statistics = {
      totalTransactions: filteredCount,
      tokenStats: tokenStats.length > 0 ? {
        totalInputVolume: tokenStats[0].totalInputVolume,
        totalOutputVolume: tokenStats[0].totalOutputVolume,
        uniqueInputTokens: tokenStats[0].uniqueInputTokens.length,
        uniqueOutputTokens: tokenStats[0].uniqueOutputTokens.length
      } : {
        totalInputVolume: 0,
        totalOutputVolume: 0,
        uniqueInputTokens: 0,
        uniqueOutputTokens: 0
      },
      topInputTokens,
      topOutputTokens
    };

    console.log(`✅ Statistics: ${filteredCount} transactions in date range`);
    res.json(statistics);
  } catch (error) {
    console.error('Error computing statistics:', error);
    res.status(500).json({ error: 'Failed to compute statistics' });
  }
});

// Get paginated transactions for display (efficient)
app.get('/api/transactions/display', async (req, res) => {
  try {
    if (!transactionsCollection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      inputTokenAddress,
      outputTokenAddress,
      sortBy = 'decayStartTimeTimestamp',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query: Record<string, any> = {};

    if (startDate || endDate) {
      query.decayStartTimeTimestamp = {};
      if (startDate) {
        query.decayStartTimeTimestamp.$gte = new Date(startDate as string).getTime() / 1000;
      }
      if (endDate) {
        query.decayStartTimeTimestamp.$lte = new Date(endDate as string).getTime() / 1000;
      }
    }

    if (inputTokenAddress && inputTokenAddress !== 'all') {
      query.inputTokenAddress = inputTokenAddress as string;
    }

    if (outputTokenAddress && outputTokenAddress !== 'all') {
      query.outputTokenAddress = outputTokenAddress as string;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    console.log(`📄 Fetching page ${page} with ${limit} items, skip: ${skip}`);

    const [transactions, total] = await Promise.all([
      transactionsCollection
        .find(query)
        .sort({ [sortBy as string]: sortDirection })
        .skip(skip)
        .limit(parseInt(limit as string))
        .toArray(),
      transactionsCollection.countDocuments(query)
    ]);

    const result = {
      transactions,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
        totalItems: total,
        itemsPerPage: parseInt(limit as string),
        hasNextPage: skip + parseInt(limit as string) < total,
        hasPrevPage: parseInt(page as string) > 1
      }
    };

    console.log(`✅ Display: ${transactions.length} transactions for page ${page}/${result.pagination.totalPages}`);
    res.json(result);
  } catch (error) {
    console.error('Error fetching display data:', error);
    res.status(500).json({ error: 'Failed to fetch display data' });
  }
});

// Get token pair statistics
app.get('/api/transactions/pairs', async (req, res) => {
  try {
    if (!transactionsCollection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter: Record<string, any> = {};
    if (startDate || endDate) {
      dateFilter.decayStartTimeTimestamp = {};
      if (startDate) {
        dateFilter.decayStartTimeTimestamp.$gte = new Date(startDate as string).getTime() / 1000;
      }
      if (endDate) {
        dateFilter.decayStartTimeTimestamp.$lte = new Date(endDate as string).getTime() / 1000;
      }
    }

    console.log('🔗 Computing token pair statistics...');

    // Get top token pairs by transaction count
    const topPairs = await transactionsCollection.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            inputToken: '$inputTokenAddress',
            outputToken: '$outputTokenAddress'
          },
          count: { $sum: 1 },
          totalOutputVolume: { $sum: { $toDouble: '$outputTokenAmountOverride' } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    const pairs = topPairs.map(pair => ({
      pair: `${pair._id.inputToken} → ${pair._id.outputToken}`,
      inputToken: pair._id.inputToken,
      outputToken: pair._id.outputToken,
      count: pair.count,
      totalOutputVolume: pair.totalOutputVolume
    }));

    console.log(`✅ Pairs: Found ${pairs.length} top token pairs`);
    res.json({ pairs });
  } catch (error) {
    console.error('Error computing pair statistics:', error);
    res.status(500).json({ error: 'Failed to compute pair statistics' });
  }
});

// 404 handler - must be last
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  console.log('🚀 Starting Uni-X Visualizer Backend Server...');
  
  const mongoConnected = await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log(`✅ Backend server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
    
    if (mongoConnected) {
      console.log(`🗄️  MongoDB: Connected and ready`);
    } else {
      console.log(`⚠️  MongoDB: Not connected - API will return errors for data operations`);
    }
    
    console.log('');
    console.log('Ready to serve requests! 🎉');
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  if (client) {
    await client.close();
    console.log('📴 MongoDB connection closed');
  }
  process.exit(0);
});

// Export for external use
export { startServer };

// Start the server immediately when this file is executed
startServer().catch(console.error);