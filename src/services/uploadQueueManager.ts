/**
 * Upload Queue Manager
 * Handles automatic retry of failed uploads with exponential backoff
 * Production-grade queue system with network resilience
 */

import { Capacitor } from '@capacitor/core';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/env';
import {
  getPendingUploads,
  updateUploadStatus,
  incrementRetryCount,
  getQueueStats,
  cleanupOldUploads,
  PendingUpload,
} from './uploadQueue';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Singleton instance
let queueManager: UploadQueueManager | null = null;

export class UploadQueueManager {
  private isProcessing = false;
  private isRunning = false;
  private retryIntervalId: NodeJS.Timeout | null = null;
  private readonly RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 10;

  constructor() {
    console.log('📋 Upload Queue Manager initialized');
  }

  /**
   * Start the background worker
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Queue manager already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting upload queue manager');

    // Process queue immediately on start
    this.processQueue();

    // Set up periodic retry (every 5 minutes)
    this.retryIntervalId = setInterval(() => {
      console.log('⏰ Periodic retry triggered');
      this.processQueue();
    }, this.RETRY_INTERVAL_MS);

    // Cleanup old uploads daily
    setInterval(() => {
      cleanupOldUploads(7);
    }, 24 * 60 * 60 * 1000); // Once per day
  }

  /**
   * Stop the background worker
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('🛑 Stopping upload queue manager');

    if (this.retryIntervalId) {
      clearInterval(this.retryIntervalId);
      this.retryIntervalId = null;
    }
  }

  /**
   * Trigger queue processing (can be called on network reconnect, etc.)
   */
  async triggerRetry(): Promise<void> {
    console.log('🔔 Manual retry triggered');
    await this.processQueue();
  }

  /**
   * Process the upload queue
   */
  async processQueue(): Promise<void> {
    // Concurrency control: only one processing at a time
    if (this.isProcessing) {
      console.log('⏳ Queue processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      console.log('📊 Processing upload queue...');

      // Get queue stats
      const stats = await getQueueStats();
      console.log(`📊 Queue stats: ${stats.pending} pending, ${stats.success} success, ${stats.failed} failed`);

      if (stats.pending === 0) {
        console.log('✅ No pending uploads');
        return;
      }

      // Get all pending uploads (sorted by oldest first)
      const pendingUploads = await getPendingUploads();
      console.log(`📋 Found ${pendingUploads.length} pending uploads`);

      // Process each upload sequentially (no parallel uploads)
      for (const upload of pendingUploads) {
        await this.processUpload(upload);
      }

      console.log('✅ Queue processing completed');
    } catch (error) {
      console.error('❌ Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single upload
   */
  private async processUpload(upload: PendingUpload): Promise<void> {
    console.log(`\n📤 Processing upload: ${upload.fileName}`);
    console.log(`   ID: ${upload.id}`);
    console.log(`   Retry count: ${upload.retryCount}/${this.MAX_RETRIES}`);
    console.log(`   Created: ${new Date(upload.createdAt).toLocaleString()}`);

    // Check if max retries exceeded
    if (upload.retryCount >= this.MAX_RETRIES) {
      console.error(`❌ Max retries exceeded for ${upload.id}, marking as failed`);
      await updateUploadStatus(upload.id, 'failed', 'Max retries exceeded');
      return;
    }

    // Calculate exponential backoff delay
    const backoffDelay = Math.pow(2, upload.retryCount) * 1000; // 2^n seconds
    const timeSinceCreation = Date.now() - upload.createdAt;
    
    if (upload.retryCount > 0 && timeSinceCreation < backoffDelay) {
      console.log(`⏸️  Backoff delay not met yet, skipping (${Math.round((backoffDelay - timeSinceCreation) / 1000)}s remaining)`);
      return;
    }

    try {
      const startTime = Date.now();

      // Step 1: Check if file already exists in Supabase (prevent duplicate upload)
      const exists = await this.checkFileExists(upload.fileName);
      if (exists) {
        console.log(`✅ File already exists in Supabase, marking as success`);
        await updateUploadStatus(upload.id, 'success', null);
        return;
      }

      // Step 2: Attempt upload using native plugin
      console.log(`📤 Uploading ${upload.fileName} (${Math.round((upload.fileSize || 0) / 1024)}KB)...`);
      
      if (!Capacitor.isNativePlatform()) {
        console.warn('⚠️ Queue manager only works on native platforms');
        return;
      }

      const result = await CallMonitor.uploadToSupabase({
        filePath: upload.filePath,
        fileName: upload.fileName,
        bucketName: 'recordings',
        supabaseUrl: SUPABASE_URL,
        supabaseKey: SUPABASE_ANON_KEY,
        storagePath: 'call-recordings',
      });

      if (result.success && result.publicUrl) {
        const duration = Date.now() - startTime;
        console.log(`✅ Upload successful! (${duration}ms)`);
        console.log(`   URL: ${result.publicUrl}`);
        await updateUploadStatus(upload.id, 'success', null);
        
        // Trigger another queue processing after successful upload
        // (in case there are more pending uploads)
        setTimeout(() => this.processQueue(), 1000);
      } else {
        throw new Error('Upload failed: No public URL returned');
      }
    } catch (error: any) {
      console.error(`❌ Upload failed:`, error.message);
      
      // Increment retry count and save error
      const newRetryCount = await incrementRetryCount(upload.id, error.message);
      
      // Calculate next retry time
      const nextRetryDelay = Math.pow(2, newRetryCount) * 1000;
      const nextRetryTime = new Date(Date.now() + nextRetryDelay);
      console.log(`🔄 Will retry in ${nextRetryDelay / 1000}s (at ${nextRetryTime.toLocaleTimeString()})`);
      
      // If max retries exceeded, it will be caught in next processing cycle
      if (newRetryCount >= this.MAX_RETRIES) {
        console.error(`❌ Max retries reached for ${upload.id}`);
      }
    }
  }

  /**
   * Check if file already exists in Supabase Storage
   * Uses HEAD request to avoid downloading the file
   */
  private async checkFileExists(fileName: string): Promise<boolean> {
    try {
      // Try to get file metadata without downloading
      const { data, error } = await supabase
        .storage
        .from('recordings')
        .list('call-recordings', {
          search: fileName,
        });

      if (error) {
        console.warn('⚠️ Error checking file existence:', error.message);
        return false;
      }

      const exists = data && data.some(file => file.name.includes(fileName));
      if (exists) {
        console.log(`✅ File ${fileName} already exists in Supabase`);
      }
      return exists;
    } catch (error) {
      console.warn('⚠️ Error checking file existence:', error);
      return false;
    }
  }

  /**
   * Get current queue status
   */
  async getStatus(): Promise<{
    isProcessing: boolean;
    isRunning: boolean;
    stats: Awaited<ReturnType<typeof getQueueStats>>;
  }> {
    const stats = await getQueueStats();
    return {
      isProcessing: this.isProcessing,
      isRunning: this.isRunning,
      stats,
    };
  }
}

/**
 * Get or create singleton instance
 */
export function getQueueManager(): UploadQueueManager {
  if (!queueManager) {
    queueManager = new UploadQueueManager();
  }
  return queueManager;
}

/**
 * Start the queue manager (call on app init)
 */
export function startQueueManager(): void {
  const manager = getQueueManager();
  manager.start();
}

/**
 * Stop the queue manager
 */
export function stopQueueManager(): void {
  if (queueManager) {
    queueManager.stop();
  }
}

/**
 * Manually trigger queue processing
 * Useful for network reconnection events
 */
export async function triggerQueueRetry(): Promise<void> {
  const manager = getQueueManager();
  await manager.triggerRetry();
}
