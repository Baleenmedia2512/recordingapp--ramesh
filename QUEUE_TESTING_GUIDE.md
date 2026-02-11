# Upload Queue Testing Guide

## Quick Test Scenarios

### 🧪 Test 1: Basic Queue Functionality
**Duration**: 2 minutes

1. **Open Chrome DevTools**
   ```
   Right-click → Inspect → Console tab
   ```

2. **Check Queue on Startup**
   ```javascript
   import('@/services/uploadQueue').then(m => m.getPendingUploads()).then(console.log)
   ```
   Expected: `[]` (empty array)

3. **Manually Add Test Upload**
   ```javascript
   import('@/services/uploadQueue').then(m => m.addToQueue({
     filePath: '/storage/emulated/0/Music/test.mp3',
     fileName: 'test_recording.mp3',
     duration: 30000
   })).then(() => console.log('✅ Added to queue'))
   ```

4. **Verify Queue Content**
   ```javascript
   import('@/services/uploadQueue').then(m => m.getPendingUploads()).then(console.log)
   ```
   Expected: Array with 1 item, `uploadStatus: 'pending'`, `retryCount: 0`

5. **Trigger Manual Retry**
   ```javascript
   import('@/services/uploadQueueManager').then(m => m.triggerQueueRetry())
   ```
   Watch logs for upload attempt

6. **Clear Queue**
   ```javascript
   import('@/services/uploadQueue').then(m => m.getPendingUploads()).then(async uploads => {
     const db = m.openDB();
     for (const upload of uploads) {
       await m.deleteUpload(upload.id);
     }
     console.log('✅ Queue cleared');
   })
   ```

---

### 🌐 Test 2: Network Failure Recovery
**Duration**: 5 minutes

1. **Start Recording**
   - Open app → Record 10 seconds → Stop

2. **Enable Airplane Mode BEFORE Upload**
   - Swipe down → Enable Airplane Mode
   
3. **Initiate Upload**
   - Click "Upload" button
   - Expected log: `❌ Native upload failed: Network error`
   - Expected log: `📥 Added to upload queue`

4. **Check Queue**
   ```javascript
   import('@/services/uploadQueue').then(m => m.getPendingUploads()).then(console.log)
   ```
   Expected: 1 upload with `uploadStatus: 'pending'`

5. **Wait 30 Seconds** (observe background worker)
   - Should see: `📤 Processing upload queue... (1 pending uploads)`
   - Should see: `📵 Network offline, skipping queue processing`

6. **Disable Airplane Mode**
   - Network reconnects
   - Expected log: `🌐 Network status: ONLINE`
   - Expected log: `🔄 Network reconnected, processing upload queue...`
   - Expected log: `📤 Processing upload 1/1: test_recording.mp3`
   - Expected log: `✅ Upload succeeded: test_recording.mp3`

7. **Verify Queue Cleared**
   ```javascript
   import('@/services/uploadQueue').then(m => m.getPendingUploads()).then(console.log)
   ```
   Expected: `[]` (empty, upload succeeded)

---

### 🔁 Test 3: Exponential Backoff
**Duration**: 2 minutes

1. **Keep Airplane Mode ON**

2. **Add Test Upload**
   ```javascript
   import('@/services/uploadQueue').then(m => m.addToQueue({
     filePath: '/storage/emulated/0/Music/test.mp3',
     fileName: 'backoff_test.mp3',
     duration: 10000
   }))
   ```

3. **Trigger 3 Manual Retries**
   ```javascript
   // Retry 1
   import('@/services/uploadQueueManager').then(m => m.triggerQueueRetry())
   // Wait 3 seconds
   // Retry 2
   import('@/services/uploadQueueManager').then(m => m.triggerQueueRetry())
   // Wait 5 seconds
   // Retry 3
   import('@/services/uploadQueueManager').then(m => m.triggerQueueRetry())
   ```

4. **Check Retry Count**
   ```javascript
   import('@/services/uploadQueue').then(m => m.getPendingUploads()).then(console.log)
   ```
   Expected: `retryCount: 3`

5. **Observe Logs**
   ```
   ❌ Upload failed (attempt 1/10): Network error
   ⏰ Next retry in 2 seconds (exponential backoff)
   
   ❌ Upload failed (attempt 2/10): Network error
   ⏰ Next retry in 4 seconds (exponential backoff)
   
   ❌ Upload failed (attempt 3/10): Network error
   ⏰ Next retry in 8 seconds (exponential backoff)
   ```

6. **Disable Airplane Mode** (let it succeed)
   - Upload should succeed on next retry
   - Queue should clear

---

### 🚫 Test 4: Duplicate Prevention
**Duration**: 3 minutes

1. **Upload a Recording Normally**
   - Record → Upload → Verify success
   - Note the filename: e.g., `recording_2024-01-15_10-30-45.mp3`

2. **Manually Add Same File to Queue**
   ```javascript
   import('@/services/uploadQueue').then(m => m.addToQueue({
     filePath: '/storage/emulated/0/Music/recording_2024-01-15_10-30-45.mp3',
     fileName: 'recording_2024-01-15_10-30-45.mp3',
     duration: 45000
   }))
   ```

3. **Trigger Retry**
   ```javascript
   import('@/services/uploadQueueManager').then(m => m.triggerQueueRetry())
   ```

4. **Expected Logs**
   ```
   📤 Processing upload 1/1: recording_2024-01-15_10-30-45.mp3
   🔍 Checking if file already exists in Supabase...
   ✅ File already exists in Supabase, marking as success
   ```

5. **Verify Queue**
   ```javascript
   import('@/services/uploadQueue').then(m => m.getPendingUploads()).then(console.log)
   ```
   Expected: `[]` (empty, duplicate detected and removed)

---

### ⏱️ Test 5: Background Worker (5-Min Interval)
**Duration**: 6 minutes

1. **Add Test Upload**
   ```javascript
   import('@/services/uploadQueue').then(m => m.addToQueue({
     filePath: '/storage/emulated/0/Music/test.mp3',
     fileName: 'background_test.mp3',
     duration: 10000
   }))
   ```

2. **Enable Airplane Mode** (prevent immediate retry)

3. **Wait 5 Minutes**
   - Keep app open in foreground
   - Do NOT manually trigger retry

4. **Observe Logs at 5-Min Mark**
   ```
   📤 Processing upload queue... (1 pending uploads)
   📵 Network offline, skipping queue processing
   ```

5. **Disable Airplane Mode**

6. **Wait Another 5 Minutes**
   ```
   📤 Processing upload queue... (1 pending uploads)
   🌐 Network online, attempting uploads...
   ✅ Upload succeeded: background_test.mp3
   ```

---

### 🔴 Test 6: Max Retry Limit
**Duration**: 3 minutes

1. **Add Test Upload**
   ```javascript
   import('@/services/uploadQueue').then(m => m.addToQueue({
     filePath: '/storage/emulated/0/Music/test.mp3',
     fileName: 'max_retry_test.mp3',
     duration: 5000
   }))
   ```

2. **Keep Airplane Mode ON**

3. **Trigger 11 Manual Retries** (exceeds max of 10)
   ```javascript
   for (let i = 0; i < 11; i++) {
     await import('@/services/uploadQueueManager').then(m => m.triggerQueueRetry());
     await new Promise(r => setTimeout(r, 2000)); // Wait 2s between retries
   }
   ```

4. **Expected Logs**
   ```
   ❌ Upload failed (attempt 10/10): Network error
   🛑 Max retry count reached for upload: max_retry_test.mp3
   ⚠️ Upload marked as failed (manual review needed)
   ```

5. **Check Queue**
   ```javascript
   import('@/services/uploadQueue').then(m => m.getPendingUploads()).then(console.log)
   ```
   Expected: 1 upload with `uploadStatus: 'failed'`, `retryCount: 10`

---

## 🔍 Debugging Commands

### View Queue Contents
```javascript
import('@/services/uploadQueue').then(m => m.getPendingUploads()).then(uploads => {
  console.table(uploads.map(u => ({
    fileName: u.fileName,
    status: u.uploadStatus,
    retries: u.retryCount,
    createdAt: new Date(u.createdAt).toLocaleString()
  })));
})
```

### Check Network Status
```javascript
console.log('Online:', navigator.onLine);
```

### Force Queue Processing
```javascript
import('@/services/uploadQueueManager').then(m => m.triggerQueueRetry())
```

### Reset Failed Upload
```javascript
// Get failed uploads
import('@/services/uploadQueue').then(async m => {
  const uploads = await m.getPendingUploads();
  const failed = uploads.find(u => u.uploadStatus === 'failed');
  if (failed) {
    await m.updateUploadStatus(failed.id, 'pending');
    await m.openDB().then(db => 
      db.update('pending_uploads', failed.id, { retryCount: 0 })
    );
    console.log('✅ Reset upload:', failed.fileName);
  }
})
```

### Clear All Queue Items
```javascript
import('@/services/uploadQueue').then(async m => {
  const uploads = await m.getPendingUploads();
  for (const upload of uploads) {
    await m.deleteUpload(upload.id);
  }
  console.log(`✅ Cleared ${uploads.length} uploads`);
})
```

### View IndexedDB Directly
1. Open Chrome DevTools
2. Go to **Application** tab
3. Expand **Storage** → **IndexedDB** → **CallRecorderDB** → **pending_uploads**
4. Right-click → **Refresh** to see current queue

---

## 📊 Expected Results Summary

| Test | Setup | Expected Outcome |
|------|-------|------------------|
| Basic Queue | Manual add | Upload added, retries successfully |
| Network Failure | Airplane mode during upload | Auto-added to queue, retries on reconnect |
| Exponential Backoff | 3 failed retries | Delays: 2s, 4s, 8s |
| Duplicate Prevention | Upload existing file | HEAD check passes, no duplicate upload |
| Background Worker | Wait 5 minutes | Automatic retry triggered |
| Max Retry Limit | 11 failed retries | Status changed to 'failed' |

---

## 🐛 Common Issues

### Issue: Queue Not Retrying
**Symptoms**: Pending uploads never process
**Checks**:
1. `navigator.onLine` → Should be `true`
2. Console logs → Should see "📤 Processing upload queue..." every 5 min
3. Network listener → Check for "🌐 Network status: ONLINE" on reconnect

**Fix**: Restart app or run `triggerQueueRetry()` manually

---

### Issue: "File Not Found" Error
**Symptoms**: Upload fails with file path error
**Cause**: Recording file was deleted before retry
**Fix**: Queue should detect this and remove upload, check logs for "🗑️ File not found locally, removing from queue"

---

### Issue: Queue Growing Indefinitely
**Symptoms**: 50+ pending uploads in queue
**Cause**: Network permanently unavailable OR Supabase endpoint unreachable
**Check**:
1. Can you access Supabase URL in browser?
2. Is API key valid? (check `.env.local`)
3. Are all uploads reaching max retries?

**Fix**: 
- If network is stable, check Supabase configuration
- If uploads are all 'failed', clear queue and investigate root cause
