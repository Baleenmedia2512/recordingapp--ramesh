import { registerPlugin } from '@capacitor/core';

export interface RecordingInfo {
  filePath: string;
  fileName: string;
  phoneNumber: string;
  timestamp: string;
  duration?: number;
}

export interface RecordingScanInfo {
  manufacturer: string;
  model: string;
  androidVersion: number;
  recordingsFound: number;
  existingRecordingPaths: string[];
}

export interface CallMonitorPlugin {
  // Permission methods
  checkAllPermissions(): Promise<{
    callLogs: boolean;
    phoneState: boolean;
    contacts: boolean;
    recordAudio: boolean;
    storage: boolean;
    microphone: boolean;
    network: boolean;
    mediaAudio?: boolean; // Android 13+ specific
  }>;
  
  requestAllPermissionsPlugin(): Promise<{ granted: boolean }>;

  // Call log methods
  getCallLogs(options: {
    limit?: number;
    offset?: number;
    fromDate?: string;
    forceRefresh?: boolean;
  }): Promise<{ callLogs: any[] }>;

  // Recording detection methods
  getRecordings(options?: { forceRefresh?: boolean }): Promise<{ recordings: RecordingInfo[]; count: number }>;
  
  // Clear recordings cache (call when app resumes to get fresh data)
  clearRecordingsCache(): Promise<{ success: boolean }>;
  
  /**
   * Find recording by call timestamp using MediaStore API
   * This works on ALL Android devices regardless of where recordings are stored
   * @param options.callStartTime - Call start time in milliseconds
   * @param options.callEndTime - Call end time in milliseconds (optional, defaults to now)
   * @param options.phoneNumber - Phone number to match (optional, improves accuracy)
   */
  findRecordingByCallTime(options: {
    callStartTime: number;
    callEndTime?: number;
    phoneNumber?: string;
  }): Promise<{
    recordings: RecordingInfo[];
    count: number;
    bestMatch: string | null;
  }>;
  
  /**
   * Get detailed scan info for debugging recording detection
   * Returns device info and what recording paths exist
   */
  getRecordingScanInfo(): Promise<RecordingScanInfo>;

  // Call monitoring methods (auto-refresh)
  startListeningForCalls(): Promise<{ success: boolean; message: string }>;
  stopListeningForCalls(): Promise<{ success: boolean; message: string }>;

  // Recording methods
  startRecording(): Promise<{ success: boolean }>;
  stopRecording(): Promise<{ success: boolean; filePath?: string }>;
  
  // Google Drive upload method
  uploadRecordingToDrive(options: {
    filePath: string;
    fileName: string;
  }): Promise<{ success: boolean; fileUrl?: string; error?: string }>;
  
  // Sync methods
  syncCallLogs(options: { logs: any[] }): Promise<{ success: boolean }>;
  
  // Device info
  getDeviceInfo(): Promise<{
    deviceId: string;
    deviceName: string;
    platform: string;
    osVersion: string;
  }>;
  
  // Event listeners
  addListener(
    eventName: 'callLogChanged' | 'phoneStateChanged',
    listenerFunc: (data: any) => void
  ): Promise<any>;
  
  removeAllListeners(): Promise<void>;
}

const CallMonitor = registerPlugin<CallMonitorPlugin>('CallMonitor', {
  web: () => import('./web').then(m => new m.CallMonitorWeb()),
});

export { CallMonitor };
