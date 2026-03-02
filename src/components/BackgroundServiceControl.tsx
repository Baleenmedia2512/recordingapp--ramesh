import React from 'react';
import { useBackgroundService } from '@/hooks/useBackgroundService';

/**
 * Component to display and control the background monitoring service
 * Shows service status and allows user to start/stop service
 */
export function BackgroundServiceControl() {
  const {
    status,
    startService,
    stopService,
    checkStatus,
    requestBatteryExemption,
    isNativePlatform,
  } = useBackgroundService();

  // Don't show on web
  if (!isNativePlatform) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📞</span>
          <div>
            <h3 className="font-semibold text-gray-900">Background Monitoring</h3>
            <p className="text-xs text-gray-600">24/7 call detection service</p>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          status.isRunning 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {status.isLoading ? '⏳ Checking...' : status.isRunning ? '✅ Running' : '⚫ Stopped'}
        </div>
      </div>

      {status.error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 mb-3 text-sm text-red-700">
          ⚠️ {status.error}
        </div>
      )}

      {status.batteryOptimized && status.isRunning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 mb-1">
                Battery Optimization Enabled
              </p>
              <p className="text-xs text-yellow-800 mb-2">
                Android may stop the service to save battery. Disable optimization for reliability.
              </p>
              <button
                onClick={requestBatteryExemption}
                className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
              >
                Disable Battery Optimization
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!status.isRunning ? (
          <button
            onClick={startService}
            disabled={status.isLoading}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
          >
            {status.isLoading ? '⏳ Starting...' : '▶️ Start Monitoring'}
          </button>
        ) : (
          <button
            onClick={stopService}
            disabled={status.isLoading}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
          >
            {status.isLoading ? '⏳ Stopping...' : '⏹️ Stop Monitoring'}
          </button>
        )}
        
        <button
          onClick={checkStatus}
          disabled={status.isLoading}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
        >
          🔄
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-600">Service Status:</span>
            <span className={`ml-1 font-medium ${status.isRunning ? 'text-green-600' : 'text-gray-600'}`}>
              {status.isRunning ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Battery:</span>
            <span className={`ml-1 font-medium ${!status.batteryOptimized ? 'text-green-600' : 'text-yellow-600'}`}>
              {status.batteryOptimized ? 'Optimized' : 'Unrestricted'}
            </span>
          </div>
        </div>
      </div>

      {status.isRunning && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2">
          <p className="text-xs text-blue-800">
            ℹ️ The service runs in the background and will restart automatically after device reboot.
            You can safely close the app.
          </p>
        </div>
      )}
    </div>
  );
}
