/**
 * Network Status Hook
 * Detects network connectivity changes and triggers upload retry
 */

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { triggerQueueRetry } from '@/services/uploadQueueManager';

export interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
  connectionType: string;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConnected: true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    let previousOnlineStatus = navigator.onLine;

    const handleOnline = async () => {
      console.log('🌐 Network: ONLINE');
      setNetworkStatus({
        isOnline: true,
        isConnected: true,
        connectionType: getConnectionType(),
      });

      // If we just came back online, trigger queue retry
      if (!previousOnlineStatus) {
        console.log('🔄 Network reconnected, triggering upload retry...');
        try {
          await triggerQueueRetry();
        } catch (error) {
          console.error('❌ Error triggering queue retry:', error);
        }
      }
      previousOnlineStatus = true;
    };

    const handleOffline = () => {
      console.log('📵 Network: OFFLINE');
      setNetworkStatus({
        isOnline: false,
        isConnected: false,
        connectionType: 'none',
      });
      previousOnlineStatus = false;
    };

    // Listen to browser online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection type changes (if available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const handleConnectionChange = () => {
        console.log('🔄 Connection type changed:', connection.effectiveType);
        setNetworkStatus(prev => ({
          ...prev,
          connectionType: connection.effectiveType || 'unknown',
        }));
      };
      connection.addEventListener('change', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return networkStatus;
}

/**
 * Get connection type (if available)
 */
function getConnectionType(): string {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return connection.effectiveType || connection.type || 'unknown';
  }
  return 'unknown';
}
