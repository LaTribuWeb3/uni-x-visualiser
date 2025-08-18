import React, { useState, useEffect } from 'react';

import { format, fromUnixTime, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { getTokenName, getTokenDecimals, formatVolume, truncateAddress } from './utils';
import apiService from './services/api';
import type { Transaction } from './types/Transaction';

interface SortConfig {
  key: keyof Transaction | 'formattedDate' | 'inputVolume' | 'outputVolume';
  direction: 'asc' | 'desc';
}

const TransactionsTable: React.FC = () => {
  const [data, setData] = useState<Transaction[]>([]);
  const [filteredData, setFilteredData] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dataRange, setDataRange] = useState<{ min: Date; max: Date } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'decayStartTime', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [selectedInputToken, setSelectedInputToken] = useState<string>('all');
  const [selectedOutputToken, setSelectedOutputToken] = useState<string>('all');
  const [inputSearchValue, setInputSearchValue] = useState<string>('');
  const [outputSearchValue, setOutputSearchValue] = useState<string>('');
  const [showInputSuggestions, setShowInputSuggestions] = useState<boolean>(false);
  const [showOutputSuggestions, setShowOutputSuggestions] = useState<boolean>(false);


  // Load metadata and initial display data efficiently
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('🔄 Loading metadata and initial display data...');
        
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
        
        // Load initial display data
        await loadDisplayData();
        
        setLoading(false);
        
      } catch (err) {
        console.error('API error:', err);
        setError(`Error loading data from API: ${err}`);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load display data with current filters and pagination
  const loadDisplayData = async () => {
    try {
      const result = await apiService.getDisplayData({
        page: currentPage,
        limit: itemsPerPage,
        startDate,
        endDate,
        inputTokenAddress: selectedInputToken,
        outputTokenAddress: selectedOutputToken,
        sortBy: sortConfig.key === 'decayStartTime' ? 'decayStartTimeTimestamp' : String(sortConfig.key),
        sortOrder: sortConfig.direction
      });
      
      setData(result.transactions);
    } catch (err) {
      console.error('Error loading display data:', err);
      setError(`Error loading display data: ${err}`);
    }
  };

  // Reload display data when filters or pagination change
  useEffect(() => {
    if (!loading) {
      loadDisplayData();
    }
  }, [currentPage, startDate, endDate, selectedInputToken, selectedOutputToken, sortConfig]);


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
      
      setFilteredData(filtered);
      setCurrentPage(1);
      return;
    }

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    let filtered = data.filter(transaction => {
      const transactionDate = fromUnixTime(transaction.decayStartTime);
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

    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [data, startDate, endDate, selectedInputToken, selectedOutputToken]);

  // Sorting function
  const sortData = (data: Transaction[]) => {
    return [...data].sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortConfig.key) {
        case 'formattedDate':
          aValue = fromUnixTime(a.decayStartTime);
          bValue = fromUnixTime(b.decayStartTime);
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
          aValue = (a[sortConfig.key] as string | number | Date) ?? '';
          bValue = (b[sortConfig.key] as string | number | Date) ?? '';
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
      <div className="max-w-7xl mx-auto px-4">
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
              Showing {filteredData.length.toLocaleString()} of {data.length.toLocaleString()} transactions
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
                Clear Filters
              </button>
            </div>
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Order Hash
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Transaction Hash
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
                  const transactionDate = fromUnixTime(transaction.decayStartTime);

                  return (
                    <tr key={`${transaction.orderHash}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(transactionDate, 'MMM dd, yyyy HH:mm:ss')}
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
                        <button
                          onClick={() => copyToClipboard(transaction.transactionHash)}
                          className="hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                          title="Click to copy full transaction hash"
                        >
                          {transaction.transactionHash.substring(0, 10)}...
                        </button>
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