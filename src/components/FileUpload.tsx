import React, { useState, useRef, useEffect } from 'react';
import apiService from '../services/api';
import { uploadStateManager, type UploadState } from '../services/uploadState';
import { uploadMonitor, type UploadStatus } from '../services/uploadMonitor';

interface UploadResult {
  message: string;
  count: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  totalRows: number;
}

interface FileUploadProps {
  onUploadSuccess?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
}

interface UploadProgress {
  stage: 'uploading' | 'parsing' | 'validating' | 'inserting' | 'complete' | 'error';
  message: string;
  progress?: number;
  details?: string;
  fileInfo?: {
    name: string;
    size: string;
    rows?: number;
  };
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [uploadState, setUploadState] = useState<UploadState>(uploadStateManager.getState());
  const [backendUploadStatus, setBackendUploadStatus] = useState<UploadStatus>({ isUploading: false });
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to global upload state changes and backend monitoring
  useEffect(() => {
    // Check for stale upload state on component mount
    uploadStateManager.checkForStaleUpload();
    
    const unsubscribe = uploadStateManager.subscribe((state) => {
      setUploadState(state);
    });

    // Start monitoring backend uploads
    uploadMonitor.startMonitoring();
    const unsubscribeBackend = uploadMonitor.subscribe((status) => {
      setBackendUploadStatus(status);
      console.log('🔍 Backend upload status:', status);
    });

    // Set up periodic activity updates during uploads
    const activityInterval = setInterval(() => {
      if (uploadState.isUploading) {
        uploadStateManager.updateLastActivity();
      }
    }, 30000); // Update every 30 seconds

    return () => {
      unsubscribe();
      unsubscribeBackend();
      uploadMonitor.stopMonitoring();
      clearInterval(activityInterval);
    };
  }, [uploadState.isUploading]);

  const updateProgress = (stage: UploadProgress['stage'], message: string, progress?: number, details?: string) => {
    uploadStateManager.updateProgress({ stage, message, progress, details });
    uploadStateManager.updateLastActivity();
    console.log(`📊 [${stage.toUpperCase()}] ${message}${details ? ` - ${details}` : ''}`);
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      uploadStateManager.setError('Please select a CSV file');
      return;
    }

    // Validate file size (500MB limit)
    if (file.size > 500 * 1024 * 1024) {
      uploadStateManager.setError('File size must be less than 500MB');
      return;
    }

    // Check if there's already an upload in progress (frontend or backend)
    if (uploadState.isUploading || backendUploadStatus.isUploading) {
      console.log('⚠️ Upload already in progress, ignoring new file');
      if (backendUploadStatus.isUploading) {
        uploadStateManager.setError('Upload already in progress on the server. Please wait for it to complete.');
      }
      return;
    }

    uploadStateManager.startUpload(file.name, `${(file.size / 1024 / 1024).toFixed(2)}MB`);
    uploadStateManager.updateLastActivity();
    setUploadResult(null);
    setSelectedFile(file);

    try {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      console.log(`📤 Starting upload: ${file.name} (${fileSizeMB}MB)`);
      
      // Handle real-time progress updates
      const result = await apiService.uploadCsvFile(file, (progressData) => {
        console.log('📊 Progress update:', progressData);
        
        // Map backend stages to frontend stages
        let stage: UploadProgress['stage'] = 'uploading';
        let message = progressData.message;
        let details = '';
        
        switch (progressData.stage) {
          case 'started':
            stage = 'uploading';
            break;
          case 'reading':
            stage = 'uploading';
            break;
          case 'parsing':
            stage = 'parsing';
            break;
          case 'parsed':
            stage = 'parsing';
            details = `${progressData.totalRows} rows detected`;
            break;
          case 'validating':
            stage = 'validating';
            details = `Validated ${progressData.validCount || 0}/${progressData.totalRows || 0} rows`;
            break;
          case 'validated':
            stage = 'validating';
            details = `${progressData.validCount} valid, ${progressData.invalidCount} invalid`;
            break;
          case 'inserting':
            stage = 'inserting';
            details = `Inserted ${progressData.insertedCount || 0}/${progressData.validCount || 0} transactions`;
            break;
          case 'complete':
            stage = 'complete';
            details = `${progressData.insertedCount || 0} transactions imported`;
            break;
          case 'error':
            stage = 'error';
            details = progressData.message;
            break;
        }
        
        updateProgress(stage, message, progressData.progress, details);
      });
      
             console.log('✅ Upload successful:', result);
       setUploadResult(result);
       uploadStateManager.completeUpload();
       
       if (onUploadSuccess) {
         onUploadSuccess(result);
       }
     } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'Upload failed';
       console.error('❌ Upload failed:', errorMessage);
       uploadStateManager.setError(errorMessage);
       
       if (onUploadError) {
         onUploadError(errorMessage);
       }
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
    uploadStateManager.clearState();
    setSelectedFile(null);
  };

  const getProgressColor = (stage: string) => {
    switch (stage) {
      case 'uploading': return 'text-blue-600';
      case 'parsing': return 'text-yellow-600';
      case 'validating': return 'text-orange-600';
      case 'inserting': return 'text-purple-600';
      case 'complete': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getProgressIcon = (stage: string) => {
    switch (stage) {
      case 'uploading': return '📤';
      case 'parsing': return '📄';
      case 'validating': return '✅';
      case 'inserting': return '💾';
      case 'complete': return '🎉';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getProgressBarColor = (stage: string) => {
    switch (stage) {
      case 'uploading': return 'bg-blue-600 shadow-blue-500/50';
      case 'parsing': return 'bg-yellow-500 shadow-yellow-500/50';
      case 'validating': return 'bg-orange-500 shadow-orange-500/50';
      case 'inserting': return 'bg-purple-600 shadow-purple-500/50';
      case 'complete': return 'bg-green-600 shadow-green-500/50';
      case 'error': return 'bg-red-600 shadow-red-500/50';
      default: return 'bg-blue-600 shadow-blue-500/50';
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload CSV File</h2>
      
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
          dragActive 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                 } ${uploadState.isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-6xl text-gray-400 transition-transform duration-300 hover:scale-110">📁</div>
          
                     {uploadState.isUploading ? (
            <div className="space-y-6">
                             {/* File Info Card */}
               {uploadState.fileInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="text-blue-600 text-2xl">📄</div>
                                         <div className="text-left">
                       <div className="font-medium text-blue-900">{uploadState.fileInfo.name}</div>
                       <div className="text-sm text-blue-700">{uploadState.fileInfo.size}</div>
                     </div>
                  </div>
                </div>
              )}

                             {/* Progress Display */}
               {uploadState.progress && (
                <div className="space-y-4">
                                     <div className="flex items-center justify-center space-x-3">
                     <span className="text-3xl animate-pulse">{getProgressIcon(uploadState.progress.stage)}</span>
                     <div className="text-center">
                       <div className={`text-lg font-medium ${getProgressColor(uploadState.progress.stage)}`}>
                         {uploadState.progress.message}
                       </div>
                       {uploadState.progress.details && (
                         <div className="text-sm text-gray-600 mt-1">{uploadState.progress.details}</div>
                       )}
                     </div>
                   </div>
                  
                                     {uploadState.progress.progress !== undefined && (
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm text-gray-600">
                         <span>Progress</span>
                         <span>{uploadState.progress.progress}%</span>
                       </div>
                       <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                         <div 
                           className={`h-4 rounded-full transition-all duration-500 ease-out shadow-lg bg-gradient-to-r ${getProgressBarColor(uploadState.progress.stage)}`}
                           style={{ width: `${uploadState.progress.progress}%` }}
                         >
                           <div className="h-full bg-white opacity-30 animate-pulse"></div>
                         </div>
                       </div>
                     </div>
                   )}
                  
                                     {/* Stage Indicators */}
                   <div className="flex justify-center space-x-2">
                     {['uploading', 'parsing', 'validating', 'inserting'].map((stage) => (
                       <div
                         key={stage}
                         className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${
                           uploadState.progress?.stage === stage 
                             ? 'bg-blue-100 text-blue-800 scale-110 shadow-md'
                             : uploadState.progress?.stage === 'complete' || uploadState.progress?.stage === 'error'
                             ? 'bg-green-100 text-green-800'
                             : 'bg-gray-100 text-gray-500'
                         }`}
                       >
                         {stage.charAt(0).toUpperCase() + stage.slice(1)}
                       </div>
                     ))}
                   </div>

                   {/* Processing Animation */}
                   {uploadState.progress?.stage !== 'complete' && uploadState.progress?.stage !== 'error' && (
                    <div className="flex justify-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                </div>
              )}
            </div>
                     ) : (
             <>
                               {uploadState.isUploading || backendUploadStatus.isUploading ? (
                  <div className="text-center space-y-4">
                    <div className="text-lg font-medium text-blue-700">
                      📤 Upload in Progress
                    </div>
                    <div className="text-sm text-gray-600">
                      {backendUploadStatus.isUploading && !uploadState.isUploading ? (
                        <>
                          <div>Server is processing: {backendUploadStatus.currentFile}</div>
                          <div>Stage: {backendUploadStatus.stage} ({backendUploadStatus.progress}%)</div>
                        </>
                      ) : (
                        'Please wait for the current upload to complete before starting a new one.'
                      )}
                    </div>
                  </div>
                ) : (
                 <>
                   <div className="text-lg font-medium text-gray-700">
                     Drop your CSV file here, or{' '}
                     <button
                       type="button"
                       onClick={handleBrowseClick}
                       className="text-blue-600 hover:text-blue-800 underline transition-colors"
                     >
                       browse
                     </button>
                   </div>
                   <div className="text-sm text-gray-500">
                     Supports CSV files up to 500MB
                   </div>
                 </>
               )}
              
              {/* File Preview */}
              {selectedFile && !uploadState.isUploading && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-green-600">📄</span>
                    <span className="text-sm text-green-800">
                      Ready to upload: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
                    </span>
                  </div>
                </div>
              )}
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
       {uploadState.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-pulse">
          <div className="flex items-center">
            <div className="text-red-600 text-xl mr-2">❌</div>
                         <div className="text-red-800 font-medium">{uploadState.error}</div>
          </div>
                     <button
             onClick={() => uploadStateManager.clearState()}
             className="mt-2 text-red-600 hover:text-red-800 text-sm underline transition-colors"
           >
             Dismiss
           </button>
        </div>
      )}

      {/* Success Result Display */}
      {uploadResult && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-green-600 text-xl mr-2 animate-bounce">✅</div>
              <div className="text-green-800 font-medium">{uploadResult.message}</div>
            </div>
            <button
              onClick={handleClearResult}
              className="text-green-600 hover:text-green-800 text-sm underline transition-colors"
            >
              Clear
            </button>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              <div className="font-medium text-gray-700">Total Rows</div>
              <div className="text-3xl font-bold text-gray-900">{uploadResult.totalRows}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              <div className="font-medium text-gray-700">Valid Transactions</div>
              <div className="text-3xl font-bold text-green-600">{uploadResult.validCount}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              <div className="font-medium text-gray-700">Invalid Rows</div>
              <div className="text-3xl font-bold text-red-600">{uploadResult.invalidCount}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              <div className="font-medium text-gray-700">Duplicates</div>
              <div className="text-3xl font-bold text-orange-600">{uploadResult.duplicateCount}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              <div className="font-medium text-gray-700">Success Rate</div>
              <div className="text-3xl font-bold text-blue-600">
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
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center">
          <span className="mr-2">📋</span>
          Expected CSV Format
        </h3>
        <div className="text-sm text-gray-600 space-y-2">
          <div className="bg-white p-3 rounded border font-mono text-xs">
            decayStartTime,inputTokenAddress,inputStartAmount,outputTokenAddress,outputTokenAmountOverride,orderHash,transactionHash
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
            <div>
              <strong>• decayStartTime:</strong> Unix timestamp<br/>
              <strong>• Token addresses:</strong> 0x-prefixed hex strings<br/>
            </div>
            <div>
              <strong>• Amounts:</strong> Valid numbers<br/>
              <strong>• Hashes:</strong> 0x-prefixed hex strings
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload; 