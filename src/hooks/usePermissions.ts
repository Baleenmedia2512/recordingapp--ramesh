import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Permission } from '@/types';

// Import the native plugin (will be created next)
let CallMonitorPlugin: any;

if (Capacitor.isNativePlatform()) {
  import('../plugins/CallMonitorPlugin').then((module) => {
    CallMonitorPlugin = module.CallMonitor;
  });
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const platform = Capacitor.getPlatform();

  const checkPermissions = async () => {
    if (!Capacitor.isNativePlatform() || !CallMonitorPlugin) {
      return;
    }

    setIsChecking(true);
    try {
      const result = await CallMonitorPlugin.checkPermissions();
      
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
            name: 'Record Audio',
            granted: result.recordAudio,
            required: true,
            description: 'Required to record call audio',
          },
          {
            name: 'Storage',
            granted: result.storage,
            required: true,
            description: 'Required to store call recordings',
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
    if (!Capacitor.isNativePlatform() || !CallMonitorPlugin) {
      return false;
    }

    try {
      const result = await CallMonitorPlugin.requestPermissions();
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

  const allRequiredGranted = permissions
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
