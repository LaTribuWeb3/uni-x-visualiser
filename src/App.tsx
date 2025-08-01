import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { format, fromUnixTime, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { getTokenName, getTokenDecimals, formatVolume } from './utils';
import './App.css';

interface Transaction {
  createdAt: string;
  inputToken: string;
  inputStartAmount: string;
  inputEndAmount: string;
  outputToken: string;
  outputStartAmount: string;
  outputEndAmount: string;
  swapper: string;
}



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
  totalInputVolume: number;
}

const App: React.FC = () => {
  const [data, setData] = useState<Transaction[]>([]);
  const [filteredData, setFilteredData] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dataRange, setDataRange] = useState<{ min: Date; max: Date } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [useFullDataset, setUseFullDataset] = useState(false);

  // Load and parse CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Use sample data by default, full dataset as option
        const filename = useFullDataset ? 'simplified_orders.csv' : 'sample_orders.csv';
        const response = await fetch(`/src/assets/${filename}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const transactions = results.data as Transaction[];
              
              if (transactions.length === 0) {
                setError('No data found in CSV file');
                setLoading(false);
                return;
              }
              
              // Convert timestamps to dates and find range more efficiently
              let minTimestamp = Infinity;
              let maxTimestamp = -Infinity;
              
              transactions.forEach(transaction => {
                const timestamp = parseInt(transaction.createdAt);
                if (!isNaN(timestamp)) {
                  if (timestamp < minTimestamp) minTimestamp = timestamp;
                  if (timestamp > maxTimestamp) maxTimestamp = timestamp;
                }
              });
              
              if (minTimestamp === Infinity || maxTimestamp === -Infinity) {
                setError('No valid timestamps found in data');
                setLoading(false);
                return;
              }
              
              const minDate = fromUnixTime(minTimestamp);
              const maxDate = fromUnixTime(maxTimestamp);
              
              setData(transactions);
              setDataRange({ min: minDate, max: maxDate });
              setStartDate(format(minDate, 'yyyy-MM-dd'));
              setEndDate(format(maxDate, 'yyyy-MM-dd'));
              setLoading(false);
            } catch (parseError) {
              setError(`Error processing data: ${parseError}`);
              setLoading(false);
            }
          },
          error: (error: any) => {
            setError(`Error parsing CSV: ${error.message}`);
            setLoading(false);
          }
        });
      } catch (err) {
        setError(`Error loading CSV file: ${err}`);
        setLoading(false);
      }
    };

    loadData();
  }, [useFullDataset]);

  // Filter data based on date range
  useEffect(() => {
    if (!data.length || !startDate || !endDate) {
      setFilteredData(data);
      return;
    }

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    const filtered = data.filter(transaction => {
      const transactionDate = fromUnixTime(parseInt(transaction.createdAt));
      return isWithinInterval(transactionDate, { start, end });
    });

    setFilteredData(filtered);
  }, [data, startDate, endDate]);



  // Calculate token popularity
  const getTokenStats = (): TokenStats[] => {
    const tokenMap = new Map<string, { token: string; count: number; totalVolume: number }>();

    filteredData.forEach(transaction => {
      const inputToken = transaction.inputToken;
      const outputToken = transaction.outputToken;
      
      // Use correct decimal places for each token
      const inputDecimals = getTokenDecimals(inputToken);
      const inputVolume = parseFloat(transaction.inputStartAmount) / Math.pow(10, inputDecimals);

      // Count input tokens only
      if (tokenMap.has(inputToken)) {
        const existing = tokenMap.get(inputToken)!;
        existing.count++;
        existing.totalVolume += inputVolume;
      } else {
        tokenMap.set(inputToken, {
          token: inputToken,
          count: 1,
          totalVolume: inputVolume
        });
      }

      // Count output tokens (but don't add their volume)
      if (tokenMap.has(outputToken)) {
        const existing = tokenMap.get(outputToken)!;
        existing.count++;
        // Don't add output volume to totalVolume
      } else {
        tokenMap.set(outputToken, {
          token: outputToken,
          count: 1,
          totalVolume: 0 // Output tokens start with 0 volume
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
      totalInputVolume: number 
    }>();

    filteredData.forEach(transaction => {
      const inputToken = transaction.inputToken;
      const outputToken = transaction.outputToken;
      const pair = `${inputToken} → ${outputToken}`;
      
      // Use correct decimal places for input token
      const inputDecimals = getTokenDecimals(inputToken);
      const inputVolume = parseFloat(transaction.inputStartAmount) / Math.pow(10, inputDecimals);

      if (pairMap.has(pair)) {
        const existing = pairMap.get(pair)!;
        existing.count++;
        existing.totalInputVolume += inputVolume;
      } else {
        pairMap.set(pair, {
          pair,
          inputToken,
          outputToken,
          count: 1,
          totalInputVolume: inputVolume
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
    const uniqueSwappers = new Set(filteredData.map(t => t.swapper)).size;
    
    // Count input tokens
    const inputTokenCounts = new Map<string, number>();
    filteredData.forEach(transaction => {
      const inputToken = transaction.inputToken;
      inputTokenCounts.set(inputToken, (inputTokenCounts.get(inputToken) || 0) + 1);
    });
    
    // Count output tokens
    const outputTokenCounts = new Map<string, number>();
    filteredData.forEach(transaction => {
      const outputToken = transaction.outputToken;
      outputTokenCounts.set(outputToken, (outputTokenCounts.get(outputToken) || 0) + 1);
    });
    
    // Count token pairs
    const pairCounts = new Map<string, number>();
    filteredData.forEach(transaction => {
      const inputSymbol = getTokenName(transaction.inputToken);
      const outputSymbol = getTokenName(transaction.outputToken);
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
      uniqueSwappers,
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Uni-X Transaction Visualizer</h1>
        
        {/* Dataset Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-center">Dataset Selection</h2>
          <div className="flex gap-4 items-center justify-center">
            <label className="flex items-center">
              <input
                type="radio"
                checked={!useFullDataset}
                onChange={() => setUseFullDataset(false)}
                className="mr-2"
              />
              Sample Dataset (1,000 records)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={useFullDataset}
                onChange={() => setUseFullDataset(true)}
                className="mr-2"
              />
              Full Dataset (All records)
            </label>
          </div>
          <p className="text-sm text-gray-700 mt-2 text-center font-medium">
            {useFullDataset ? 
              'Warning: Full dataset may take longer to load and process.' : 
              'Using sample dataset for faster testing. Switch to full dataset for complete analysis.'
            }
          </p>
        </div>
        
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
              className="px-4 py-2 bg-blue-500 text-black font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
              className="px-4 py-2 bg-green-500 text-black font-semibold rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
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
              className="px-4 py-2 bg-gray-500 text-black font-semibold rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unique Swappers</h3>
            <p className="text-3xl font-bold text-green-600">{summaryStats.uniqueSwappers.toLocaleString()}</p>
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Input Volume</th>
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Input Token Volume</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pairStats.map((pair, index) => {
                  const volumeInfo = formatVolume(pair.totalInputVolume);
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
                          {volumeInfo.display} {inputSymbol}
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

export default App;
