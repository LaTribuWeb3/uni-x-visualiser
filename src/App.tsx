import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

import { format } from 'date-fns';
import { getTokenName, formatVolume } from './utils';
import TransactionsTable from './TransactionsTable';
import FileUpload from './components/FileUpload';
import apiService from './services/api';
import './App.css';



interface TokenStats {
  token: string;
  count: number;
  totalVolume: number;
}

interface PairStats {
  pair: string;
  inputToken: string;
  outputToken: string;
  count: number;
  totalOutputVolume: number;
}

// Navigation component
const Navigation: React.FC = () => {
  const location = useLocation();
  
  return (
    <nav className="bg-white shadow-md mb-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-2xl font-bold text-gray-900">Uni-X Visualizer</h1>
          <div className="flex space-x-4">
            <Link
              to="/"
              className={`px-4 py-2 rounded-md font-medium transition-colors border ${
                location.pathname === '/'
                  ? 'bg-gray-400 text-black border-gray-500'
                  : 'bg-gray-200 text-black border-gray-400 hover:bg-gray-300'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/upload"
              className={`px-4 py-2 rounded-md font-medium transition-colors border ${
                location.pathname === '/upload'
                  ? 'bg-gray-400 text-black border-gray-500'
                  : 'bg-gray-200 text-black border-gray-400 hover:bg-gray-300'
              }`}
            >
              Upload CSV
            </Link>
            <Link
              to="/transactions"
              className={`px-4 py-2 rounded-md font-medium transition-colors border ${
                location.pathname === '/transactions'
                  ? 'bg-gray-400 text-black border-gray-500'
                  : 'bg-gray-200 text-black border-gray-400 hover:bg-gray-300'
              }`}
            >
              Transactions Table
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Dashboard component (existing App logic)
const Dashboard: React.FC = () => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dataRange, setDataRange] = useState<{ min: Date; max: Date } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [statistics, setStatistics] = useState<{
    totalTransactions: number;
    tokenStats: {
      totalInputVolume: number;
      totalOutputVolume: number;
      uniqueInputTokens: number;
      uniqueOutputTokens: number;
    };
    topInputTokens: Array<{ _id: string; count: number }>;
    topOutputTokens: Array<{ _id: string; count: number; totalVolume: number }>;
  } | null>(null);
  const [tokenPairs, setTokenPairs] = useState<Array<{
    pair: string;
    inputToken: string;
    outputToken: string;
    count: number;
    totalOutputVolume: number;
  }>>([]);

  // Load metadata and statistics efficiently
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('🔄 Loading metadata and statistics...');
        
        // Load metadata (counts, date ranges, unique tokens)
        const metadataResult = await apiService.getMetadata();
        
        if (metadataResult.totalCount === 0) {
          setError('No data found in database. Please run the CSV import script first.');
          setLoading(false);
          return;
        }
        
        // Set date range from metadata
        if (metadataResult.dateRange.min && metadataResult.dateRange.max) {
          setDataRange({
            min: new Date(metadataResult.dateRange.min),
            max: new Date(metadataResult.dateRange.max)
          });
          setStartDate(format(new Date(metadataResult.dateRange.min), 'yyyy-MM-dd'));
          setEndDate(format(new Date(metadataResult.dateRange.max), 'yyyy-MM-dd'));
        }
        
        // Load initial statistics
        const statsResult = await apiService.getStatistics();
        setStatistics(statsResult);
        
        // Load token pair statistics
        const pairsResult = await apiService.getTokenPairs();
        setTokenPairs(pairsResult.pairs);
        
        setLoading(false);
        
      } catch (err) {
        console.error('API error:', err);
        setError(`Error loading data from API: ${err}`);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Update statistics when date range changes
  useEffect(() => {
    const updateStatistics = async () => {
      if (!startDate || !endDate) return;
      
      try {
        const [statsResult, pairsResult] = await Promise.all([
          apiService.getStatistics({
            startDate,
            endDate
          }),
          apiService.getTokenPairs({
            startDate,
            endDate
          })
        ]);
        setStatistics(statsResult);
        setTokenPairs(pairsResult.pairs);
      } catch (err) {
        console.error('Error updating statistics:', err);
      }
    };

    updateStatistics();
  }, [startDate, endDate]);



  // Calculate token popularity using backend statistics
  const getTokenStats = (): TokenStats[] => {
    if (!statistics?.topOutputTokens) return [];
    
    return statistics.topOutputTokens.map((token) => ({
      token: token._id,
      count: token.count,
      totalVolume: token.totalVolume
    }));
  };

  // Calculate pair popularity using backend statistics
  const getPairStats = (): PairStats[] => {
    if (!tokenPairs.length) return [];
    
    return tokenPairs.map(pair => ({
      pair: pair.pair,
      inputToken: pair.inputToken,
      outputToken: pair.outputToken,
      count: pair.count,
      totalOutputVolume: pair.totalOutputVolume
    }));
  };

  // Calculate summary stats using efficient backend statistics
  const getSummaryStats = () => {
    if (!statistics) return null;

    return {
      totalTransactions: statistics.totalTransactions,
      totalInputVolume: statistics.tokenStats.totalInputVolume,
      totalOutputVolume: statistics.tokenStats.totalOutputVolume,
      uniqueInputTokens: statistics.tokenStats.uniqueInputTokens,
      uniqueOutputTokens: statistics.tokenStats.uniqueOutputTokens
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  const tokenStats = getTokenStats();
  const pairStats = getPairStats();
  const summaryStats = getSummaryStats();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Dashboard Overview</h2>
        
        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-center">Date Range</h2>
          
          {/* Quick Selection Buttons */}
          <div className="flex gap-3 justify-center mb-4">
            <button
              onClick={() => {
                if (dataRange) {
                  const endDate = new Date(dataRange.max);
                  const startDate = new Date(endDate);
                  startDate.setDate(endDate.getDate() - 30);
                  setStartDate(format(startDate, 'yyyy-MM-dd'));
                  setEndDate(format(endDate, 'yyyy-MM-dd'));
                }
              }}
              className="px-4 py-2 bg-gray-200 text-black font-semibold rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border border-gray-400"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => {
                if (dataRange) {
                  const endDate = new Date(dataRange.max);
                  const startDate = new Date(endDate);
                  startDate.setDate(endDate.getDate() - 90);
                  setStartDate(format(startDate, 'yyyy-MM-dd'));
                  setEndDate(format(endDate, 'yyyy-MM-dd'));
                }
              }}
              className="px-4 py-2 bg-gray-200 text-black font-semibold rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors border border-gray-400"
            >
              Last 90 Days
            </button>
            <button
              onClick={() => {
                if (dataRange) {
                  setStartDate(format(dataRange.min, 'yyyy-MM-dd'));
                  setEndDate(format(dataRange.max, 'yyyy-MM-dd'));
                }
              }}
              className="px-4 py-2 bg-gray-200 text-black font-semibold rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors border border-gray-400"
            >
              All Data
            </button>
          </div>
          
          <div className="flex gap-4 items-center justify-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={dataRange ? format(dataRange.min, 'yyyy-MM-dd') : undefined}
                max={dataRange ? format(dataRange.max, 'yyyy-MM-dd') : undefined}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={dataRange ? format(dataRange.min, 'yyyy-MM-dd') : undefined}
                max={dataRange ? format(dataRange.max, 'yyyy-MM-dd') : undefined}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-sm text-gray-700 font-medium">
              Data available from {dataRange ? format(dataRange.min, 'MMM dd, yyyy') : ''} to {dataRange ? format(dataRange.max, 'MMM dd, yyyy') : ''}
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Transactions</h3>
            <p className="text-3xl font-bold text-blue-600">{summaryStats?.totalTransactions.toLocaleString() || '0'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unique Input Tokens</h3>
            <p className="text-3xl font-bold text-green-600">{summaryStats?.uniqueInputTokens.toLocaleString() || '0'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unique Output Tokens</h3>
            <p className="text-3xl font-bold text-purple-600">{summaryStats?.uniqueOutputTokens.toLocaleString() || '0'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Output Volume</h3>
            <p className="text-3xl font-bold text-orange-600">
              {summaryStats?.totalOutputVolume ? (
                <span 
                  className="cursor-help" 
                  title={formatVolume(summaryStats.totalOutputVolume).full}
                >
                  {formatVolume(summaryStats.totalOutputVolume).display}
                </span>
              ) : '0'}
            </p>
          </div>
        </div>



        {/* Token Popularity */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-center">Most Popular Tokens</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Token Address</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Transaction Count</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Output Volume</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tokenStats.map((token, index) => {
                  const volumeInfo = formatVolume(token.totalVolume);
                  return (
                    <tr key={token.token}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="font-semibold">{getTokenName(token.token)}</div>
                        <div className="text-xs text-gray-500 font-mono">{token.token}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{token.count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span 
                          className="cursor-help" 
                          title={volumeInfo.full}
                        >
                          {volumeInfo.display} {getTokenName(token.token)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Token Pairs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-center">Most Popular Token Pairs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Token Pair</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Transaction Count</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Output Token Volume</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pairStats.map((pair, index) => {
                  const volumeInfo = formatVolume(pair.totalOutputVolume);
                  const inputSymbol = getTokenName(pair.inputToken);
                  const outputSymbol = getTokenName(pair.outputToken);
                  return (
                    <tr key={pair.pair}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="font-semibold">{inputSymbol} → {outputSymbol}</div>
                        <div className="text-xs text-gray-500 font-mono">{pair.inputToken} → {pair.outputToken}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{pair.count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span 
                          className="cursor-help" 
                          title={volumeInfo.full}
                        >
                          {volumeInfo.display} {outputSymbol}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Navigation />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<FileUpload />} />
        <Route path="/transactions" element={<TransactionsTable />} />
      </Routes>
    </Router>
  );
};

export default App;
