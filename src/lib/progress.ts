export interface ProgressEventData {
  jobId: string;
  status: 'initializing' | 'downloading' | 'transcoding' | 'muxing' | 'completed' | 'error';
  percent: number; // 0 to 100
  phase: string;
  bytesDownloaded?: number;
  totalBytes?: number;
  speed?: string;
  timemark?: string;
  message: string;
}

type ProgressListener = (data: ProgressEventData) => void;

class ProgressManager {
  private listeners: Map<string, Set<ProgressListener>> = new Map();
  private lastEvents: Map<string, ProgressEventData> = new Map();

  subscribe(jobId: string, listener: ProgressListener): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(listener);

    // Send the last event immediately if available
    const last = this.lastEvents.get(jobId);
    if (last) {
      listener(last);
    }

    return () => {
      const set = this.listeners.get(jobId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(jobId);
        }
      }
    };
  }

  emit(data: ProgressEventData): void {
    this.lastEvents.set(data.jobId, data);
    const set = this.listeners.get(data.jobId);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(data);
        } catch (e) {
          console.error('[ProgressManager] Listener error:', e);
        }
      });
    }

    // Clean up memory after completion or error after 60 seconds
    if (data.status === 'completed' || data.status === 'error') {
      setTimeout(() => {
        this.lastEvents.delete(data.jobId);
      }, 60000);
    }
  }

  get(jobId: string): ProgressEventData | undefined {
    return this.lastEvents.get(jobId);
  }
}

// Global singleton for the server runtime
const globalForProgress = globalThis as unknown as {
  progressManager?: ProgressManager;
};

export const progressManager = globalForProgress.progressManager ?? new ProgressManager();

if (process.env.NODE_ENV !== 'production') {
  globalForProgress.progressManager = progressManager;
}
