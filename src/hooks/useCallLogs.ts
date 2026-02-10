import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '@/store';
import { callLogApi } from '@/lib/api';
import { DashboardFilters, CallLog } from '@/types';
import { isMockMode } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';
import { uploadAndSyncToLMS } from '@/services/supabaseUpload';

// Performance constants
const LOAD_TIMEOUT_MS = 3000; // 3 second timeout for loading
const AUTO_REFRESH_INTERVAL_MS = 30000; // 30 seconds
const CALL_END_REFRESH_DELAY_MS = 2000; // Wait for call log to be written

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
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [isSlowLoad, setIsSlowLoad] = useState(false);
  const eventListenerRef = useRef<any>(null);
  const autoRefreshIntervalRef = useRef<any>(null);
  const previousCallLogsRef = useRef<CallLog[]>([]);
  const callLogsRef = useRef<CallLog[]>([]); // Keep track of current call logs for upload retry
  const loadStartTimeRef = useRef<number>(0);

  // Helper to gracefully handle missing data
  const sanitizeCallLog = (log: any): CallLog => {
    return {
      id: log.id || String(Math.random()),
      user_id: log.user_id || 'local',
      phone_number: log.phone_number || 'Unknown Number',
      contact_name: log.contact_name || undefined,
      call_type: log.call_type || 'unknown',
      timestamp: log.timestamp || new Date().toISOString(),
      duration: typeof log.duration === 'number' ? log.duration : 0,
      device_id: log.device_id || 'current-device',
      device_platform: log.device_platform || Capacitor.getPlatform(),
      has_recording: Boolean(log.has_recording),
      recording_url: log.recording_url || undefined,
      recording_file_path: log.recording_file_path || undefined,
      recording_file_name: log.recording_file_name || undefined,
      is_synced: Boolean(log.is_synced),
      created_at: log.created_at || log.timestamp || new Date().toISOString(),
      updated_at: log.updated_at || log.timestamp || new Date().toISOString(),
    };
  };

  const fetchCallLogs = useCallback(async (customFilters?: DashboardFilters, silent = false, forceRefresh = false) => {
    if (!silent) {
      setIsLoading(true);
      loadStartTimeRef.current = performance.now();
      setIsSlowLoad(false);
    }
    setError(null);
    
    // Set up timeout warning for slow loads
    const slowLoadTimeout = setTimeout(() => {
      if (!silent) {
        setIsSlowLoad(true);
      }
    }, LOAD_TIMEOUT_MS);
    
    try {
      // Try to fetch from native plugin first on mobile devices
      if (Capacitor.isNativePlatform()) {
        try {
          // Clear cache first if forceRefresh is requested
          if (forceRefresh) {
            console.log('Force refresh requested, clearing recordings cache...');
            try {
              await CallMonitor.clearRecordingsCache();
            } catch (e) {
              console.warn('Could not clear recordings cache:', e);
            }
          }
          
          console.log('Fetching call logs from native plugin...');
          const result = await CallMonitor.getCallLogs({ limit: 100, forceRefresh });
          console.log('Native plugin result:', result);
          const nativeLogs = result.callLogs || [];
          
          // Transform and sanitize native logs
          const transformedLogs = nativeLogs.map((log: any) => sanitizeCallLog({
            id: log.id,
            user_id: 'local',
            phone_number: log.phone_number,
            contact_name: log.contact_name,
            call_type: log.call_type,
            timestamp: log.timestamp,
            duration: log.duration,
            device_id: 'current-device',
            device_platform: log.device_platform || Capacitor.getPlatform(),
            has_recording: log.has_recording,
            recording_url: log.recording_url,
            recording_file_path: log.recording_file_path,
            recording_file_name: log.recording_file_name,
            is_synced: log.is_synced,
          }));
          
          console.log('Transformed logs:', transformedLogs.length, 'entries');
          
          // Track load time
          const elapsed = performance.now() - loadStartTimeRef.current;
          setLoadTime(elapsed);
          
          // Check for new calls
          if (previousCallLogsRef.current.length > 0 && transformedLogs.length > previousCallLogsRef.current.length) {
            const newCount = transformedLogs.length - previousCallLogsRef.current.length;
            setNewCallsCount(prev => prev + newCount);
            
            // Reset new calls count after 5 seconds
            setTimeout(() => setNewCallsCount(0), 5000);
          }
          
          previousCallLogsRef.current = transformedLogs;
          callLogsRef.current = transformedLogs;
          setCallLogs(transformedLogs);
          setLastUpdated(new Date());
          
          clearTimeout(slowLoadTimeout);
          if (!silent) {
            setIsLoading(false);
            setIsSlowLoad(false);
          }
          return;
        } catch (nativeError: any) {
          console.error('Native call log fetch failed:', nativeError);
          // Gracefully handle - use mock data instead of failing completely
          const sanitizedMocks = mockCallLogs.map(sanitizeCallLog);
          callLogsRef.current = sanitizedMocks;
          setCallLogs(sanitizedMocks);
          setLastUpdated(new Date());
          const errorMsg = nativeError?.message || 'Unknown error';
          setError(`Could not access call logs: ${errorMsg}. Showing sample data.`);
          
          clearTimeout(slowLoadTimeout);
          if (!silent) {
            setIsLoading(false);
            setIsSlowLoad(false);
          }
          return;
        }
      }

      // Web platform or non-native: try API, fallback to mock data
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        // Use mock data if not authenticated
        await new Promise(resolve => setTimeout(resolve, 300));
        const sanitizedMocks = mockCallLogs.map(sanitizeCallLog);
        callLogsRef.current = sanitizedMocks;
        setCallLogs(sanitizedMocks);
        setLastUpdated(new Date());
        setLoadTime(performance.now() - loadStartTimeRef.current);
        
        clearTimeout(slowLoadTimeout);
        if (!silent) {
          setIsLoading(false);
          setIsSlowLoad(false);
        }
        return;
      }

      try {
        const response = await fetch('/api/call-logs', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // If API route doesn't exist (static build), use mock data
          if (response.status === 404) {
            const sanitizedMocks = mockCallLogs.map(sanitizeCallLog);
            callLogsRef.current = sanitizedMocks;
            setCallLogs(sanitizedMocks);
            setLastUpdated(new Date());
            setLoadTime(performance.now() - loadStartTimeRef.current);
            
            clearTimeout(slowLoadTimeout);
            if (!silent) {
              setIsLoading(false);
              setIsSlowLoad(false);
            }
            return;
          }
          throw new Error('Failed to fetch call logs');
        }

        const logs = await response.json();
        // Sanitize each log entry for graceful handling of missing data
        const sanitizedLogs = (logs || []).map(sanitizeCallLog);
        setCallLogs(sanitizedLogs);
        setLastUpdated(new Date());
        setLoadTime(performance.now() - loadStartTimeRef.current);
      } catch (fetchError: any) {
        console.warn('API fetch failed, using mock data:', fetchError);
        // Graceful fallback to mock data on any fetch error
        const sanitizedMocks = mockCallLogs.map(sanitizeCallLog);
        setCallLogs(sanitizedMocks);
        setLastUpdated(new Date());
        setError('Could not connect to server. Showing sample data.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch call logs');
      console.error('Error fetching call logs:', err);
      // Graceful fallback to mock data on error
      const sanitizedMocks = mockCallLogs.map(sanitizeCallLog);
      setCallLogs(sanitizedMocks);
      setLastUpdated(new Date());
    } finally {
      clearTimeout(slowLoadTimeout);
      if (!silent) {
        setIsLoading(false);
        setIsSlowLoad(false);
      }
    }
  }, [filters, setCallLogs, setIsLoading]);

  const refreshCallLogs = useCallback((forceRefresh = false) => {
    fetchCallLogs(filters, false, forceRefresh);
  }, [fetchCallLogs, filters]);

  // Set up native event listeners for real-time updates
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const setupListeners = async () => {
      try {
        // Import App plugin for app state changes
        const { App } = await import('@capacitor/app');
        
        // Listen for app resume - force refresh recordings when returning to app
        App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            console.log('App resumed, force refreshing call logs and recordings...');
            // Force refresh to get new recordings
            fetchCallLogs(filters, false, true);
          }
        });
        
        // Start listening for call state changes
        await CallMonitor.startListeningForCalls();
        
        // Listen for call log changes
        const callLogListener = await CallMonitor.addListener('callLogChanged', (data) => {
          console.log('Call log changed:', data);
          // Force refresh in background to get new recordings
          fetchCallLogs(filters, true, true);
        });
        
        // Listen for phone state changes
        const phoneStateListener = await CallMonitor.addListener('phoneStateChanged', async (data) => {
          console.log('Phone state changed:', data);
          if (data.type === 'call_ended') {
            // Wait a moment for the call log and recording to be written
            setTimeout(async () => {
              console.log('Call ended, force refreshing to get new recording...');
              // Refresh call logs first to get the new recording
              await fetchCallLogs(filters, true, true);
              
              // Retry function to find and upload recording using findRecordingByCallTime
              const tryUploadWithRetry = async (attempt: number = 1, maxAttempts: number = 10): Promise<void> => {
                try {
                  console.log(`📤 Attempting to upload recording (attempt ${attempt}/${maxAttempts})...`);
                  
                  // Get latest call from state (already refreshed)
                  const latestLog = callLogsRef.current?.[0];
                  
                  if (!latestLog) {
                    console.log('⚠️ No call logs found');
                    return;
                  }
                  
                  console.log(`📋 Latest call: ${latestLog.phone_number?.substring(0, 4)}***, duration: ${latestLog.duration}s`);
                  
                  // Use findRecordingByCallTime API to locate the recording file
                  const callTime = new Date(latestLog.timestamp).getTime();
                  const callEndTime = callTime + ((latestLog.duration || 0) * 1000);
                  
                  console.log(`🔍 Searching for recording (call time: ${new Date(callTime).toLocaleTimeString()})`);
                  
                  const recordingResult = await CallMonitor.findRecordingByCallTime({
                    callStartTime: callTime,
                    callEndTime: callEndTime,
                    phoneNumber: latestLog.phone_number
                  });
                  
                  console.log(`🔍 Found ${recordingResult.count} recordings, bestMatch: ${recordingResult.bestMatch ? 'YES' : 'NO'}`);
                  
                  if (recordingResult.bestMatch && recordingResult.recordings.length > 0) {
                    const recording = recordingResult.recordings[0];
                    console.log(`📤 Found recording! File: ${recording.fileName}`);
                    console.log(`📂 File path: ${recording.filePath}`);
                    
                    // Read file as blob with timeout
                    console.log('🔄 Converting file path to URI...');
                    const fileUri = Capacitor.convertFileSrc(recording.filePath);
                    console.log(`📍 File URI: ${fileUri}`);
                    
                    console.log('📥 Fetching file as blob...');
                    
                    // Create fetch with 15 second timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => {
                      console.error('⏱️ Blob fetch timeout after 15s');
                      controller.abort();
                    }, 15000);
                    
                    let response;
                    try {
                      response = await fetch(fileUri, { signal: controller.signal });
                      clearTimeout(timeoutId);
                      console.log(`📊 Fetch response status: ${response.status} ${response.statusText}`);
                    } catch (fetchError: any) {
                      clearTimeout(timeoutId);
                      throw new Error(`Failed to fetch file: ${fetchError.message}`);
                    }
                    
                    if (!response.ok) {
                      throw new Error(`Fetch failed with status ${response.status}`);
                    }
                    
                    console.log('🔄 Converting to blob...');
                    const blob = await response.blob();
                    console.log(`📦 Blob created: ${blob.size} bytes, type: ${blob.type}`);
                    
                    if (blob.size === 0) {
                      throw new Error('Blob is empty (0 bytes)');
                    }
                    
                    // Upload to Supabase and sync to LMS, passing original file path for native optimization
                    console.log('☁️ Starting Supabase upload...');
                    const uploadResult = await uploadAndSyncToLMS(
                      blob,
                      recording.fileName,
                      latestLog.duration || 0,
                      recording.filePath  // Pass original file path for native upload with DNS over HTTPS
                    );
                    
                    if (uploadResult.url) {
                      console.log('✅ Auto-upload successful!', uploadResult.url);
                      if (uploadResult.sentToLMS) {
                        console.log('✅ Recording sent to LMS!');
                      } else {
                        console.log('⚠️ Uploaded to Supabase but not synced with LMS');
                      }
                    }
                  } else if (attempt < maxAttempts) {
                    // Recording not indexed yet, retry after delay
                    console.log(`⏳ Recording not indexed yet, retrying in 3s (attempt ${attempt}/${maxAttempts})...`);
                    setTimeout(() => tryUploadWithRetry(attempt + 1, maxAttempts), 3000);
                  } else {
                    console.log(`❌ Recording not found after ${maxAttempts} attempts`);
                  }
                } catch (uploadError) {
                  console.error(`❌ Auto-upload error (attempt ${attempt}):`, uploadError);
                  if (attempt < maxAttempts) {
                    console.log(`⏳ Retrying after error in 3s...`);
                    setTimeout(() => tryUploadWithRetry(attempt + 1, maxAttempts), 3000);
                  }
                }
              };
              
              // Start upload with retry
              tryUploadWithRetry();
            }, CALL_END_REFRESH_DELAY_MS);
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
    }, AUTO_REFRESH_INTERVAL_MS);

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
    loadTime,
    isSlowLoad,
  };
};
