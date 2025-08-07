export interface Transaction {
  _id?: string;
  decayStartTime: string;              // Original Unix timestamp as string
  inputTokenAddress: string;           // Input token contract address
  inputStartAmount: string;            // Input token amount as string
  outputTokenAddress: string;          // Output token contract address
  outputTokenAmountOverride: string;   // Output token amount as string
  orderHash: string;                   // Unique order identifier
  transactionHash: string;             // Ethereum transaction hash
  decayStartTimeTimestamp?: number;    // Parsed Unix timestamp for queries
  createdAt?: Date;                    // Document creation timestamp
  updatedAt?: Date;                    // Document update timestamp
  // Price data fields
  priceData?: {
    openPrice?: number;                // Open price from pair pricing API
    closePrice?: number;               // Close price from pair pricing API
    highPrice?: number;                // High price from pair pricing API
    lowPrice?: number;                 // Low price from pair pricing API
    volume?: number;                   // Volume from pair pricing API
    exactMatch?: boolean;              // Whether the price data is an exact match
    priceFetchedAt?: Date;            // When the price data was fetched
    priceJobId?: string;              // Job ID from the pricing API
    priceStatus?: 'pending' | 'completed' | 'failed'; // Status of price fetch
  };
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