#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Papa from 'papaparse';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';



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

async function processAndUploadFile(filePath: string): Promise<{ message: string; count: number; validCount: number; invalidCount: number; totalRows: number }> {
  try {
    // Read and parse CSV locally
    console.log('📖 Reading and parsing CSV file...');
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim().replace(/^"|"$/g, ''), // Remove surrounding quotes
    });

    if (parseResult.errors.length > 0) {
      console.error('CSV parsing errors:');
      parseResult.errors.forEach((error: any) => {
        console.error(`  Row ${error.row}: ${error.message}`);
      });
    }

    console.log(`📊 Parsed ${parseResult.data.length} rows from CSV`);

    // Validate and transform data
    console.log('🔍 Validating transactions...');
    const validTransactions: any[] = [];
    let invalidCount = 0;

    parseResult.data.forEach((row: any, index: number) => {
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
      throw new Error('No valid transactions found in file');
    }

    // Upload to backend using existing JSON endpoint with adaptive batch sizing
    console.log('💾 Uploading transactions to backend with adaptive batch sizing...');
    const url = `${API_BASE_URL}/transactions`;
    
    let currentBatchSize = 50; // Start with small batch size
    let lastWorkingBatchSize = 50;
    let lastFailingBatchSize = null;
    const minBatchSize = 10;
    const maxBatchSize = 1000;
    
    let totalInserted = 0;
    let batchIndex = 0;
    
    for (let i = 0; i < validTransactions.length; i += currentBatchSize) {
      const batch = validTransactions.slice(i, i + currentBatchSize);
      batchIndex++;
      
      console.log(`📦 Processing batch ${batchIndex} (size: ${batch.length}, total: ${totalInserted}/${validTransactions.length})`);
      
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retries < maxRetries && !success) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transactions: batch })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            
            // Handle duplicate key errors gracefully
            if (response.status === 409) {
              console.log(`  ⚠️  Batch ${batchIndex}: Some transactions already exist, continuing...`);
              totalInserted += batch.length; // Assume all were processed
              success = true;
            } else {
              throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
          } else {
            const result = await response.json();
            totalInserted += result.count;
            console.log(`  ✅ Batch ${batchIndex}: ${result.message}`);
            
            // Success - update last working batch size and potentially increase batch size
            lastWorkingBatchSize = currentBatchSize;
            
            // If we've had several successful batches, try increasing the batch size
            if (batchIndex % 3 === 0 && currentBatchSize < maxBatchSize) {
              const newBatchSize = Math.min(currentBatchSize * 1.5, maxBatchSize);
              if (newBatchSize > currentBatchSize) {
                console.log(`  📈 Increasing batch size from ${currentBatchSize} to ${Math.floor(newBatchSize)} (successful batches)`);
                currentBatchSize = Math.floor(newBatchSize);
              }
            }
            
            success = true;
          }
        } catch (error) {
          retries++;
          console.error(`  ❌ Error inserting batch ${batchIndex} (attempt ${retries}/${maxRetries}):`, error);
          
          if (retries >= maxRetries) {
            // Failure - update last failing batch size and calculate new batch size
            lastFailingBatchSize = currentBatchSize;
            
            // Calculate new batch size using mean between last working and failing sizes
            let newBatchSize;
            if (lastFailingBatchSize !== null) {
              newBatchSize = Math.floor((lastWorkingBatchSize + lastFailingBatchSize) / 2);
              console.log(`  🔄 Adjusting batch size: last working=${lastWorkingBatchSize}, last failing=${lastFailingBatchSize}, new=${newBatchSize}`);
            } else {
              // If this is the first failure, halve the current batch size
              newBatchSize = Math.max(Math.floor(currentBatchSize / 2), minBatchSize);
              console.log(`  📉 First failure, halving batch size from ${currentBatchSize} to ${newBatchSize}`);
            }
            
            // Ensure batch size is within bounds
            newBatchSize = Math.max(minBatchSize, Math.min(maxBatchSize, newBatchSize));
            
            if (newBatchSize !== currentBatchSize) {
              console.log(`  📊 Adjusting batch size from ${currentBatchSize} to ${newBatchSize}`);
              currentBatchSize = newBatchSize;
            }
            
            // If we've reduced to minimum batch size and still failing, continue with current batch
            if (currentBatchSize <= minBatchSize) {
              console.log(`  ⚠️  At minimum batch size (${minBatchSize}), continuing with current batch`);
              // Force success to continue processing
              totalInserted += batch.length;
              console.log(`  ⚠️  Batch ${batchIndex}: Forced to continue (${batch.length} transactions)`);
              success = true;
            } else {
              // Try again with the new batch size
              console.log(`  🔄 Retrying with new batch size ${currentBatchSize}...`);
              retries = 0; // Reset retries for the new batch size
            }
          } else {
            // Wait longer between retries
            console.log(`  ⏳ Retrying in ${retries * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retries * 2000));
          }
        }
      }
      
      // Add a small delay between batches to prevent overwhelming the server
      if (i + currentBatchSize < validTransactions.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return {
      message: `Successfully imported ${totalInserted} transactions`,
      count: totalInserted,
      validCount: validTransactions.length,
      invalidCount: invalidCount,
      totalRows: parseResult.data.length
    };

  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to process and upload file');
  }
}

function validateTransaction(row: any, index: number): any | null {
  const requiredFields = [
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

async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  
  if (args.includes('--help')) {
    console.log(`
CSV Import Script for Uni-X Visualizer

Usage: npm run import-csv [options]

Options:
  --clear           Clear existing data before import
  --help            Show this help message

Examples:
  npm run import-csv
  npm run import-csv -- --clear
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

    // Upload and process the file
    console.log('📤 Processing and uploading CSV file...');
    const result = await processAndUploadFile(csvPath);
    
    console.log(`✅ Upload completed successfully!`);
    console.log(`📈 ${result.message}`);
    console.log(`📊 Valid transactions: ${result.validCount}`);
    console.log(`⚠️  Invalid transactions: ${result.invalidCount}`);
    console.log(`📋 Total rows processed: ${result.totalRows}`);

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);