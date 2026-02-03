// Type definitions for the Call Monitor app

export type CallType = 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'voicemail';

export interface CallLog {
  id: string;
  user_id: string;
  phone_number: string;
  contact_name?: string;
  call_type: CallType;
  timestamp: string;
  duration: number; // in seconds
  device_id: string;
  device_platform: 'android' | 'ios';
  has_recording: boolean;
  recording_path?: string;
  recording_url?: string;
  is_synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface Recording {
  id: string;
  call_log_id: string;
  file_path: string;
  file_size: number;
  duration: number;
  format: string;
  is_encrypted: boolean;
  storage_url?: string;
  created_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  device_name: string;
  device_platform: 'android' | 'ios';
  os_version: string;
  app_version: string;
  last_sync: string;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  name: string;
  granted: boolean;
  required: boolean;
  description: string;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  callLogId: string | null;
}

export interface DashboardFilters {
  callType?: CallType | 'all';
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  hasRecording?: boolean;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSync: string | null;
  pendingCount: number;
  error?: string;
}
