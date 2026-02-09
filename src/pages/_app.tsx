import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapacitorApp } from '@capacitor/app';
import { testLMSConnection } from '@/services/lmsApi';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize Capacitor plugins
    if (Capacitor.isNativePlatform()) {
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
  }, []);

  return <Component {...pageProps} />;
}
