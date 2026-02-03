import { WebPlugin } from '@capacitor/core';
import type { CallMonitorPlugin } from './CallMonitorPlugin';

export class CallMonitorWeb extends WebPlugin implements CallMonitorPlugin {
  async checkPermissions(): Promise<any> {
    console.log('Web platform: Permissions not applicable');
    return {
      callLogs: false,
      phoneState: false,
      recordAudio: false,
      storage: false,
      microphone: false,
      network: true,
    };
  }

  async requestPermissions(): Promise<{ granted: boolean }> {
    console.log('Web platform: Cannot request native permissions');
    return { granted: false };
  }

  async getCallLogs(options: any): Promise<{ logs: any[] }> {
    console.log('Web platform: Returning mock call logs', options);
    return {
      logs: [
        {
          id: '1',
          phone_number: '+1234567890',
          call_type: 'incoming',
          timestamp: new Date().toISOString(),
          duration: 125,
          has_recording: true,
        },
        {
          id: '2',
          phone_number: '+0987654321',
          call_type: 'outgoing',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          duration: 245,
          has_recording: false,
        },
      ],
    };
  }

  async startRecording(): Promise<{ success: boolean }> {
    console.log('Web platform: Recording not supported');
    return { success: false };
  }

  async stopRecording(): Promise<{ success: boolean; filePath?: string }> {
    console.log('Web platform: Recording not supported');
    return { success: false };
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
}
