/**
 * Upload Queue Storage Service
 * Persists failed uploads using IndexedDB for reliable retry
 */

export interface PendingUpload {
  id: string;
  filePath: string;
  fileName: string;
  duration: number;
  createdAt: number;
  uploadStatus: 'pending' | 'success' | 'failed';
  retryCount: number;
  lastError: string | null;
  fileSize?: number;
}

const DB_NAME = 'CallMonitorDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_uploads';

/**
 * Initialize IndexedDB
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        
        // Create indexes for efficient querying
        objectStore.createIndex('uploadStatus', 'uploadStatus', { unique: false });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
        objectStore.createIndex('retryCount', 'retryCount', { unique: false });
        
        console.log('✅ IndexedDB object store created');
      }
    };
  });
}

/**
 * Add upload to queue
 */
export async function addToQueue(upload: Omit<PendingUpload, 'id' | 'createdAt' | 'uploadStatus' | 'retryCount' | 'lastError'>): Promise<string> {
  try {
    const db = await openDatabase();
    
    const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pendingUpload: PendingUpload = {
      id,
      ...upload,
      createdAt: Date.now(),
      uploadStatus: 'pending',
      retryCount: 0,
      lastError: null,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(pendingUpload);

      request.onsuccess = () => {
        console.log('✅ Added to upload queue:', id, upload.fileName);
        resolve(id);
      };

      request.onerror = () => {
        console.error('❌ Failed to add to queue:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('❌ Error adding to queue:', error);
    throw error;
  }
}

/**
 * Get all pending uploads (sorted by creation time, oldest first)
 */
export async function getPendingUploads(): Promise<PendingUpload[]> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('uploadStatus');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        const uploads = request.result as PendingUpload[];
        // Sort by creation time (oldest first)
        uploads.sort((a, b) => a.createdAt - b.createdAt);
        resolve(uploads);
      };

      request.onerror = () => {
        console.error('❌ Failed to get pending uploads:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('❌ Error getting pending uploads:', error);
    return [];
  }
}

/**
 * Update upload status
 */
export async function updateUploadStatus(
  id: string,
  status: 'pending' | 'success' | 'failed',
  error: string | null = null
): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const upload = getRequest.result as PendingUpload;
        if (!upload) {
          console.warn('⚠️ Upload not found:', id);
          resolve();
          return;
        }

        upload.uploadStatus = status;
        upload.lastError = error;

        const updateRequest = store.put(upload);
        
        updateRequest.onsuccess = () => {
          console.log(`✅ Updated upload ${id} status: ${status}`);
          resolve();
        };

        updateRequest.onerror = () => {
          console.error('❌ Failed to update upload:', updateRequest.error);
          reject(updateRequest.error);
        };
      };

      getRequest.onerror = () => {
        console.error('❌ Failed to get upload:', getRequest.error);
        reject(getRequest.error);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('❌ Error updating upload status:', error);
  }
}

/**
 * Increment retry count
 */
export async function incrementRetryCount(id: string, error: string): Promise<number> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const upload = getRequest.result as PendingUpload;
        if (!upload) {
          console.warn('⚠️ Upload not found:', id);
          resolve(0);
          return;
        }

        upload.retryCount += 1;
        upload.lastError = error;

        // If retry count exceeds threshold, mark as failed
        if (upload.retryCount > 10) {
          upload.uploadStatus = 'failed';
          console.error(`❌ Upload ${id} exceeded max retries (10), marking as failed`);
        }

        const updateRequest = store.put(upload);
        
        updateRequest.onsuccess = () => {
          console.log(`🔄 Incremented retry count for ${id}: ${upload.retryCount}`);
          resolve(upload.retryCount);
        };

        updateRequest.onerror = () => {
          console.error('❌ Failed to increment retry count:', updateRequest.error);
          reject(updateRequest.error);
        };
      };

      getRequest.onerror = () => {
        console.error('❌ Failed to get upload:', getRequest.error);
        reject(getRequest.error);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('❌ Error incrementing retry count:', error);
    return 0;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  success: number;
  failed: number;
  total: number;
}> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const uploads = request.result as PendingUpload[];
        const stats = {
          pending: uploads.filter(u => u.uploadStatus === 'pending').length,
          success: uploads.filter(u => u.uploadStatus === 'success').length,
          failed: uploads.filter(u => u.uploadStatus === 'failed').length,
          total: uploads.length,
        };
        resolve(stats);
      };

      request.onerror = () => {
        console.error('❌ Failed to get queue stats:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('❌ Error getting queue stats:', error);
    return { pending: 0, success: 0, failed: 0, total: 0 };
  }
}

/**
 * Remove old successful uploads (cleanup)
 */
export async function cleanupOldUploads(olderThanDays: number = 7): Promise<number> {
  try {
    const db = await openDatabase();
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const uploads = request.result as PendingUpload[];
        let deletedCount = 0;

        uploads.forEach(upload => {
          // Only delete successful uploads older than cutoff
          if (upload.uploadStatus === 'success' && upload.createdAt < cutoffTime) {
            store.delete(upload.id);
            deletedCount++;
          }
        });

        transaction.oncomplete = () => {
          console.log(`🧹 Cleaned up ${deletedCount} old uploads`);
          db.close();
          resolve(deletedCount);
        };
      };

      request.onerror = () => {
        console.error('❌ Failed to cleanup uploads:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ Error cleaning up uploads:', error);
    return 0;
  }
}

/**
 * Get upload by ID
 */
export async function getUploadById(id: string): Promise<PendingUpload | null> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('❌ Failed to get upload:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('❌ Error getting upload:', error);
    return null;
  }
}
