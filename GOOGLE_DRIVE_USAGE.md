# 📁 Google Drive Integration - Usage Guide

This guide explains how to use the Google Drive integration to store call recordings in the cloud.

---

## 🎯 Quick Start

### 1. Setup Google Drive (One-time)

Follow the complete setup guide in [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md)

### 2. Configure Environment Variables

Add to your `.env.local`:
```env
GOOGLE_DRIVE_CLIENT_ID=your_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/recordings/google-auth
GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token
```

---

## 💻 Usage Examples

### Using the React Hook

```typescript
import { useGoogleDriveUpload } from '@/hooks/useGoogleDriveUpload';

function MyComponent() {
  const { uploadRecording, uploadStatus } = useGoogleDriveUpload();

  const handleUpload = async () => {
    try {
      const url = await uploadRecording(
        '/path/to/recording.m4a',
        'call_2024_01_15.m4a'
      );
      console.log('Uploaded to:', url);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleUpload} disabled={uploadStatus.isUploading}>
        {uploadStatus.isUploading ? 'Uploading...' : 'Upload to Drive'}
      </button>
      {uploadStatus.error && <p>Error: {uploadStatus.error}</p>}
      {uploadStatus.uploadedUrl && (
        <a href={uploadStatus.uploadedUrl}>View in Drive</a>
      )}
    </div>
  );
}
```

### Using the Plugin Directly

```typescript
import { CallMonitor } from '@/plugins/CallMonitorPlugin';

// Upload a recording
const result = await CallMonitor.uploadRecordingToDrive({
  filePath: '/storage/emulated/0/Recordings/call.m4a',
  fileName: 'call_recording_2024_01_15.m4a'
});

if (result.success) {
  console.log('File URL:', result.fileUrl);
} else {
  console.error('Error:', result.error);
}
```

### Using the Component

```typescript
import { GoogleDriveUploadButton } from '@/components/GoogleDriveUploadButton';

function RecordingsList() {
  const recordings = [
    { filePath: '/path/to/rec1.m4a', fileName: 'recording1.m4a' },
    { filePath: '/path/to/rec2.m4a', fileName: 'recording2.m4a' },
  ];

  return (
    <div>
      {recordings.map((rec, index) => (
        <GoogleDriveUploadButton
          key={index}
          recording={rec}
          onUploadComplete={(url) => {
            console.log('Uploaded:', url);
            // Update your database with the Drive URL
          }}
        />
      ))}
    </div>
  );
}
```

### Automatic Upload After Recording

```typescript
import { CallMonitor } from '@/plugins/CallMonitorPlugin';

// Start recording
await CallMonitor.startRecording();

// ... during call ...

// Stop recording
const result = await CallMonitor.stopRecording();

if (result.success && result.filePath) {
  // Automatically upload to Google Drive
  const uploadResult = await CallMonitor.uploadRecordingToDrive({
    filePath: result.filePath,
    fileName: `recording_${Date.now()}.m4a`
  });
  
  if (uploadResult.success) {
    console.log('Recording saved to Drive:', uploadResult.fileUrl);
    
    // Optionally delete local file to save space
    // await deleteLocalFile(result.filePath);
  }
}
```

---

## 🌐 API Endpoints

### Upload Endpoint

**POST** `/api/recordings/upload`

Upload a file using multipart form data.

**Request:**
```typescript
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('fileName', 'recording.m4a');

const response = await fetch('/api/recordings/upload', {
  method: 'POST',
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "fileId": "1abc123xyz",
  "fileUrl": "https://drive.google.com/file/d/1abc123xyz/view"
}
```

### Google Auth Endpoint

**GET** `/api/recordings/google-auth`

Get OAuth authorization URL or handle callback.

**Get Auth URL:**
```typescript
const response = await fetch('/api/recordings/google-auth');
const data = await response.json();
console.log('Auth URL:', data.authUrl);
// Redirect user to data.authUrl
```

**Handle Callback:**
```
GET /api/recordings/google-auth?code=4/0AY0e-g5...
```

Returns tokens including refresh_token.

---

## 🔄 Batch Upload

Upload multiple recordings:

```typescript
async function uploadAllRecordings() {
  const { recordings } = await CallMonitor.getRecordings();
  
  const results = await Promise.allSettled(
    recordings.map(rec => 
      CallMonitor.uploadRecordingToDrive({
        filePath: rec.filePath,
        fileName: rec.fileName
      })
    )
  );
  
  const successful = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');
  
  console.log(`Uploaded: ${successful.length}, Failed: ${failed.length}`);
}
```

---

## 📊 Monitoring Upload Status

```typescript
function UploadMonitor() {
  const { uploadStatus } = useGoogleDriveUpload();
  
  return (
    <div>
      {uploadStatus.isUploading && (
        <div className="progress-bar">
          <div style={{ width: `${uploadStatus.progress}%` }} />
        </div>
      )}
      
      {uploadStatus.error && (
        <div className="error">{uploadStatus.error}</div>
      )}
      
      {uploadStatus.uploadedUrl && (
        <div className="success">
          ✓ Uploaded successfully!
          <a href={uploadStatus.uploadedUrl}>View</a>
        </div>
      )}
    </div>
  );
}
```

---

## 🗄️ Database Integration

Update your database after upload:

```typescript
async function uploadAndSaveUrl(callLogId: string, recordingPath: string) {
  // Upload to Drive
  const result = await CallMonitor.uploadRecordingToDrive({
    filePath: recordingPath,
    fileName: `recording_${callLogId}.m4a`
  });
  
  if (result.success && result.fileUrl) {
    // Update database
    const { error } = await supabase
      .from('call_logs')
      .update({ 
        recording_url: result.fileUrl,
        storage_provider: 'google_drive'
      })
      .eq('id', callLogId);
    
    if (!error) {
      console.log('Database updated with Drive URL');
    }
  }
}
```

---

## 🔒 Security Best Practices

### Environment Variables

Never commit credentials to git:
```bash
# .gitignore already includes:
.env.local
.env*.local
```

### Secure Token Storage

For production, use secure environment variables:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Build & Deploy → Environment
- AWS: Systems Manager Parameter Store
- Google Cloud: Secret Manager

### Limit Scopes

The app only requests minimal permissions:
- ✅ `drive.file` - Access only to files created by the app
- ❌ No access to your other Drive files

---

## 🧪 Testing

### Test Upload Locally

```bash
# Start development server
npm run dev

# Test upload endpoint
curl -X POST http://localhost:3000/api/recordings/upload \
  -F "file=@test-recording.m4a" \
  -F "fileName=test.m4a"
```

### Mock Data for Development

```typescript
// src/lib/google-drive.mock.ts
export const mockGoogleDriveService = {
  uploadFile: async (filePath: string, fileName: string) => ({
    success: true,
    fileId: 'mock-file-id',
    fileUrl: 'https://drive.google.com/file/d/mock-file-id/view'
  })
};
```

---

## 📈 Storage Management

### Check Storage Quota

```typescript
import { createGoogleDriveService, getGoogleDriveConfigFromEnv } from '@/lib/google-drive';

const service = createGoogleDriveService(getGoogleDriveConfigFromEnv());
const quota = await service.getStorageQuota();

console.log('Used:', quota.usage, 'bytes');
console.log('Limit:', quota.limit, 'bytes');
console.log('Available:', quota.limit - quota.usage, 'bytes');
```

### List Uploaded Files

```typescript
const files = await service.listFiles(100);
console.log('Total files:', files.length);

files.forEach(file => {
  console.log(file.name, '-', file.size, 'bytes');
});
```

### Delete Old Files

```typescript
async function deleteOldRecordings(daysOld: number) {
  const service = createGoogleDriveService(getGoogleDriveConfigFromEnv());
  const files = await service.listFiles();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  for (const file of files) {
    const fileDate = new Date(file.createdTime);
    if (fileDate < cutoffDate) {
      await service.deleteFile(file.id);
      console.log('Deleted:', file.name);
    }
  }
}
```

---

## 🚀 Performance Tips

### Compress Before Upload

```typescript
// Consider compressing audio before upload
import { compressAudio } from '@/lib/audio-utils';

const compressedPath = await compressAudio(originalPath);
await CallMonitor.uploadRecordingToDrive({
  filePath: compressedPath,
  fileName: 'compressed_recording.m4a'
});
```

### Upload in Background

```typescript
// Queue uploads for background processing
const uploadQueue = [];

function queueUpload(filePath: string, fileName: string) {
  uploadQueue.push({ filePath, fileName });
}

// Process queue periodically
setInterval(async () => {
  if (uploadQueue.length > 0) {
    const item = uploadQueue.shift();
    await CallMonitor.uploadRecordingToDrive(item);
  }
}, 5000); // Every 5 seconds
```

### Retry Failed Uploads

```typescript
async function uploadWithRetry(
  filePath: string, 
  fileName: string, 
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await CallMonitor.uploadRecordingToDrive({
        filePath,
        fileName
      });
      
      if (result.success) return result;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

---

## 🐛 Debugging

### Enable Verbose Logging

```typescript
// In your upload function
console.log('Uploading:', { filePath, fileName, size: fileSize });

const result = await CallMonitor.uploadRecordingToDrive({
  filePath,
  fileName
});

console.log('Upload result:', result);
```

### Check Network Connection

```typescript
async function checkConnection() {
  try {
    const response = await fetch('https://www.googleapis.com/drive/v3/about', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return response.ok;
  } catch {
    return false;
  }
}
```

---

## 📚 Additional Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [File Upload Best Practices](https://developers.google.com/drive/api/guides/manage-uploads)

---

## ✅ Summary

You can now:
- ✅ Upload recordings to Google Drive automatically
- ✅ Access recordings from any device
- ✅ Free up local storage
- ✅ Secure cloud backup
- ✅ Share recordings easily

All recordings are stored safely in your Google Drive account! 🎉
