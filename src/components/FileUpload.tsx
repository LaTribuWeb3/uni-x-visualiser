import React, { useState, useRef } from 'react';
import apiService from '../services/api';

interface UploadResult {
  message: string;
  count: number;
  validCount: number;
  invalidCount: number;
  totalRows: number;
}

interface FileUploadProps {
  onUploadSuccess?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    // Validate file size (500MB limit)
    if (file.size > 500 * 1024 * 1024) {
      setError('File size must be less than 500MB');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadResult(null);

    try {
      console.log(`📤 Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      const result = await apiService.uploadCsvFile(file);
      
      console.log('✅ Upload successful:', result);
      setUploadResult(result);
      
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      console.error('❌ Upload failed:', errorMessage);
      setError(errorMessage);
      
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearResult = () => {
    setUploadResult(null);
    setError('');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload CSV File</h2>
      
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-6xl text-gray-400">📁</div>
          
          {isUploading ? (
            <div className="space-y-2">
              <div className="text-lg font-medium text-gray-700">Uploading...</div>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="text-lg font-medium text-gray-700">
                Drop your CSV file here, or{' '}
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  browse
                </button>
              </div>
                             <div className="text-sm text-gray-500">
                 Supports CSV files up to 500MB
               </div>
            </>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-red-600 text-xl mr-2">❌</div>
            <div className="text-red-800 font-medium">{error}</div>
          </div>
          <button
            onClick={() => setError('')}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Result Display */}
      {uploadResult && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-green-600 text-xl mr-2">✅</div>
              <div className="text-green-800 font-medium">{uploadResult.message}</div>
            </div>
            <button
              onClick={handleClearResult}
              className="text-green-600 hover:text-green-800 text-sm underline"
            >
              Clear
            </button>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-700">Total Rows</div>
              <div className="text-2xl font-bold text-gray-900">{uploadResult.totalRows}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-700">Valid Transactions</div>
              <div className="text-2xl font-bold text-green-600">{uploadResult.validCount}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-700">Invalid Rows</div>
              <div className="text-2xl font-bold text-red-600">{uploadResult.invalidCount}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-700">Success Rate</div>
              <div className="text-2xl font-bold text-blue-600">
                {uploadResult.totalRows > 0 
                  ? `${((uploadResult.validCount / uploadResult.totalRows) * 100).toFixed(1)}%`
                  : '0%'
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">📋 Expected CSV Format</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <div>Required columns: decayStartTime, inputTokenAddress, inputStartAmount,</div>
          <div>outputTokenAddress, outputTokenAmountOverride, orderHash, transactionHash</div>
          <div className="mt-2 text-xs text-gray-500">
            • decayStartTime should be a Unix timestamp<br/>
            • Token addresses should be 0x-prefixed hex strings<br/>
            • Amounts should be valid numbers<br/>
            • Hashes should be 0x-prefixed hex strings
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload; 