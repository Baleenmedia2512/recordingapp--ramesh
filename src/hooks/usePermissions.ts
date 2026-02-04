import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Permission } from '@/types';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';

export type PermissionStatus = 'checking' | 'granted' | 'denied' | 'partial' | 'revoked' | 'unavailable';

export interface PlatformCapabilities {
  canAccessCallLogs: boolean;
  canRecordCalls: boolean;
  canAccessRecordings: boolean;
  canSyncData: boolean;
  limitations: string[];
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('checking');
  const [wasRevoked, setWasRevoked] = useState(false);
  const [denialMessage, setDenialMessage] = useState<string | null>(null);
  const previousPermissionsRef = useRef<Permission[]>([]);
  const platform = Capacitor.getPlatform();

  // Get platform-specific capabilities
  const getPlatformCapabilities = useCallback((): PlatformCapabilities => {
    if (platform === 'android') {
      return {
        canAccessCallLogs: true,
        canRecordCalls: true,
        canAccessRecordings: true,
        canSyncData: true,
        limitations: [],
      };
    } else if (platform === 'ios') {
      return {
        canAccessCallLogs: false,
        canRecordCalls: false,
        canAccessRecordings: false,
        canSyncData: true,
        limitations: [
          'iOS does not allow apps to access system call logs due to Apple privacy policies',
          'iOS does not allow recording of regular phone calls',
          'You can only view call logs synced from your Android devices',
          'Recording is only possible for VoIP calls (WhatsApp, Skype, etc.)',
        ],
      };
    }
    return {
      canAccessCallLogs: false,
      canRecordCalls: false,
      canAccessRecordings: false,
      canSyncData: true,
      limitations: [
        'Web browsers cannot access native phone features',
        'Install the app on Android for full functionality',
      ],
    };
  }, [platform]);

  const checkPermissions = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      // For web platform, set default permissions
      setPermissions([
        {
          name: 'Web Platform',
          granted: false,
          required: false,
          description: 'Native permissions not available on web. Install on Android or iOS for full features.',
        },
      ]);
      setPermissionStatus('unavailable');
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    try {
      const result = await CallMonitor.checkAllPermissions();
      console.log('Permission check result:', JSON.stringify(result));
      
      let newPermissions: Permission[] = [];
      
      if (platform === 'android') {
        newPermissions = [
          {
            name: 'Call Logs',
            granted: result.callLogs,
            required: true,
            description: 'Required to read your call history',
          },
          {
            name: 'Phone State',
            granted: result.phoneState,
            required: true,
            description: 'Required to detect incoming/outgoing calls',
          },
          {
            name: 'Contacts',
            granted: result.contacts || false,
            required: false,
            description: 'Optional: Shows contact names for phone numbers',
          },
          {
            name: 'Storage',
            granted: result.storage || false,
            required: false,
            description: 'Optional: Required to detect stored call recordings',
          },
          {
            name: 'Record Audio',
            granted: result.recordAudio,
            required: false,
            description: 'Optional: Required to record call audio',
          },
        ];
      } else if (platform === 'ios') {
        newPermissions = [
          {
            name: 'Microphone',
            granted: result.microphone,
            required: false,
            description: 'Required for VoIP call recording',
          },
          {
            name: 'Network',
            granted: result.network,
            required: true,
            description: 'Required to sync data',
          },
        ];
      }
      
      // Check for permission revocation
      if (previousPermissionsRef.current.length > 0) {
        const wasGrantedBefore = previousPermissionsRef.current
          .filter(p => p.required)
          .every(p => p.granted);
        const isGrantedNow = newPermissions
          .filter(p => p.required)
          .every(p => p.granted);
        
        if (wasGrantedBefore && !isGrantedNow) {
          setWasRevoked(true);
          setDenialMessage('Some permissions were revoked. Please re-enable them to continue using the app.');
        }
      }
      
      previousPermissionsRef.current = newPermissions;
      setPermissions(newPermissions);
      
      // Update permission status
      const requiredPermissions = newPermissions.filter(p => p.required);
      const allRequiredGranted = requiredPermissions.every(p => p.granted);
      const someGranted = requiredPermissions.some(p => p.granted);
      
      console.log('Required permissions:', requiredPermissions.map(p => `${p.name}: ${p.granted}`));
      console.log('All required granted:', allRequiredGranted);
      
      if (allRequiredGranted) {
        console.log('Setting permission status to GRANTED');
        setPermissionStatus('granted');
        setDenialMessage(null);
      } else if (someGranted) {
        console.log('Setting permission status to PARTIAL');
        setPermissionStatus('partial');
      } else {
        console.log('Setting permission status to DENIED');
        setPermissionStatus('denied');
      }
      
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionStatus('denied');
    } finally {
      setIsChecking(false);
    }
  }, [platform]);

  const requestPermissions = useCallback(async (): Promise<{ granted: boolean; deniedPermissions: string[] }> => {
    if (!Capacitor.isNativePlatform()) {
      return { granted: false, deniedPermissions: ['Native platform required'] };
    }

    setWasRevoked(false);
    setDenialMessage(null);

    try {
      const result = await CallMonitor.requestAllPermissionsPlugin();
      await checkPermissions();
      
      if (!result.granted) {
        const deniedPerms = permissions
          .filter(p => p.required && !p.granted)
          .map(p => p.name);
        
        if (deniedPerms.length > 0) {
          setDenialMessage(
            `The following permissions were denied: ${deniedPerms.join(', ')}. ` +
            'To use the app, please enable them in your device Settings > Apps > Call Monitor > Permissions.'
          );
        }
        
        return { granted: false, deniedPermissions: deniedPerms };
      }
      
      return { granted: true, deniedPermissions: [] };
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setDenialMessage('Failed to request permissions. Please try again or enable them manually in Settings.');
      return { granted: false, deniedPermissions: ['Error occurred'] };
    }
  }, [checkPermissions, permissions]);

  // Open device settings for permission management
  const openAppSettings = useCallback(async () => {
    try {
      // This will open app settings on the device
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor App plugin to open settings
        // Note: This requires implementing a native method or using a plugin
        console.log('Opening app settings...');
        // For now, show instructions
        setDenialMessage(
          'To change permissions manually: Go to Settings > Apps > Call Monitor > Permissions'
        );
      }
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  }, []);

  // Clear denial message
  const clearDenialMessage = useCallback(() => {
    setDenialMessage(null);
    setWasRevoked(false);
  }, []);

  // Check permissions on mount and when app resumes (for revocation detection)
  useEffect(() => {
    checkPermissions();
    
    // Listen for app resume to check if permissions were revoked
    const handleAppResume = () => {
      console.log('App resumed, checking permissions...');
      checkPermissions();
    };
    
    // Add listener for app state changes
    let removeListener: (() => void) | undefined;
    
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          handleAppResume();
        }
      }).then(listener => {
        removeListener = () => listener.remove();
      });
    }
    
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [checkPermissions]);

  const allRequiredGranted = permissions.length > 0 && 
    permissions
      .filter(p => p.required)
      .every(p => p.granted);

  const platformCapabilities = getPlatformCapabilities();

  return {
    permissions,
    isChecking,
    allRequiredGranted,
    permissionStatus,
    wasRevoked,
    denialMessage,
    platformCapabilities,
    checkPermissions,
    requestPermissions,
    openAppSettings,
    clearDenialMessage,
    platform,
  };
};
