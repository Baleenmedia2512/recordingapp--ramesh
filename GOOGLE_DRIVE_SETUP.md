# 🚀 Google Drive Setup Guide

This guide will help you set up Google Drive integration to automatically store all call recordings in your Google Drive account.

---

## 📋 Prerequisites

- Google Account
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Call Monitor app installed

---

## ⚙️ Step-by-Step Setup

### 1️⃣ Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `Call Monitor App`
4. Click **Create**

### 2️⃣ Enable Google Drive API

1. In your project, navigate to **APIs & Services** → **Library**
2. Search for **Google Drive API**
3. Click on it and press **Enable**

### 3️⃣ Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Call Monitor
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **Save and Continue**
6. On Scopes page, click **Add or Remove Scopes**
7. Add these scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive.appdata`
8. Click **Update** → **Save and Continue**
9. Add test users (your email) → **Save and Continue**
10. Review and click **Back to Dashboard**

### 4️⃣ Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: Web application
4. Name: `Call Monitor Web Client`
5. Add **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/recordings/google-auth
   https://yourdomain.com/api/recordings/google-auth
   ```
   (Replace `yourdomain.com` with your production domain)
6. Click **Create**
7. **Copy** the Client ID and Client Secret (you'll need these!)

### 5️⃣ Get Refresh Token

#### Option A: Using the App (Recommended)

1. Add credentials to your `.env.local` file:
   ```env
   GOOGLE_DRIVE_CLIENT_ID=your_client_id_here
   GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/recordings/google-auth
   ```

2. Start the app:
   ```bash
   npm run dev
   ```

3. Open browser and go to:
   ```
   http://localhost:3000/api/recordings/google-auth
   ```

4. This will redirect you to Google sign-in
5. Grant permissions to the app
6. You'll be redirected back with your tokens
7. Copy the `refresh_token` from the response
8. Add it to `.env.local`:
   ```env
   GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token_here
   ```

#### Option B: Using OAuth Playground

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click ⚙️ (settings) in top right
3. Check **Use your own OAuth credentials**
4. Enter your Client ID and Client Secret
5. In Step 1, enter scopes:
   ```
   https://www.googleapis.com/auth/drive.file
   https://www.googleapis.com/auth/drive.appdata
   ```
6. Click **Authorize APIs**
7. Sign in and grant permissions
8. In Step 2, click **Exchange authorization code for tokens**
9. Copy the **Refresh Token**
10. Add to `.env.local`:
    ```env
    GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token_here
    ```

### 6️⃣ Configure Environment Variables

Create or update `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Drive Configuration
GOOGLE_DRIVE_CLIENT_ID=123456789-abcdefgh.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=GOCSPX-your_client_secret_here
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/recordings/google-auth
GOOGLE_DRIVE_REFRESH_TOKEN=1//0g-your_refresh_token_here

# App Configuration
NEXT_PUBLIC_APP_NAME=Call Monitor
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=development
```

### 7️⃣ Restart the Application

```bash
npm run dev
```

---

## 🎯 Usage

### Automatic Upload (After Recording)

The app will automatically upload recordings to Google Drive after each call is recorded.

### Manual Upload

You can also manually upload existing recordings:

```typescript
import { CallMonitor } from '@/plugins/CallMonitorPlugin';

// Upload a recording
const result = await CallMonitor.uploadRecordingToDrive({
  filePath: '/path/to/recording.m4a',
  fileName: 'call_recording_2024_01_15.m4a'
});

if (result.success) {
  console.log('Uploaded to:', result.fileUrl);
} else {
  console.error('Upload failed:', result.error);
}
```

### Via API Endpoint

For web uploads or server-side uploads:

```javascript
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('fileName', 'recording.m4a');

const response = await fetch('/api/recordings/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('File uploaded:', result.fileUrl);
}
```

---

## 📁 Google Drive Folder Structure

All recordings are stored in:
```
Google Drive/
└── Call Recordings/
    ├── Recording_+1234567890_2024-01-15_10-30-45.m4a
    ├── Recording_+0987654321_2024-01-15_11-20-30.m4a
    └── ...
```

---

## 🔒 Security & Privacy

### What Access Does the App Have?

- **drive.file**: Only files created by this app
- **drive.appdata**: App-specific hidden folder
- ❌ **NO access** to your other Drive files
- ❌ **NO access** to shared files or folders

### Data Protection

- Files are uploaded via secure HTTPS
- OAuth tokens are stored securely in environment variables
- Refresh tokens never expire (unless revoked)
- Local recordings can be deleted after upload

---

## 🛠️ Troubleshooting

### Error: "Google Drive not configured"

**Solution**: Make sure all environment variables are set in `.env.local`

### Error: "Invalid credentials"

**Solutions**:
1. Check Client ID and Client Secret are correct
2. Verify redirect URI matches exactly
3. Ensure Google Drive API is enabled
4. Check if app is still in "Testing" mode (add test users)

### Error: "Token expired"

**Solution**: 
1. Delete `GOOGLE_DRIVE_REFRESH_TOKEN` from `.env.local`
2. Follow Step 5 again to get a new refresh token

### Upload fails silently

**Solutions**:
1. Check Google Drive storage quota (15GB free)
2. Verify file permissions on Android
3. Check network connectivity
4. Review server logs for detailed errors

### "Access blocked: This app's request is invalid"

**Solution**: 
1. Go to OAuth consent screen
2. Publish the app (or add your email as test user)
3. Verify scopes are correctly configured

---

## 📊 Storage Quota

- **Free Google Account**: 15 GB shared across Drive, Gmail, Photos
- **Google One (100GB)**: $1.99/month
- **Google One (200GB)**: $2.99/month
- **Google Workspace**: Starting at $6/user/month

### Estimate Your Needs

- Average call recording: 1-5 MB per minute
- 1 hour of recordings ≈ 60-300 MB
- 15 GB can store: ~50-250 hours of recordings

---

## 🔄 Migration from Local Storage

To migrate existing recordings:

1. Get all local recordings:
```typescript
const { recordings } = await CallMonitor.getRecordings();
```

2. Upload each recording:
```typescript
for (const recording of recordings) {
  await CallMonitor.uploadRecordingToDrive({
    filePath: recording.filePath,
    fileName: recording.fileName
  });
}
```

3. Update database to mark as uploaded

---

## 🌐 Production Deployment

### Update Redirect URI

1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Add production redirect URI:
   ```
   https://yourdomain.com/api/recordings/google-auth
   ```

### Update Environment Variables

In your production environment (Vercel, Netlify, etc.):

```env
GOOGLE_DRIVE_CLIENT_ID=your_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret
GOOGLE_DRIVE_REDIRECT_URI=https://yourdomain.com/api/recordings/google-auth
GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token
```

### Publish OAuth App

1. Go to **OAuth consent screen**
2. Click **Publish App**
3. Submit for verification (if needed)

---

## 📞 Support

If you encounter issues:

1. Check [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
2. Review [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
3. Open an issue on GitHub

---

## ✅ Quick Checklist

- [ ] Created Google Cloud Project
- [ ] Enabled Google Drive API
- [ ] Configured OAuth consent screen
- [ ] Created OAuth credentials
- [ ] Got refresh token
- [ ] Added all environment variables to `.env.local`
- [ ] Restarted the app
- [ ] Tested upload functionality
- [ ] Verified files in Google Drive

---

## 🎉 You're All Set!

Your recordings will now automatically backup to Google Drive. Access them anytime at [drive.google.com](https://drive.google.com) in the **Call Recordings** folder.
