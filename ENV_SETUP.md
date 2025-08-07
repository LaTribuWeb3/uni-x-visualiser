# Environment Variables Setup

## Required Environment Variables

Make sure your `.env` file contains these variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
DB_NAME=uni-x-visualiser
COLLECTION_NAME=transactions

# Pair Pricing API Configuration
PAIR_PRICE_API=https://pair-pricing.la-tribu.xyz/api/price
PAIR_PRICE_API_TOKEN=your_jwt_token_here
```

## Important Notes

- **PAIR_PRICE_API_TOKEN** is the correct environment variable name (not PAIR_PRICE_TOKEN)
- Make sure to replace `your_jwt_token_here` with your actual JWT token
- The token should have access to the pair pricing API

## Verification

You can verify your environment variables are loaded correctly by:

1. Starting the backend server
2. Checking the console logs for any warnings about missing environment variables
3. Testing the price enrichment endpoints through Swagger UI

## Troubleshooting

If you see warnings about missing environment variables:
- Double-check your `.env` file exists in the project root
- Verify the variable names are exactly as shown above
- Make sure there are no extra spaces or quotes around the values 