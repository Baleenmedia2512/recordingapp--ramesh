/**
 * Network Utilities
 * Helper functions for checking network connectivity and status
 */

import { Capacitor } from '@capacitor/core';

/**
 * Check if device has internet connectivity
 */
export async function isOnline(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return true; // Assume online during SSR
  }

  // First check browser/WebView navigator.onLine
  if (!navigator.onLine) {
    console.log('📵 navigator.onLine = false');
    return false;
  }

  // On native platforms, navigator.onLine can be unreliable
  // Try a simple DNS lookup test
  if (Capacitor.isNativePlatform()) {
    console.log('📱 Native platform - navigator.onLine:', navigator.onLine);
    
    // Try to verify DNS is working by testing a reliable domain
    try {
      const testUrls = [
        'https://www.google.com/favicon.ico',
        'https://www.cloudflare.com/favicon.ico',
      ];
      
      for (const testUrl of testUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(testUrl, {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache',
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok || response.status === 404) {
            console.log('✅ DNS test passed');
            return true;
          }
        } catch (e) {
          // Try next URL
          continue;
        }
      }
      
      // If all tests failed but navigator says online, warn about DNS
      if (navigator.onLine) {
        console.warn('⚠️ Device reports online but DNS resolution may be failing');
      }
      return navigator.onLine;
    } catch (error) {
      console.warn('⚠️ Network connectivity test failed:', error);
      return navigator.onLine;
    }
  }

  // On web, trust navigator.onLine
  return navigator.onLine;
}

/**
 * Test connectivity to a specific URL
 */
export async function canReach(url: string, timeout: number = 5000): Promise<boolean> {
  // On native platforms, avoid CORS issues by relying on navigator.onLine
  // Fetch to external domains will fail due to CORS in Android WebView
  if (Capacitor.isNativePlatform()) {
    console.log(`📱 Native platform - skipping fetch check for ${url}, using navigator.onLine:`, navigator.onLine);
    return navigator.onLine;
  }

  // On web platforms, try to actually reach the URL
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache',
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 404; // 404 means reachable but not found
  } catch (error) {
    console.warn(`⚠️ Cannot reach ${url}:`, error);
    return false;
  }
}

/**
 * Get network connection type (if available)
 */
export function getConnectionType(): string {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  // @ts-ignore - navigator.connection is not in TypeScript types
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!connection) {
    return 'unknown';
  }

  return connection.effectiveType || connection.type || 'unknown';
}

/**
 * Check if on a metered connection (cellular data)
 */
export function isMeteredConnection(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // @ts-ignore
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!connection) {
    return false;
  }

  // Check if connection is metered (cellular)
  return connection.saveData === true || connection.type === 'cellular';
}

/**
 * Wait for network to become available
 */
export async function waitForNetwork(maxWaitTime: number = 30000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    if (await isOnline()) {
      return true;
    }

    // Wait 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return false;
}

/**
 * Add network status change listener
 */
export function addNetworkListener(callback: (isOnline: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op cleanup
  }

  const handleOnline = () => {
    console.log('✅ Network: ONLINE');
    callback(true);
  };

  const handleOffline = () => {
    console.log('❌ Network: OFFLINE');
    callback(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
