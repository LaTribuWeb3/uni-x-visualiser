import React, { useState, useEffect } from 'react';

import { format, fromUnixTime, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { getTokenName, getTokenDecimals, formatVolume, truncateAddress } from './utils';
import { useData } from './DataContext';

interface Transaction {
  _id: string;
  decayStartTime: string;
  inputTokenAddress: string;
  inputStartAmount: string;
  outputTokenAddress: string;
  outputTokenAmountOverride: string;
  orderHash: string;
  transactionHash: string;
  openPrice?: string;
  closePrice?: string;
  filler?: string;
  quoteId?: string;
  requestId?: string;
}

interface SortConfig {
  key: keyof Transaction | 'formattedDate' | 'inputVolume' | 'outputVolume';
  direction: 'asc' | 'desc';
}

const TransactionsTable: React.FC = () => {
  const { data, dataRange, loading, error } = useData();
  const [filteredData, setFilteredData] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'decayStartTime', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [selectedInputToken, setSelectedInputToken] = useState<string>('all');
  const [selectedOutputToken, setSelectedOutputToken] = useState<string>('all');
  const [inputSearchValue, setInputSearchValue] = useState<string>('');
  const [outputSearchValue, setOutputSearchValue] = useState<string>('');
  const [showInputSuggestions, setShowInputSuggestions] = useState<boolean>(false);
  const [showOutputSuggestions, setShowOutputSuggestions] = useState<boolean>(false);
  const [transactionHashFilter, setTransactionHashFilter] = useState<string>('');
  const [orderHashFilter, setOrderHashFilter] = useState<string>('');
  const [fillerFilter, setFillerFilter] = useState<string>('');
  const [requestIdFilter, setRequestIdFilter] = useState<string>('');

  // Initialize date range when data is loaded
  useEffect(() => {
    if (dataRange && data.length > 0) {
      setStartDate(format(dataRange.min, 'yyyy-MM-dd'));
      setEndDate(format(dataRange.max, 'yyyy-MM-dd'));
    }
    
    // Debug: Log the first transaction to see what fields are available
    if (data.length > 0) {
      console.log('First transaction fields:', Object.keys(data[0]));
      console.log('First transaction data:', data[0]);
    }
  }, [dataRange, data]);



  // Get unique tokens for filtering
  const getUniqueTokens = () => {
    const inputTokens = new Set<string>();
    const outputTokens = new Set<string>();
    
    data.forEach(transaction => {
      inputTokens.add(transaction.inputTokenAddress);
      outputTokens.add(transaction.outputTokenAddress);
    });
    
    return {
      inputTokens: Array.from(inputTokens).sort(),
      outputTokens: Array.from(outputTokens).sort()
    };
  };

  // Get unique transaction counts
  const getUniqueTransactionCounts = () => {
    const uniqueOrderHashes = new Set<string>();
    const uniqueTransactionHashes = new Set<string>();
    
    data.forEach(transaction => {
      uniqueOrderHashes.add(transaction.orderHash);
      uniqueTransactionHashes.add(transaction.transactionHash);
    });
    
    return {
      uniqueOrders: uniqueOrderHashes.size,
      uniqueTransactions: uniqueTransactionHashes.size,
      totalRows: data.length
    };
  };

  // Get unique transaction counts for filtered data
  const getFilteredUniqueTransactionCounts = () => {
    const uniqueOrderHashes = new Set<string>();
    const uniqueTransactionHashes = new Set<string>();
    
    filteredData.forEach(transaction => {
      uniqueOrderHashes.add(transaction.orderHash);
      uniqueTransactionHashes.add(transaction.transactionHash);
    });
    
    return {
      uniqueOrders: uniqueOrderHashes.size,
      uniqueTransactions: uniqueTransactionHashes.size,
      totalRows: filteredData.length
    };
  };

  // Get filtered suggestions for autocomplete
  const getInputSuggestions = () => {
    if (!inputSearchValue.trim()) return [];
    
    const { inputTokens } = getUniqueTokens();
    return inputTokens
      .filter(token => 
        getTokenName(token).toLowerCase().includes(inputSearchValue.toLowerCase()) ||
        token.toLowerCase().includes(inputSearchValue.toLowerCase())
      )
      .slice(0, 8); // Limit to 8 suggestions
  };

  const getOutputSuggestions = () => {
    if (!outputSearchValue.trim()) return [];
    
    const { outputTokens } = getUniqueTokens();
    return outputTokens
      .filter(token => 
        getTokenName(token).toLowerCase().includes(outputSearchValue.toLowerCase()) ||
        token.toLowerCase().includes(outputSearchValue.toLowerCase())
      )
      .slice(0, 8); // Limit to 8 suggestions
  };

  // Handle token selection
  const handleInputTokenSelect = (tokenAddress: string) => {
    setSelectedInputToken(tokenAddress);
    setInputSearchValue(getTokenName(tokenAddress));
    setShowInputSuggestions(false);
  };

  const handleOutputTokenSelect = (tokenAddress: string) => {
    setSelectedOutputToken(tokenAddress);
    setOutputSearchValue(getTokenName(tokenAddress));
    setShowOutputSuggestions(false);
  };

  // Filter data based on date range and selected tokens
  useEffect(() => {
    if (!data.length || !startDate || !endDate) {
      let filtered = data;
      
      // Apply input token filter if not "all"
      if (selectedInputToken !== 'all') {
        filtered = filtered.filter(transaction => 
          transaction.inputTokenAddress === selectedInputToken
        );
      }
      
      // Apply output token filter if not "all"
      if (selectedOutputToken !== 'all') {
        filtered = filtered.filter(transaction => 
          transaction.outputTokenAddress === selectedOutputToken
        );
      }
      
      // Apply transaction hash filter if provided
      if (transactionHashFilter.trim()) {
        filtered = filtered.filter(transaction => 
          transaction.transactionHash.toLowerCase().includes(transactionHashFilter.toLowerCase())
        );
      }
      
      // Apply order hash filter if provided
      if (orderHashFilter.trim()) {
        filtered = filtered.filter(transaction => 
          transaction.orderHash.toLowerCase().includes(orderHashFilter.toLowerCase())
        );
      }

      // Apply filler filter if provided
      if (fillerFilter.trim()) {
        filtered = filtered.filter(transaction => 
          (transaction as any).filler && (transaction as any).filler.toLowerCase().includes(fillerFilter.toLowerCase())
        );
      }
      
      // Apply requestId filter if provided
      if (requestIdFilter.trim()) {
        filtered = filtered.filter(transaction => 
          transaction.requestId && transaction.requestId.toLowerCase().includes(requestIdFilter.toLowerCase())
        );
      }
      
      setFilteredData(filtered);
      setCurrentPage(1);
      return;
    }

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    let filtered = data.filter(transaction => {
      const transactionDate = fromUnixTime(parseInt(transaction.decayStartTime));
      return isWithinInterval(transactionDate, { start, end });
    });

    // Apply input token filter if not "all"
    if (selectedInputToken !== 'all') {
      filtered = filtered.filter(transaction => 
        transaction.inputTokenAddress === selectedInputToken
      );
    }
    
    // Apply output token filter if not "all"
    if (selectedOutputToken !== 'all') {
      filtered = filtered.filter(transaction => 
        transaction.outputTokenAddress === selectedOutputToken
      );
    }
    
    // Apply transaction hash filter if provided
    if (transactionHashFilter.trim()) {
      filtered = filtered.filter(transaction => 
        transaction.transactionHash.toLowerCase().includes(transactionHashFilter.toLowerCase())
      );
    }
    
    // Apply order hash filter if provided
    if (orderHashFilter.trim()) {
      filtered = filtered.filter(transaction => 
        transaction.orderHash.toLowerCase().includes(orderHashFilter.toLowerCase())
      );
    }

    // Apply filler filter if provided
    if (fillerFilter.trim()) {
      filtered = filtered.filter(transaction => 
        (transaction as any).filler && (transaction as any).filler.toLowerCase().includes(fillerFilter.toLowerCase())
      );
    }
    
    // Apply requestId filter if provided
    if (requestIdFilter.trim()) {
      filtered = filtered.filter(transaction => 
        transaction.requestId && transaction.requestId.toLowerCase().includes(requestIdFilter.trim().toLowerCase())
      );
    }

    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [data, startDate, endDate, selectedInputToken, selectedOutputToken, transactionHashFilter, orderHashFilter, fillerFilter, requestIdFilter]);

  // Sorting function
  const sortData = (data: Transaction[]) => {
    return [...data].sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortConfig.key) {
        case 'formattedDate':
          aValue = fromUnixTime(parseInt(a.decayStartTime));
          bValue = fromUnixTime(parseInt(b.decayStartTime));
          break;
        case 'inputVolume': {
          const inputDecimalsA = getTokenDecimals(a.inputTokenAddress);
          const inputDecimalsB = getTokenDecimals(b.inputTokenAddress);
          aValue = parseFloat(a.inputStartAmount) / Math.pow(10, inputDecimalsA);
          bValue = parseFloat(b.inputStartAmount) / Math.pow(10, inputDecimalsB);
          break;
        }
        case 'outputVolume': {
          const outputDecimalsA = getTokenDecimals(a.outputTokenAddress);
          const outputDecimalsB = getTokenDecimals(b.outputTokenAddress);
          aValue = parseFloat(a.outputTokenAmountOverride) / Math.pow(10, outputDecimalsA);
          bValue = parseFloat(b.outputTokenAmountOverride) / Math.pow(10, outputDecimalsB);
          break;
        }
        default:
          // Type guard to ensure we only access valid Transaction properties
          if (sortConfig.key in a && sortConfig.key in b) {
            const aProp = a[sortConfig.key as keyof Transaction];
            const bProp = b[sortConfig.key as keyof Transaction];
            aValue = aProp ?? '';
            bValue = bProp ?? '';
          } else {
            // Fallback for invalid keys
            aValue = '';
            bValue = '';
          }
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if desired
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Calculate total input volume for filtered transactions
  const getTotalInputVolume = () => {
    if (selectedInputToken === 'all') return null;
    
    const volumes = filteredData.map(transaction => {
      const inputDecimals = getTokenDecimals(transaction.inputTokenAddress);
      return parseFloat(transaction.inputStartAmount) / Math.pow(10, inputDecimals);
    });
    
    const totalVolume = volumes.reduce((total, volume) => total + volume, 0);
    const meanVolume = totalVolume / volumes.length;
    
    // Calculate median
    const sortedVolumes = [...volumes].sort((a, b) => a - b);
    const medianVolume = sortedVolumes.length % 2 === 0
      ? (sortedVolumes[sortedVolumes.length / 2 - 1] + sortedVolumes[sortedVolumes.length / 2]) / 2
      : sortedVolumes[Math.floor(sortedVolumes.length / 2)];
    
    const totalVolumeInfo = formatVolume(totalVolume);
    const meanVolumeInfo = formatVolume(meanVolume);
    const medianVolumeInfo = formatVolume(medianVolume);
    
    return {
      volume: totalVolume,
      display: totalVolumeInfo.display,
      full: totalVolumeInfo.full,
      mean: meanVolume,
      meanDisplay: meanVolumeInfo.display,
      meanFull: meanVolumeInfo.full,
      median: medianVolume,
      medianDisplay: medianVolumeInfo.display,
      medianFull: medianVolumeInfo.full,
      tokenName: getTokenName(selectedInputToken),
      count: volumes.length
    };
  };

  // Calculate total input volume for current page only
  const getCurrentPageInputVolume = () => {
    if (selectedInputToken === 'all') return null;
    
    const currentPageVolumes = paginatedData.map(transaction => {
      const inputDecimals = getTokenDecimals(transaction.inputTokenAddress);
      return parseFloat(transaction.inputStartAmount) / Math.pow(10, inputDecimals);
    });
    
    const totalVolume = currentPageVolumes.reduce((total, volume) => total + volume, 0);
    const volumeInfo = formatVolume(totalVolume);
    
    return {
      volume: totalVolume,
      display: volumeInfo.display,
      full: volumeInfo.full,
      tokenName: getTokenName(selectedInputToken)
    };
  };

  const sortedData = sortData(filteredData);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-none mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Transactions Table</h1>
        
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
              {(() => {
                const totalCounts = getUniqueTransactionCounts();
                const filteredCounts = getFilteredUniqueTransactionCounts();
                const hasDuplicates = totalCounts.totalRows !== totalCounts.uniqueOrders;
                
                return (
                  <div>
                    <div>
                      Showing {filteredCounts.totalRows.toLocaleString()} of {totalCounts.totalRows.toLocaleString()} transaction rows
                      {hasDuplicates && (
                        <span className="text-orange-600 font-semibold ml-2">
                          ({filteredCounts.uniqueOrders.toLocaleString()} unique orders)
                        </span>
                      )}
                    </div>
                    {hasDuplicates && (
                      <div className="text-xs text-gray-500 mt-1">
                        Dataset contains {totalCounts.totalRows - totalCounts.uniqueOrders} duplicate order entries
                      </div>
                    )}
                    {(() => {
                      const totalVolume = getTotalInputVolume();
                      if (totalVolume) {
                        return (
                          <div className="mt-1 text-blue-600 font-semibold">
                            <div>
                              Total {totalVolume.tokenName}: {totalVolume.display}
                              <span className="text-xs text-gray-500 ml-1" title={totalVolume.full}>
                                (hover for exact value)
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Mean: {totalVolume.meanDisplay}
                              <span className="text-xs text-gray-500 ml-1" title={totalVolume.meanFull}>
                                (hover for exact value)
                              </span>
                              {' • '}
                              Median: {totalVolume.medianDisplay}
                              <span className="text-xs text-gray-500 ml-1" title={totalVolume.medianFull}>
                                (hover for exact value)
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                );
              })()}
            </div>
          </div>
          
          {/* Token Filters */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Filter by Tokens</label>
            <div className="flex justify-center items-center gap-2">
              <div className="relative">
                <label className="block text-xs text-gray-600 mb-1">Input Token</label>
                <input
                  type="text"
                  value={inputSearchValue}
                  onChange={(e) => {
                    setInputSearchValue(e.target.value);
                    setShowInputSuggestions(true);
                    if (e.target.value === '') {
                      setSelectedInputToken('all');
                    }
                  }}
                  onFocus={() => setShowInputSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowInputSuggestions(false), 200)}
                  placeholder="Search input token..."
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                />
                {showInputSuggestions && getInputSuggestions().length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {getInputSuggestions().map((token) => (
                      <div
                        key={token}
                        onClick={() => handleInputTokenSelect(token)}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                      >
                        <div className="font-medium">{getTokenName(token)}</div>
                        <div className="text-xs text-gray-500 font-mono">{token}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-gray-700 font-semibold mt-6">→</div>
              <div className="relative">
                <label className="block text-xs text-gray-600 mb-1">Output Token</label>
                <input
                  type="text"
                  value={outputSearchValue}
                  onChange={(e) => {
                    setOutputSearchValue(e.target.value);
                    setShowOutputSuggestions(true);
                    if (e.target.value === '') {
                      setSelectedOutputToken('all');
                    }
                  }}
                  onFocus={() => setShowOutputSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowOutputSuggestions(false), 200)}
                  placeholder="Search output token..."
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                />
                {showOutputSuggestions && getOutputSuggestions().length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {getOutputSuggestions().map((token) => (
                      <div
                        key={token}
                        onClick={() => handleOutputTokenSelect(token)}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                      >
                        <div className="font-medium">{getTokenName(token)}</div>
                        <div className="text-xs text-gray-500 font-mono">{token}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="text-center mt-2">
              <button
                onClick={() => {
                  setSelectedInputToken('all');
                  setSelectedOutputToken('all');
                  setInputSearchValue('');
                  setOutputSearchValue('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear Token Filters
              </button>
            </div>
          </div>

          {/* Hash Filters */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Filter by Hash, Filler & Request ID</label>
            <div className="flex justify-center items-center gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Transaction Hash</label>
                <input
                  type="text"
                  value={transactionHashFilter}
                  onChange={(e) => setTransactionHashFilter(e.target.value)}
                  placeholder="Enter transaction hash..."
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Order Hash</label>
                <input
                  type="text"
                  value={orderHashFilter}
                  onChange={(e) => setOrderHashFilter(e.target.value)}
                  placeholder="Enter order hash..."
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px]"
                />
              </div>
              <div>
                <label className="block text-xs text-xs text-gray-600 mb-1">Filler</label>
                <input
                  type="text"
                  value={fillerFilter}
                  onChange={(e) => setFillerFilter(e.target.value)}
                  placeholder="Enter filler value..."
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Request ID</label>
                <input
                  type="text"
                  value={requestIdFilter}
                  onChange={(e) => setRequestIdFilter(e.target.value)}
                  placeholder="Enter request ID..."
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                />
              </div>
            </div>
            <div className="text-center mt-2">
              <button
                onClick={() => {
                  setTransactionHashFilter('');
                  setOrderHashFilter('');
                  setFillerFilter('');
                  setRequestIdFilter('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear Hash & Filler Filters
              </button>
            </div>
          </div>

          {/* Clear All Filters */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                if (dataRange) {
                  setStartDate(format(dataRange.min, 'yyyy-MM-dd'));
                  setEndDate(format(dataRange.max, 'yyyy-MM-dd'));
                }
                setSelectedInputToken('all');
                setSelectedOutputToken('all');
                setInputSearchValue('');
                setOutputSearchValue('');
                setTransactionHashFilter('');
                setOrderHashFilter('');
                setFillerFilter('');
                setRequestIdFilter('');
              }}
              className="px-4 py-2 bg-red-100 text-red-700 font-semibold rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors border border-red-300"
            >
              Clear All Filters
            </button>
          </div>

          {/* Cache Clear Button */}
          <div className="mt-4 text-center">
            <button
              onClick={async () => {
                try {
                  const response = await fetch('https://mm.la-tribu.xyz/api/cache/clear', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  });
                  
                  if (response.ok) {
                    const result = await response.json();
                    alert(`Cache cleared successfully! ${result.message}`);
                  } else {
                    alert('Failed to clear cache. Please try again.');
                  }
                } catch (error) {
                  console.error('Error clearing cache:', error);
                  alert('Error clearing cache. Please check the console for details.');
                }
              }}
              disabled={loading}
              className="px-4 py-2 bg-orange-100 text-orange-700 font-semibold rounded-md hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors border border-orange-300"
              title="Clear API cache"
            >
              Clear Cache
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('formattedDate')}
                  >
                    Date/Time
                    {sortConfig.key === 'formattedDate' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('inputTokenAddress')}
                  >
                    Input Token
                    {sortConfig.key === 'inputTokenAddress' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('inputVolume')}
                  >
                    Input Amount
                    {sortConfig.key === 'inputVolume' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('outputTokenAddress')}
                  >
                    Output Token
                    {sortConfig.key === 'outputTokenAddress' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('outputVolume')}
                  >
                    Output Amount
                    {sortConfig.key === 'outputVolume' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    title="1 tokenIn = x tokenOut"
                  >
                    Price
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('filler')}
                  >
                    Filler
                    {sortConfig.key === 'filler' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Order Hash
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Transaction Hash
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('requestId')}
                  >
                    Request ID
                    {sortConfig.key === 'requestId' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((transaction, index) => {
                  const inputDecimals = getTokenDecimals(transaction.inputTokenAddress);
                  const outputDecimals = getTokenDecimals(transaction.outputTokenAddress);
                  const inputVolume = parseFloat(transaction.inputStartAmount) / Math.pow(10, inputDecimals);
                  const outputVolume = parseFloat(transaction.outputTokenAmountOverride) / Math.pow(10, outputDecimals);
                  const inputVolumeInfo = formatVolume(inputVolume);
                  const outputVolumeInfo = formatVolume(outputVolume);
                  const transactionDate = fromUnixTime(parseInt(transaction.decayStartTime));

                  return (
                    <tr key={`${transaction.orderHash}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const now = new Date();
                          const diffInMinutes = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60));
                          
                          if (diffInMinutes < 60) {
                            return (
                              <span 
                                className="text-blue-600 font-medium cursor-help" 
                                title={format(transactionDate, 'MMM dd, yyyy HH:mm:ss')}
                              >
                                {diffInMinutes === 0 ? 'Just now' : `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`}
                              </span>
                            );
                          } else {
                            return format(transactionDate, 'MMM dd, yyyy HH:mm:ss');
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="font-semibold">{getTokenName(transaction.inputTokenAddress)}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          <button
                            onClick={() => copyToClipboard(transaction.inputTokenAddress)}
                            className="hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                            title="Click to copy full address"
                          >
                            {truncateAddress(transaction.inputTokenAddress)}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span 
                          className="cursor-help" 
                          title={inputVolumeInfo.full}
                        >
                          {inputVolumeInfo.display} {getTokenName(transaction.inputTokenAddress)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="font-semibold">{getTokenName(transaction.outputTokenAddress)}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          <button
                            onClick={() => copyToClipboard(transaction.outputTokenAddress)}
                            className="hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                            title="Click to copy full address"
                          >
                            {truncateAddress(transaction.outputTokenAddress)}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span 
                          className="cursor-help" 
                          title={outputVolumeInfo.full}
                        >
                          {outputVolumeInfo.display} {getTokenName(transaction.outputTokenAddress)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {transaction.openPrice ? (
                          <span 
                            className="font-medium text-gray-900 cursor-help" 
                            title={`1 ${getTokenName(transaction.inputTokenAddress)} = ${parseFloat(transaction.openPrice).toFixed(6)} ${getTokenName(transaction.outputTokenAddress)}`}
                          >
                            {parseFloat(transaction.openPrice).toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {(transaction as any).filler ? (
                          <button
                            onClick={() => (transaction as any).filler && copyToClipboard((transaction as any).filler)}
                            className="hover:text-blue-600 hover:underline cursor-pointer transition-colors text-left w-full"
                            title="Click to copy full filler value"
                          >
                            <span className="font-medium text-gray-900">
                              {(transaction as any).filler.length > 20 
                                ? `${(transaction as any).filler.substring(0, 20)}...` 
                                : (transaction as any).filler}
                            </span>
                          </button>
                        ) : (
                          <span className="text-gray-400 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        <button
                          onClick={() => copyToClipboard(transaction.orderHash)}
                          className="hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                          title="Click to copy full order hash"
                        >
                          {transaction.orderHash.substring(0, 10)}...
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        <a
                          href={`https://etherscan.io/tx/${transaction.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                          title="Click to view on Etherscan"
                        >
                          {transaction.transactionHash.substring(0, 10)}...
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {transaction.requestId ? (
                          <button
                            onClick={() => transaction.requestId && copyToClipboard(transaction.requestId)}
                            className="hover:text-blue-600 hover:underline cursor-pointer transition-colors text-left w-full"
                            title="Click to copy full request ID"
                          >
                            <span className="font-medium text-gray-900">
                              {transaction.requestId.length > 20 
                                ? `${transaction.requestId.substring(0, 20)}...` 
                                : transaction.requestId}
                            </span>
                          </button>
                        ) : (
                          <span className="text-gray-400 italic">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-400 text-sm font-medium rounded-md text-black bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-400 text-sm font-medium rounded-md text-black bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, sortedData.length)}
                    </span>{' '}
                    of <span className="font-medium">{sortedData.length}</span> results
                    {(() => {
                      const currentPageVolume = getCurrentPageInputVolume();
                      if (currentPageVolume) {
                        return (
                          <span className="ml-2 text-blue-600 font-semibold">
                            • Page {currentPageVolume.tokenName}: {currentPageVolume.display}
                            <span className="text-xs text-gray-500 ml-1" title={currentPageVolume.full}>
                              (hover for exact value)
                            </span>
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-400 bg-gray-200 text-sm font-medium text-black hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-gray-400 border-gray-500 text-black'
                              : 'bg-gray-200 border-gray-400 text-black hover:bg-gray-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-400 bg-gray-200 text-sm font-medium text-black hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>


      </div>
    </div>
  );
};

export default TransactionsTable; 