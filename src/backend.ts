import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, Db, Collection } from 'mongodb';
import type { Transaction } from './types/Transaction';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';

import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

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

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Uni-X Visualizer API',
      version: '1.0.0',
      description: 'API for managing transactions and price enrichment',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        Transaction: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            decayStartTime: { type: 'string' },
            inputTokenAddress: { type: 'string' },
            inputStartAmount: { type: 'string' },
            outputTokenAddress: { type: 'string' },
            outputTokenAmountOverride: { type: 'string' },
            orderHash: { type: 'string' },
            transactionHash: { type: 'string' },
            openPrice: { type: 'number' },
            closePrice: { type: 'number' },
            priceStatus: { 
              type: 'string', 
              enum: ['pending', 'completed', 'failed'] 
            }
          }
        },
        PriceStatus: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            enriched: { type: 'number' },
            pending: { type: 'number' },
            failed: { type: 'number' },
            noPrice: { type: 'number' },
            enrichmentRate: { type: 'number' }
          }
        },
        EnrichmentResult: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            processed: { type: 'number' },
            enriched: { type: 'number' },
            pending: { type: 'number' },
            failed: { type: 'number' }
          }
        },
        PendingJobsResult: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            processed: { type: 'number' },
            completed: { type: 'number' },
            stillPending: { type: 'number' },
            failed: { type: 'number' }
          }
        }
      }
    }
  },
  apis: ['./src/backend.ts'] // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Validation function for CSV rows
interface CsvRow {
  decayStartTime: string;
  inputTokenAddress: string;
  inputStartAmount: string;
  outputTokenAddress: string;
  outputTokenAmountOverride: string;
  orderHash: string;
  transactionHash: string;
}

function validateTransaction(row: CsvRow, index: number): Transaction | null {
  const requiredFields: (keyof CsvRow)[] = [
    'decayStartTime',
    'inputTokenAddress',
    'inputStartAmount',
    'outputTokenAddress',
    'outputTokenAmountOverride',
    'orderHash',
    'transactionHash'
  ];

  // Check for missing required fields
  for (const field of requiredFields) {
    if (!row[field] || row[field].trim() === '') {
      console.warn(`⚠️  Row ${index + 1}: Missing required field '${field}'`);
      return null;
    }
  }

  // Validate numeric fields
  const timestamp = parseInt(row.decayStartTime);
  if (isNaN(timestamp) || timestamp <= 0) {
    console.warn(`⚠️  Row ${index + 1}: Invalid timestamp '${row.decayStartTime}'`);
    return null;
  }

  // Validate BigInt fields (amounts)
  try {
    BigInt(row.inputStartAmount);
    BigInt(row.outputTokenAmountOverride);
  } catch (error) {
    console.warn(`⚠️  Row ${index + 1}: Invalid amount field`);
    return null;
  }

  // Validate addresses (basic format check)
  if (!row.inputTokenAddress.startsWith('0x') || row.inputTokenAddress.length !== 42) {
    console.warn(`⚠️  Row ${index + 1}: Invalid input token address format`);
    return null;
  }

  if (!row.outputTokenAddress.startsWith('0x') || row.outputTokenAddress.length !== 42) {
    console.warn(`⚠️  Row ${index + 1}: Invalid output token address format`);
    return null;
  }

  // Validate hashes
  if (!row.orderHash.startsWith('0x') || row.orderHash.length !== 66) {
    console.warn(`⚠️  Row ${index + 1}: Invalid order hash format`);
    return null;
  }

  if (!row.transactionHash.startsWith('0x') || row.transactionHash.length !== 66) {
    console.warn(`⚠️  Row ${index + 1}: Invalid transaction hash format`);
    return null;
  }

  return {
    transactionHash: row.transactionHash.toLowerCase(), // Primary identifier
    decayStartTime: timestamp, // Store as number timestamp
    inputTokenAddress: row.inputTokenAddress.toLowerCase(),
    inputStartAmount: row.inputStartAmount,
    outputTokenAddress: row.outputTokenAddress.toLowerCase(),
    outputTokenAmountOverride: row.outputTokenAmountOverride,
    orderHash: row.orderHash.toLowerCase(),
  };
}

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

    // Create unique index on transactionHash
    console.log('🔑 Creating unique index on transactionHash...');
    try {
      await transactionsCollection.createIndex(
        { transactionHash: 1 }, 
        { unique: true, name: 'transactionHash_unique' }
      );
      console.log('✅ Unique index created on transactionHash');
    } catch (indexError) {
      console.log('ℹ️  Index already exists or error creating index:', (indexError as Error).message);
    }

    console.log('✅ Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:');
    console.error('   Error:', (error as Error).message);
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

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API and MongoDB connection
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 message:
 *                   type: string
 *                   example: "Uni-X Visualizer Backend is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 mongodb:
 *                   type: string
 *                   example: "Connected"
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Uni-X Visualizer Backend is running',
    timestamp: new Date().toISOString(),
    mongodb: client ? 'Connected' : 'Disconnected'
  });
});

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions
 *     description: Retrieves all transactions from the database (limited to 1000 for performance)
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       500:
 *         description: Database connection error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Database not connected"
 */
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
      .limit(1000) // Limit to 1000 records for performance
      .toArray();
    
    console.log(`✅ Retrieved ${transactions.length} transactions`);
    res.json(transactions);
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions', details: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/transactions/filtered:
 *   get:
 *     summary: Get filtered transactions
 *     description: Retrieves transactions with filtering and pagination options
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (ISO format)
 *       - in: query
 *         name: inputTokenAddress
 *         schema:
 *           type: string
 *         description: Input token address filter
 *       - in: query
 *         name: outputTokenAddress
 *         schema:
 *           type: string
 *         description: Output token address filter
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *         description: Number of transactions to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: number
 *           default: 0
 *         description: Number of transactions to skip
 *     responses:
 *       200:
 *         description: Filtered transactions with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 total:
 *                   type: number
 *                 page:
 *                   type: number
 *                 totalPages:
 *                   type: number
 *       500:
 *         description: Database connection error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Database not connected"
 */
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
      query.decayStartTime = {};
      if (startDate) {
        query.decayStartTime.$gte = new Date(startDate as string).getTime() / 1000;
      }
      if (endDate) {
        query.decayStartTime.$lte = new Date(endDate as string).getTime() / 1000;
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
        .sort({ decayStartTime: -1 })
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
      transactionsCollection.findOne({}, { sort: { decayStartTime: 1 } }),
      transactionsCollection.findOne({}, { sort: { decayStartTime: -1 } })
    ]);

    if (!minResult || !maxResult) {
      return res.status(404).json({ error: 'No transactions found' });
    }

    res.json({
      min: new Date(minResult.decayStartTime * 1000),
      max: new Date(maxResult.decayStartTime * 1000)
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

    // Insert transactions directly (no additional processing needed)
    await transactionsCollection.insertMany(transactions);
    
    res.json({ 
      message: `Inserted ${transactions.length} transactions successfully`,
      count: transactions.length
    });
  } catch (error) {
    console.error('Error inserting transactions:', error);
    res.status(500).json({ error: 'Failed to insert transactions' });
  }
});

/**
 * @swagger
 * /api/transactions/upload:
 *   post:
 *     summary: Upload CSV file and import transactions
 *     description: Upload a CSV file containing transaction data and import it into the database
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file to upload
 *     responses:
 *       200:
 *         description: File uploaded and transactions imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: number
 *                 validCount:
 *                   type: number
 *                 invalidCount:
 *                   type: number
 *       400:
 *         description: Invalid file or data
 *       500:
 *         description: Server error
 */
app.post('/api/transactions/upload', upload.single('file'), async (req, res) => {
  try {
    if (!transactionsCollection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileSizeMB = (req.file.size / 1024 / 1024).toFixed(2);
    console.log(`📁 Processing uploaded file: ${req.file.originalname} (${fileSizeMB}MB)`);

    // Stage 1: Read and parse CSV
    console.log('📄 Reading CSV file...');
    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    
    console.log('🔍 Parsing CSV content...');
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      console.error('❌ CSV parsing errors:', parseResult.errors);
      return res.status(400).json({ 
        error: 'CSV parsing failed', 
        details: parseResult.errors 
      });
    }

    console.log(`📊 Parsed ${parseResult.data.length} rows from CSV`);

    // Stage 2: Validate and transform data
    console.log('✅ Validating transactions...');
    const validTransactions: Transaction[] = [];
    let invalidCount = 0;
    const totalRows = parseResult.data.length;

    // Process in batches for better progress reporting
    const batchSize = 1000;
    for (let i = 0; i < totalRows; i += batchSize) {
      const batch = parseResult.data.slice(i, i + batchSize);
      console.log(`🔍 Validating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalRows / batchSize)} (rows ${i + 1}-${Math.min(i + batchSize, totalRows)})`);
      
      batch.forEach((row: any, index: number) => {
        const transaction = validateTransaction(row, i + index);
        if (transaction) {
          validTransactions.push(transaction);
        } else {
          invalidCount++;
        }
      });
    }

    console.log(`✅ Validation complete: ${validTransactions.length} valid, ${invalidCount} invalid`);

    if (validTransactions.length === 0) {
      console.log('❌ No valid transactions found in file');
      return res.status(400).json({ error: 'No valid transactions found in file' });
    }

    // Stage 3: Insert transactions into database (no additional processing needed)
    console.log('🗄️ Inserting transactions into database...');
    const insertResult = await transactionsCollection.insertMany(validTransactions);
    console.log(`✅ Successfully inserted ${insertResult.insertedCount} transactions`);

    // Clean up uploaded file
    console.log('🧹 Cleaning up uploaded file...');
    fs.unlinkSync(req.file.path);

    const result = { 
      message: `Successfully imported ${validTransactions.length} transactions`,
      count: validTransactions.length,
      validCount: validTransactions.length,
      invalidCount: invalidCount,
      totalRows: parseResult.data.length
    };

    console.log('🎉 Upload processing complete:', result);
    res.json(result);

  } catch (error) {
    console.error('❌ Error processing uploaded file:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        console.log('🧹 Cleaning up file after error...');
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    res.status(500).json({ error: 'Failed to process uploaded file' });
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
      transactionsCollection.findOne({}, { sort: { decayStartTime: 1 } }),
      transactionsCollection.findOne({}, { sort: { decayStartTime: -1 } })
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
        min: minResult ? new Date(minResult.decayStartTime! * 1000) : null,
        max: maxResult ? new Date(maxResult.decayStartTime! * 1000) : null
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
      decayStartTime?: {
        $gte?: number;
        $lte?: number;
      };
    }
    
    const dateFilter: DateFilter = {};
    if (startDate || endDate) {
      dateFilter.decayStartTime = {};
      if (startDate) {
        dateFilter.decayStartTime.$gte = new Date(startDate as string).getTime() / 1000;
      }
      if (endDate) {
        dateFilter.decayStartTime.$lte = new Date(endDate as string).getTime() / 1000;
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
      sortBy = 'decayStartTime',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query: Record<string, any> = {};

    if (startDate || endDate) {
      query.decayStartTime = {};
      if (startDate) {
        query.decayStartTime.$gte = new Date(startDate as string).getTime() / 1000;
      }
      if (endDate) {
        query.decayStartTime.$lte = new Date(endDate as string).getTime() / 1000;
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
      dateFilter.decayStartTime = {};
      if (startDate) {
        dateFilter.decayStartTime.$gte = new Date(startDate as string).getTime() / 1000;
      }
      if (endDate) {
        dateFilter.decayStartTime.$lte = new Date(endDate as string).getTime() / 1000;
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