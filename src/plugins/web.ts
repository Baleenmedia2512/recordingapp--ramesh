import { WebPlugin } from '@capacitor/core';
import type { CallMonitorPlugin, RecordingInfo, RecordingScanInfo } from './CallMonitorPlugin';

export class CallMonitorWeb extends WebPlugin implements CallMonitorPlugin {
  async checkAllPermissions(): Promise<any> {
    console.log('Web platform: Permissions not applicable');
    return {
      callLogs: false,
      phoneState: false,
      contacts: false,
      recordAudio: false,
      storage: false,
      microphone: false,
      network: true,
    };
  }

  async requestAllPermissionsPlugin(): Promise<{ granted: boolean }> {
    console.log('Web platform: Cannot request native permissions');
    return { granted: false };
  }

  async getCallLogs(options: any): Promise<{ callLogs: any[] }> {
    console.log('Web platform: Returning mock call logs', options);
    return {
      callLogs: [
        {
          id: '1',
          phone_number: '+1234567890',
          contact_name: 'John Doe',
          call_type: 'incoming',
          timestamp: new Date().toISOString(),
          duration: 125,
          has_recording: true,
          recording_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        },
        {
          id: '2',
          phone_number: '+0987654321',
          contact_name: 'Jane Smith',
          call_type: 'outgoing',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          duration: 245,
          has_recording: false,
          recording_url: '',
        },
        {
          id: '3',
          phone_number: '+5551234567',
          contact_name: null,
          call_type: 'missed',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          duration: 0,
          has_recording: false,
          recording_url: '',
        },
      ],
    };
  }

  async getRecordings(options?: { forceRefresh?: boolean }): Promise<{ recordings: RecordingInfo[]; count: number }> {
    console.log('Web platform: Returning mock recordings', options);
    return {
      recordings: [
        {
          filePath: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          fileName: 'Recording_+1234567890_2024-01-15_10-30-45.mp3',
          phoneNumber: '+1234567890',
          timestamp: new Date().toISOString(),
        },
      ],
      count: 1,
    };
  }
  
  async clearRecordingsCache(): Promise<{ success: boolean }> {
    console.log('Web platform: Clearing recordings cache (no-op)');
    return { success: true };
  }

  async startListeningForCalls(): Promise<{ success: boolean; message: string }> {
    console.log('Web platform: Call listening not supported');
    return { success: false, message: 'Not supported on web' };
  }

  async stopListeningForCalls(): Promise<{ success: boolean; message: string }> {
    console.log('Web platform: Call listening not supported');
    return { success: false, message: 'Not supported on web' };
  }

  async startRecording(): Promise<{ success: boolean }> {
    console.log('Web platform: Recording not supported');
    return { success: false };
  }

  async stopRecording(): Promise<{ success: boolean; filePath?: string }> {
    console.log('Web platform: Recording not supported');
    return { success: false };
  }

  async uploadRecordingToDrive(options: {
    filePath: string;
    fileName: string;
  }): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
    console.log('Web platform: Google Drive upload not supported directly', options);
    return { 
      success: false, 
      error: 'Use the API endpoint /api/recordings/upload for web uploads' 
    };
  }

  async uploadToSupabase(options: {
    filePath: string;
    fileName: string;
    bucketName?: string;
    supabaseUrl: string;
    supabaseKey: string;
    storagePath?: string;
  }): Promise<{
    success: boolean;
    path?: string;
    publicUrl?: string;
    fileSize?: number;
  }> {
    console.log('Web platform: uploadToSupabase not supported, use web SDK instead', options);
    return {
      success: false,
    };
  }

  async findRecordingByCallTime(options: {
    callStartTime: number;
    callEndTime?: number;
    phoneNumber?: string;
  }): Promise<{
    recordings: RecordingInfo[];
    count: number;
    bestMatch: string | null;
  }> {
    console.log('Web platform: findRecordingByCallTime not supported', options);
    return {
      recordings: [
        {
          filePath: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          fileName: 'Recording_mock.mp3',
          phoneNumber: options.phoneNumber || '+1234567890',
          timestamp: new Date(options.callStartTime).toISOString(),
          duration: 120000,
        },
      ],
      count: 1,
      bestMatch: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    };
  }

  async getRecordingScanInfo(): Promise<RecordingScanInfo> {
    console.log('Web platform: getRecordingScanInfo not supported');
    return {
      manufacturer: 'Web Browser',
      model: navigator.userAgent,
      androidVersion: 0,
      recordingsFound: 0,
      existingRecordingPaths: [],
    };
  }

  async syncCallLogs(options: any): Promise<{ success: boolean }> {
    console.log('Web platform: Syncing logs', options);
    return { success: true };
  }

  async getDeviceInfo(): Promise<any> {
    return {
      deviceId: 'web-device',
      deviceName: 'Web Browser',
      platform: 'web',
      osVersion: navigator.userAgent,
    };
  }

  async configureAutoUpload(options: {
    supabaseUrl: string;
    supabaseKey: string;
    enabled?: boolean;
    bucketName?: string;
    storagePath?: string;
  }): Promise<{
    success: boolean;
    enabled: boolean;
    message: string;
  }> {
    console.log('Web platform: configureAutoUpload not supported (native feature only)', options);
    return {
      success: true,
      enabled: false,
      message: 'Auto-upload is only supported on native platforms (Android)',
    };
  }

  async getAutoUploadConfig(): Promise<{
    enabled: boolean;
    configured: boolean;
    bucketName: string;
    storagePath: string;
  }> {
    console.log('Web platform: getAutoUploadConfig not supported');
    return {
      enabled: false,
      configured: false,
      bucketName: 'recordings',
      storagePath: 'call-recordings',
    };
  }

  async saveSupabaseCredentials(options: {
    supabaseUrl: string;
    supabaseKey: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log('Web platform: saveSupabaseCredentials not required (credentials already in memory)', options);
    return {
      success: true,
      message: 'Credentials saved in memory (web platform)',
    };
  }

  async checkPendingLeadNotification(): Promise<{
    hasPending: boolean;
    data?: {
      phoneNumber: string;
      action: string;
      foundInContacts?: boolean;
      foundInLeads?: boolean;
      foundInLMS?: boolean;
      leadName?: string;
    };
  }> {
    console.log('Web platform: checkPendingLeadNotification not supported');
    return {
      hasPending: false,
    };
  }

  async addContact(options: {
    name: string;
    phoneNumber: string;
    email?: string;
    company?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log('Web platform: addContact not supported', options);
    return {
      success: false,
      message: 'Adding contacts is only supported on native platforms',
    };
  }

  async lookupContactByPhone(options: {
    phoneNumber: string;
  }): Promise<{
    found: boolean;
    name?: string;
  }> {
    console.log('Web platform: lookupContactByPhone not supported', options);
    return {
      found: false,
    };
  }
  
  async startMonitoringService(): Promise<{ success: boolean; message: string }> {
    console.log('Web platform: startMonitoringService not supported');
    return { success: false, message: 'Not supported on web' };
  }
  
  async stopMonitoringService(): Promise<{ success: boolean; message: string }> {
    console.log('Web platform: stopMonitoringService not supported');
    return { success: false, message: 'Not supported on web' };
  }
  
  async isMonitoringServiceRunning(): Promise<{ running: boolean }> {
    console.log('Web platform: isMonitoringServiceRunning not supported');
    return { running: false };
  }
  
  async requestBatteryOptimizationExemption(): Promise<{ granted: boolean; message: string }> {
    console.log('Web platform: requestBatteryOptimizationExemption not supported');
    return { granted: true, message: 'Not applicable on web' };
  }
  
  async isBatteryOptimizationDisabled(): Promise<{ disabled: boolean }> {
    console.log('Web platform: isBatteryOptimizationDisabled not supported');
    return { disabled: true };
  }
}
