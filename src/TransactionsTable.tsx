import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { format, fromUnixTime, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { getTokenName, getTokenDecimals, formatVolume } from './utils';

interface Transaction {
  decayStartTime: string;
  inputTokenAddress: string;
  inputStartAmount: string;
  outputTokenAddress: string;
  outputTokenAmountOverride: string;
  orderHash: string;
  transactionHash: string;
}

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

  // Load and parse CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Try to load from GitHub first, then fall back to local file
        const githubUrl = 'https://raw.githubusercontent.com/LaTribuWeb3/uni-x-visualiser/refs/heads/main/src/assets/order_summary_2025-08-04T14-13-09-803Z.csv?token=GHSAT0AAAAAADD6DMSCLIADOOTAVHI3Z4A62ER3TZQ';
        const localUrl = '/src/assets/order_summary_2025-08-04T14-13-09-803Z.csv';
        
        let response;
        try {
          // Try GitHub first
          response = await fetch(githubUrl);
          if (!response.ok) {
            throw new Error(`GitHub fetch failed: ${response.status}`);
          }
        } catch (githubError) {
          console.log('GitHub fetch failed, trying local file:', githubError);
          // Fall back to local file
          response = await fetch(localUrl);
        }
        
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
              
              // Convert timestamps to dates and find range
              let minTimestamp = Infinity;
              let maxTimestamp = -Infinity;
              
              transactions.forEach(transaction => {
                const timestamp = parseInt(transaction.decayStartTime);
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
    setCurrentPage(1); // Reset to first page when filtering
  }, [data, startDate, endDate]);

  // Sorting function
  const sortData = (data: Transaction[]) => {
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'formattedDate':
          aValue = fromUnixTime(parseInt(a.decayStartTime));
          bValue = fromUnixTime(parseInt(b.decayStartTime));
          break;
        case 'inputVolume':
          const inputDecimalsA = getTokenDecimals(a.inputTokenAddress);
          const inputDecimalsB = getTokenDecimals(b.inputTokenAddress);
          aValue = parseFloat(a.inputStartAmount) / Math.pow(10, inputDecimalsA);
          bValue = parseFloat(b.inputStartAmount) / Math.pow(10, inputDecimalsB);
          break;
        case 'outputVolume':
          const outputDecimalsA = getTokenDecimals(a.outputTokenAddress);
          const outputDecimalsB = getTokenDecimals(b.outputTokenAddress);
          aValue = parseFloat(a.outputTokenAmountOverride) / Math.pow(10, outputDecimalsA);
          bValue = parseFloat(b.outputTokenAmountOverride) / Math.pow(10, outputDecimalsB);
          break;
        default:
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
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
                  const transactionDate = fromUnixTime(parseInt(transaction.decayStartTime));

                  return (
                    <tr key={`${transaction.orderHash}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(transactionDate, 'MMM dd, yyyy HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="font-semibold">{getTokenName(transaction.inputTokenAddress)}</div>
                        <div className="text-xs text-gray-500 font-mono">{transaction.inputTokenAddress}</div>
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
                        <div className="text-xs text-gray-500 font-mono">{transaction.outputTokenAddress}</div>
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
                        {transaction.orderHash.substring(0, 10)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {transaction.transactionHash.substring(0, 10)}...
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