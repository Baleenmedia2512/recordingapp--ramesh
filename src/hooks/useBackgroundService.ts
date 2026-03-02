import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';

interface ServiceStatus {
  isRunning: boolean;
  batteryOptimized: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to manage the background call monitoring service
 * Auto-starts service on mount if on native platform
 */
export function useBackgroundService() {
  const [status, setStatus] = useState<ServiceStatus>({
    isRunning: false,
    batteryOptimized: true,
    isLoading: true,
    error: null,
  });

  // Check service status
  const checkStatus = async () => {
    if (!Capacitor.isNativePlatform()) {
      setStatus({
        isRunning: false,
        batteryOptimized: true,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      const [serviceResult, batteryResult] = await Promise.all([
        CallMonitor.isMonitoringServiceRunning(),
        CallMonitor.isBatteryOptimizationDisabled(),
      ]);

      setStatus({
        isRunning: serviceResult.running,
        batteryOptimized: !batteryResult.disabled,
        isLoading: false,
        error: null,
      });

      console.log('🔍 Service status:', {
        running: serviceResult.running,
        batteryOptimized: !batteryResult.disabled,
      });
    } catch (error: any) {
      console.error('❌ Failed to check service status:', error);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to check service status',
      }));
    }
  };

  // Start the service
  const startService = async () => {
    if (!Capacitor.isNativePlatform()) {
      console.warn('⚠️ Service only available on native platforms');
      return false;
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('🚀 Starting background monitoring service...');
      const result = await CallMonitor.startMonitoringService();
      
      console.log('✅ Service started:', result.message);
      
      // Refresh status
      await checkStatus();
      
      return true;
    } catch (error: any) {
      console.error('❌ Failed to start service:', error);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to start service',
      }));
      return false;
    }
  };

  // Stop the service
  const stopService = async () => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('🛑 Stopping background monitoring service...');
      const result = await CallMonitor.stopMonitoringService();
      
      console.log('✅ Service stopped:', result.message);
      
      // Refresh status
      await checkStatus();
      
      return true;
    } catch (error: any) {
      console.error('❌ Failed to stop service:', error);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to stop service',
      }));
      return false;
    }
  };

  // Request battery optimization exemption
  const requestBatteryExemption = async () => {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }

    try {
      console.log('🔋 Requesting battery optimization exemption...');
      const result = await CallMonitor.requestBatteryOptimizationExemption();
      
      console.log('✅ Battery exemption result:', result.message);
      
      // If granted, refresh status
      if (result.granted) {
        await checkStatus();
      }
      
      return result.granted;
    } catch (error: any) {
      console.error('❌ Failed to request battery exemption:', error);
      return false;
    }
  };

  // Auto-start service on mount (only on native platforms)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('📱 Native platform detected - checking service status...');
      
      checkStatus().then(async () => {
        // If service is not running, start it automatically
        if (!status.isRunning && !status.isLoading) {
          console.log('🚀 Service not running - auto-starting...');
          await startService();
        }
      });
    }
  }, []);

  return {
    status,
    startService,
    stopService,
    checkStatus,
    requestBatteryExemption,
    isNativePlatform: Capacitor.isNativePlatform(),
  };
}
