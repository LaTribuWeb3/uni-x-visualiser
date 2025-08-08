# Updated Price Enrichment Daemon

## Overview

The Price Enrichment Daemon has been updated to run continuously in the background, processing the full collection of transactions with a 5-minute pause between runs to avoid CPU overconsumption.

## Key Changes

### 1. Continuous Background Processing
- **Removed REST API triggers**: The daemon no longer requires manual API calls to start enrichment
- **Full collection processing**: Processes all transactions that need enrichment, not just a subset
- **5-minute intervals**: Runs every 5 minutes (300,000 ms) to balance performance and resource usage

### 2. Configuration Updates
- **Batch size**: Increased to 1000 (configurable via `DAEMON_BATCH_SIZE`)
- **Interval**: Set to 5 minutes (300,000 ms) via `DAEMON_INTERVAL_MS`
- **Processing**: Optimized for full collection processing

### 3. Simplified Data Structure
- **Removed complex price data**: No longer stores complex nested price data structures
- **Simplified format**: Uses direct `openPrice` and `closePrice` fields
- **Clean status tracking**: Uses top-level `priceStatus` field

## Running the Daemon

### Start the Daemon
```bash
npm run start-daemon
```

### Environment Variables
```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
DB_NAME=uni-x-visualiser
COLLECTION_NAME=transactions

# Daemon Configuration
DAEMON_BATCH_SIZE=1000
DAEMON_INTERVAL_MS=300000  # 5 minutes
DAEMON_MAX_RETRIES=3
DAEMON_RETRY_DELAY_MS=5000
DAEMON_REQUEST_DELAY=100

# API Configuration
PAIR_PRICE_API=https://pair-pricing.la-tribu.xyz/api/price
PAIR_PRICE_API_TOKEN=your_token_here
API_TIMEOUT_MS=10000

# Logging
LOG_LEVEL=info
```

## How It Works

### 1. Continuous Processing
- The daemon starts automatically and runs continuously
- Every 5 minutes, it scans the entire collection for transactions needing enrichment
- Processes transactions in batches to avoid memory issues

### 2. Transaction Selection
The daemon identifies transactions that need enrichment based on:
- Missing `openPrice` or `closePrice` fields
- `priceStatus` set to 'pending' or 'failed'
- Zero values for `openPrice` or `closePrice`

### 3. Price Enrichment Process
1. **Fetch price data** from the pair pricing API
2. **Transform to simplified format** (openPrice, closePrice)
3. **Update transaction** with new price data
4. **Track status** (completed, pending, failed)

### 4. Error Handling
- **Retry logic**: Failed requests are retried up to 3 times
- **Graceful degradation**: Continues processing even if some transactions fail
- **Logging**: Comprehensive logging for monitoring and debugging

## Monitoring

### Log Output
The daemon provides detailed logging:
```
🚀 Starting Price Enrichment Daemon...
📊 Configuration:
   Batch Size: 1000
   Interval: 300 seconds
   Max Retries: 3
   Request Delay: 100ms
   Data Format: Simplified

🔄 Starting enrichment cycle...
📊 Found 150 transactions to enrich
✅ Enriched transaction abc123 with simplified price data
⏳ Transaction def456 price data pending
❌ No price data available for transaction ghi789

📊 Enrichment cycle completed:
   Total: 150
   Enriched: 120
   Pending: 20
   Failed: 10
   Skipped: 0
```

### Stopping the Daemon
- Press `Ctrl+C` to stop the daemon gracefully
- The daemon will complete current processing before shutting down

## Benefits

### 1. Automated Processing
- No manual intervention required
- Continuous background processing
- Automatic retry for failed requests

### 2. Resource Optimization
- 5-minute intervals prevent CPU overconsumption
- Batch processing for memory efficiency
- Configurable delays between API requests

### 3. Simplified Architecture
- Removed REST API complexity
- Direct database processing
- Cleaner data structure

### 4. Scalability
- Processes full collection efficiently
- Configurable batch sizes
- Graceful error handling

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `MONGODB_URI` environment variable
   - Ensure MongoDB is running

2. **API Authentication Failed**
   - Verify `PAIR_PRICE_API_TOKEN` is set correctly
   - Check API endpoint accessibility

3. **High CPU Usage**
   - Increase `DAEMON_INTERVAL_MS` to reduce frequency
   - Decrease `DAEMON_BATCH_SIZE` to reduce batch size

4. **Memory Issues**
   - Decrease `DAEMON_BATCH_SIZE`
   - Monitor memory usage during processing

### Debug Mode
Set `LOG_LEVEL=debug` for detailed logging:
```bash
LOG_LEVEL=debug npm run start-daemon
```

## Migration Notes

### From Previous Version
- **REST API endpoints removed**: No longer need to call `/api/transactions/enrich-prices`
- **Simplified data structure**: Old complex price data will be automatically transformed
- **Continuous processing**: No manual triggers needed

### Data Compatibility
- The daemon automatically transforms old complex price data to simplified format
- Existing transactions with complex price data will be updated during processing
- No data migration script needed 