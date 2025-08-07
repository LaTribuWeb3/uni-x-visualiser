# Swagger UI for Uni-X Visualizer API

This document explains how to use the Swagger UI to interact with the Uni-X Visualizer API.

## Overview

Swagger UI provides an interactive web interface for testing and exploring the API endpoints. It's automatically generated from the OpenAPI specification and includes:

- Interactive documentation for all endpoints
- Request/response schemas
- Try-it-out functionality
- Example requests and responses

## Accessing Swagger UI

### 1. Start the Backend Server

```bash
# Start the backend server
npm run dev
# or
node src/backend.ts
```

### 2. Open Swagger UI

Navigate to: **http://localhost:5000/api-docs**

You should see the Swagger UI interface with all available endpoints organized by tags.

## Available Endpoints

### System
- **GET /api/health** - Health check endpoint

### Transactions
- **GET /api/transactions** - Get all transactions
- **GET /api/transactions/filtered** - Get filtered transactions with pagination
- **GET /api/transactions/date-range** - Get transaction date range
- **GET /api/transactions/unique-tokens** - Get unique token addresses
- **POST /api/transactions** - Insert transactions
- **DELETE /api/transactions** - Clear all transactions

### Price Enrichment
- **POST /api/transactions/enrich-prices** - Enrich transactions with price data
- **POST /api/transactions/process-pending-prices** - Process pending price jobs
- **GET /api/transactions/price-status** - Get price enrichment status

### Statistics & Analytics
- **GET /api/transactions/metadata** - Get transaction metadata
- **GET /api/transactions/statistics** - Get transaction statistics
- **GET /api/transactions/display** - Get paginated transactions for display
- **GET /api/transactions/pairs** - Get token pair statistics

## How to Use Swagger UI

### 1. Explore Endpoints

1. Click on any endpoint to expand its details
2. Read the description and parameters
3. View the request/response schemas

### 2. Test Endpoints

1. Click the **"Try it out"** button for any endpoint
2. Fill in the required parameters
3. Click **"Execute"** to send the request
4. View the response in the UI

### 3. Example: Test Price Enrichment

1. Navigate to **Price Enrichment** section
2. Click on **POST /api/transactions/price-status**
3. Click **"Try it out"**
4. Click **"Execute"**
5. View the current price enrichment status

### 4. Example: Enrich Prices

1. Navigate to **Price Enrichment** section
2. Click on **POST /api/transactions/enrich-prices**
3. Click **"Try it out"**
4. Fill in the request body:
   ```json
   {
     "limit": 10,
     "skip": 0,
     "forceRefresh": false
   }
   ```
5. Click **"Execute"**
6. View the enrichment results

## Request Body Examples

### Enrich Prices Request
```json
{
  "limit": 50,
  "skip": 0,
  "forceRefresh": false
}
```

### Process Pending Prices Request
```json
{
  "limit": 50
}
```

### Insert Transactions Request
```json
{
  "transactions": [
    {
      "decayStartTime": "1693726400",
      "inputTokenAddress": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "inputStartAmount": "1000000000000000000",
      "outputTokenAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      "outputTokenAmountOverride": "1800000000",
      "orderHash": "0x1234567890abcdef",
      "transactionHash": "0xabcdef1234567890"
    }
  ]
}
```

## Query Parameters

### Filtered Transactions
- `startDate` (string, date) - Start date for filtering
- `endDate` (string, date) - End date for filtering
- `inputTokenAddress` (string) - Input token address filter
- `outputTokenAddress` (string) - Output token address filter
- `limit` (number) - Number of transactions to return (default: 50)
- `skip` (number) - Number of transactions to skip (default: 0)

### Display Transactions
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 50)
- `startDate` (string, date) - Start date filter
- `endDate` (string, date) - End date filter
- `inputTokenAddress` (string) - Input token filter
- `outputTokenAddress` (string) - Output token filter
- `sortBy` (string) - Sort field (default: 'decayStartTimeTimestamp')
- `sortOrder` (string) - Sort order: 'asc' or 'desc' (default: 'desc')

## Response Examples

### Price Status Response
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

### Enrichment Result Response
```json
{
  "message": "Price enrichment completed",
  "processed": 50,
  "enriched": 45,
  "pending": 3,
  "failed": 2
}
```

### Transaction Response
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "decayStartTime": "1693726400",
  "inputTokenAddress": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "inputStartAmount": "1000000000000000000",
  "outputTokenAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "outputTokenAmountOverride": "1800000000",
  "orderHash": "0x1234567890abcdef",
  "transactionHash": "0xabcdef1234567890",
  "decayStartTimeTimestamp": 1693726400,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "priceData": {
    "openPrice": 1634.3,
    "closePrice": 1634.3,
    "highPrice": 1634.3,
    "lowPrice": 1634.3,
    "volume": 0,
    "exactMatch": true,
    "priceFetchedAt": "2024-01-15T10:30:00.000Z",
    "priceJobId": "84430cd9-2f1a-4cff-bdd2-bff61990816b",
    "priceStatus": "completed"
  }
}
```

## Testing the API

### 1. Health Check
Test if the API is running:
```bash
curl http://localhost:5000/api/health
```

### 2. Price Status
Check current price enrichment status:
```bash
curl http://localhost:5000/api/transactions/price-status
```

### 3. Enrich Prices
Start price enrichment:
```bash
curl -X POST http://localhost:5000/api/transactions/enrich-prices \
  -H "Content-Type: application/json" \
  -d '{"limit": 10, "skip": 0, "forceRefresh": false}'
```

### 4. Process Pending Jobs
Process pending price jobs:
```bash
curl -X POST http://localhost:5000/api/transactions/process-pending-prices \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

## Troubleshooting

### Swagger UI Not Loading
1. Check if the backend server is running on port 5000
2. Verify the server started without errors
3. Check browser console for any JavaScript errors

### API Endpoints Not Working
1. Check if MongoDB is connected
2. Verify environment variables are set correctly
3. Check server logs for error messages

### CORS Issues
1. Ensure the CORS configuration is correct
2. Check if the frontend URL is properly configured
3. Verify the request origin is allowed

## Benefits of Swagger UI

1. **Interactive Documentation** - Test endpoints directly in the browser
2. **Request/Response Examples** - See exactly what data to send and receive
3. **Schema Validation** - Automatic validation of request/response formats
4. **Easy Testing** - No need for curl or Postman for basic testing
5. **API Discovery** - Explore all available endpoints and their parameters
6. **Development Speed** - Faster API development and testing workflow

## Next Steps

1. **Explore the API** - Use Swagger UI to understand all available endpoints
2. **Test Price Enrichment** - Try the price enrichment endpoints
3. **Monitor Progress** - Use the status endpoints to track enrichment progress
4. **Integrate with Frontend** - Use the API endpoints in your React application 