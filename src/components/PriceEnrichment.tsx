import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

interface PriceStatus {
  total: number;
  enriched: number;
  pending: number;
  failed: number;
  noPrice: number;
  enrichmentRate: number;
}

interface EnrichmentResult {
  message: string;
  processed: number;
  enriched: number;
  pending: number;
  failed: number;
}

const PriceEnrichment: React.FC = () => {
  const [priceStatus, setPriceStatus] = useState<PriceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrichmentResult, setEnrichmentResult] = useState<EnrichmentResult | null>(null);
  const [enrichmentParams, setEnrichmentParams] = useState({
    limit: 50,
    skip: 0,
    forceRefresh: false
  });

  const fetchPriceStatus = async () => {
    try {
      const status = await apiService.getPriceStatus();
      setPriceStatus(status);
    } catch (error) {
      console.error('Failed to fetch price status:', error);
    }
  };

  useEffect(() => {
    fetchPriceStatus();
  }, []);

  const handleEnrichPrices = async () => {
    setLoading(true);
    setEnrichmentResult(null);
    
    try {
      const result = await apiService.enrichPrices(enrichmentParams);
      setEnrichmentResult(result);
      await fetchPriceStatus(); // Refresh status after enrichment
    } catch (error) {
      console.error('Failed to enrich prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPending = async () => {
    setLoading(true);
    
    try {
      const result = await apiService.processPendingPrices({ limit: 50 });
      setEnrichmentResult(result);
      await fetchPriceStatus(); // Refresh status after processing
    } catch (error) {
      console.error('Failed to process pending prices:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!priceStatus) {
    return <div>Loading price status...</div>;
  }

  return (
    <div className="price-enrichment p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">💰 Price Enrichment</h2>
      
      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Total Transactions</div>
          <div className="text-2xl font-bold text-blue-800">{priceStatus.total}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600 font-medium">Enriched</div>
          <div className="text-2xl font-bold text-green-800">{priceStatus.enriched}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-sm text-yellow-600 font-medium">Pending</div>
          <div className="text-2xl font-bold text-yellow-800">{priceStatus.pending}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-sm text-red-600 font-medium">Failed</div>
          <div className="text-2xl font-bold text-red-800">{priceStatus.failed}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Enrichment Progress</span>
          <span>{priceStatus.enrichmentRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${priceStatus.enrichmentRate}%` }}
          ></div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Enrichment Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Size
              </label>
              <input
                type="number"
                value={enrichmentParams.limit}
                onChange={(e) => setEnrichmentParams(prev => ({ 
                  ...prev, 
                  limit: parseInt(e.target.value) || 50 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skip Count
              </label>
              <input
                type="number"
                value={enrichmentParams.skip}
                onChange={(e) => setEnrichmentParams(prev => ({ 
                  ...prev, 
                  skip: parseInt(e.target.value) || 0 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="forceRefresh"
                checked={enrichmentParams.forceRefresh}
                onChange={(e) => setEnrichmentParams(prev => ({ 
                  ...prev, 
                  forceRefresh: e.target.checked 
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="forceRefresh" className="ml-2 text-sm text-gray-700">
                Force Refresh
              </label>
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleEnrichPrices}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Enrich Prices'}
          </button>
          
          <button
            onClick={handleProcessPending}
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Process Pending'}
          </button>
          
          <button
            onClick={fetchPriceStatus}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Refresh Status
          </button>
        </div>
      </div>

      {/* Results */}
      {enrichmentResult && (
        <div className="mt-6 bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Last Operation Result</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-green-600 font-medium">Processed:</span>
              <span className="ml-1">{enrichmentResult.processed}</span>
            </div>
            <div>
              <span className="text-green-600 font-medium">Enriched:</span>
              <span className="ml-1">{enrichmentResult.enriched}</span>
            </div>
            <div>
              <span className="text-yellow-600 font-medium">Pending:</span>
              <span className="ml-1">{enrichmentResult.pending}</span>
            </div>
            <div>
              <span className="text-red-600 font-medium">Failed:</span>
              <span className="ml-1">{enrichmentResult.failed}</span>
            </div>
          </div>
          <div className="mt-2 text-green-700">
            {enrichmentResult.message}
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="mt-6 text-sm text-gray-600">
        <p><strong>Note:</strong> Price enrichment fetches open and close prices for each transaction using the pair pricing API.</p>
        <p>• <strong>Enriched:</strong> Transactions with completed price data</p>
        <p>• <strong>Pending:</strong> Transactions with price data still being processed</p>
        <p>• <strong>Failed:</strong> Transactions where price data could not be fetched</p>
        <p>• <strong>No Price:</strong> Transactions that haven't been processed yet</p>
      </div>
    </div>
  );
};

export default PriceEnrichment; 