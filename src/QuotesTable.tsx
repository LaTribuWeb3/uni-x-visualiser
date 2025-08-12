import React, { useState, useEffect } from 'react';
import { getTokenName } from './utils';

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
  const [count, setCount] = useState<number>(0);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('https://mm.la-tribu.xyz/api/solvxQuotes');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const jsonData: QuotesResponse = await response.json();
      
      if (!jsonData.success) {
        throw new Error('API returned unsuccessful response');
      }
      
      setQuotes(jsonData.data);
      setCount(jsonData.count || jsonData.data.length);
      setLoading(false);
    } catch (err) {
      setError(`Error loading quotes: ${err}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  const formatAmount = (amount: string | number): string => {
    if (typeof amount === 'string') {
      // Handle very large numbers
      const num = parseFloat(amount);
      if (isNaN(num)) return amount;
      
      if (Math.abs(num) >= 1e18) {
        return (num / 1e18).toFixed(2) + 'e18';
      } else if (Math.abs(num) >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
      } else if (Math.abs(num) >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
      } else if (Math.abs(num) >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
      } else {
        return num.toFixed(4);
      }
    } else {
      return amount.toFixed(4);
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
        
        {/* Summary Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Quotes Overview</h2>
            <p className="text-sm text-gray-600">
              {count.toLocaleString()} quotes loaded from the SolvX API
            </p>
          </div>
        </div>

        {/* Quotes Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                    ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotes.map((quote) => (
                  <tr key={quote._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(quote.processedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="font-semibold">{getTokenName(quote.tokenIn)}</div>
                      <div className="text-xs text-gray-500 font-mono">{quote.tokenIn}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="font-semibold">{getTokenName(quote.tokenOut)}</div>
                      <div className="text-xs text-gray-500 font-mono">{quote.tokenOut}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span className={parseFloat(quote.amount.toString()) < 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatAmount(quote.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {quote._id.substring(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotesTable;
