import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '@/store';
import { callLogApi } from '@/lib/api';
import { DashboardFilters, CallLog } from '@/types';
import { isMockMode } from '@/lib/supabase';
import { LEAD_MANAGEMENT_ENABLED } from '@/config/env';
import { Capacitor } from '@capacitor/core';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';
import { uploadAndSyncToLMS } from '@/services/supabaseUpload';
import { handleOutgoingCall } from '@/services/googleDriveService';
import { lookupPhoneNumber } from '@/services/phoneNumberLookup';
import { showLeadNotification } from '@/services/leadNotificationService';

// Performance constants
const LOAD_TIMEOUT_MS = 3000; // 3 second timeout for loading
const AUTO_REFRESH_INTERVAL_MS = 30000; // 30 seconds
const CALL_END_REFRESH_DELAY_MS = 2000; // Wait for call log to be written
const BLOB_FETCH_TIMEOUT_MS = 8000; // 8 second timeout for blob fetch (reduced from 15s)
const MAX_UPLOAD_RETRIES = 5; // Reduced from 10 to 5 for faster failure detection

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
  const { callLogs, setCallLogs, filters, isLoading, setIsLoading, user } = useStore();
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
  const uploadingRecordings = useRef<Set<string>>(new Set()); // Track uploads in progress to prevent duplicates
  const uploadedRecordings = useRef<Set<string>>(new Set()); // Track completed uploads
  const processingCallEnd = useRef<boolean>(false); // Prevent duplicate call_ended processing
  const activeTimeoutId = useRef<number | null>(null); // Track active setTimeout ID

  // Helper to gracefully handle missing data
  const sanitizeCallLog = (log: any): CallLog => {
    // Generate a temporary ID for local use (UUID format)
    const tempId = log.id && log.id.includes('-') 
      ? log.id // Already a UUID
      : `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: tempId,
      native_call_id: log.id || log.native_call_id || undefined, // Store original Android ID
      user_id: log.user_id || user?.id, // Let database default handle if undefined
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
            user_id: user?.id, // Let database default handle if undefined
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
          // Silent refresh without forcing - phoneStateChanged will handle uploads
          fetchCallLogs(filters, true, false);
        });
        
        // Listen for phone state changes
        const phoneStateListener = await CallMonitor.addListener('phoneStateChanged', async (data) => {
          console.log('📞 Phone state changed:', data);
          console.log('🔍 DEBUG - Phone state data:', JSON.stringify(data));
          console.log('🔍 DEBUG - data.type:', data.type);
          console.log('🔍 DEBUG - data.state:', (data as any).state);
          
          // ============================================================
          // ✅ LMS INTEGRATION: Detect outgoing call start
          // ============================================================
          if (data.type === 'outgoing_call_started' || 
              (data as any).state === 'OFFHOOK' || 
              data.type === 'call_started') {
            console.log('📞 ========================================');
            console.log('📞 [OUTGOING CALL DETECTED]');
            console.log('   Phone:', (data as any).phoneNumber);
            console.log('   Type:', data.type);
            console.log('📞 ========================================');
            
            try {
              const phoneNumber = (data as any).phoneNumber || (data as any).number;
              if (phoneNumber) {
                console.log('🔍 Checking if this call is from LMS...');
                await handleOutgoingCall(phoneNumber, new Date());
              } else {
                console.warn('⚠️ No phone number in call data');
              }
            } catch (error) {
              console.error('❌ Error handling outgoing call for LMS:', error);
            }
          }
          // ============================================================
          
          if (data.type === 'call_ended') {
            console.log('✅ ENTERED call_ended block!');
            
            // Prevent duplicate processing if event fires multiple times
            if (processingCallEnd.current) {
              console.log('⚠️ Already processing call_ended event, skipping duplicate');
              return;
            }
            
            // Cancel any existing timeout
            if (activeTimeoutId.current !== null) {
              console.log('⚠️ Cancelling existing timeout:', activeTimeoutId.current);
              clearTimeout(activeTimeoutId.current);
              activeTimeoutId.current = null;
            }
            
            processingCallEnd.current = true;
            console.log('⏰ Processing call end - will check lead after delay');
            console.log('🧪 Current time:', new Date().toLocaleTimeString());
            
            // Use Promise-based delay instead of setTimeout to avoid event listener issues
            (async () => {
              try {
                console.log('⏰ Waiting', CALL_END_REFRESH_DELAY_MS, 'ms for call log to be written...');
                await new Promise(resolve => setTimeout(resolve, CALL_END_REFRESH_DELAY_MS));
                console.log('⏰⏰⏰ DELAY COMPLETE! Starting lead check...');
                console.log('⏰ Inside delay callback, starting lead check process...');
                console.log('Call ended, force refreshing to get new recording...');
                
                // On native platforms (Android/iOS), WorkManager handles uploads automatically
                // Skip JavaScript upload to prevent duplicate uploads
                const isNativePlatform = Capacitor.isNativePlatform();
                if (isNativePlatform) {
                  try {
                    const autoUploadConfig = await CallMonitor.getAutoUploadConfig();
                    if (autoUploadConfig.enabled && autoUploadConfig.configured) {
                      console.log('✅ Native auto-upload is enabled - WorkManager will handle upload');
                      console.log('⏭️ Skipping JavaScript upload to prevent duplicate');
                      
                      // ✨ IMPORTANT: Check phone number and show notification even when native upload handles the file
                      if (LEAD_MANAGEMENT_ENABLED) {
                        try {
                          console.log('🔍 [Lead Check] Checking phone number after native upload...');
                          
                          // Refresh to get latest call log
                          await fetchCallLogs(filters, true, true);
                          const latestLog = callLogsRef.current?.[0];
                          
                          console.log('🔍 [Lead Check] DEBUG - user?.id:', user?.id);
                          console.log('🔍 [Lead Check] DEBUG - latestLog?.phone_number:', latestLog?.phone_number);
                          console.log('🔍 [Lead Check] DEBUG - latestLog:', latestLog);
                          
                          if (latestLog?.phone_number) {
                            // Work with or without user authentication
                            const lookupResult = await lookupPhoneNumber(latestLog.phone_number, user?.id);
                            console.log('📋 [Lead Check] Lookup result:', {
                              phone: latestLog.phone_number,
                              foundInContacts: lookupResult.foundInContacts,
                              foundInLeads: lookupResult.foundInLeads,
                              foundInLMS: lookupResult.foundInLMS
                            });
                            
                            // Add delay to prevent permission conflict (Android needs time to clean up contacts permission UI)
                            console.log('⏳ [Lead Check] Waiting 800ms before notification (prevent permission conflict)...');
                            await new Promise(resolve => setTimeout(resolve, 800));
                            
                            // Show notification for ALL cases (new lead, existing lead, partial match, etc.)
                            console.log('📢 [Lead Check] Showing notification for phone:', latestLog.phone_number);
                            showLeadNotification(lookupResult, (action) => {
                              console.log('🔔 [Lead Check] User clicked notification action:', action);
                              // Dashboard component handles the action via useLeadManagement hook
                            });
                          } else {
                            console.warn('⚠️ [Lead Check] Cannot check lead - missing phone number');
                            console.warn('   latestLog?.phone_number:', latestLog?.phone_number);
                          }
                        } catch (leadCheckError) {
                          console.error('⚠️ Error checking lead after native upload:', leadCheckError);
                          // Don't fail if lead check fails
                        }
                      } else {
                        console.log('🚫 [Lead Check] Feature disabled via feature flag');
                      }
                      
                      processingCallEnd.current = false;
                      return;
                    }
                  } catch (error) {
                    console.warn('⚠️ Could not check auto-upload config, proceeding with JS upload:', error);
                  }
                }
                
                // Refresh call logs first to get the new recording
                await fetchCallLogs(filters, true, true);
                
                // Retry function to find and upload recording using findRecordingByCallTime
                const tryUploadWithRetry = async (attempt: number = 1, maxAttempts: number = MAX_UPLOAD_RETRIES): Promise<void> => {
                // Get latest call from state (already refreshed)
                const latestLog = callLogsRef.current?.[0];
                
                if (!latestLog) {
                  console.log('⚠️ No call logs found');
                  return;
                }
                
                // Check if already uploaded to cloud storage (not just local file path)
                // Local paths: file://, content://, /storage/
                // Cloud URLs: https://...supabase.co/storage/...
                const isCloudUrl = latestLog.recording_url && 
                                   (latestLog.recording_url.includes('supabase.co/storage') || 
                                    latestLog.recording_url.startsWith('https://'));
                
                if (isCloudUrl || uploadedRecordings.current.has(latestLog.id)) {
                  console.log('⏭️ Recording already uploaded to cloud storage, skipping');
                  return;
                }
                
                if (uploadingRecordings.current.has(latestLog.id)) {
                  console.log('⏭️ Recording upload already in progress, skipping duplicate');
                  return;
                }
                
                try {
                  console.log(`📤 Attempting to upload recording (attempt ${attempt}/${maxAttempts})...`);
                  
                  // Mark as uploading
                  uploadingRecordings.current.add(latestLog.id);
                  
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
                    
                    // Read file using XMLHttpRequest (better timeout support than fetch)
                    console.log('📥 Reading file with XMLHttpRequest...');
                    
                    let blob: Blob;
                    try {
                      const fileUri = Capacitor.convertFileSrc(recording.filePath);
                      console.log('📁 File URI:', fileUri);
                      
                      // Use XMLHttpRequest for reliable timeout
                      const xhr = new XMLHttpRequest();
                      const xhrPromise = new Promise<Blob>((resolve, reject) => {
                        xhr.timeout = BLOB_FETCH_TIMEOUT_MS;
                        xhr.responseType = 'blob';
                        
                        xhr.onload = () => {
                          if (xhr.status === 200) {
                            console.log('✅ File loaded, size:', xhr.response?.size || 0, 'bytes');
                            resolve(xhr.response);
                          } else {
                            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                          }
                        };
                        
                        xhr.onerror = () => reject(new Error('Network error'));
                        xhr.ontimeout = () => reject(new Error(`Timeout after ${BLOB_FETCH_TIMEOUT_MS}ms`));
                        xhr.onabort = () => reject(new Error('Request aborted'));
                        
                        xhr.open('GET', fileUri);
                        xhr.send();
                      });
                      
                      blob = await xhrPromise;
                      console.log(`📦 Blob created: ${blob.size} bytes, type: ${blob.type}`);
                      
                      if (!blob || blob.size === 0) {
                        throw new Error('Blob is empty (0 bytes)');
                      }
                    } catch (blobError: any) {
                      console.error('❌ File read error:', blobError);
                      throw new Error(`Failed to read file: ${blobError.message}`);
                    }
                    
                    // Upload to Supabase and sync to LMS, passing original file path for native optimization
                    console.log('☁️ Starting Supabase upload...');
                    console.log('📦 Blob size for upload:', blob.size, 'bytes');
                    console.log('📁 Original file path:', recording.filePath);
                    
                    let uploadResult;
                    try {
                      uploadResult = await uploadAndSyncToLMS(
                        blob,
                        recording.fileName,
                        latestLog.duration || 0,
                        recording.filePath,  // Pass original file path for native upload with DNS over HTTPS
                        latestLog.phone_number  // Pass phone number for LMS context check
                      );
                      console.log('📡 Upload result received:', JSON.stringify(uploadResult));
                    } catch (uploadError: any) {
                      console.error('❌ Upload function threw error:', uploadError);
                      throw uploadError;
                    }
                    
                    if (!uploadResult) {
                      throw new Error('Upload result is null or undefined');
                    }
                    
                    if (!uploadResult.success) {
                      throw new Error('Upload was not successful');
                    }
                    
                    if (uploadResult.url) {
                      console.log('✅ Auto-upload successful!', uploadResult.url);
                      
                      // ✅ FIX #2: Save recording URL to database (with full call log data for upsert)
                      try {
                        console.log('💾 Saving recording URL to database...');
                        await callLogApi.updateCallLog(latestLog.id, {
                          recording_url: uploadResult.url,
                          has_recording: true,
                          native_call_id: latestLog.native_call_id, // Include native Android ID
                          // Include full call log data for upsert fallback
                          phone_number: latestLog.phone_number,
                          contact_name: latestLog.contact_name,
                          call_type: latestLog.call_type,
                          timestamp: latestLog.timestamp,
                          duration: latestLog.duration,
                          device_id: latestLog.device_id,
                          device_platform: latestLog.device_platform,
                          user_id: latestLog.user_id || user?.id, // Let database default handle if undefined
                        });
                        console.log('✅ Recording URL saved to database!');
                        
                        // Mark as uploaded successfully
                        uploadedRecordings.current.add(latestLog.id);
                        uploadingRecordings.current.delete(latestLog.id);
                        
                        // Update local state immediately
                        const updatedLogs = callLogsRef.current.map(log => 
                          log.id === latestLog.id 
                            ? { ...log, recording_url: uploadResult.url, has_recording: true }
                            : log
                        );
                        callLogsRef.current = updatedLogs;
                        setCallLogs(updatedLogs);
                        
                        if (uploadResult.sentToLMS) {
                          console.log('✅ Recording sent to LMS!');
                        } else {
                          console.log('⚠️ Uploaded to Supabase but not synced with LMS');
                        }
                        
                        // ✨ NEW: Check phone number after successful upload
                        if (LEAD_MANAGEMENT_ENABLED) {
                          try {
                            console.log('🔍 [Lead Check] Checking phone number after call end...');
                            if (latestLog.phone_number) {
                              // Work with or without user authentication
                              const lookupResult = await lookupPhoneNumber(latestLog.phone_number, user?.id);
                              
                              console.log('📋 [Lead Check] Lookup result:', {
                                phone: latestLog.phone_number,
                                foundInContacts: lookupResult.foundInContacts,
                                foundInLeads: lookupResult.foundInLeads,
                                foundInLMS: lookupResult.foundInLMS
                              });
                              
                              // Add delay to prevent permission conflict (Android needs time to clean up contacts permission UI)
                              console.log('⏳ [Lead Check] Waiting 800ms before notification (prevent permission conflict)...');
                              await new Promise(resolve => setTimeout(resolve, 800));
                              
                              // Show notification for ALL cases (new lead, existing lead, partial match, etc.)
                              console.log('📢 [Lead Check] Showing notification for phone:', latestLog.phone_number);
                              showLeadNotification(lookupResult, (action) => {
                                console.log('🔔 [Lead Check] User clicked notification action:', action);
                                // Dashboard component handles the action via useLeadManagement hook
                              });
                            }
                          } catch (leadCheckError) {
                            console.error('⚠️ Error checking lead after upload:', leadCheckError);
                            // Don't fail the upload if lead check fails
                          }
                        } else {
                          console.log('🚫 [Lead Check] Feature disabled via feature flag');
                        }
                        
                      } catch (dbError) {
                        console.error('❌ Failed to save recording URL to database:', dbError);
                        // Still mark as uploaded to prevent retries
                        uploadedRecordings.current.add(latestLog.id);
                        uploadingRecordings.current.delete(latestLog.id);
                      }
                    } else {
                      // Upload failed, remove from progress
                      uploadingRecordings.current.delete(latestLog.id);
                    }
                  } else if (attempt < maxAttempts) {
                    // Recording not indexed yet, retry after delay
                    console.log(`⏳ Recording not indexed yet, retrying in 3s (attempt ${attempt}/${maxAttempts})...`);
                    uploadingRecordings.current.delete(latestLog.id); // Remove from progress before retry
                    setTimeout(() => tryUploadWithRetry(attempt + 1, maxAttempts), 3000);
                  } else {
                    console.log(`❌ Recording not found after ${maxAttempts} attempts`);
                    uploadingRecordings.current.delete(latestLog.id); // Remove from progress
                  }
                } catch (uploadError) {
                  console.error(`❌ Auto-upload error (attempt ${attempt}):`, uploadError);
                  uploadingRecordings.current.delete(latestLog.id); // Remove from progress
                  if (attempt < maxAttempts) {
                    console.log(`⏳ Retrying after error in 3s...`);
                    setTimeout(() => tryUploadWithRetry(attempt + 1, maxAttempts), 3000);
                  }
                }
              };
              
              // Start upload with retry
              tryUploadWithRetry();
              } catch (error: any) {
                console.error('❌❌❌ ERROR IN DELAY CALLBACK:', error);
                console.error('Error stack:', error?.stack);
              } finally {
                // Reset processing flag after upload attempt completes
                processingCallEnd.current = false;
                console.log('✅ Lead check/upload process completed, ready for next call');
              }
            })(); // Immediately invoke the async function
            
            console.log('✅ Async lead check scheduled');
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
