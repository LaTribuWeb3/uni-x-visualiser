export interface Transaction {
  _id?: string;                       // MongoDB auto-generated ID (optional)
  transactionHash: string;             // Primary identifier - Ethereum transaction hash
  decayStartTime: number;              // Unix timestamp as number (stored only once)
  inputTokenAddress: string;           // Input token contract address
  inputStartAmount: string;            // Input token amount as string
  outputTokenAddress: string;          // Output token contract address
  outputTokenAmountOverride: string;   // Output token amount as string
  orderHash: string;                   // Unique order identifier
  openPrice?: number;                  // Simplified open price (optional)
  closePrice?: number;                 // Simplified close price (optional)
  priceStatus?: 'pending' | 'completed' | 'failed'; // Status of price fetch (optional)
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  inputTokenAddress?: string;
  outputTokenAddress?: string;
  limit?: number;
  skip?: number;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DateRange {
  min: Date;
  max: Date;
}

export interface UniqueTokens {
  inputTokens: string[];
  outputTokens: string[];
}