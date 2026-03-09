# Quick Reference: Native Upload Implementation

## How to Use Native Upload

### From TypeScript/JavaScript

```typescript
import { CallMonitor } from '@/plugins/CallMonitorPlugin';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/env';

// Upload recording directly from file path (NATIVE)
const result = await CallMonitor.uploadToSupabase({
  filePath: '/storage/emulated/0/Recordings/Call/recording.m4a',
  fileName: 'recording.m4a',
  bucketName: 'recordings',
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_ANON_KEY,
  storagePath: 'call-recordings',
});

if (result.success) {
  console.log('Upload successful!');
  console.log('Public URL:', result.publicUrl);
  console.log('File size:', result.fileSize);
  console.log('Attempts:', result.attempts);
} else {
  console.error('Upload failed');
}
```

### Upload Service (Automatic Platform Detection)

```typescript
import { uploadRecordingToSupabase } from '@/services/supabaseUpload';

// Automatically uses native upload on Android/iOS, web SDK on web
const result = await uploadRecordingToSupabase(
  fileBlob,              // Only used on web
  'recording.m4a',       // File name
  'recordings',          // Bucket name
  originalFilePath       // REQUIRED for native: full path to file
);

if (result.success) {
  console.log('URL:', result.publicUrl);
}
```

## Native Plugin API Reference

### Method: `uploadToSupabase`

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `filePath` | string | ✅ Yes | - | Full path to file on device storage |
| `fileName` | string | ✅ Yes | - | Name of file for cloud storage |
| `bucketName` | string | No | `"recordings"` | Supabase bucket name |
| `supabaseUrl` | string | ✅ Yes | - | Supabase project URL |
| `supabaseKey` | string | ✅ Yes | - | Supabase anon key |
| `storagePath` | string | No | `"call-recordings"` | Path prefix in bucket |
| `maxRetries` | number | No | `3` | Max retry attempts |

**Returns**:
```typescript
{
  success: boolean;
  path?: string;          // Storage path in bucket
  publicUrl?: string;     // Full public URL
  fileSize?: number;      // Size in bytes
  attempts?: number;      // Number of attempts made
  duration?: number;      // Upload duration in ms
}
```

**Errors**:
- `"File not found: {path}"` - File doesn't exist
- `"Cannot read file: {path} (permission denied)"` - No read permission
- `"File is empty: {path}"` - File has 0 bytes
- `"DNS error: ..."` - DNS resolution failed
- `"Upload timeout: ..."` - Network timeout
- `"Storage bucket not found: ..."` - Bucket doesn't exist
- `"Permission denied: ..."` - Supabase policy issue

## Supported Audio Formats

| Extension | MIME Type | Native Support |
|-----------|-----------|----------------|
| `.m4a` | `audio/mp4` | ✅ Yes |
| `.mp4` | `audio/mp4` | ✅ Yes |
| `.mp3` | `audio/mpeg` | ✅ Yes |
| `.wav` | `audio/wav` | ✅ Yes |
| `.3gp` | `audio/3gpp` | ✅ Yes |
| `.amr` | `audio/amr` | ✅ Yes |
| `.aac` | `audio/aac` | ✅ Yes |
| `.ogg` | `audio/ogg` | ✅ Yes |

## Error Handling Examples

### DNS Resolution Error
```typescript
try {
  const result = await CallMonitor.uploadToSupabase({ ... });
} catch (error) {
  if (error.message.includes('DNS error')) {
    // Show user-friendly message
    showAlert(
      'DNS Error',
      'Cannot reach cloud storage.\n\n' +
      'Fix: Go to WiFi settings → DNS → Set to 8.8.8.8'
    );
  }
}
```

### Timeout Error
```typescript
catch (error) {
  if (error.message.includes('timeout')) {
    showAlert(
      'Network Timeout',
      'Your network is too slow or unstable.\n' +
      'Recording saved locally. Will retry later.'
    );
  }
}
```

### Bucket Not Found
```typescript
catch (error) {
  if (error.message.includes('bucket not found')) {
    showAlert(
      'Configuration Error',
      'Storage bucket "recordings" not found.\n' +
      'Please create it in Supabase Dashboard.'
    );
  }
}
```

## Debugging

### Android Logcat
```bash
adb logcat | grep CallMonitor
```

### Log Markers
- 📤 Upload start
- 📁 File path
- 📦 File size
- 🌐 HTTP client ready
- 🎵 MIME type detected
- 📡 Upload URL
- 📥 Response received
- ✅ Success
- ❌ Error
- ⏳ Retry wait

### Success Log Example
```
D/CallMonitor: 📤 Starting native Supabase upload (100% native, no WebView)
D/CallMonitor: 📁 File: /storage/emulated/0/Recordings/Call/1234567890_recording.m4a
D/CallMonitor: 📦 File size: 1234567 bytes (1205KB)
D/CallMonitor: 🌐 OkHttp client ready (DNS-over-HTTPS enabled)
D/CallMonitor: 🎵 MIME type: audio/mp4
D/CallMonitor: 📤 Upload attempt 1/3
D/CallMonitor: 📡 URL: https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/recordings/call-recordings/1234567890_recording.m4a
D/CallMonitor: 📥 Response: 200 (took 2345ms)
D/CallMonitor: ✅ Upload successful on attempt 1!
```

### Error Log Example
```
D/CallMonitor: 📤 Upload attempt 1/3
E/CallMonitor: ❌ DNS error on attempt 1: Unable to resolve host
D/CallMonitor: ⏳ Waiting 1000ms before retry...
D/CallMonitor: 📤 Upload attempt 2/3
E/CallMonitor: ❌ DNS error on attempt 2: Unable to resolve host
D/CallMonitor: ⏳ Waiting 2000ms before retry...
D/CallMonitor: 📤 Upload attempt 3/3
E/CallMonitor: ❌ DNS error on attempt 3: Unable to resolve host
E/CallMonitor: ❌ Upload failed after 3 attempts
E/CallMonitor: ❌ Last error: DNS_RESOLUTION_FAILED: Unable to resolve host
```

## Performance Expectations

### Typical Upload Times (Good Network)

| File Size | Expected Time |
|-----------|---------------|
| 100 KB | < 1s |
| 500 KB | 1-2s |
| 1 MB | 2-3s |
| 5 MB | 5-10s |
| 10 MB | 10-20s |

### Retry Behavior

| Attempt | Delay Before | Total Time Elapsed |
|---------|--------------|-------------------|
| 1 | 0s | 0s |
| 2 | 1s | ~3-5s |
| 3 | 2s | ~6-10s |

**Max retry delay**: 5 seconds (capped)

## Testing Checklist

- [ ] Upload succeeds on first attempt with good network
- [ ] Retry works with poor network (see multiple attempts in log)
- [ ] DNS error shows user-friendly message
- [ ] Timeout error shows user-friendly message
- [ ] File validation catches missing files
- [ ] Uploaded file is not corrupted (playable)
- [ ] Public URL is accessible
- [ ] Large files (5-10MB) upload successfully
- [ ] Multiple uploads work sequentially
- [ ] Airplane mode triggers correct error

## Supabase Configuration

### Required Bucket Setup

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in sidebar
4. Create bucket named: `recordings`
5. Set bucket to **Public** or configure policies:

```sql
-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recordings');

-- Allow public read access
CREATE POLICY "Allow public downloads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'recordings');
```

### Get Credentials

1. Go to **Settings** → **API**
2. Copy **Project URL** (e.g., `https://wkwrrdcjknvupwsfdjtd.supabase.co`)
3. Copy **anon public** key
4. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Common Issues

### Issue: "File not found"
**Cause**: File path is incorrect or file was deleted
**Fix**: Verify file exists using file manager app

### Issue: "DNS error"
**Cause**: Device DNS cannot resolve Supabase domain
**Fix**: 
1. Go to WiFi settings
2. Tap your network → Modify
3. Advanced → Static IP
4. DNS 1: 8.8.8.8
5. DNS 2: 8.8.4.4

### Issue: "Permission denied"
**Cause**: Supabase bucket policies not configured
**Fix**: Check bucket policies in Supabase Dashboard (see above)

### Issue: "Upload timeout"
**Cause**: Network too slow or unstable
**Fix**: Try again on better network, or reduce file size

### Issue: "Bucket not found"
**Cause**: Bucket "recordings" doesn't exist
**Fix**: Create bucket in Supabase Dashboard

## Migration Guide

### Old Code (WebView-based)
```typescript
// ❌ OLD: Uses WebView fetch (unstable)
const response = await fetch(filePath);
const blob = await response.blob();
const base64 = await blobToBase64(blob);
const result = await Http.post({
  url: uploadUrl,
  data: base64,
  ...
});
```

### New Code (Native)
```typescript
// ✅ NEW: Direct native upload
const result = await CallMonitor.uploadToSupabase({
  filePath: filePath,
  fileName: fileName,
  bucketName: 'recordings',
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_ANON_KEY,
});
```

## Additional Resources

- **Full Architecture**: See `NATIVE_UPLOAD_ARCHITECTURE.md`
- **Implementation Summary**: See `REFACTOR_COMPLETE.md`
- **Supabase Storage Docs**: https://supabase.com/docs/guides/storage
- **OkHttp Docs**: https://square.github.io/okhttp/
