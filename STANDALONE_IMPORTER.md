# Standalone CSV to MongoDB Importer

A comprehensive standalone program to import UniswapX CSV transaction data into MongoDB with full validation, error handling, and performance optimization.

## 🚀 Quick Start

1. **Navigate to the standalone directory**:
   ```bash
   cd standalone-importer
   ```

2. **Configure your MongoDB connection** in `.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/uni-x-visualiser
   DB_NAME=uni-x-visualiser
   COLLECTION_NAME=transactions
   ```

3. **Run the importer**:
   ```bash
   node csv-to-mongodb.js
   ```

## 📋 Features

✅ **Automatic CSV Detection** - Finds CSV files automatically  
✅ **Data Validation** - Validates all transactions before import  
✅ **Batch Processing** - Handles large files efficiently  
✅ **Duplicate Handling** - Skips duplicate entries gracefully  
✅ **Index Creation** - Creates optimized database indexes  
✅ **Progress Tracking** - Shows real-time import progress  
✅ **Detailed Statistics** - Comprehensive import summary  
✅ **Error Recovery** - Continues on non-critical errors  
✅ **Colored Output** - Easy-to-read console messages  

## 🛠️ Command Line Options

```bash
node csv-to-mongodb.js [options]
```

### Options:

| Option | Description | Default |
|--------|-------------|---------|
| `--csv-path <path>` | Path to CSV file | Auto-detect |
| `--mongo-uri <uri>` | MongoDB connection string | From .env |
| `--db-name <name>` | Database name | uni-x-visualiser |
| `--collection <name>` | Collection name | transactions |
| `--batch-size <size>` | Batch size for inserts | 1000 |
| `--clear` | Clear existing data before import | false |
| `--skip-indexes` | Skip creating indexes | false |
| `--help` | Show help message | - |

## 📖 Usage Examples

### Basic Import
```bash
# Import with default settings
node csv-to-mongodb.js
```

### Custom CSV Path
```bash
# Import specific CSV file
node csv-to-mongodb.js --csv-path "/path/to/your/data.csv"
```

### Clear and Import
```bash
# Clear existing data and import fresh
node csv-to-mongodb.js --clear
```

### Custom Database
```bash
# Import to different database/collection
node csv-to-mongodb.js --db-name "production" --collection "uniswap_orders"
```

### MongoDB Atlas
```bash
# Import to MongoDB Atlas
node csv-to-mongodb.js --mongo-uri "mongodb+srv://user:password@cluster.mongodb.net/database"
```

### Large File Optimization
```bash
# Optimize for large files with bigger batches
node csv-to-mongodb.js --batch-size 5000 --skip-indexes
```

## 🗄️ Database Schema

Each imported document contains:

```javascript
{
  _id: ObjectId("..."),                    // MongoDB document ID
  decayStartTime: "1704067200",           // Original Unix timestamp (string)
  inputTokenAddress: "0x...",             // Input token contract address
  inputStartAmount: "1000000000000000000", // Input amount (string)
  outputTokenAddress: "0x...",            // Output token contract address
  outputTokenAmountOverride: "500000",    // Output amount (string)
  orderHash: "0x...",                     // Unique order identifier
  transactionHash: "0x...",               // Ethereum transaction hash
  decayStartTimeTimestamp: 1704067200,    // Parsed timestamp (number)
  createdAt: ISODate("2025-01-08T..."),   // Import timestamp
  updatedAt: ISODate("2025-01-08T...")    // Last update timestamp
}
```

## 📊 Performance Indexes

The importer automatically creates these indexes for optimal query performance:

- `decayStartTimeTimestamp_1` - For date range queries
- `inputTokenAddress_1` - For input token filtering
- `outputTokenAddress_1` - For output token filtering  
- `orderHash_1` (unique) - For order lookups and duplicate prevention
- `transactionHash_1` - For transaction lookups
- `createdAt_1` - For import tracking

## 🔍 Data Validation

The importer validates each transaction:

- **Required Fields**: Checks for missing critical data
- **Timestamp Validation**: Ensures valid Unix timestamps
- **Address Format**: Basic Ethereum address validation
- **Data Integrity**: Skips malformed entries with detailed logging

## 📈 Import Statistics

After import completion, you'll see detailed statistics:

```
=== IMPORT STATISTICS ===
✅ Total Transactions: 199,999
✅ Date Range: 2025-01-01 to 2025-12-31  
✅ Unique Input Tokens: 1,234
✅ Unique Output Tokens: 987
✅ Unique Orders: 199,999
✅ Import completed in 45.67 seconds
```

## ⚠️ Error Handling

The importer handles various error scenarios:

- **Connection Errors**: MongoDB connection issues
- **File Errors**: Missing or corrupted CSV files  
- **Data Errors**: Invalid or malformed transaction data
- **Duplicate Errors**: Existing orders (skipped gracefully)
- **Memory Errors**: Large file processing optimization

## 🔧 Environment Variables

Configure via `.env` file:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/uni-x-visualiser

# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Database Settings
DB_NAME=uni-x-visualiser
COLLECTION_NAME=transactions

# Debug Mode (optional)
DEBUG=true
```

## 🚀 Performance Tips

### For Large Files (>100MB):
- Use larger batch sizes: `--batch-size 5000`
- Skip indexes initially: `--skip-indexes` (create manually later)
- Ensure sufficient RAM (MongoDB needs memory for operations)

### For Production:
- Use MongoDB replica sets for reliability
- Enable MongoDB logging for audit trails
- Run during low-traffic periods
- Monitor disk space (indexes require additional space)

## 🔒 Security Considerations

- Store MongoDB credentials securely
- Use MongoDB authentication in production
- Restrict network access to MongoDB
- Enable MongoDB audit logging
- Regular backup before large imports

## 🐛 Troubleshooting

### Common Issues:

**"CSV file not found"**
- Check file path and permissions
- Use `--csv-path` to specify exact location

**"Connection refused"**  
- Ensure MongoDB is running
- Check connection string format
- Verify network connectivity

**"Duplicate key error"**
- Use `--clear` to remove existing data
- Or let the importer skip duplicates automatically

**"Out of memory"**
- Reduce `--batch-size` 
- Close other applications
- Use a machine with more RAM

## 📞 Support

For issues or questions:
1. Check the console output for detailed error messages
2. Enable debug mode: `DEBUG=true node csv-to-mongodb.js`
3. Verify MongoDB connection independently
4. Check CSV file format and structure

---

**Happy Importing! 🎉**