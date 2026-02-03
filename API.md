# API Documentation - Call Monitor

## 📚 Overview

This document describes the API structure for the Call Monitor application, including Supabase backend API, native plugin methods, and internal API functions.

---

## 🔐 Authentication

All API calls require authentication via Supabase Auth.

### Sign Up

```typescript
import { authApi } from '@/lib/auth';

const { user, session } = await authApi.signUp(
  'user@example.com',
  'password123',
  'John Doe' // optional
);
```

### Sign In

```typescript
const { user, session } = await authApi.signIn(
  'user@example.com',
  'password123'
);
```

### Sign Out

```typescript
await authApi.signOut();
```

### Get Current User

```typescript
const user = await authApi.getCurrentUser();
```

---

## 📞 Call Logs API

### Fetch Call Logs

```typescript
import { callLogApi } from '@/lib/api';
import { DashboardFilters } from '@/types';

// Fetch all logs
const logs = await callLogApi.fetchCallLogs();

// Fetch with filters
const filters: DashboardFilters = {
  callType: 'incoming',
  dateFrom: '2026-01-01',
  dateTo: '2026-02-03',
  searchQuery: '+1234',
  hasRecording: true
};

const filteredLogs = await callLogApi.fetchCallLogs(filters);
```

**Response:**
```typescript
CallLog[] = [
  {
    id: "uuid",
    user_id: "uuid",
    phone_number: "+1234567890",
    contact_name: "John Doe",
    call_type: "incoming",
    timestamp: "2026-02-03T10:30:00.000Z",
    duration: 125,
    device_id: "device-uuid",
    device_platform: "android",
    has_recording: true,
    recording_path: "/path/to/file",
    recording_url: "https://...",
    is_synced: true,
    created_at: "2026-02-03T10:30:00.000Z",
    updated_at: "2026-02-03T10:30:00.000Z"
  }
]
```

### Create Call Log

```typescript
const newLog = await callLogApi.createCallLog({
  user_id: "user-uuid",
  phone_number: "+1234567890",
  contact_name: "Jane Smith",
  call_type: "outgoing",
  timestamp: new Date().toISOString(),
  duration: 60,
  device_id: "device-uuid",
  device_platform: "android",
  has_recording: false,
  is_synced: false
});
```

### Update Call Log

```typescript
const updated = await callLogApi.updateCallLog("log-uuid", {
  has_recording: true,
  recording_url: "https://storage.url/recording.m4a"
});
```

### Delete Call Log

```typescript
await callLogApi.deleteCallLog("log-uuid");
```

### Sync Call Logs

```typescript
const synced = await callLogApi.syncCallLogs([
  // Array of call logs to sync
]);
```

---

## 🔌 Native Plugin API

### CallMonitorPlugin

#### Check Permissions

```typescript
import { CallMonitor } from '@/plugins/CallMonitorPlugin';

const result = await CallMonitor.checkPermissions();
// Result:
{
  callLogs: boolean;
  phoneState: boolean;
  recordAudio: boolean;
  storage: boolean;
  microphone: boolean;
  network: boolean;
}
```

#### Request Permissions

```typescript
const result = await CallMonitor.requestPermissions();
// Result: { granted: boolean }
```

#### Get Call Logs

```typescript
const result = await CallMonitor.getCallLogs({
  limit: 100,
  offset: 0,
  fromDate: '2026-01-01'
});
// Result: { logs: CallLog[] }
```

#### Start Recording

```typescript
const result = await CallMonitor.startRecording();
// Result: { success: boolean }
```

#### Stop Recording

```typescript
const result = await CallMonitor.stopRecording();
// Result: { success: boolean, filePath?: string }
```

#### Get Device Info

```typescript
const result = await CallMonitor.getDeviceInfo();
// Result:
{
  deviceId: string;
  deviceName: string;
  platform: string;
  osVersion: string;
}
```

---

## 🎵 Audio Player API

### Using the Hook

```typescript
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

function MyComponent() {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    callLogId,
    play,
    pause,
    stop,
    seek,
    setVolume,
    error
  } = useAudioPlayer();

  // Play audio
  const handlePlay = () => {
    play('https://audio.url/file.m4a', 'call-log-uuid');
  };

  // Pause
  const handlePause = () => {
    pause();
  };

  // Stop
  const handleStop = () => {
    stop();
  };

  // Seek to time
  const handleSeek = (seconds: number) => {
    seek(seconds);
  };

  // Set volume (0-1)
  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
  };
}
```

---

## 📊 Database Schema

### Tables

#### profiles
```sql
- id: UUID (PK, FK to auth.users)
- email: TEXT
- full_name: TEXT
- avatar_url: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### devices
```sql
- id: UUID (PK)
- user_id: UUID (FK)
- device_id: TEXT (UNIQUE)
- device_name: TEXT
- device_platform: TEXT
- os_version: TEXT
- app_version: TEXT
- last_sync: TIMESTAMP
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### call_logs
```sql
- id: UUID (PK)
- user_id: UUID (FK)
- device_id: TEXT
- phone_number: TEXT
- contact_name: TEXT
- call_type: TEXT (enum)
- timestamp: TIMESTAMP
- duration: INTEGER
- device_platform: TEXT
- has_recording: BOOLEAN
- recording_path: TEXT
- recording_url: TEXT
- is_synced: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- UNIQUE(device_id, timestamp, phone_number)
```

#### recordings
```sql
- id: UUID (PK)
- call_log_id: UUID (FK)
- file_path: TEXT
- file_size: BIGINT
- duration: INTEGER
- format: TEXT
- is_encrypted: BOOLEAN
- storage_url: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

---

## 🔍 Query Examples

### Get Recent Calls

```typescript
const recentCalls = await supabase
  .from('call_logs')
  .select('*')
  .order('timestamp', { ascending: false })
  .limit(50);
```

### Get Calls with Recordings

```typescript
const callsWithRecordings = await supabase
  .from('call_logs')
  .select('*, recordings(*)')
  .eq('has_recording', true);
```

### Search by Phone Number

```typescript
const results = await supabase
  .from('call_logs')
  .select('*')
  .ilike('phone_number', '%1234%');
```

### Filter by Date Range

```typescript
const filtered = await supabase
  .from('call_logs')
  .select('*')
  .gte('timestamp', '2026-01-01')
  .lte('timestamp', '2026-02-03');
```

### Get User's Devices

```typescript
const devices = await supabase
  .from('devices')
  .select('*')
  .eq('user_id', userId)
  .eq('is_active', true);
```

---

## 🔔 Real-time Subscriptions

### Subscribe to Call Logs

```typescript
const subscription = supabase
  .channel('call_logs_changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'call_logs',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('New call log:', payload.new);
      // Update UI
    }
  )
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

---

## 🛡️ Error Handling

All API functions throw errors that should be caught:

```typescript
try {
  const logs = await callLogApi.fetchCallLogs();
} catch (error) {
  console.error('Error fetching logs:', error.message);
  // Show user-friendly error message
}
```

### Common Errors

- **Authentication Error**: User not logged in
- **Permission Denied**: Missing database permissions
- **Network Error**: No internet connection
- **Not Found**: Resource doesn't exist
- **Invalid Data**: Validation failed

---

## 🚦 Rate Limiting

Supabase free tier limits:
- 500 MB database
- 1 GB file storage
- 2 GB bandwidth
- 50,000 monthly active users

For production, consider upgrading to Pro plan.

---

## 📈 Performance Tips

1. **Use Indexes**: Already created in schema
2. **Batch Operations**: Use `upsert` for multiple records
3. **Cache Data**: Store frequently accessed data locally
4. **Pagination**: Use limit/offset for large datasets
5. **Selective Queries**: Only fetch needed columns

---

## 🔐 Security

- All API calls authenticated via JWT
- Row Level Security (RLS) enabled
- Recordings encrypted at rest
- HTTPS for all connections
- No sensitive data in logs

---

## 📱 Platform-Specific Notes

### Android
- Full native plugin functionality
- Local SQLite for offline support
- Background sync service

### iOS
- Limited native functionality (Apple restrictions)
- Displays synced data only
- VoIP recording only

### Web
- Mock data for development
- Read-only dashboard
- No native features

---

## 🔄 Sync Strategy

1. Local changes stored in device DB
2. Periodic sync to Supabase (every 5 minutes)
3. Conflict resolution: Server wins
4. Delta sync for efficiency
5. Manual refresh available

---

## 📞 Support

For API issues:
- Check Supabase logs
- Verify authentication
- Check network connectivity
- Review RLS policies

---

**Version**: 1.0.0  
**Last Updated**: February 3, 2026
