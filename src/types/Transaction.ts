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