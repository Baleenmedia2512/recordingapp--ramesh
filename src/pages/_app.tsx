import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapacitorApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { testLMSConnection } from '@/services/lmsApi';
import { startQueueManager } from '@/services/uploadQueueManager';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/env';

export default function App({ Component, pageProps }: AppProps) {
  // Monitor network status (triggers upload retry on reconnect)
  const networkStatus = useNetworkStatus();

  useEffect(() => {
    // Initialize Capacitor plugins
    if (Capacitor.isNativePlatform()) {
      // Store Supabase credentials in SharedPreferences for native code access
      // IMPORTANT: Use native method instead of Preferences to ensure immediate persistence
      (async () => {
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
          try {
            console.log('📝 Saving Supabase credentials via native method...');
            console.log('📝 SUPABASE_URL:', SUPABASE_URL);
            console.log('📝 SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY.substring(0, 30) + '...');
            
            // Call native method to save credentials directly to SharedPreferences
            const result = await CallMonitor.saveSupabaseCredentials({
              supabaseUrl: SUPABASE_URL,
              supabaseKey: SUPABASE_ANON_KEY
            });
            
            console.log('✅ Native save result:', result);
            console.log('✅ Supabase credentials saved to native SharedPreferences');
            console.log('✅ PhoneLookupWorker will now be able to access credentials');
          } catch (error) {
            console.error('❌ Failed to save Supabase credentials via native method:', error);
            console.error('❌ PhoneLookupWorker will NOT be able to access database');
          }
        } else {
          console.warn('⚠️ Supabase credentials not available!');
          console.warn('⚠️ SUPABASE_URL:', SUPABASE_URL);
          console.warn('⚠️ SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'EXISTS' : 'MISSING');
        }
      })();
      
      // Set status bar style
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#0ea5e9' });

      // Handle back button on Android
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          CapacitorApp.exitApp();
        } else {
          window.history.back();
        }
      });
      
      // Configure native auto-upload (uploads recordings even when app is in background)
      // This allows recording upload without returning to Call Monitor app
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        CallMonitor.configureAutoUpload({
          supabaseUrl: SUPABASE_URL,
          supabaseKey: SUPABASE_ANON_KEY,
          enabled: true,
          bucketName: 'recordings',
          storagePath: 'call-recordings'
        }).then((result) => {
          console.log('✅ Native auto-upload configured:', result.message);
        }).catch((error) => {
          console.warn('⚠️ Failed to configure native auto-upload:', error);
        });
        
        // Listen for auto-upload status events
        CallMonitor.addListener('autoUploadStatus', (data) => {
          console.log('📤 Auto-upload status:', data.status);
          if (data.status === 'success') {
            console.log('✅ Recording auto-uploaded:', data.url);
          } else if (data.status === 'failed' || data.status === 'error') {
            console.warn('⚠️ Auto-upload failed:', data.message);
          }
        });
      }
    }

    // Test LMS connection on app startup
    testLMSConnection().then((connected) => {
      if (connected) {
        console.log('✅ LMS integration ready');
      } else {
        console.log('⚠️ LMS not reachable - app will work in standalone mode');
      }
    }).catch((error) => {
      console.error('❌ Error testing LMS connection:', error);
    });

    // Start upload queue manager for automatic retry
    console.log('🚀 Starting upload queue manager...');
    startQueueManager();
    console.log('✅ Upload queue manager started');
  }, []);

  // Log network status changes
  useEffect(() => {
    if (networkStatus.isOnline) {
      console.log('🌐 Network status: ONLINE');
    } else {
      console.log('📵 Network status: OFFLINE');
    }
  }, [networkStatus.isOnline]);

  return <Component {...pageProps} />;
}
