import { Transaction } from '../types/Transaction';
import type { TransactionFilters, PaginatedTransactions, DateRange, UniqueTokens } from '../types/Transaction';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private async fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to server');
    }
  }

  async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/health`);
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/transactions`);
  }

  async getAllTransactionsPaginated(batchSize: number = 1000): Promise<Transaction[]> {
    const allTransactions: Transaction[] = [];
    let skip = 0;
    let hasMore = true;
    let batchCount = 0;

    console.log(`🔄 Starting paginated fetch with batch size: ${batchSize}`);

    while (hasMore) {
      batchCount++;
      console.log(`📦 Fetching batch ${batchCount} (skip: ${skip})`);
      
      try {
        const result = await this.getTransactions({
          limit: batchSize,
          skip: skip
        });
        
        allTransactions.push(...result.transactions);
        console.log(`✅ Batch ${batchCount}: ${result.transactions.length} transactions (Total: ${allTransactions.length})`);
        
        if (result.transactions.length < batchSize) {
          hasMore = false;
          console.log(`🏁 Reached end of data after ${batchCount} batches`);
        } else {
          skip += batchSize;
        }
      } catch (error) {
        console.error(`❌ Error fetching batch ${batchCount}:`, error);
        throw error;
      }
    }

    console.log(`🎉 Successfully loaded ${allTransactions.length} total transactions`);
    return allTransactions;
  }

  // New efficient methods
  async getMetadata(): Promise<{
    totalCount: number;
    dateRange: { min: Date | null; max: Date | null };
    uniqueTokens: { inputTokens: string[]; outputTokens: string[] };
  }> {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/transactions/metadata`);
  }

  async getStatistics(filters?: { startDate?: string; endDate?: string }): Promise<{
    totalTransactions: number;
    tokenStats: {
      totalInputVolume: number;
      totalOutputVolume: number;
      uniqueInputTokens: number;
      uniqueOutputTokens: number;
    };
    topInputTokens: Array<{ _id: string; count: number }>;
    topOutputTokens: Array<{ _id: string; count: number; totalVolume: number }>;
  }> {
    const queryParams = new URLSearchParams();
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    
    const url = `${API_BASE_URL}/transactions/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.fetchWithErrorHandling(url);
  }

  async getDisplayData(params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    inputTokenAddress?: string;
    outputTokenAddress?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    transactions: Transaction[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.inputTokenAddress && params.inputTokenAddress !== 'all') {
      queryParams.append('inputTokenAddress', params.inputTokenAddress);
    }
    if (params.outputTokenAddress && params.outputTokenAddress !== 'all') {
      queryParams.append('outputTokenAddress', params.outputTokenAddress);
    }
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `${API_BASE_URL}/transactions/display${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.fetchWithErrorHandling(url);
  }

  async getTokenPairs(filters?: { startDate?: string; endDate?: string }): Promise<{
    pairs: Array<{
      pair: string;
      inputToken: string;
      outputToken: string;
      count: number;
      totalOutputVolume: number;
    }>;
  }> {
    const queryParams = new URLSearchParams();
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    
    const url = `${API_BASE_URL}/transactions/pairs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.fetchWithErrorHandling(url);
  }

  async getTransactions(filters: TransactionFilters = {}): Promise<PaginatedTransactions> {
    const queryParams = new URLSearchParams();
    
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.inputTokenAddress && filters.inputTokenAddress !== 'all') {
      queryParams.append('inputTokenAddress', filters.inputTokenAddress);
    }
    if (filters.outputTokenAddress && filters.outputTokenAddress !== 'all') {
      queryParams.append('outputTokenAddress', filters.outputTokenAddress);
    }
    if (filters.limit) queryParams.append('limit', filters.limit.toString());
    if (filters.skip) queryParams.append('skip', filters.skip.toString());

    const url = `${API_BASE_URL}/transactions/filtered${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.fetchWithErrorHandling(url);
  }

  async getDateRange(): Promise<DateRange | null> {
    try {
      const response = await this.fetchWithErrorHandling<DateRange>(`${API_BASE_URL}/transactions/date-range`);
      // Convert ISO strings back to Date objects
      return {
        min: new Date(response.min),
        max: new Date(response.max)
      };
    } catch (error) {
      // Return null if no data found (404) or other errors
      console.warn('Failed to get date range:', error);
      return null;
    }
  }

  async getUniqueTokens(): Promise<UniqueTokens> {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/transactions/unique-tokens`);
  }

  async insertTransactions(transactions: Transaction[]): Promise<{ message: string; count: number }> {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    });
  }

  async clearTransactions(): Promise<{ message: string; deletedCount: number }> {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/transactions`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
export default apiService;