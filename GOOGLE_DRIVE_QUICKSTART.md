# 🚀 Google Drive Quick Start

Get your recordings in Google Drive in **5 minutes**!

---

## ⚡ Step 1: Install (Already Done ✓)

The required packages are already installed:
- `googleapis`
- `@google-cloud/local-auth`
- `formidable`

---

## ⚙️ Step 2: Google Cloud Console Setup (10 minutes)

### 1. Create Project
1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Click **Select Project** → **New Project**
3. Name: "Call Monitor" → **Create**

### 2. Enable API
1. Go to **APIs & Services** → **Library**
2. Search "Google Drive API" → **Enable**

### 3. Configure OAuth
1. **APIs & Services** → **OAuth consent screen**
2. Select **External** → **Create**
3. Fill in:
   - App name: Call Monitor
   - Your email for support and contact
4. **Save and Continue**
5. Add scopes:
   - `https://www.googleapis.com/auth/drive.file`
6. Add test users (your email) → **Save**

### 4. Get Credentials
1. **APIs & Services** → **Credentials**
2. **Create Credentials** → **OAuth client ID**
3. Type: **Web application**
4. Name: Call Monitor Client
5. Authorized redirect URIs:
   ```
   http://localhost:3000/api/recordings/google-auth
   ```
6. **Create** → Copy Client ID & Secret

---

## 🔑 Step 3: Get Refresh Token

### Option A: Browser Method (Easiest)

1. **Add credentials to `.env.local`:**
   ```env
   GOOGLE_DRIVE_CLIENT_ID=your_client_id_here
   GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/recordings/google-auth
   ```

2. **Start app:**
   ```bash
   npm run dev
   ```

3. **Open browser:**
   ```
   http://localhost:3000/api/recordings/google-auth
   ```

4. **Sign in with Google** and grant permissions

5. **Copy the `refresh_token`** from the response JSON

6. **Add to `.env.local`:**
   ```env
   GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token_here
   ```

### Option B: OAuth Playground

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click ⚙️ → Check "Use your own OAuth credentials"
3. Enter Client ID & Secret
4. Scopes: `https://www.googleapis.com/auth/drive.file`
5. **Authorize APIs** → Sign in
6. **Exchange authorization code for tokens**
7. Copy **Refresh Token**
8. Add to `.env.local`

---

## 📝 Step 4: Complete `.env.local`

Create/update `.env.local` in project root:

```env
# Supabase (your existing config)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Google Drive (new)
GOOGLE_DRIVE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=GOCSPX-your_secret_here
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/recordings/google-auth
GOOGLE_DRIVE_REFRESH_TOKEN=1//0g-your_token_here

# App
NEXT_PUBLIC_APP_NAME=Call Monitor
NODE_ENV=development
```

---

## 🎯 Step 5: Restart & Test

1. **Restart the app:**
   ```bash
   npm run dev
   ```

2. **Test upload** (in browser console or code):
   ```typescript
   import { CallMonitor } from '@/plugins/CallMonitorPlugin';
   
   const result = await CallMonitor.uploadRecordingToDrive({
     filePath: '/path/to/recording.m4a',
     fileName: 'test.m4a'
   });
   
   console.log(result);
   ```

3. **Check Google Drive:**
   - Go to [drive.google.com](https://drive.google.com)
   - Look for "Call Recordings" folder
   - Your file should be there! 🎉

---

## 💡 Usage Examples

### In Your Component

```typescript
import { GoogleDriveUploadButton } from '@/components/GoogleDriveUploadButton';

function MyComponent() {
  return (
    <GoogleDriveUploadButton
      recording={{ 
        filePath: '/path/to/recording.m4a',
        fileName: 'call.m4a'
      }}
      onUploadComplete={(url) => {
        console.log('Uploaded to:', url);
      }}
    />
  );
}
```

### Auto-Upload After Recording

```typescript
// After call ends
const result = await CallMonitor.stopRecording();

if (result.success && result.filePath) {
  // Upload to Drive
  await CallMonitor.uploadRecordingToDrive({
    filePath: result.filePath,
    fileName: `recording_${Date.now()}.m4a`
  });
}
```

---

## 🐛 Troubleshooting

### "Google Drive not configured"
→ Check `.env.local` has all 4 variables

### "Invalid credentials"  
→ Verify Client ID & Secret are correct

### "Token expired"
→ Generate a new refresh token (Step 3)

### Upload fails
→ Check Google Drive storage (15GB free)

---

## 📚 Need More Help?

- **Full Setup Guide:** [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md)
- **Usage Examples:** [GOOGLE_DRIVE_USAGE.md](./GOOGLE_DRIVE_USAGE.md)
- **Implementation Details:** [GOOGLE_DRIVE_IMPLEMENTATION.md](./GOOGLE_DRIVE_IMPLEMENTATION.md)

---

## ✅ Checklist

- [ ] Created Google Cloud Project
- [ ] Enabled Google Drive API
- [ ] Set up OAuth consent screen
- [ ] Created OAuth credentials
- [ ] Got refresh token
- [ ] Updated `.env.local`
- [ ] Restarted app
- [ ] Tested upload
- [ ] Verified in Google Drive

---

## 🎊 You're Done!

Your recordings now automatically backup to Google Drive! 

Access them anytime at: [drive.google.com](https://drive.google.com) → **Call Recordings** folder

🚀 Enjoy cloud storage!
