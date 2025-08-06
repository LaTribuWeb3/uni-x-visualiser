import { Transaction, TransactionFilters, PaginatedTransactions, DateRange, UniqueTokens } from '../types/Transaction';

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