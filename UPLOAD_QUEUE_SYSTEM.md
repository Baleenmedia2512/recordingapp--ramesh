# Upload Queue System

## Overview
Production-grade upload queue system that ensures no recordings are lost due to network failures. Failed uploads are automatically retried with exponential backoff.

## Architecture

### Components
1. **uploadQueue.ts** - IndexedDB persistence layer
2. **uploadQueueManager.ts** - Background worker with retry logic
3. **useNetworkStatus.ts** - Network detection hook
4. **supabaseUpload.ts** - Integration point (adds to queue on failure)

### Flow Diagram
```
Recording Upload Attempt
         ↓
   Native Upload
         ↓
    Success? ──Yes──→ Done
         ↓
        No
         ↓
   Add to Queue (IndexedDB)
         ↓
   Background Worker (5 min intervals)
         ↓
   Network Online? ──No──→ Wait
         ↓
        Yes
         ↓
   File Exists? ──HEAD Request
         ↓
        Yes ──→ Mark Success
         ↓
        No
         ↓
   Retry Upload
         ↓
    Success? ──Yes──→ Remove from Queue
         ↓
        No
         ↓
   Retry Count < 10? ──Yes──→ Exponential Backoff → Queue
         ↓
        No
         ↓
   Mark Failed (manual review needed)
```

## Features

### ✅ Automatic Retry
- **Trigger 1**: Every 5 minutes via background worker
- **Trigger 2**: Immediately when network reconnects
- **Concurrency**: Only 1 upload at a time (mutex pattern)

### ✅ Exponential Backoff
```javascript
delay = Math.min(2 ^ retryCount * 1000, 300000) // max 5 minutes
```
- Retry 1: 2 seconds
- Retry 2: 4 seconds
- Retry 3: 8 seconds
- Retry 4: 16 seconds
- ...
- Retry 10+: 5 minutes (cap)

### ✅ Duplicate Prevention
Before retrying, checks if file already exists in Supabase:
```javascript
HEAD /{bucket}/{fileName}
If-Match: etag // optional
```

### ✅ Persistence
IndexedDB database: `CallRecorderDB`
Object store: `pending_uploads`

Schema:
```typescript
{
  id: string; // UUID
  filePath: string; // Local file path
  fileName: string; // Target filename
  duration: number; // Recording duration (ms)
  createdAt: number; // Timestamp
  uploadStatus: 'pending' | 'uploading' | 'success' | 'failed';
  retryCount: number; // Current retry attempt
  lastError?: string; // Last error message
}
```

### ✅ Network Detection
Monitors `window.addEventListener('online')` and immediately triggers queue processing.

## Usage

### Integration Points

#### 1. App Initialization
[src/pages/_app.tsx](src/pages/_app.tsx)
```typescript
import { startQueueManager } from '@/services/uploadQueueManager';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

useEffect(() => {
  startQueueManager(); // Starts 5-min background worker
}, []);

const networkStatus = useNetworkStatus(); // Auto-retry on reconnect
```

#### 2. Upload Failure Handler
[src/services/supabaseUpload.ts](src/services/supabaseUpload.ts)
```typescript
import { addToQueue } from './uploadQueue';

try {
  await uploadToSupabase(...);
} catch (error) {
  if (!isFileNotFoundError(error)) {
    await addToQueue({ filePath, fileName, duration });
  }
}
```

### Manual Operations

#### View Pending Uploads
```typescript
import { getPendingUploads } from '@/services/uploadQueue';

const pending = await getPendingUploads();
console.log(`${pending.length} uploads in queue`);
```

#### Force Retry Now
```typescript
import { triggerQueueRetry } from '@/services/uploadQueueManager';

await triggerQueueRetry(); // Manual trigger
```

#### Clear Failed Uploads
```typescript
import { deleteUpload, getPendingUploads } from '@/services/uploadQueue';

const failed = await getPendingUploads();
for (const upload of failed) {
  if (upload.uploadStatus === 'failed') {
    await deleteUpload(upload.id);
  }
}
```

## Monitoring

### Production Logs
```
🚀 Starting upload queue manager...
✅ Upload queue manager started
🌐 Network status: ONLINE
📤 Processing upload queue... (3 pending uploads)
✅ Upload succeeded: recording_2024-01-15_10-30-45.mp3
❌ Upload failed (attempt 2/10): Network timeout
⏰ Next retry in 4 seconds
```

### Error Scenarios

#### Scenario 1: Network Temporarily Down
```
1. User records call → Upload fails (network offline)
2. Added to queue → Status: pending, retryCount: 0
3. Background worker checks → Network still offline, skip
4. Network reconnects → useNetworkStatus triggers retry
5. Upload succeeds → Removed from queue
```

#### Scenario 2: Persistent Network Issues
```
1. Upload fails → Added to queue
2. Retry 1 (2s) → Network down, fails
3. Retry 2 (4s) → Network down, fails
...
10. Retry 9 (5min) → Network down, fails
11. Retry 10 → Network down, fails
12. Status changed to 'failed' → Manual review needed
```

#### Scenario 3: File Already Uploaded (Duplicate)
```
1. Upload fails due to timeout (but actually succeeded)
2. Added to queue
3. Retry → HEAD check shows file exists
4. Mark as success, remove from queue (no duplicate upload)
```

## Configuration

### Tuning Parameters
[src/services/uploadQueueManager.ts](src/services/uploadQueueManager.ts)

```typescript
// Check queue every 5 minutes
const QUEUE_CHECK_INTERVAL = 5 * 60 * 1000;

// Max retry attempts before marking failed
const MAX_RETRY_COUNT = 10;

// Max exponential backoff delay (5 minutes)
const MAX_BACKOFF = 5 * 60 * 1000;
```

### Network Detection Sensitivity
[src/hooks/useNetworkStatus.ts](src/hooks/useNetworkStatus.ts)

```typescript
// Current: Instant retry on 'online' event
// Alternative: Add debounce to avoid rapid retries
const RETRY_DEBOUNCE = 2000; // 2 seconds
```

## Testing

### Test Network Failure Recovery

#### 1. Enable Airplane Mode
```
1. Start recording
2. Enable Android Airplane Mode
3. Stop recording → Upload will fail
4. Check IndexedDB: await getPendingUploads() → Should see 1 pending
```

#### 2. Reconnect Network
```
1. Disable Airplane Mode
2. Watch logs for "🌐 Network status: ONLINE"
3. Upload should retry within seconds
4. Check queue: await getPendingUploads() → Should be empty (success)
```

#### 3. Verify Background Worker
```
1. Leave app open with pending uploads
2. Wait 5 minutes
3. Should see "📤 Processing upload queue..." log
4. Pending uploads should be retried
```

### Verify Duplicate Prevention
```
1. Upload file via native upload (should succeed)
2. Manually add same file to queue: 
   await addToQueue({ filePath, fileName: 'recording_test.mp3', duration: 30000 })
3. Trigger retry: await triggerQueueRetry()
4. Check logs: Should see "File already exists in Supabase, marking as success"
5. Queue should be empty (no duplicate upload)
```

## Troubleshooting

### Queue Not Processing
**Symptom**: Pending uploads never retry

**Checks**:
1. Queue manager started? → Check for "🚀 Starting upload queue manager..." log
2. Network online? → Check `navigator.onLine` value
3. Background worker running? → Should see "📤 Processing upload queue..." every 5 min

**Fix**: Restart app or manually trigger: `await triggerQueueRetry()`

### Uploads Stuck in "uploading" State
**Symptom**: `uploadStatus: 'uploading'` never clears

**Cause**: App crashed during upload, status not reset

**Fix**:
```typescript
// Reset stuck uploads on app startup
const stuck = await getPendingUploads();
for (const upload of stuck) {
  if (upload.uploadStatus === 'uploading') {
    await updateUploadStatus(upload.id, 'pending');
  }
}
```

### Max Retries Reached
**Symptom**: Upload marked as 'failed' after 10 attempts

**Check**:
1. Network connectivity stable?
2. Supabase endpoint reachable?
3. File still exists locally?

**Manual Retry**:
```typescript
// Reset retry count to give another chance
await db.update('pending_uploads', uploadId, { retryCount: 0, uploadStatus: 'pending' });
```

## Performance Impact

### Storage
- **IndexedDB Size**: ~1KB per pending upload
- **Typical Queue Size**: 0-10 uploads (cleared quickly on network recovery)
- **Max Queue Size**: No hard limit (should monitor if > 100)

### CPU/Battery
- **Background Worker**: Runs every 5 minutes, processes queue in < 1 second (idle if empty)
- **Network Listener**: Passive event listener, negligible impact
- **Upload Process**: Same as normal upload (native plugin handles heavy lifting)

### Memory
- **Queue Manager**: Singleton instance, ~10KB resident memory
- **IndexedDB Connection**: Opened on-demand, closed after operation

## Future Enhancements

### Priority Queue
Add priority field to uploads:
```typescript
priority: 'high' | 'normal' | 'low'
```
Process high-priority uploads first.

### Compression
Compress recordings before upload if network is slow:
```typescript
if (networkType === 'slow-2g') {
  compressAudio(filePath, { bitrate: 64 });
}
```

### Notification
Show user notification when large queue clears:
```typescript
if (completedCount > 5) {
  LocalNotifications.schedule({
    title: 'Uploads Complete',
    body: `${completedCount} recordings uploaded successfully`
  });
}
```

### Analytics
Track queue metrics:
- Average retry count before success
- Most common failure reasons
- Time-to-upload distribution
