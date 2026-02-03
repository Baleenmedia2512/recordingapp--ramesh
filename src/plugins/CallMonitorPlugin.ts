import { registerPlugin } from '@capacitor/core';

export interface CallMonitorPlugin {
  // Permission methods
  checkPermissions(): Promise<{
    callLogs: boolean;
    phoneState: boolean;
    recordAudio: boolean;
    storage: boolean;
    microphone: boolean;
    network: boolean;
  }>;
  
  requestPermissions(): Promise<{ granted: boolean }>;

  // Call log methods
  getCallLogs(options: {
    limit?: number;
    offset?: number;
    fromDate?: string;
  }): Promise<{ logs: any[] }>;

  // Recording methods
  startRecording(): Promise<{ success: boolean }>;
  stopRecording(): Promise<{ success: boolean; filePath?: string }>;
  
  // Sync methods
  syncCallLogs(options: { logs: any[] }): Promise<{ success: boolean }>;
  
  // Device info
  getDeviceInfo(): Promise<{
    deviceId: string;
    deviceName: string;
    platform: string;
    osVersion: string;
  }>;
}

const CallMonitor = registerPlugin<CallMonitorPlugin>('CallMonitor', {
  web: () => import('./web').then(m => new m.CallMonitorWeb()),
});

export { CallMonitor };
