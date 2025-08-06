import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

import { format, fromUnixTime, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { getTokenName, getTokenDecimals, formatVolume } from './utils';
import TransactionsTable from './TransactionsTable';
import apiService from './services/api';
import { Transaction } from './types/Transaction';
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
  const [data, setData] = useState<Transaction[]>([]);
  const [filteredData, setFilteredData] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dataRange, setDataRange] = useState<{ min: Date; max: Date } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');


  // Load data from MongoDB
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Load all transactions from API
        const transactions = await apiService.getAllTransactions();
        
        if (transactions.length === 0) {
          setError('No data found in database. Please run the CSV import script first.');
          setLoading(false);
          return;
        }
        
        // Get date range from API
        const dateRange = await apiService.getDateRange();
        
        if (!dateRange) {
          setError('No valid date range found in data');
          setLoading(false);
          return;
        }
        
        setData(transactions);
        setDataRange(dateRange);
        setStartDate(format(dateRange.min, 'yyyy-MM-dd'));
        setEndDate(format(dateRange.max, 'yyyy-MM-dd'));
        setLoading(false);
        
      } catch (err) {
        console.error('API error:', err);
        setError(`Error loading data from API: ${err}`);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter data based on date range
  useEffect(() => {
    if (!data.length || !startDate || !endDate) {
      setFilteredData(data);
      return;
    }

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    const filtered = data.filter(transaction => {
      const transactionDate = fromUnixTime(parseInt(transaction.decayStartTime));
      return isWithinInterval(transactionDate, { start, end });
    });

    setFilteredData(filtered);
  }, [data, startDate, endDate]);



  // Calculate token popularity
  const getTokenStats = (): TokenStats[] => {
    const tokenMap = new Map<string, { token: string; count: number; totalVolume: number }>();

    filteredData.forEach(transaction => {
      const inputToken = transaction.inputTokenAddress;
      const outputToken = transaction.outputTokenAddress;
      
      // Use correct decimal places for each token
      const outputDecimals = getTokenDecimals(outputToken);
      const outputVolume = parseFloat(transaction.outputTokenAmountOverride) / Math.pow(10, outputDecimals);

      // Count input tokens (but don't add their volume)
      if (tokenMap.has(inputToken)) {
        const existing = tokenMap.get(inputToken)!;
        existing.count++;
        // Don't add input volume to totalVolume
      } else {
        tokenMap.set(inputToken, {
          token: inputToken,
          count: 1,
          totalVolume: 0 // Input tokens start with 0 volume
        });
      }

      // Count output tokens and add their volume
      if (tokenMap.has(outputToken)) {
        const existing = tokenMap.get(outputToken)!;
        existing.count++;
        existing.totalVolume += outputVolume;
      } else {
        tokenMap.set(outputToken, {
          token: outputToken,
          count: 1,
          totalVolume: outputVolume
        });
      }
    });

    return Array.from(tokenMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 tokens
  };

  // Calculate pair popularity
  const getPairStats = (): PairStats[] => {
    const pairMap = new Map<string, { 
      pair: string; 
      inputToken: string; 
      outputToken: string; 
      count: number; 
      totalOutputVolume: number 
    }>();

    filteredData.forEach(transaction => {
      const inputToken = transaction.inputTokenAddress;
      const outputToken = transaction.outputTokenAddress;
      const pair = `${inputToken} → ${outputToken}`;
      
      // Use correct decimal places for output token
      const outputDecimals = getTokenDecimals(outputToken);
      const outputVolume = parseFloat(transaction.outputTokenAmountOverride) / Math.pow(10, outputDecimals);

      if (pairMap.has(pair)) {
        const existing = pairMap.get(pair)!;
        existing.count++;
        existing.totalOutputVolume += outputVolume;
      } else {
        pairMap.set(pair, {
          pair,
          inputToken,
          outputToken,
          count: 1,
          totalOutputVolume: outputVolume
        });
      }
    });

    return Array.from(pairMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 pairs
  };

  // Get summary statistics
  const getSummaryStats = () => {
    const totalTransactions = filteredData.length;
    const uniqueTransactions = new Set(filteredData.map(t => t.transactionHash)).size;
    
    // Count input tokens
    const inputTokenCounts = new Map<string, number>();
    filteredData.forEach(transaction => {
      const inputToken = transaction.inputTokenAddress;
      inputTokenCounts.set(inputToken, (inputTokenCounts.get(inputToken) || 0) + 1);
    });
    
    // Count output tokens
    const outputTokenCounts = new Map<string, number>();
    filteredData.forEach(transaction => {
      const outputToken = transaction.outputTokenAddress;
      outputTokenCounts.set(outputToken, (outputTokenCounts.get(outputToken) || 0) + 1);
    });
    
    // Count token pairs
    const pairCounts = new Map<string, number>();
    filteredData.forEach(transaction => {
      const inputSymbol = getTokenName(transaction.inputTokenAddress);
      const outputSymbol = getTokenName(transaction.outputTokenAddress);
      const pair = `${inputSymbol} → ${outputSymbol}`;
      pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
    });
    
    // Find most frequent
    const mostSeenInputToken = Array.from(inputTokenCounts.entries())
      .sort((a, b) => b[1] - a[1])[0] || ['None', 0];
    
    const mostSeenOutputToken = Array.from(outputTokenCounts.entries())
      .sort((a, b) => b[1] - a[1])[0] || ['None', 0];
    
    const mostSeenPair = Array.from(pairCounts.entries())
      .sort((a, b) => b[1] - a[1])[0] || ['None', 0];

    return {
      totalTransactions,
      uniqueTransactions,
      mostSeenInputToken: { token: mostSeenInputToken[0], count: mostSeenInputToken[1] },
      mostSeenOutputToken: { token: mostSeenOutputToken[0], count: mostSeenOutputToken[1] },
      mostSeenPair: { pair: mostSeenPair[0], count: mostSeenPair[1] }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Transactions</h3>
            <p className="text-3xl font-bold text-blue-600">{summaryStats.totalTransactions.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unique Transactions</h3>
            <p className="text-3xl font-bold text-green-600">{summaryStats.uniqueTransactions.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Most Seen Input Token</h3>
            <p className="text-lg font-bold text-purple-600">{getTokenName(summaryStats.mostSeenInputToken.token)}</p>
            <p className="text-sm text-gray-500">{summaryStats.mostSeenInputToken.count} times</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Most Seen Output Token</h3>
            <p className="text-lg font-bold text-orange-600">{getTokenName(summaryStats.mostSeenOutputToken.token)}</p>
            <p className="text-sm text-gray-500">{summaryStats.mostSeenOutputToken.count} times</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Most Seen Pair</h3>
            <p className="text-lg font-bold text-indigo-600">{summaryStats.mostSeenPair.pair}</p>
            <p className="text-sm text-gray-500">{summaryStats.mostSeenPair.count} times</p>
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
        <Route path="/transactions" element={<TransactionsTable />} />
      </Routes>
    </Router>
  );
};

export default App;
