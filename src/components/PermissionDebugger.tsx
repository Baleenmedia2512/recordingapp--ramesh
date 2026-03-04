import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CallMonitor } from '@/plugins/CallMonitorPlugin';

export const PermissionDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    let info = '📊 Permission Diagnostics\n';
    info += '='.repeat(50) + '\n\n';

    try {
      // Platform info
      info += `Platform: ${Capacitor.getPlatform()}\n`;
      info += `Native: ${Capacitor.isNativePlatform()}\n\n`;

      if (!Capacitor.isNativePlatform()) {
        info += '❌ Not on native platform\n';
        setDebugInfo(info);
        setIsLoading(false);
        return;
      }

      // Check permissions
      info += '🔍 Checking permissions...\n';
      const permissions = await CallMonitor.checkAllPermissions();
      info += JSON.stringify(permissions, null, 2) + '\n\n';

      // Device info
      info += '📱 Device info...\n';
      try {
        const deviceInfo = await CallMonitor.getDeviceInfo();
        info += JSON.stringify(deviceInfo, null, 2) + '\n\n';
      } catch (e: any) {
        info += `Error: ${e.message}\n\n`;
      }

      // Try to get call logs
      info += '📞 Testing call log access...\n';
      try {
        const callLogs = await CallMonitor.getCallLogs({ limit: 1 });
        if (callLogs && callLogs.callLogs) {
          info += `✅ Successfully retrieved ${callLogs.callLogs.length} call log(s)\n`;
          if (callLogs.callLogs.length > 0) {
            info += 'Sample: ' + JSON.stringify(callLogs.callLogs[0], null, 2) + '\n';
          }
        } else {
          info += '❌ No call logs returned\n';
        }
      } catch (e: any) {
        info += `❌ Error: ${e.message}\n`;
      }

      info += '\n' + '='.repeat(50) + '\n';
      info += 'Diagnostics complete!';

    } catch (error: any) {
      info += `\n❌ Error during diagnostics: ${error.message}\n`;
      info += `Stack: ${error.stack}\n`;
    }

    setDebugInfo(info);
    setIsLoading(false);
  };

  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">🔧 Debug Tools</h3>
        <button
          onClick={runDiagnostics}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
        >
          {isLoading ? 'Running...' : 'Run Diagnostics'}
        </button>
      </div>

      {debugInfo && (
        <div className="bg-white rounded p-3 font-mono text-xs overflow-auto max-h-96 whitespace-pre-wrap">
          {debugInfo}
        </div>
      )}
    </div>
  );
};
