import { WebPlugin } from '@capacitor/core';
import type { CallMonitorPlugin, RecordingInfo } from './CallMonitorPlugin';

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

  async getRecordings(): Promise<{ recordings: RecordingInfo[]; count: number }> {
    console.log('Web platform: Returning mock recordings');
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
