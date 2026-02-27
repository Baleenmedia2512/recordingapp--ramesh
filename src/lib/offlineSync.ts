/**
 * Offline Sync Service
 * Syncs queued leads to database when connection is restored
 */

import { getOfflineQueue, removeFromQueue, clearOfflineQueue } from './offlineQueue';
import { createLead } from '@/services/leadsMetadataService';

/**
 * Sync all queued leads to database
 * Returns number of successfully synced items
 */
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const queue = getOfflineQueue();
  
  if (queue.length === 0) {
    console.log('📭 [Sync] No items in offline queue');
    return { synced: 0, failed: 0 };
  }

  console.log(`🔄 [Sync] Starting sync for ${queue.length} queued items...`);
  
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      console.log(`📤 [Sync] Syncing item ${item.id}...`);
      
      const result = await createLead(item.userId, item.leadData);
      
      if (result) {
        console.log(`✅ [Sync] Item synced successfully: ${item.id}`);
        removeFromQueue(item.id);
        synced++;
      } else {
        console.error(`❌ [Sync] Failed to sync item: ${item.id}`);
        failed++;
      }
    } catch (error: any) {
      console.error(`❌ [Sync] Error syncing item ${item.id}:`, error);
      
      // If it's a network error, stop trying (still offline)
      if (error?.message?.includes('timeout') || error?.message?.includes('offline')) {
        console.log('⚠️ [Sync] Still offline, stopping sync');
        break;
      }
      
      // Other errors - mark as failed but continue
      failed++;
    }
  }

  console.log(`✅ [Sync] Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}

/**
 * Check if online and auto-sync if needed
 */
export async function autoSyncIfOnline(): Promise<void> {
  try {
    // Simple network check (try to reach Supabase)
    const response = await fetch('https://wkwrrdcjknvupwsfdjtd.supabase.co/rest/v1/', {
      method: 'HEAD',
      cache: 'no-cache',
    });

    if (response.ok || response.status === 401) {
      // 401 means we reached the server (just not authenticated for that endpoint)
      console.log('🌐 [Auto Sync] Connection restored, starting sync...');
      const result = await syncOfflineQueue();
      
      if (result.synced > 0) {
        console.log(`✅ [Auto Sync] Successfully synced ${result.synced} items`);
      }
    }
  } catch (error) {
    console.log('📡 [Auto Sync] Device still offline, skipping sync');
  }
}
