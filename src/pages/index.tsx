import React, { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useLMSIntegration } from '@/hooks/useLMSIntegration';
import Dashboard from '@/components/Dashboard';
import PermissionsManager from '@/components/PermissionsManager';
import AddLeadModal from '@/components/AddLeadModal';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';
import { LocalNotifications } from '@capacitor/local-notifications';
import { initializeAutoAuth } from '@/lib/autoAuth';
import { autoSyncIfOnline } from '@/lib/offlineSync';
import { useStore } from '@/store';

export default function Home() {
  const { 
    allRequiredGranted, 
    platform, 
    isChecking, 
    permissionStatus,
    platformCapabilities 
  } = usePermissions();
  
  const { lmsStatus, initializeLMSHttpServer } = useLMSIntegration();
  const { setUser } = useStore();
  
  const [appReady, setAppReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [leadPhoneNumber, setLeadPhoneNumber] = useState<string>('');
  const [leadActionType, setLeadActionType] = useState<string>('');

  // Auto-authenticate on app start (no login required)
  useEffect(() => {
    const setupAuth = async () => {
      try {
        console.log('🔐 Starting auto-authentication...');
        const authResult = await initializeAutoAuth();
        console.log('✅ Auto-authenticated:', authResult.userId);
        
        // Update store with authenticated user
        setUser({
          id: authResult.userId,
          email: authResult.email,
          full_name: 'Call Monitor User',
          isGuest: false,
        });
        
        // Mark auth as ready
        setAuthReady(true);
        console.log('✅ Auth ready for database operations');
      } catch (error) {
        console.error('❌ Auto-auth failed:', error);
        // Still mark as ready so app doesn't hang
        setAuthReady(true);
      }
    };

    setupAuth();
  }, [setUser]);

  // Track app initialization time for performance and initialize LMS
  useEffect(() => {
    const startTime = performance.now();
    
    // Mark app as ready when permissions are checked
    if (!isChecking) {
      const loadTime = performance.now() - startTime;
      console.log(`App initialized in ${loadTime.toFixed(2)}ms`);
      
      // Initialize LMS HTTP server
      initializeLMSHttpServer().then(success => {
        console.log(`🏢 LMS Server initialization: ${success ? 'SUCCESS' : 'FAILED'}`);
      });
      
      setAppReady(true);
    }
  }, [isChecking, initializeLMSHttpServer]);

  // Check for pending lead notification data when app opens
  const checkPendingLeadNotification = async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const result = await CallMonitor.checkPendingLeadNotification();
      
      if (result.hasPending && result.phoneNumber) {
        console.log('📝 Opening AddLeadForm for:', result.phoneNumber);
        setLeadPhoneNumber(result.phoneNumber);
        setLeadActionType(result.actionType || 'ADD_BOTH');
        setShowAddLead(true);
      }
    } catch (e) {
      console.error('Error checking pending notification:', e);
    }
  };

  // Listen for app state changes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Check on initial load
    checkPendingLeadNotification();

    // Check when app comes to foreground
    const stateListener = CapacitorApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        console.log('📱 App became active, checking for pending notification...');
        checkPendingLeadNotification();
        
        // Try to sync offline queue when app resumes
        console.log('🔄 App resumed, attempting offline queue sync...');
        autoSyncIfOnline().catch(err => {
          console.log('⚠️ Auto-sync skipped:', err?.message || 'Still offline');
        });
      }
    });

    return () => {
      stateListener.then(listener => listener.remove());
    };
  }, []);

  // Listen for notification actions (when user clicks notification)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    console.log('🔔 Setting up notification action listener...');
    
    const listener = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (notification) => {
        console.log('🔔 [NOTIFICATION CLICK] Action performed:', JSON.stringify(notification));
        const phoneNumber = notification.notification.extra?.phoneNumber;
        const action = notification.notification.extra?.action;
        
        if (phoneNumber && action) {
          console.log('📝 [NOTIFICATION CLICK] Opening modal for:', phoneNumber, 'action:', action);
          setLeadPhoneNumber(phoneNumber);
          setLeadActionType(action);
          setShowAddLead(true);
        } else {
          console.warn('⚠️ [NOTIFICATION CLICK] Missing data - phoneNumber:', phoneNumber, 'action:', action);
        }
      }
    );

    return () => {
      console.log('🔔 Removing notification action listener...');
      listener.then(l => l.remove());
    };
  }, []);

  // Get platform-specific info for header
  const getPlatformBadge = () => {
    if (!Capacitor.isNativePlatform()) {
      return { icon: '🌐', label: 'Web', color: 'bg-gray-100 text-gray-600' };
    }
    if (platform === 'android') {
      return { icon: '🤖', label: 'Android', color: 'bg-green-100 text-green-700' };
    }
    return { icon: '🍎', label: 'iOS', color: 'bg-purple-100 text-purple-700' };
  };

  const platformBadge = getPlatformBadge();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-primary-600">📞 Call Monitor</h1>
              <span className={`text-sm px-3 py-1 rounded-full ${platformBadge.color}`}>
                {platformBadge.icon} {platformBadge.label}
              </span>
              {allRequiredGranted && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  ✓ Active
                </span>
              )}
              {lmsStatus.serverStatus.isRunning && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  🏢 LMS Ready
                </span>
              )}
            </div>
            
            {/* Platform Capabilities Quick View */}
            {Capacitor.isNativePlatform() && (
              <div className="hidden md:flex items-center gap-2 text-xs">
                <span className={platformCapabilities.canAccessCallLogs ? 'text-green-600' : 'text-gray-400'}>
                  {platformCapabilities.canAccessCallLogs ? '✓' : '✗'} Logs
                </span>
                <span className={platformCapabilities.canRecordCalls ? 'text-green-600' : 'text-gray-400'}>
                  {platformCapabilities.canRecordCalls ? '✓' : '✗'} Recording
                </span>
                <span className={platformCapabilities.canSyncData ? 'text-green-600' : 'text-gray-400'}>
                  {platformCapabilities.canSyncData ? '✓' : '✗'} Sync
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Loading State */}
        {isChecking && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
            <p className="text-gray-600">Checking permissions...</p>
            <p className="text-xs text-gray-400 mt-1">This should only take a moment</p>
          </div>
        )}

        {/* App Ready State */}
        {!isChecking && appReady && (
          <>
            {/* iOS Limitations Banner (always show on iOS) */}
            {platform === 'ios' && (
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍎</span>
                  <div>
                    <p className="font-semibold text-purple-900">iOS Mode</p>
                    <p className="text-sm text-purple-700">
                      Due to Apple restrictions, you can only view synced call logs from Android devices.
                      Native call recording is not available on iOS.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Show permissions manager on native platforms */}
            {Capacitor.isNativePlatform() && (
              <PermissionsManager />
            )}
            
            {/* Show dashboard when permissions are granted or on web */}
            {(!Capacitor.isNativePlatform() || allRequiredGranted) && (
              <Dashboard />
            )}

            {/* Blocked State - Native platform with no permissions */}
            {Capacitor.isNativePlatform() && !allRequiredGranted && permissionStatus === 'denied' && (
              <div className="mt-6 p-6 bg-gray-100 rounded-lg text-center">
                <span className="text-4xl mb-4 block">🔐</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  App Requires Permissions
                </h3>
                <p className="text-gray-600 text-sm">
                  This app cannot display call logs without the required permissions.
                  Please grant the permissions above to continue.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-600">© {new Date().getFullYear()} Call Monitor. All rights reserved.</p>
              <p className="text-xs text-gray-500 mt-1">
                Your privacy is important. All data is encrypted and stored locally.
              </p>
            </div>
            
            {/* Platform Status */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className={`flex items-center gap-1 ${platformBadge.color} px-2 py-1 rounded`}>
                {platformBadge.icon} {platformBadge.label}
              </span>
              {allRequiredGranted ? (
                <span className="flex items-center gap-1 text-green-600">
                  ✓ Permissions OK
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-600">
                  ⚠ Permissions Required
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* Add Lead Modal */}
      {showAddLead && (
        <AddLeadModal
          phoneNumber={leadPhoneNumber}
          actionType={leadActionType}
          onClose={() => {
            setShowAddLead(false);
            setLeadPhoneNumber('');
            setLeadActionType('');
          }}
        />
      )}
    </div>
  );
}
