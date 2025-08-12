import React, { useState, useEffect } from 'react';
import { getTokenName, getTokenDecimals, truncateAddress } from './utils';

interface Quote {
  _id: string;
  amount: string | number;
  processedAt: string;
  tokenIn: string;
  tokenOut: string;
}

interface QuotesResponse {
  success: boolean;
  count: number;
  data: Quote[];
}

const QuotesTable: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [idFilter, setIdFilter] = useState<string>('');
  const [idFilterDebounced, setIdFilterDebounced] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [selectedTokenIn, setSelectedTokenIn] = useState<string>('all');
  const [selectedTokenOut, setSelectedTokenOut] = useState<string>('all');
  const [tokenInSearchValue, setTokenInSearchValue] = useState<string>('');
  const [tokenOutSearchValue, setTokenOutSearchValue] = useState<string>('');
  const [showTokenInSuggestions, setShowTokenInSuggestions] = useState<boolean>(false);
  const [showTokenOutSuggestions, setShowTokenOutSuggestions] = useState<boolean>(false);
  const [isLoadingFullData, setIsLoadingFullData] = useState(false);
  const [hasFullData, setHasFullData] = useState(false);

  // Debounce ID filter for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setIdFilterDebounced(idFilter);
    }, 300);

    return () => clearTimeout(timer);
  }, [idFilter]);

  const loadQuotes = async (limit?: number) => {
    try {
      if (limit) {
        // Quick load with limited entries
        setLoading(true);
        setError('');
        
        const params = new URLSearchParams();
        if (selectedTokenIn !== 'all') {
          params.append('tokenIn', selectedTokenIn);
        }
        if (selectedTokenOut !== 'all') {
          params.append('tokenOut', selectedTokenOut);
        }
        params.append('limit', limit.toString());
        
        const url = `https://mm.la-tribu.xyz/api/solvxQuotes?${params.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jsonData: QuotesResponse = await response.json();
        
        if (!jsonData.success) {
          throw new Error('API returned unsuccessful response');
        }
        
        setQuotes(jsonData.data);
        setLoading(false);
        
        // If this was a quick load, start loading full data in background
        if (limit < 20000) {
          loadFullDataInBackground();
        }
      } else {
        // Full load (called by user clicking Fetch Data button)
        setIsLoadingFullData(true);
        setError('');
        
        const params = new URLSearchParams();
        if (selectedTokenIn !== 'all') {
          params.append('tokenIn', selectedTokenIn);
        }
        if (selectedTokenOut !== 'all') {
          params.append('tokenOut', selectedTokenOut);
        }
        params.append('limit', '20000');
        
        const url = `https://mm.la-tribu.xyz/api/solvxQuotes?${params.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jsonData: QuotesResponse = await response.json();
        
        if (!jsonData.success) {
          throw new Error('API returned unsuccessful response');
        }
        
        setQuotes(jsonData.data);
        setIsLoadingFullData(false);
        setHasFullData(true);
      }
    } catch (err) {
      setError(`Error loading quotes: ${err}`);
      setLoading(false);
      setIsLoadingFullData(false);
    }
  };

  const loadFullDataInBackground = async () => {
    try {
      setIsLoadingFullData(true);
      
      const params = new URLSearchParams();
      if (selectedTokenIn !== 'all') {
        params.append('tokenIn', selectedTokenIn);
      }
      if (selectedTokenOut !== 'all') {
        params.append('tokenOut', selectedTokenOut);
      }
      params.append('limit', '20000');
      
      const url = `https://mm.la-tribu.xyz/api/solvxQuotes?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const jsonData: QuotesResponse = await response.json();
      
      if (!jsonData.success) {
        throw new Error('API returned unsuccessful response');
      }
      
      setQuotes(jsonData.data);
      setIsLoadingFullData(false);
      setHasFullData(true);
    } catch (err) {
      console.error('Background data load failed:', err);
      setIsLoadingFullData(false);
      // Don't show error to user for background load
    }
  };

  // Load initial data on component mount (quick load first)
  useEffect(() => {
    loadQuotes(50); // Start with quick load of 50 entries
  }, []); // Only run once on mount

  // Filter quotes based on all filters (now working locally)
  const filteredQuotes = quotes.filter(quote => {
    // ID filter
    if (idFilterDebounced.trim() !== '' && !quote._id.toLowerCase().includes(idFilterDebounced.toLowerCase())) {
      return false;
    }
    
    // Token In filter
    if (selectedTokenIn !== 'all' && quote.tokenIn !== selectedTokenIn) {
      return false;
    }
    
    // Token Out filter
    if (selectedTokenOut !== 'all' && quote.tokenOut !== selectedTokenOut) {
      return false;
    }
    
    return true;
  });

  console.log(filteredQuotes)

  // Pagination logic
  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
  const paginatedQuotes = filteredQuotes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [idFilterDebounced, selectedTokenIn, selectedTokenOut]);

  // Get unique tokens for filtering
  const getUniqueTokens = () => {
    const tokenInTokens = new Set<string>();
    const tokenOutTokens = new Set<string>();
    
    quotes.forEach(quote => {
      tokenInTokens.add(quote.tokenIn);
      tokenOutTokens.add(quote.tokenOut);
    });
    
    return {
      tokenInTokens: Array.from(tokenInTokens).sort(),
      tokenOutTokens: Array.from(tokenOutTokens).sort()
    };
  };

  // Get filtered suggestions for autocomplete
  const getTokenInSuggestions = () => {
    if (!tokenInSearchValue.trim()) return [];
    
    const { tokenInTokens } = getUniqueTokens();
    return tokenInTokens
      .filter(token => 
        getTokenName(token).toLowerCase().includes(tokenInSearchValue.toLowerCase()) ||
        token.toLowerCase().includes(tokenInSearchValue.toLowerCase())
      )
      .slice(0, 8); // Limit to 8 suggestions
  };

  const getTokenOutSuggestions = () => {
    if (!tokenOutSearchValue.trim()) return [];
    
    const { tokenOutTokens } = getUniqueTokens();
    return tokenOutTokens
      .filter(token => 
        getTokenName(token).toLowerCase().includes(tokenOutSearchValue.toLowerCase()) ||
        token.toLowerCase().includes(tokenOutSearchValue.toLowerCase())
      )
      .slice(0, 8); // Limit to 8 suggestions
  };

  // Handle token selection
  const handleTokenInSelect = (tokenAddress: string) => {
    setSelectedTokenIn(tokenAddress);
    setTokenInSearchValue(getTokenName(tokenAddress));
    setShowTokenInSuggestions(false);
  };

  const handleTokenOutSelect = (tokenAddress: string) => {
    setSelectedTokenOut(tokenAddress);
    setTokenOutSearchValue(getTokenName(tokenAddress));
    setShowTokenOutSuggestions(false);
  };

  const formatAmount = (amount: string | number, tokenInAddress: string, tokenOutAddress: string): string => {
    const isNegative = parseFloat(amount.toString()) < 0;
    const decimals = isNegative ? getTokenDecimals(tokenOutAddress) : getTokenDecimals(tokenInAddress);
    const tokenSymbol = isNegative ? getTokenName(tokenOutAddress) : getTokenName(tokenInAddress);
    
    // If we don't have a name for the token, truncate the address
    const displayToken = tokenSymbol === tokenInAddress || tokenSymbol === tokenOutAddress 
      ? truncateAddress(isNegative ? tokenOutAddress : tokenInAddress)
      : tokenSymbol;
    
    // Check if token is WETH or USDC to skip normalization
    const isWETH = tokenSymbol === 'WETH' || tokenSymbol === 'USDC';
    
    if (typeof amount === 'string') {
      const num = parseFloat(amount);
      if (isNaN(num)) return amount;
      
      // Only normalize if not WETH or USDC
      const absAmount = isWETH ? Math.abs(num) : Math.abs(num) / Math.pow(10, decimals);
      
      if (absAmount >= 1e9) {
        return (absAmount / 1e9).toFixed(2) + 'B ' + displayToken;
      } else if (absAmount >= 1e6) {
        return (absAmount / 1e6).toFixed(2) + 'M ' + displayToken;
      } else if (absAmount >= 1e3) {
        return (absAmount / 1e3).toFixed(2) + 'K ' + displayToken;
      } else {
        return absAmount.toFixed(4) + ' ' + displayToken;
      }
    } else {
      // Only normalize if not WETH or USDC
      const absAmount = isWETH ? Math.abs(amount) : Math.abs(amount) / Math.pow(10, decimals);
      
      if (absAmount >= 1e9) {
        return (absAmount / 1e9).toFixed(2) + 'B ' + displayToken;
      } else if (absAmount >= 1e6) {
        return (absAmount / 1e6).toFixed(2) + 'M ' + displayToken;
      } else if (absAmount >= 1e3) {
        return (absAmount / 1e3).toFixed(2) + 'K ' + displayToken;
      } else {
        return absAmount.toFixed(4) + ' ' + displayToken;
      }
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return diffInMinutes === 0 ? 'Just now' : `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleString();
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading quotes...</div>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">SolvX Quotes</h1>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            
          {/* ID Filter */}
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Filter by ID</label>
              <input
                type="text"
                value={idFilter}
                onChange={(e) => setIdFilter(e.target.value)}
                placeholder="Search by quote ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {idFilter && (
                <button
                  onClick={() => setIdFilter('')}
                  className="mt-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:underline"
                >
                  Clear filter
                </button>
              )}
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
                  value={tokenInSearchValue}
                  onChange={(e) => {
                    setTokenInSearchValue(e.target.value);
                    setShowTokenInSuggestions(true);
                    if (e.target.value === '') {
                      setSelectedTokenIn('all');
                    }
                  }}
                  onFocus={() => setShowTokenInSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTokenInSuggestions(false), 200)}
                  placeholder="Search input token..."
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                />
                {showTokenInSuggestions && getTokenInSuggestions().length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {getTokenInSuggestions().map((token) => (
                      <div
                        key={token}
                        onClick={() => handleTokenInSelect(token)}
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
                  value={tokenOutSearchValue}
                  onChange={(e) => {
                    setTokenOutSearchValue(e.target.value);
                    setShowTokenOutSuggestions(true);
                    if (e.target.value === '') {
                      setSelectedTokenOut('all');
                    }
                  }}
                  onFocus={() => setShowTokenOutSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTokenOutSuggestions(false), 200)}
                  placeholder="Search output token..."
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                />
                {showTokenOutSuggestions && getTokenOutSuggestions().length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {getTokenOutSuggestions().map((token) => (
                      <div
                        key={token}
                        onClick={() => handleTokenOutSelect(token)}
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
                  setSelectedTokenIn('all');
                  setSelectedTokenOut('all');
                  setTokenInSearchValue('');
                  setTokenOutSearchValue('');
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:underline"
              >
                Clear token filters
              </button>
            </div>
          </div>

          {/* Fetch Data Button */}
          <div className="mt-6 text-center">
            <button
              onClick={() => loadQuotes()}
              disabled={isLoadingFullData}
              className={`px-6 py-3 rounded-md font-medium transition-colors border ${
                isLoadingFullData
                  ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 text-black border-blue-600 hover:bg-blue-600'
              }`}
              title="Fetch new data from API with current filters"
            >
              {isLoadingFullData ? '🔄 Fetching...' : '🔄 Fetch Data from API'}
            </button>
            <div className="text-xs text-gray-500 mt-2">
              {hasFullData ? (
                <span className="text-green-600">✓ Full dataset loaded ({quotes.length.toLocaleString()} quotes)</span>
              ) : isLoadingFullData ? (
                <span className="text-blue-600">Loading full dataset in background...</span>
              ) : (
                <span>Current filters will be applied when fetching new data</span>
              )}
            </div>
          </div>
        </div>

        {/* Quotes Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Background Loading Indicator */}
          {isLoadingFullData && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <div className="flex items-center justify-center text-sm text-blue-700">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Loading full dataset in background... ({quotes.length.toLocaleString()} quotes loaded so far)
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Processed At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Token In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Token Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    ID (click to copy)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedQuotes.map((quote) => (
                  <tr key={quote._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(quote.processedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="font-semibold">{getTokenName(quote.tokenIn)}</div>
                      <div className="text-xs text-gray-500 font-mono">{truncateAddress(quote.tokenIn)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="font-semibold">{getTokenName(quote.tokenOut)}</div>
                      <div className="text-xs text-gray-500 font-mono">{truncateAddress(quote.tokenOut)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span className={parseFloat(quote.amount.toString()) < 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatAmount(quote.amount, quote.tokenIn, quote.tokenOut)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        <button 
                          onClick={() => copyToClipboard(quote._id)} 
                          className="hover:text-blue-600 hover:underline cursor-pointer transition-colors text-left w-full"
                          title="Click to copy full ID"
                        >
                          {quote._id.substring(0, 8)}...
                        </button>
                      </td>
                  </tr>
                ))}
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
                      {Math.min(currentPage * itemsPerPage, filteredQuotes.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredQuotes.length}</span> results
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

export default QuotesTable;
