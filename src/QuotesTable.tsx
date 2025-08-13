import React, { useState, useEffect } from 'react';
import { getTokenName, getTokenDecimals, truncateAddress } from './utils';

interface Quote {
  _id: string;
  processedAt: string;
  src: number;
  amount: number;
  otherAmount?: number;
}

interface Request {
  _id: string;
  amount: number;
  chainId: number;
  processedAt: string;
  quotes: Quote[];
  tokenIn: string;
  tokenOut: string;
}

interface RequestsResponse {
  success: boolean;
  count: number;
  data: Request[];
}

const QuotesTable: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Debounce ID filter for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setIdFilterDebounced(idFilter);
    }, 300);

    return () => clearTimeout(timer);
  }, [idFilter]);

  const loadRequests = async (limit?: number, showFullScreenLoading: boolean = true) => {
    try {
      if (limit) {
        // Quick load with limited entries
        if (showFullScreenLoading) {
          setLoading(true);
        }
        setError('');
        
        // Determine appropriate limit based on filters
        let effectiveLimit = limit;
        if (idFilter.trim() !== '') {
          // When filtering by ID, use a moderate limit to allow for proper filtering
          effectiveLimit = Math.min(limit, 100);
        }
        
        const params = new URLSearchParams();
        if (selectedTokenIn !== 'all') {
          params.append('tokenIn', selectedTokenIn);
        }
        if (selectedTokenOut !== 'all') {
          params.append('tokenOut', selectedTokenOut);
        }
        params.append('limit', effectiveLimit.toString());
        
        const url = `https://mm.la-tribu.xyz/api/solvxQuotes?${params.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jsonData: RequestsResponse = await response.json();
        
        if (!jsonData.success) {
          throw new Error('API returned unsuccessful response');
        }
        
        setRequests(jsonData.data);
        setLoading(false);
        
        // If this was a quick load and we're not filtering by ID, start loading full data in background
        if (limit < 20000 && idFilter.trim() === '') {
          loadFullDataInBackground();
        }
      } else {
        // Full load (called by user clicking Fetch Data button)
        setIsLoadingFullData(true);
        setError('');
        
        // Determine appropriate limit based on filters
        let effectiveLimit = '20000';
        if (idFilter.trim() !== '') {
          // When filtering by ID, use a moderate limit to allow for proper filtering
          effectiveLimit = '100';
        }
        
        const params = new URLSearchParams();
        if (selectedTokenIn !== 'all') {
          params.append('tokenIn', selectedTokenIn);
        }
        if (selectedTokenOut !== 'all') {
          params.append('tokenOut', selectedTokenOut);
        }
        params.append('limit', effectiveLimit);
        
        const url = `https://mm.la-tribu.xyz/api/solvxQuotes?${params.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jsonData: RequestsResponse = await response.json();
        
        if (!jsonData.success) {
          throw new Error('API returned unsuccessful response');
        }
        
        setRequests(jsonData.data);
        setIsLoadingFullData(false);
        setHasFullData(true);
      }
    } catch (err) {
      setError(`Error loading requests: ${err}`);
      setLoading(false);
      setIsLoadingFullData(false);
    }
  };

  const loadFullDataInBackground = async () => {
    try {
      // Don't load full data in background if filtering by ID
      if (idFilter.trim() !== '') {
        setIsLoadingFullData(false);
        return;
      }
      
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
      
      const jsonData: RequestsResponse = await response.json();
      
      if (!jsonData.success) {
        throw new Error('API returned unsuccessful response');
      }
      
      setRequests(jsonData.data);
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
    loadRequests(50, true); // Start with quick load of 50 entries, show full-screen loading
  }, []); // Only run once on mount

  // Filter requests based on all filters (now working locally)
  const filteredRequests = requests.filter(request => {
    // ID filter - always apply to ensure we have the right result
    if (idFilterDebounced.trim() !== '' && !request._id.toLowerCase().includes(idFilterDebounced.toLowerCase())) {
      return false;
    }
    
    // Token In filter
    if (selectedTokenIn !== 'all' && request.tokenIn !== selectedTokenIn) {
      return false;
    }
    
    // Token Out filter
    if (selectedTokenOut !== 'all' && request.tokenOut !== selectedTokenOut) {
      return false;
    }
    
    return true;
  });

  console.log(filteredRequests)

  // Pagination logic
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice(
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
    
    requests.forEach(request => {
      tokenInTokens.add(request.tokenIn);
      tokenOutTokens.add(request.tokenOut);
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
    // Reset to first page and load data with new filter
    setCurrentPage(1);
    setHasFullData(false);
    loadRequests(50, false); // Start with quick load of 50 entries, no full-screen loading
  };

  const handleTokenOutSelect = (tokenAddress: string) => {
    setSelectedTokenOut(tokenAddress);
    setTokenOutSearchValue(getTokenName(tokenAddress));
    setShowTokenOutSuggestions(false);
    // Reset to first page and load data with new filter
    setCurrentPage(1);
    setHasFullData(false);
    loadRequests(50, false); // Start with quick load of 50 entries, no full-screen loading
  };

  const formatAmount = (amount: number, tokenInAddress: string, tokenOutAddress: string, isRequestAmount: boolean = false): string => {
    // For quotes, the token denomination depends on whether this is an exact input or exact output request
    let decimals: number;
    let tokenSymbol: string;
    let isNegative: boolean;
    
    if (isRequestAmount) {
      // This is the main request amount - use the original logic
      isNegative = amount < 0;
      decimals = isNegative ? getTokenDecimals(tokenOutAddress) : getTokenDecimals(tokenInAddress);
      tokenSymbol = isNegative ? getTokenName(tokenOutAddress) : getTokenName(tokenInAddress);
    } else {
      // This is a quote amount - the denomination depends on the request type
      // We need to determine this from the parent request context
      // For now, we'll use the same logic but this will be overridden in the quotes display
      isNegative = amount < 0;
      decimals = isNegative ? getTokenDecimals(tokenOutAddress) : getTokenDecimals(tokenInAddress);
      tokenSymbol = isNegative ? getTokenName(tokenOutAddress) : getTokenName(tokenInAddress);
    }
    
    // If we don't have a name for the token, truncate the address
    const displayToken = tokenSymbol === tokenInAddress || tokenSymbol === tokenOutAddress 
      ? truncateAddress(isNegative ? tokenOutAddress : tokenInAddress)
      : tokenSymbol;
    
    // Check if token has an associated address (is in our tokens list)
    const hasAssociatedAddress = tokenSymbol !== (isNegative ? tokenOutAddress : tokenInAddress);
    
    // Only normalize if token has an associated address
    const absAmount = hasAssociatedAddress ? Math.abs(amount) / Math.pow(10, decimals) : Math.abs(amount);
    
    if (absAmount >= 1e9) {
      return (absAmount / 1e9).toFixed(2) + 'B ' + displayToken;
    } else if (absAmount >= 1e6) {
      return (absAmount / 1e6).toFixed(2) + 'M ' + displayToken;
    } else if (absAmount >= 1e3) {
      return (absAmount / 1e3).toFixed(2) + 'K ' + displayToken;
    } else {
      return absAmount.toFixed(4) + ' ' + displayToken;
    }
  };

  // Helper function to format quote amounts based on request type
  const formatQuoteAmount = (quoteAmount: number, requestAmount: number, tokenInAddress: string, tokenOutAddress: string): string => {
    // Determine if this is an exact input or exact output request
    const isExactOutput = requestAmount < 0;
    
    if (isExactOutput) {
      // Exact output request: quotes are denominated in output token
      const decimals = getTokenDecimals(tokenOutAddress);
      const tokenSymbol = getTokenName(tokenOutAddress);
      const displayToken = tokenSymbol === tokenOutAddress ? truncateAddress(tokenOutAddress) : tokenSymbol;
      
      // Normalize the amount
      const hasAssociatedAddress = tokenSymbol !== tokenOutAddress;
      const absAmount = hasAssociatedAddress ? Math.abs(quoteAmount) / Math.pow(10, decimals) : Math.abs(quoteAmount);
      
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
      // Exact input request: quotes are denominated in input token
      const decimals = getTokenDecimals(tokenInAddress);
      const tokenSymbol = getTokenName(tokenInAddress);
      const displayToken = tokenSymbol === tokenInAddress ? truncateAddress(tokenInAddress) : tokenSymbol;
      
      // Normalize the amount
      const hasAssociatedAddress = tokenSymbol !== tokenInAddress;
      const absAmount = hasAssociatedAddress ? Math.abs(quoteAmount) / Math.pow(10, decimals) : Math.abs(quoteAmount);
      
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

  // Helper function to format other amounts (amounts in the opposite token)
  const formatOtherAmount = (otherAmount: number, requestAmount: number, tokenInAddress: string, tokenOutAddress: string): string => {
    // Determine if this is an exact input or exact output request
    const isExactOutput = requestAmount < 0;
    
    if (isExactOutput) {
      // Exact output request: main amount is in output token, so otherAmount is in input token
      const decimals = getTokenDecimals(tokenInAddress);
      const tokenSymbol = getTokenName(tokenInAddress);
      const displayToken = tokenSymbol === tokenInAddress ? truncateAddress(tokenInAddress) : tokenSymbol;
      
      // Normalize the amount
      const hasAssociatedAddress = tokenSymbol !== tokenInAddress;
      const absAmount = hasAssociatedAddress ? Math.abs(otherAmount) / Math.pow(10, decimals) : Math.abs(otherAmount);
      
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
      // Exact input request: main amount is in input token, so otherAmount is in output token
      const decimals = getTokenDecimals(tokenOutAddress);
      const tokenSymbol = getTokenName(tokenOutAddress);
      const displayToken = tokenSymbol === tokenOutAddress ? truncateAddress(tokenOutAddress) : tokenSymbol;
      
      // Normalize the amount
      const hasAssociatedAddress = tokenSymbol !== tokenOutAddress;
      const absAmount = hasAssociatedAddress ? Math.abs(otherAmount) / Math.pow(10, decimals) : Math.abs(otherAmount);
      
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

  const formatDate = (dateString: string): { fullDate: string; relativeTime?: string } => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    const fullDate = date.toLocaleString();
    
    if (diffInMinutes < 60) {
      const relativeTime = diffInMinutes === 0 ? 'Just now' : `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
      return { fullDate, relativeTime };
    } else {
      return { fullDate };
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

  // Toggle row expansion
  const toggleRowExpansion = (requestId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(requestId)) {
      newExpandedRows.delete(requestId);
    } else {
      newExpandedRows.add(requestId);
    }
    setExpandedRows(newExpandedRows);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading requests...</div>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">SolvX Requests</h1>
        
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
                placeholder="Search by request ID..."
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
              onClick={() => loadRequests()}
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
                <span className="text-green-600">✓ Full dataset loaded ({requests.length.toLocaleString()} requests)</span>
              ) : isLoadingFullData ? (
                <span className="text-blue-600">Loading full dataset in background...</span>
              ) : (
                <span>Current filters will be applied when fetching new data</span>
              )}
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Background Loading Indicator */}
          {isLoadingFullData && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <div className="flex items-center justify-center text-sm text-blue-700">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Loading full dataset in background... ({requests.length.toLocaleString()} requests loaded so far)
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
                    Request Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Quotes Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    ID (click to copy)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedRequests.map((request) => (
                  <React.Fragment key={request._id}>
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRowExpansion(request._id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <span className="mr-2">
                            {expandedRows.has(request._id) ? '▼' : '▶'}
                          </span>
                          <div className="flex flex-col">
                            <span>{formatDate(request.processedAt).fullDate}</span>
                            {formatDate(request.processedAt).relativeTime && (
                              <span className="text-xs text-blue-600 font-medium">
                                {formatDate(request.processedAt).relativeTime}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="font-semibold">{getTokenName(request.tokenIn)}</div>
                        <div className="text-xs text-gray-500 font-mono">{truncateAddress(request.tokenIn)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="font-semibold">{getTokenName(request.tokenOut)}</div>
                        <div className="text-xs text-gray-500 font-mono">{truncateAddress(request.tokenOut)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className={request.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                            {formatAmount(request.amount, request.tokenIn, request.tokenOut, true)}
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            {request.amount < 0 ? 'Exact Output' : 'Exact Input'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {request.quotes.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(request._id);
                          }} 
                          className="hover:text-blue-600 hover:underline cursor-pointer transition-colors text-left w-full"
                          title="Click to copy full ID"
                        >
                          {request._id.substring(0, 8)}...
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded quotes section */}
                    {expandedRows.has(request._id) && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 text-sm">Quotes for this request:</h4>
                            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                              <strong>Note:</strong> This is an <strong>{request.amount < 0 ? 'Exact Output' : 'Exact Input'}</strong> request. 
                              {request.amount < 0 
                                ? ` All quote amounts are denominated in ${getTokenName(request.tokenOut)} (output token).`
                                : ` All quote amounts are denominated in ${getTokenName(request.tokenIn)} (input token).`
                              }
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                      Processed At
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                      {request.amount < 0 ? 'Output Amount' : 'Input Amount'}
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                      Amount Offered
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                      Quote ID
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                                                     {request.quotes.map((quote) => (
                                     <tr key={quote._id} className="hover:bg-gray-100">
                                       <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                         <div className="flex flex-col">
                                           <span>{formatDate(quote.processedAt).fullDate}</span>
                                           {formatDate(quote.processedAt).relativeTime && (
                                             <span className="text-xs text-blue-600 font-medium">
                                               {formatDate(quote.processedAt).relativeTime}
                                             </span>
                                           )}
                                         </div>
                                       </td>
                                       <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                                         <span className={quote.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                                           {formatQuoteAmount(quote.amount, request.amount, request.tokenIn, request.tokenOut)}
                                         </span>
                                       </td>
                                       <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                                         {quote.otherAmount ? (
                                           <span className={quote.otherAmount < 0 ? 'text-red-600' : 'text-green-600'}>
                                             {formatOtherAmount(quote.otherAmount, request.amount, request.tokenIn, request.tokenOut)}
                                           </span>
                                         ) : (
                                           <span className="text-gray-400 italic">N/A</span>
                                         )}
                                       </td>
                                       <td className="px-3 py-2 whitespace-nowrap text-xs font-mono text-gray-900">
                                         <button 
                                           onClick={() => copyToClipboard(quote._id)}
                                           className="hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                                           title="Click to copy full quote ID"
                                         >
                                           {quote._id.substring(0, 8)}...
                                         </button>
                                       </td>
                                     </tr>
                                   ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
                      {Math.min(currentPage * itemsPerPage, filteredRequests.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredRequests.length}</span> results
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
