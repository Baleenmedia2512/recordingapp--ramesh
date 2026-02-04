import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '@/store';
import { callLogApi } from '@/lib/api';
import { DashboardFilters, CallLog } from '@/types';
import { isMockMode } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';

// Mock data for testing
const mockCallLogs: CallLog[] = [
  {
    id: '1',
    user_id: 'mock-user-id',
    phone_number: '+1 (555) 123-4567',
    contact_name: 'John Doe',
    call_type: 'incoming',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    duration: 245,
    device_id: 'mock-device',
    device_platform: 'android',
    has_recording: true,
    recording_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    is_synced: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'mock-user-id',
    phone_number: '+1 (555) 987-6543',
    contact_name: 'Jane Smith',
    call_type: 'outgoing',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    duration: 180,
    device_id: 'mock-device',
    device_platform: 'android',
    has_recording: false,
    is_synced: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    user_id: 'mock-user-id',
    phone_number: '+1 (555) 555-0123',
    contact_name: 'Sarah Wilson',
    call_type: 'missed',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    duration: 0,
    device_id: 'mock-device',
    device_platform: 'android',
    has_recording: false,
    is_synced: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    user_id: 'mock-user-id',
    phone_number: '+1 (555) 234-5678',
    contact_name: 'Mike Johnson',
    call_type: 'incoming',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    duration: 420,
    device_id: 'mock-device',
    device_platform: 'android',
    has_recording: true,
    recording_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    is_synced: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const useCallLogs = () => {
  const { callLogs, setCallLogs, filters, isLoading, setIsLoading } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newCallsCount, setNewCallsCount] = useState(0);
  const eventListenerRef = useRef<any>(null);
  const autoRefreshIntervalRef = useRef<any>(null);
  const previousCallLogsRef = useRef<CallLog[]>([]);

  const fetchCallLogs = useCallback(async (customFilters?: DashboardFilters, silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      // Try to fetch from native plugin first on mobile devices
      if (Capacitor.isNativePlatform()) {
        try {
          const result = await CallMonitor.getCallLogs({ limit: 100 });
          const nativeLogs = result.callLogs || [];
          
          // Transform native logs to match our CallLog type
          const transformedLogs = nativeLogs.map((log: any) => ({
            id: log.id || String(Math.random()),
            user_id: 'local',
            phone_number: log.phone_number || 'Unknown',
            contact_name: log.contact_name || undefined,
            call_type: log.call_type,
            timestamp: log.timestamp,
            duration: log.duration,
            device_id: 'current-device',
            device_platform: log.device_platform || Capacitor.getPlatform(),
            has_recording: log.has_recording || false,
            recording_url: log.recording_url,
            is_synced: log.is_synced || false,
            created_at: log.timestamp,
            updated_at: log.timestamp,
          })) as CallLog[];
          
          // Check for new calls
          if (previousCallLogsRef.current.length > 0 && transformedLogs.length > previousCallLogsRef.current.length) {
            const newCount = transformedLogs.length - previousCallLogsRef.current.length;
            setNewCallsCount(prev => prev + newCount);
            
            // Reset new calls count after 5 seconds
            setTimeout(() => setNewCallsCount(0), 5000);
          }
          
          previousCallLogsRef.current = transformedLogs;
          setCallLogs(transformedLogs);
          setLastUpdated(new Date());
          
          if (!silent) {
            setIsLoading(false);
          }
          return;
        } catch (nativeError) {
          console.warn('Native call log fetch failed, falling back to API:', nativeError);
        }
      }

      // Fallback to API/mock data
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        // Use mock data if not authenticated
        await new Promise(resolve => setTimeout(resolve, 500));
        setCallLogs(mockCallLogs);
        setLastUpdated(new Date());
        return;
      }

      const response = await fetch('/api/call-logs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If API route doesn't exist (static build), use mock data
        if (response.status === 404) {
          setCallLogs(mockCallLogs);
          setLastUpdated(new Date());
          return;
        }
        throw new Error('Failed to fetch call logs');
      }

      const logs = await response.json();
      setCallLogs(logs);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch call logs');
      console.error('Error fetching call logs:', err);
      // Fallback to mock data on error
      setCallLogs(mockCallLogs);
      setLastUpdated(new Date());
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [filters, setCallLogs, setIsLoading]);

  const refreshCallLogs = useCallback(() => {
    fetchCallLogs(filters);
  }, [fetchCallLogs, filters]);

  // Set up native event listeners for real-time updates
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const setupListeners = async () => {
      try {
        // Start listening for call state changes
        await CallMonitor.startListeningForCalls();
        
        // Listen for call log changes
        const callLogListener = await CallMonitor.addListener('callLogChanged', (data) => {
          console.log('Call log changed:', data);
          // Silently refresh in background
          fetchCallLogs(filters, true);
        });
        
        // Listen for phone state changes
        const phoneStateListener = await CallMonitor.addListener('phoneStateChanged', (data) => {
          console.log('Phone state changed:', data);
          if (data.type === 'call_ended') {
            // Wait a moment for the call log to be written, then refresh
            setTimeout(() => {
              fetchCallLogs(filters, true);
            }, 2000);
          }
        });
        
        eventListenerRef.current = { callLogListener, phoneStateListener };
      } catch (error) {
        console.error('Error setting up call listeners:', error);
      }
    };

    setupListeners();

    return () => {
      if (eventListenerRef.current) {
        CallMonitor.removeAllListeners();
        CallMonitor.stopListeningForCalls();
      }
    };
  }, [fetchCallLogs, filters]);

  // Set up polling as a fallback for platforms that don't support native listeners
  useEffect(() => {
    // Poll every 30 seconds for new call logs
    autoRefreshIntervalRef.current = setInterval(() => {
      fetchCallLogs(filters, true);
    }, 30000);

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [fetchCallLogs, filters]);

  useEffect(() => {
    fetchCallLogs(filters);
  }, [filters, fetchCallLogs]);

  return {
    callLogs,
    isLoading,
    error,
    refreshCallLogs,
    fetchCallLogs,
    lastUpdated,
    newCallsCount,
  };
};
