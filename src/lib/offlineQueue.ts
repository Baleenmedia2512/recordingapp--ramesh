/**
 * Offline Queue Manager
 * Stores operations locally when offline and syncs when online
 */

const OFFLINE_QUEUE_KEY = 'offline_leads_queue';

interface QueuedLead {
  id: string;
  timestamp: number;
  userId: string;
  leadData: {
    phoneNumber: string;
    contactName: string;
    company?: string;
    email?: string;
    designation?: string;
    notes?: string;
    isInContacts?: boolean;
    isSyncedToLMS?: boolean;
  };
}

/**
 * Add lead to offline queue
 */
export function addToOfflineQueue(userId: string, leadData: any): void {
  try {
    const queue = getOfflineQueue();
    const queuedItem: QueuedLead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      userId,
      leadData,
    };
    
    queue.push(queuedItem);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    
    console.log('📦 [Offline Queue] Lead saved to local queue:', queuedItem.id);
    console.log('📊 [Offline Queue] Total queued items:', queue.length);
  } catch (error) {
    console.error('❌ [Offline Queue] Failed to save to queue:', error);
  }
}

/**
 * Get all queued leads
 */
export function getOfflineQueue(): QueuedLead[] {
  try {
    const queueJson = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (error) {
    console.error('❌ [Offline Queue] Failed to read queue:', error);
    return [];
  }
}

/**
 * Remove item from queue
 */
export function removeFromQueue(id: string): void {
  try {
    const queue = getOfflineQueue();
    const filtered = queue.filter(item => item.id !== id);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
    console.log('✅ [Offline Queue] Item removed:', id);
  } catch (error) {
    console.error('❌ [Offline Queue] Failed to remove item:', error);
  }
}

/**
 * Clear entire queue
 */
export function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
  console.log('🗑️ [Offline Queue] Queue cleared');
}

/**
 * Get queue count
 */
export function getQueueCount(): number {
  return getOfflineQueue().length;
}

/**
 * Check if device is likely offline based on recent errors
 */
export function isLikelyOffline(): boolean {
  // Check if last Supabase request failed with timeout
  const lastError = localStorage.getItem('last_supabase_error');
  if (lastError) {
    const errorData = JSON.parse(lastError);
    const timeSinceError = Date.now() - errorData.timestamp;
    // If error was within last 30 seconds, assume still offline
    if (timeSinceError < 30000 && errorData.message.includes('timeout')) {
      return true;
    }
  }
  return false;
}

/**
 * Record Supabase error for offline detection
 */
export function recordSupabaseError(error: any): void {
  if (error?.message?.includes('timeout') || error?.message?.includes('offline')) {
    localStorage.setItem('last_supabase_error', JSON.stringify({
      message: error.message,
      timestamp: Date.now(),
    }));
  }
}
