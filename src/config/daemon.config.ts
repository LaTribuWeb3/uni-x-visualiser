export interface DaemonConfig {
  // Database configuration
  mongodb: {
    uri: string;
    dbName: string;
    collectionName: string;
  };
  
  // Processing configuration
  processing: {
    batchSize: number;
    intervalMs: number;
    maxRetries: number;
    retryDelayMs: number;
    delayBetweenRequests: number;
  };
  
  // API configuration
  api: {
    baseUrl: string;
    token: string;
    timeoutMs: number;
  };
  
  // Logging configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableFile: boolean;
    logFile?: string;
  };
}

export const defaultConfig: DaemonConfig = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.DB_NAME || 'uni-x-visualiser',
    collectionName: process.env.COLLECTION_NAME || 'transactions',
  },
  
  processing: {
    batchSize: parseInt(process.env.DAEMON_BATCH_SIZE || '25'),
    intervalMs: parseInt(process.env.DAEMON_INTERVAL_MS || '30000'), // 30 seconds
    maxRetries: parseInt(process.env.DAEMON_MAX_RETRIES || '3'),
    retryDelayMs: parseInt(process.env.DAEMON_RETRY_DELAY_MS || '5000'), // 5 seconds
    delayBetweenRequests: parseInt(process.env.DAEMON_REQUEST_DELAY || '100'), // 100ms
  },
  
  api: {
    baseUrl: process.env.PAIR_PRICE_API || 'https://pair-pricing.la-tribu.xyz/api/price',
    token: process.env.PAIR_PRICE_API_TOKEN || '',
    timeoutMs: parseInt(process.env.API_TIMEOUT_MS || '10000'), // 10 seconds
  },
  
  logging: {
    level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    enableConsole: true,
    enableFile: false,
    logFile: process.env.LOG_FILE || 'daemon.log',
  },
};

export function getConfig(): DaemonConfig {
  return defaultConfig;
}

export function validateConfig(config: DaemonConfig): string[] {
  const errors: string[] = [];
  
  // Validate MongoDB configuration
  if (!config.mongodb.uri) {
    errors.push('MONGODB_URI is required');
  }
  
  if (!config.mongodb.dbName) {
    errors.push('DB_NAME is required');
  }
  
  if (!config.mongodb.collectionName) {
    errors.push('COLLECTION_NAME is required');
  }
  
  // Validate processing configuration
  if (config.processing.batchSize <= 0) {
    errors.push('DAEMON_BATCH_SIZE must be greater than 0');
  }
  
  if (config.processing.intervalMs <= 0) {
    errors.push('DAEMON_INTERVAL_MS must be greater than 0');
  }
  
  if (config.processing.maxRetries < 0) {
    errors.push('DAEMON_MAX_RETRIES must be 0 or greater');
  }
  
  // Validate API configuration
  if (!config.api.baseUrl) {
    errors.push('PAIR_PRICE_API is required');
  }
  
  if (!config.api.token) {
    errors.push('PAIR_PRICE_API_TOKEN is required');
  }
  
  return errors;
} 