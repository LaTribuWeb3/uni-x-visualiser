export interface UploadStatus {
  isUploading: boolean;
  currentFile?: string;
  progress?: number;
  stage?: string;
  startTime?: number;
  lastActivity?: number;
}

class UploadMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: ((status: UploadStatus) => void)[] = [];

  // Start monitoring uploads
  startMonitoring() {
    if (this.checkInterval) {
      return; // Already monitoring
    }

    console.log('🔍 Starting upload monitoring...');
    
    // Check immediately
    this.checkUploadStatus();
    
    // Then check every 5 seconds
    this.checkInterval = setInterval(() => {
      this.checkUploadStatus();
    }, 5000);
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🔍 Stopped upload monitoring');
    }
  }

  // Check if there's an upload in progress on the backend
  private async checkUploadStatus() {
    try {
      const response = await fetch('/api/upload/status');
      if (response.ok) {
        const status: UploadStatus = await response.json();
        this.notifyListeners(status);
      }
    } catch (error) {
      console.warn('Failed to check upload status:', error);
      // If we can't reach the backend, assume no upload is in progress
      this.notifyListeners({ isUploading: false });
    }
  }

  // Subscribe to upload status changes
  subscribe(listener: (status: UploadStatus) => void) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(status: UploadStatus) {
    this.listeners.forEach(listener => listener(status));
  }
}

// Export singleton instance
export const uploadMonitor = new UploadMonitor(); 