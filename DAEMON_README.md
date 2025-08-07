# Price Enrichment Daemon

The Price Enrichment Daemon is a background service that automatically enriches transaction data with price information from the pair pricing API.

## 🚀 Features

- **Automatic Processing**: Continuously processes transactions that need price enrichment
- **Batch Processing**: Processes transactions in configurable batches
- **Periodic Execution**: Runs enrichment cycles at configurable intervals
- **Graceful Shutdown**: Handles SIGINT and SIGTERM signals properly
- **Error Handling**: Comprehensive error handling and logging
- **Configurable**: All settings can be configured via environment variables

## 📋 Prerequisites

- MongoDB running and accessible
- Valid `PAIR_PRICE_API_TOKEN` environment variable
- Node.js and npm installed

## 🔧 Configuration

The daemon can be configured using environment variables:

### Database Configuration
```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=uni-x-visualiser
COLLECTION_NAME=transactions
```

### Processing Configuration
```env
DAEMON_BATCH_SIZE=25          # Number of transactions to process per batch
DAEMON_INTERVAL_MS=30000      # Interval between cycles (30 seconds)
DAEMON_MAX_RETRIES=3          # Maximum retry attempts
DAEMON_RETRY_DELAY_MS=5000    # Delay between retries (5 seconds)
DAEMON_REQUEST_DELAY=100      # Delay between API requests (100ms)
```

### API Configuration
```env
PAIR_PRICE_API=https://pair-pricing.la-tribu.xyz/api/price
PAIR_PRICE_API_TOKEN=your_jwt_token_here
API_TIMEOUT_MS=10000          # API request timeout (10 seconds)
```

### Logging Configuration
```env
LOG_LEVEL=info                 # debug, info, warn, error
LOG_FILE=daemon.log           # Log file path (optional)
```

## 🚀 Usage

### Starting the Daemon Alone

```bash
# Using npm script
npm run start-daemon

# Or directly with node
node src/scripts/priceEnrichmentDaemon.ts
```

### Starting All Services Together

```bash
# Start backend, frontend, and daemon together
npm run start-all

# Or directly
node start-all.js
```

## 📊 How It Works

1. **Connection**: Connects to MongoDB using configured settings
2. **Discovery**: Finds transactions that need price enrichment:
   - Transactions without price data
   - Transactions with failed or pending price data
3. **Processing**: For each transaction:
   - Resolves token addresses to names
   - Fetches price data from the API
   - Updates the transaction with price information
4. **Cycling**: Repeats the process at configured intervals
5. **Monitoring**: Logs progress and statistics

## 🔍 Monitoring

The daemon provides detailed logging:

```
🚀 Starting Price Enrichment Daemon...
📊 Configuration:
   Batch Size: 25
   Interval: 30 seconds
   Max Retries: 3
   Request Delay: 100ms
✅ Daemon started successfully

🔄 Starting enrichment cycle...
🔄 Processing batch of 10 transactions...
✅ Enriched transaction 507f1f77bcf86cd799439011 with price data
⏳ Transaction 507f1f77bcf86cd799439012 price data pending
❌ No price data available for transaction 507f1f77bcf86cd799439013

📊 Enrichment cycle completed:
   Total: 10
   Enriched: 3
   Pending: 5
   Failed: 2
   Skipped: 0
```

## 🛠️ Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check `MONGODB_URI` environment variable
   - Ensure MongoDB is running
   - Verify network connectivity

2. **API Token Issues**
   - Verify `PAIR_PRICE_API_TOKEN` is set correctly
   - Check token expiration
   - Ensure token has required permissions

3. **No Transactions Processed**
   - Check if transactions exist in the database
   - Verify collection name is correct
   - Check if transactions already have price data

4. **High Failure Rate**
   - Check API rate limits
   - Increase `DAEMON_REQUEST_DELAY`
   - Verify token addresses are in `tokens.ts`

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

### Manual Testing

Test the daemon with a small batch:

```env
DAEMON_BATCH_SIZE=5
DAEMON_INTERVAL_MS=60000  # 1 minute
```

## 🔧 Integration

### With Backend API

The daemon works alongside the backend API:

- Backend provides manual enrichment endpoints
- Daemon provides automatic background processing
- Both use the same price service and database

### With Frontend

The frontend can display:

- Real-time enrichment status
- Processing statistics
- Manual enrichment controls

## 📈 Performance

### Optimization Tips

1. **Batch Size**: Adjust based on API rate limits
2. **Interval**: Balance between responsiveness and resource usage
3. **Request Delay**: Prevent API throttling
4. **Database Indexes**: Ensure proper indexes on query fields

### Monitoring Metrics

Track these metrics:

- Transactions processed per cycle
- Success/failure rates
- API response times
- Database connection health

## 🔒 Security

### Environment Variables

- Store sensitive data in environment variables
- Never commit API tokens to version control
- Use `.env` files for local development

### API Access

- Use least-privilege API tokens
- Monitor API usage and costs
- Implement proper error handling

## 📝 Logs

The daemon logs to:

- **Console**: Real-time status updates
- **File**: Optional persistent logging (if `LOG_FILE` is set)

### Log Levels

- **debug**: Detailed debugging information
- **info**: General operational messages
- **warn**: Warning messages
- **error**: Error messages

## 🚀 Deployment

### Production Considerations

1. **Process Management**: Use PM2 or similar
2. **Logging**: Configure proper log rotation
3. **Monitoring**: Set up health checks
4. **Scaling**: Consider multiple daemon instances

### Example PM2 Configuration

```json
{
  "name": "price-enrichment-daemon",
  "script": "src/scripts/priceEnrichmentDaemon.ts",
  "instances": 1,
  "autorestart": true,
  "watch": false,
  "max_memory_restart": "1G",
  "env": {
    "NODE_ENV": "production"
  }
}
``` 