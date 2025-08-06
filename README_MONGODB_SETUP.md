# Uni-X Visualizer - MongoDB Integration Setup Guide

Your project has been successfully updated to use MongoDB instead of CSV files! The architecture now includes:

- **Backend API Server** (Express.js + MongoDB)
- **Frontend** (React with API calls)
- **Import Script** (CSV to MongoDB via API)

## 🏗️ Architecture Overview

```
Frontend (React) <-> Backend API (Express.js) <-> MongoDB
```

## 🚀 Quick Start

### 1. Install MongoDB

**Option A: Local MongoDB**
1. Download [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Install and start MongoDB service
3. MongoDB will run on `mongodb://localhost:27017` by default

**Option B: MongoDB Atlas (Cloud)**
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a free cluster
3. Get your connection string
4. Update `.env` file with your connection string

### 2. Configure Environment

The `.env` file has been created with default settings:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
DB_NAME=uni-x-visualiser
COLLECTION_NAME=transactions

# Frontend Configuration
VITE_API_URL=http://localhost:5000/api

# Backend Configuration
PORT=5000
FRONTEND_URL=http://localhost:5173
```

For MongoDB Atlas, update the `MONGODB_URI`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/uni-x-visualiser?retryWrites=true&w=majority
```

### 3. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 4. Import Your CSV Data

```bash
# Start the backend server first
npm run dev:backend

# In another terminal, import CSV data
npm run import-csv
```

### 5. Start the Application

```bash
# Start both frontend and backend together
npm run dev:full

# OR start them separately:
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend  
npm run dev
```

## 📊 Available Scripts

### Frontend + Backend
- `npm run dev:full` - Start both frontend and backend
- `npm run dev` - Start frontend only
- `npm run dev:backend` - Start backend only

### Data Import
- `npm run import-csv` - Import CSV data to MongoDB
- `npm run import-csv -- --clear` - Clear existing data and import
- `npm run import-csv -- --help` - Show import options

## 🔧 API Endpoints

The backend provides these REST API endpoints:

- `GET /api/health` - Health check
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/filtered` - Get filtered transactions with pagination
- `GET /api/transactions/date-range` - Get min/max date range
- `GET /api/transactions/unique-tokens` - Get unique token addresses
- `POST /api/transactions` - Insert transactions (used by import script)
- `DELETE /api/transactions` - Clear all transactions

## 🛠️ Development Workflow

1. **Start MongoDB** (if using local installation)
2. **Start Backend**: `npm run dev:backend`
3. **Import Data**: `npm run import-csv`
4. **Start Frontend**: `npm run dev`
5. **Open Browser**: http://localhost:5173

## 📁 Project Structure

```
uni-x-visualiser/
├── server/                    # Backend API server
│   ├── index.js              # Express.js server
│   └── package.json          # Backend dependencies
├── src/
│   ├── services/
│   │   └── api.ts            # Frontend API service
│   ├── scripts/
│   │   └── importCsv.ts      # CSV import script
│   └── types/
│       └── Transaction.ts    # TypeScript types
├── .env                      # Environment configuration
└── package.json             # Frontend dependencies
```

## 🔍 Troubleshooting

### MongoDB Connection Issues

**Error**: `MongoServerSelectionError: connect ECONNREFUSED`
- **Solution**: Make sure MongoDB is running
  - Local: Start MongoDB service
  - Atlas: Check connection string and network access

### Backend Not Starting

**Error**: `Failed to connect to MongoDB`
- Check MongoDB is running
- Verify connection string in `.env`
- Check firewall settings

### Import Script Fails

**Error**: `Backend server is not accessible`
- Start the backend first: `npm run dev:backend`
- Check if port 5000 is available

### Frontend Can't Connect to API

**Error**: API requests failing
- Ensure backend is running on port 5000
- Check `VITE_API_URL` in `.env`
- Verify CORS settings

## 🌟 Benefits of MongoDB Integration

✅ **Faster Queries** - Database indexes for efficient filtering  
✅ **Memory Efficient** - No need to load entire dataset  
✅ **Scalable** - Handle millions of transactions  
✅ **Real-time** - Add new data without regenerating files  
✅ **Advanced Queries** - Complex filtering and aggregation  

## 📝 Next Steps

1. **Start MongoDB** on your system
2. **Run** `npm run dev:backend` to start the API server  
3. **Import** your CSV data with `npm run import-csv`
4. **Launch** the frontend with `npm run dev`
5. **Enjoy** your MongoDB-powered transaction visualizer!

## 🆘 Need Help?

1. Check this guide first
2. Verify all services are running
3. Check the console for error messages
4. Ensure MongoDB is accessible
5. Verify environment configuration

Your UI will remain exactly the same, but now it's powered by MongoDB for better performance and scalability!