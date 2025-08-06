# MongoDB Integration Setup

This guide explains how to set up MongoDB integration for the Uni-X Visualizer.

## Prerequisites

1. **MongoDB Installation**: Install MongoDB locally or use MongoDB Atlas
   - Local: Download from [MongoDB Community Server](https://www.mongodb.com/try/download/community)
   - Cloud: Create a free cluster at [MongoDB Atlas](https://cloud.mongodb.com/)

## Setup Instructions

### 1. Configure Environment Variables

The `.env` file has been created with default local MongoDB settings:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/uni-x-visualiser

# Alternative MongoDB Atlas connection string (replace with your actual connection string)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/uni-x-visualiser?retryWrites=true&w=majority

# Database Name
DB_NAME=uni-x-visualiser

# Collection Name
COLLECTION_NAME=transactions
```

### 2. For MongoDB Atlas (Cloud)

If using MongoDB Atlas:

1. Create a cluster at [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a database user
3. Whitelist your IP address
4. Get your connection string
5. Update `.env` file:

```env
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/uni-x-visualiser?retryWrites=true&w=majority
```

### 3. Import CSV Data to MongoDB

Run the TypeScript import script to populate your database:

```bash
# Basic import
npm run import-csv

# Clear existing data and import
npm run import-csv:clear

# Show help and options
npm run import-csv:help

# Custom options (use -- to pass arguments)
npm run import-csv -- --batch-size 2000 --skip-indexes
```

The import script will:
- Connect to your MongoDB instance using .env configuration
- Automatically find the CSV file in src/assets/
- Validate all transaction data with TypeScript types
- Import in configurable batches (default: 1000)
- Create optimized database indexes
- Display comprehensive import statistics

### 4. Database Schema

Each transaction document in MongoDB contains:

```typescript
{
  _id: ObjectId,
  decayStartTime: string,              // Original Unix timestamp as string
  inputTokenAddress: string,           // Input token contract address
  inputStartAmount: string,            // Input token amount as string
  outputTokenAddress: string,          // Output token contract address
  outputTokenAmountOverride: string,   // Output token amount as string
  orderHash: string,                   // Unique order identifier
  transactionHash: string,             // Ethereum transaction hash
  decayStartTimeTimestamp: number,     // Parsed Unix timestamp for queries
  createdAt: Date,                     // Document creation timestamp
  updatedAt: Date                      // Document update timestamp
}
```

### 5. Database Indexes

The following indexes are automatically created for optimal performance:

- `decayStartTimeTimestamp` (ascending) - for date range queries
- `inputTokenAddress` (ascending) - for input token filtering
- `outputTokenAddress` (ascending) - for output token filtering
- `orderHash` (ascending, unique) - for unique order identification
- `transactionHash` (ascending) - for transaction lookups

## Database Service API

The `DatabaseService` class provides these methods:

### Query Methods
- `getTransactions(filters)` - Get paginated transactions with filtering
- `getAllTransactions()` - Get all transactions
- `getDateRange()` - Get min/max date range
- `getUniqueTokens()` - Get unique input/output token addresses

### Management Methods
- `insertTransactions(transactions)` - Insert new transactions
- `clearCollection()` - Clear all transactions
- `close()` - Close database connection

## Usage in Components

Components now use the database service instead of CSV parsing:

```typescript
import databaseService from './services/database';

// Load all transactions
const transactions = await databaseService.getAllTransactions();

// Load filtered transactions
const result = await databaseService.getTransactions({
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  inputTokenAddress: '0x...',
  limit: 50,
  skip: 0
});
```

## Performance Benefits

✅ **Faster Queries**: Database indexes provide fast filtering and sorting
✅ **Memory Efficient**: No need to load entire CSV into memory
✅ **Scalable**: Can handle millions of transactions
✅ **Real-time**: Easy to add new transactions without regenerating CSV
✅ **Flexible**: Advanced querying capabilities with MongoDB

## Troubleshooting

### Connection Issues
- Ensure MongoDB is running (local) or connection string is correct (Atlas)
- Check firewall settings and IP whitelist (Atlas)
- Verify username/password (Atlas)

### Import Issues
- Ensure CSV file exists in `src/assets/`
- Check file permissions
- Verify MongoDB connection before running import

### Performance Issues
- Ensure indexes are created (automatic with import script)
- Consider adding compound indexes for complex queries
- Use pagination for large result sets

## Development vs Production

### Development
- Use local MongoDB instance
- Default connection: `mongodb://localhost:27017/uni-x-visualiser`

### Production
- Use MongoDB Atlas or dedicated MongoDB server
- Update connection string in production environment
- Ensure proper security (authentication, encryption, network security)