import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Permission } from '@/types';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const platform = Capacitor.getPlatform();

  const checkPermissions = async () => {
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
      return;
    }

    setIsChecking(true);
    try {
      const result = await CallMonitor.checkAllPermissions();
      
      if (platform === 'android') {
        setPermissions([
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
        ]);
      } else if (platform === 'ios') {
        setPermissions([
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
        ]);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const requestPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const result = await CallMonitor.requestAllPermissionsPlugin();
      await checkPermissions();
      return result.granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  const allRequiredGranted = permissions.length > 0 && 
    permissions
      .filter(p => p.required)
      .every(p => p.granted);

  return {
    permissions,
    isChecking,
    allRequiredGranted,
    checkPermissions,
    requestPermissions,
    platform,
  };
};
