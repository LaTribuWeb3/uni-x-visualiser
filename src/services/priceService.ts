import { tokens } from '../assets/tokens';
import dotenv from 'dotenv';
import { translateTokenName } from '../utils/tokenTranslations';
import type { Transaction } from '../types/Transaction';

// Load environment variables
dotenv.config();

interface PriceApiResponse {
  jobId: string;
  status: 'completed' | 'processing';
  result?: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    exactMatch: boolean;
  };
  message: string;
  completedAt?: string;
  cached?: boolean;
}

interface PriceData {
  openPrice: number;
  closePrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  exactMatch: boolean;
  priceFetchedAt: Date;
  priceJobId: string;
  priceStatus: 'pending' | 'completed' | 'failed';
}

class PriceService {
  private apiUrl: string;
  private apiToken: string;

  constructor() {
    this.apiUrl = process.env.PAIR_PRICE_API || 'https://pair-pricing.la-tribu.xyz/api/price';
    this.apiToken = process.env.PAIR_PRICE_API_TOKEN || '';
    
    if (!this.apiToken) {
      console.warn('⚠️ PAIR_PRICE_API_TOKEN not found in environment variables');
    }
  }

  /**
   * Convert token address to token name using the tokens.ts mapping
   * and apply token translations (e.g., WETH -> ETH)
   */
  private getTokenName(address: string): string | null {
    
    const normalizedAddress = address.toLowerCase();
    const token = tokens.find(t => t.address.toLowerCase() === normalizedAddress);
    
    if (!token) {
      return null;
    }
    
    // Apply token translations (e.g., WETH -> ETH)
    return translateTokenName(token.name);
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch price data with retry logic for 503 errors
   */
  private async fetchWithRetry(
    url: string, 
    options: RequestInit, 
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // If it's a 503 error and we haven't exceeded max retries, retry with exponential backoff
        if (response.status === 503 && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s
          console.log(`🔄 Received 503 error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await this.sleep(delay);
          continue;
        }
        
        return response;
      } catch (error) {
        // If it's the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error;
        }
        
        // For network errors, retry with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`🔄 Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await this.sleep(delay);
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw new Error('Max retries exceeded');
  }

  /**
   * Fetch price data for a token pair at a specific timestamp
   * If the original pair doesn't exist, try the reverse pair and invert the price
   */
  async fetchPriceData(
    inputTokenAddress: string, 
    outputTokenAddress: string, 
    timestamp: number
  ): Promise<PriceData | null> {
    try {
      const inputTokenName = this.getTokenName(inputTokenAddress);
      const outputTokenName = this.getTokenName(outputTokenAddress);

      if (!inputTokenName || !outputTokenName) {
        console.warn(`⚠️ Could not resolve token names for ${inputTokenAddress} or ${outputTokenAddress}`);
        return null;
      }

      // Try the original pair first
      const originalUrl = `${this.apiUrl}?inputToken=${inputTokenName}&outputToken=${outputTokenName}&timestamp=${timestamp}`;
      console.log(`🔍 Fetching price for ${inputTokenName}/${outputTokenName} at ${timestamp}`);

      try {
        const response = await this.fetchWithRetry(originalUrl, {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} on ${originalUrl}: ${response.statusText}`);
        }

        const data: PriceApiResponse = await response.json();
        
        if (data.status === 'completed' && data.result) {
          console.log(`✅ Price data received for ${inputTokenName}/${outputTokenName}`);
          return {
            openPrice: data.result.open,
            closePrice: data.result.close,
            highPrice: data.result.high,
            lowPrice: data.result.low,
            volume: data.result.volume,
            exactMatch: data.result.exactMatch,
            priceFetchedAt: new Date(),
            priceJobId: data.jobId,
            priceStatus: 'completed' as const
          };
        } else if (data.status === 'processing') {
          console.log(`⏳ Price data processing for ${inputTokenName}/${outputTokenName} (Job ID: ${data.jobId})`);
          return {
            openPrice: 0,
            closePrice: 0,
            highPrice: 0,
            lowPrice: 0,
            volume: 0,
            exactMatch: false,
            priceFetchedAt: new Date(),
            priceJobId: data.jobId,
            priceStatus: 'pending' as const
          };
        } else {
          console.warn(`⚠️ Unexpected response status: ${data.status}`);
          throw new Error(`Unexpected response status: ${data.status}`);
        }
      } catch (originalError) {
        // If original pair failed, try the reverse pair
        console.log(`⚠️ Original pair ${inputTokenName}/${outputTokenName} failed, trying reverse pair ${outputTokenName}/${inputTokenName}`);
        
        const reverseUrl = `${this.apiUrl}?inputToken=${outputTokenName}&outputToken=${inputTokenName}&timestamp=${timestamp}`;
        
        try {
          const reverseResponse = await this.fetchWithRetry(reverseUrl, {
            headers: {
              'Authorization': `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!reverseResponse.ok) {
            throw new Error(`HTTP ${reverseResponse.status} on ${reverseUrl}: ${reverseResponse.statusText}`);
          }

          const reverseData: PriceApiResponse = await reverseResponse.json();
          
          if (reverseData.status === 'completed' && reverseData.result) {
            console.log(`✅ Price data received for reverse pair ${outputTokenName}/${inputTokenName}, inverting prices`);
            
            // Invert the prices: price of AB = 1 / (price of BA)
            const invertedOpenPrice = 1 / reverseData.result.open;
            const invertedClosePrice = 1 / reverseData.result.close;
            const invertedHighPrice = 1 / reverseData.result.low; // High becomes low when inverted
            const invertedLowPrice = 1 / reverseData.result.high; // Low becomes high when inverted
            
            return {
              openPrice: invertedOpenPrice,
              closePrice: invertedClosePrice,
              highPrice: invertedHighPrice,
              lowPrice: invertedLowPrice,
              volume: reverseData.result.volume,
              exactMatch: reverseData.result.exactMatch,
              priceFetchedAt: new Date(),
              priceJobId: reverseData.jobId,
              priceStatus: 'completed' as const
            };
          } else if (reverseData.status === 'processing') {
            console.log(`⏳ Price data processing for reverse pair ${outputTokenName}/${inputTokenName} (Job ID: ${reverseData.jobId})`);
            return {
              openPrice: 0,
              closePrice: 0,
              highPrice: 0,
              lowPrice: 0,
              volume: 0,
              exactMatch: false,
              priceFetchedAt: new Date(),
              priceJobId: reverseData.jobId,
              priceStatus: 'pending' as const
            };
          } else {
            console.warn(`⚠️ Unexpected response status for reverse pair: ${reverseData.status}`);
            throw new Error(`Unexpected response status for reverse pair: ${reverseData.status}`);
          }
                 } catch {
           // Both original and reverse pairs failed
           console.error(`❌ Both original pair ${inputTokenName}/${outputTokenName} and reverse pair ${outputTokenName}/${inputTokenName} failed`);
           throw new Error(`Both pairs failed: ${originalError instanceof Error ? originalError.message : 'Unknown error'}`);
         }
      }
    } catch (error) {
      console.error(`❌ Error fetching price data:`, error);
      throw new Error(`❌ Error fetching price data: ${error instanceof Error ? error.stack : 'Unknown error'}`);
    }
  }

    /**
   * Check the status of a pending price job
   * NOTE: This endpoint doesn't exist in the current API, so we'll return null
   */
  async checkJobStatus(jobId: string): Promise<PriceData | null> {
    try {
      // The status endpoint doesn't exist in the current API
      console.log(`⚠️ Job status checking not implemented - endpoint doesn't exist`);
      console.log(`🔍 Would check job status for ${jobId} but endpoint is not available`);
      
      // Return null to indicate we can't check the status
      return null;
    } catch (error) {
      console.error(`❌ Error checking job status:`, error);
      return null;
    }
  }

  /**
   * Process pending price jobs and update them
   * NOTE: Job status checking is not available, so this function is limited
   */
  async processPendingJobs(pendingTransactions: Transaction[]): Promise<number> {
    console.log(`⚠️ Job status checking not available - cannot process pending jobs`);
    console.log(`📊 Found ${pendingTransactions.length} pending transactions that cannot be updated`);
    
    // Since we can't check job status, we can't update pending jobs
    return 0;
  }
}

export const priceService = new PriceService();
export default priceService; 