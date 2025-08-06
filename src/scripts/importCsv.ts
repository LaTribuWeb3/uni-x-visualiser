#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import dotenv from 'dotenv';
import { Transaction } from '../types/Transaction';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';

interface CsvRow {
  decayStartTime: string;
  inputTokenAddress: string;
  inputStartAmount: string;
  outputTokenAddress: string;
  outputTokenAmountOverride: string;
  orderHash: string;
  transactionHash: string;
}

async function findCsvFile(): Promise<string> {
  const assetsDir = path.join(process.cwd(), 'src', 'assets');
  
  if (!fs.existsSync(assetsDir)) {
    throw new Error(`Assets directory not found: ${assetsDir}`);
  }

  const files = fs.readdirSync(assetsDir);
  const csvFiles = files.filter(file => file.endsWith('.csv'));

  if (csvFiles.length === 0) {
    throw new Error(`No CSV files found in ${assetsDir}`);
  }

  if (csvFiles.length > 1) {
    console.log('Multiple CSV files found:');
    csvFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    console.log(`Using the first one: ${csvFiles[0]}`);
  }

  return path.join(assetsDir, csvFiles[0]);
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
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
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to connect to backend server');
  }
}

async function healthCheck(): Promise<void> {
  try {
    await apiRequest('/health');
    console.log('✅ Backend server is running');
  } catch (error) {
    console.error('❌ Backend server is not accessible:', error);
    console.log('Please make sure to start the backend server with: npm run dev:backend');
    process.exit(1);
  }
}

async function clearExistingData(): Promise<void> {
  try {
    const result = await apiRequest<{ message: string; deletedCount: number }>('/transactions', {
      method: 'DELETE',
    });
    console.log(`🗑️  ${result.message}`);
  } catch (error) {
    console.error('Error clearing existing data:', error);
    throw error;
  }
}

async function insertTransactions(transactions: Transaction[], batchSize: number = 1000): Promise<void> {
  const batches = [];
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    batches.push(transactions.slice(i, i + batchSize));
  }

  console.log(`📦 Processing ${transactions.length} transactions in ${batches.length} batches of ${batchSize}`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      const result = await apiRequest<{ message: string; count: number }>('/transactions', {
        method: 'POST',
        body: JSON.stringify({ transactions: batch }),
      });
      
      console.log(`  Batch ${i + 1}/${batches.length}: ${result.message}`);
    } catch (error) {
      console.error(`Error inserting batch ${i + 1}:`, error);
      throw error;
    }
  }
}

function validateTransaction(row: CsvRow, index: number): Transaction | null {
  const requiredFields: (keyof CsvRow)[] = [
    'decayStartTime',
    'inputTokenAddress',
    'inputStartAmount',
    'outputTokenAddress',
    'outputTokenAmountOverride',
    'orderHash',
    'transactionHash'
  ];

  // Check for missing required fields
  for (const field of requiredFields) {
    if (!row[field] || row[field].trim() === '') {
      console.warn(`⚠️  Row ${index + 1}: Missing required field '${field}'`);
      return null;
    }
  }

  // Validate numeric fields
  const timestamp = parseInt(row.decayStartTime);
  if (isNaN(timestamp) || timestamp <= 0) {
    console.warn(`⚠️  Row ${index + 1}: Invalid timestamp '${row.decayStartTime}'`);
    return null;
  }

  // Validate BigInt fields (amounts)
  try {
    BigInt(row.inputStartAmount);
    BigInt(row.outputTokenAmountOverride);
  } catch (error) {
    console.warn(`⚠️  Row ${index + 1}: Invalid amount field`);
    return null;
  }

  // Validate addresses (basic format check)
  if (!row.inputTokenAddress.startsWith('0x') || row.inputTokenAddress.length !== 42) {
    console.warn(`⚠️  Row ${index + 1}: Invalid input token address format`);
    return null;
  }

  if (!row.outputTokenAddress.startsWith('0x') || row.outputTokenAddress.length !== 42) {
    console.warn(`⚠️  Row ${index + 1}: Invalid output token address format`);
    return null;
  }

  // Validate hashes
  if (!row.orderHash.startsWith('0x') || row.orderHash.length !== 66) {
    console.warn(`⚠️  Row ${index + 1}: Invalid order hash format`);
    return null;
  }

  if (!row.transactionHash.startsWith('0x') || row.transactionHash.length !== 66) {
    console.warn(`⚠️  Row ${index + 1}: Invalid transaction hash format`);
    return null;
  }

  return {
    decayStartTime: row.decayStartTime,
    inputTokenAddress: row.inputTokenAddress.toLowerCase(),
    inputStartAmount: row.inputStartAmount,
    outputTokenAddress: row.outputTokenAddress.toLowerCase(),
    outputTokenAmountOverride: row.outputTokenAmountOverride,
    orderHash: row.orderHash.toLowerCase(),
    transactionHash: row.transactionHash.toLowerCase(),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '1000');
  
  if (args.includes('--help')) {
    console.log(`
CSV Import Script for Uni-X Visualizer

Usage: npm run import-csv [options]

Options:
  --clear           Clear existing data before import
  --batch-size=N    Set batch size for imports (default: 1000)
  --help            Show this help message

Examples:
  npm run import-csv
  npm run import-csv -- --clear
  npm run import-csv -- --batch-size=2000
  npm run import-csv -- --clear --batch-size=500
`);
    return;
  }

  console.log('🚀 Starting CSV import process...');

  // Check backend connectivity
  await healthCheck();

  try {
    // Find CSV file
    const csvPath = await findCsvFile();
    console.log(`📁 Found CSV file: ${path.basename(csvPath)}`);

    // Clear existing data if requested
    if (shouldClear) {
      await clearExistingData();
    }

    // Read and parse CSV
    console.log('📖 Reading CSV file...');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    const parseResult = Papa.parse<CsvRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      console.error('CSV parsing errors:');
      parseResult.errors.forEach(error => {
        console.error(`  Row ${error.row}: ${error.message}`);
      });
    }

    console.log(`📊 Parsed ${parseResult.data.length} rows from CSV`);

    // Validate and transform data
    console.log('🔍 Validating transactions...');
    const validTransactions: Transaction[] = [];
    let invalidCount = 0;

    parseResult.data.forEach((row, index) => {
      const transaction = validateTransaction(row, index);
      if (transaction) {
        validTransactions.push(transaction);
      } else {
        invalidCount++;
      }
    });

    console.log(`✅ Validated ${validTransactions.length} transactions`);
    if (invalidCount > 0) {
      console.log(`⚠️  Skipped ${invalidCount} invalid transactions`);
    }

    if (validTransactions.length === 0) {
      console.error('❌ No valid transactions to import');
      process.exit(1);
    }

    // Insert into database
    console.log('💾 Inserting transactions into database...');
    await insertTransactions(validTransactions, batchSize);

    console.log(`🎉 Import completed successfully!`);
    console.log(`📈 Total transactions imported: ${validTransactions.length}`);

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);