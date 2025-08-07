# Price Enrichment Feature

This feature enriches each database transaction with open and close prices fetched from the pair pricing API.

## Overview

The price enrichment system:
- Fetches price data for each transaction using the pair pricing API
- Handles both immediate responses and async processing (202 status)
- Translates token addresses to names using the `tokens.ts` mapping
- Stores price data in the database with status tracking
- Provides UI controls for monitoring and managing the enrichment process

## Setup

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Pair Pricing API Configuration
PAIR_PRICE_API=https://pair-pricing.la-tribu.xyz/api/price
PAIR_PRICE_API_TOKEN=your_jwt_token_here
```

### 2. Database Schema Update

The Transaction type has been updated to include price data fields:

```typescript
interface Transaction {
  // ... existing fields ...
  priceData?: {
    openPrice?: number;
    closePrice?: number;
    highPrice?: number;
    lowPrice?: number;
    volume?: number;
    exactMatch?: boolean;
    priceFetchedAt?: Date;
    priceJobId?: string;
    priceStatus?: 'pending' | 'completed' | 'failed';
  };
}
```

## API Endpoints

### Enrich Transactions with Price Data
```http
POST /api/transactions/enrich-prices
Content-Type: application/json

{
  "limit": 50,
  "skip": 0,
  "forceRefresh": false
}
```

**Response:**
```json
{
  "message": "Price enrichment completed",
  "processed": 50,
  "enriched": 45,
  "pending": 3,
  "failed": 2
}
```

### Process Pending Price Jobs
```http
POST /api/transactions/process-pending-prices
Content-Type: application/json

{
  "limit": 50
}
```

**Response:**
```json
{
  "message": "Pending price jobs processed",
  "processed": 10,
  "completed": 8,
  "stillPending": 1,
  "failed": 1
}
```

### Get Price Enrichment Status
```http
GET /api/transactions/price-status
```

**Response:**
```json
{
  "total": 1000,
  "enriched": 750,
  "pending": 50,
  "failed": 20,
  "noPrice": 180,
  "enrichmentRate": 75
}
```

## Usage

### 1. Using the UI Component

Import and use the `PriceEnrichment` component in your React app:

```tsx
import PriceEnrichment from './components/PriceEnrichment';

function App() {
  return (
    <div>
      <PriceEnrichment />
    </div>
  );
}
```

### 2. Using the Script

Run the enrichment script directly:

```bash
# Install dependencies if needed
npm install

# Run the enrichment script
npx tsx src/scripts/enrichPrices.ts
```

### 3. Using the API Service

```typescript
import apiService from './services/api';

// Enrich prices
const result = await apiService.enrichPrices({
  limit: 100,
  skip: 0,
  forceRefresh: false
});

// Process pending jobs
const pendingResult = await apiService.processPendingPrices({
  limit: 50
});

// Get status
const status = await apiService.getPriceStatus();
```

## How It Works

### 1. Token Address Translation
The system uses the `tokens.ts` file to translate token addresses to names:
- Input: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
- Output: `WETH`

### 2. API Request
For each transaction, the system makes a request to:
```
GET https://pair-pricing.la-tribu.xyz/api/price?inputToken=WETH&outputToken=USDT&timestamp=1693726400
Authorization: Bearer <jwt-token>
```

### 3. Response Handling
The API can respond in two ways:

**Immediate Response (200):**
```json
{
  "jobId": "84430cd9-2f1a-4cff-bdd2-bff61990816b",
  "status": "completed",
  "result": {
    "timestamp": 1693726400,
    "open": 1634.3,
    "high": 1634.3,
    "low": 1634.3,
    "close": 1634.3,
    "volume": 0,
    "exactMatch": true
  }
}
```

**Async Response (202):**
```json
{
  "jobId": "84430cd9-2f1a-4cff-bdd2-bff61990816b",
  "status": "processing",
  "message": "Request is being processed. Use the job ID to check status."
}
```

### 4. Status Tracking
- **completed**: Price data successfully fetched and stored
- **pending**: Job submitted, waiting for completion
- **failed**: Job failed or no data available

## Best Practices

### 1. Batch Processing
- Use small batch sizes (25-50) to avoid overwhelming the API
- Add delays between requests (100-200ms)
- Process in background for large datasets

### 2. Error Handling
- The system automatically retries failed jobs
- Pending jobs are checked periodically
- Failed transactions can be retried with `forceRefresh: true`

### 3. Monitoring
- Use the status endpoint to monitor progress
- Check enrichment rate to track completion
- Monitor failed transactions for investigation

## Troubleshooting

### Common Issues

1. **Missing Token Mapping**
   - Check if token addresses exist in `tokens.ts`
   - Add missing tokens to the mapping

2. **API Rate Limiting**
   - Reduce batch sizes
   - Increase delays between requests
   - Use the pending job processing feature

3. **Authentication Errors**
   - Verify `PAIR_PRICE_API_TOKEN` is set correctly
   - Check token expiration

4. **Database Connection Issues**
   - Verify MongoDB connection string
   - Check database permissions

### Debug Commands

```bash
# Check price status
curl http://localhost:5000/api/transactions/price-status

# Enrich a small batch
curl -X POST http://localhost:5000/api/transactions/enrich-prices \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# Process pending jobs
curl -X POST http://localhost:5000/api/transactions/process-pending-prices \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

## Performance Considerations

- **API Limits**: The pair pricing API may have rate limits
- **Database Load**: Large enrichment jobs can impact database performance
- **Memory Usage**: Processing large batches requires sufficient memory
- **Network**: Ensure stable network connection for API requests

## Future Enhancements

- [ ] Caching layer for frequently requested prices
- [ ] Background job processing with queue system
- [ ] Price data validation and quality checks
- [ ] Historical price data analysis
- [ ] Real-time price updates for recent transactions 