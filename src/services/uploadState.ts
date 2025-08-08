export interface UploadState {
  isUploading: boolean;
  progress: {
    stage: 'uploading' | 'parsing' | 'validating' | 'inserting' | 'complete' | 'error';
    message: string;
    progress?: number;
    details?: string;
  } | null;
  fileInfo: {
    name: string;
    size: string;
  } | null;
  error: string | null;
}

class UploadStateManager {
  private state: UploadState;
  private listeners: ((state: UploadState) => void)[] = [];

  constructor() {
    // Load state from localStorage on initialization
    this.state = this.loadState();
  }

  // Load state from localStorage
  private loadState(): UploadState {
    try {
      const saved = localStorage.getItem('uploadState');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate the loaded state
        if (parsed && typeof parsed === 'object') {
          return {
            isUploading: parsed.isUploading || false,
            progress: parsed.progress || null,
            fileInfo: parsed.fileInfo || null,
            error: parsed.error || null
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load upload state from localStorage:', error);
    }
    
    // Return default state if loading fails
    return {
      isUploading: false,
      progress: null,
      fileInfo: null,
      error: null
    };
  }

  // Save state to localStorage
  private saveState(state: UploadState) {
    try {
      localStorage.setItem('uploadState', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save upload state to localStorage:', error);
    }
  }

  // Get current state
  getState(): UploadState {
    return { ...this.state };
  }

  // Update state and notify listeners
  setState(newState: Partial<UploadState>) {
    this.state = { ...this.state, ...newState };
    this.saveState(this.state);
    this.notifyListeners();
  }

  // Start upload
  startUpload(fileName: string, fileSize: string) {
    this.setState({
      isUploading: true,
      progress: {
        stage: 'uploading',
        message: 'Starting upload...',
        progress: 0
      },
      fileInfo: {
        name: fileName,
        size: fileSize
      },
      error: null
    });
  }

  // Update progress
  updateProgress(progress: UploadState['progress']) {
    this.setState({ progress });
  }

  // Complete upload
  completeUpload() {
    this.setState({
      isUploading: false,
      progress: {
        stage: 'complete',
        message: 'Upload completed successfully!',
        progress: 100
      }
    });
  }

  // Set error
  setError(error: string) {
    this.setState({
      isUploading: false,
      error,
      progress: {
        stage: 'error',
        message: 'Upload failed',
        progress: 0
      }
    });
  }

  // Clear state (for new uploads)
  clearState() {
    this.setState({
      isUploading: false,
      progress: null,
      fileInfo: null,
      error: null
    });
  }

  // Check if there's a stale upload state (e.g., from a previous session)
  checkForStaleUpload(): boolean {
    // If there's an upload in progress but no recent activity, it might be stale
    if (this.state.isUploading) {
      const lastActivity = localStorage.getItem('uploadLastActivity');
      if (lastActivity) {
        const lastActivityTime = parseInt(lastActivity);
        const now = Date.now();
        // If more than 5 minutes have passed, consider it stale
        if (now - lastActivityTime > 5 * 60 * 1000) {
          console.log('🕐 Clearing stale upload state');
          this.clearState();
          return true;
        }
      }
    }
    return false;
  }

  // Update last activity timestamp
  updateLastActivity() {
    localStorage.setItem('uploadLastActivity', Date.now().toString());
  }

  // Subscribe to state changes
  subscribe(listener: (state: UploadState) => void) {
    this.listeners.push(listener);
    // Immediately call with current state
    listener(this.state);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Export singleton instance
export const uploadStateManager = new UploadStateManager(); 