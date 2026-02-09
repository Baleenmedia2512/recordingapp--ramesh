# Supabase Storage Setup Guide

## What's Been Done

### 1. ✅ Environment Configuration
- Added Supabase credentials to `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL=https://wkwrrdcjknvupwsfdjtd.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...` (your publishable key)

### 2. ✅ Created Upload Service
- **File**: `src/services/supabaseUpload.ts`
- **Functions**:
  - `uploadRecordingToSupabase()` - Uploads recording to Supabase Storage
  - `uploadAndSyncToLMS()` - Complete flow: upload + send URL to LMS
  - `ensureBucketExists()` - Auto-creates bucket if needed
  - `filePathToBlob()` - Converts native file paths to Blob

### 3. ✅ Updated Upload Hook
- **File**: `src/hooks/useGoogleDriveUpload.ts`
- **Changed**: Now uses Supabase instead of CallMonitor plugin
- **Returns**: `{ url, sentToLMS }` object with upload results

## Next Steps

### Step 1: Create Storage Bucket in Supabase

1. **Go to Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard/project/wkwrrdcjknvupwsfdjtd

2. **Navigate to Storage**:
   - Click "Storage" in left sidebar

3. **Create Bucket**:
   - Click "New bucket"
   - Bucket name: `recordings`
   - Make it **public** (check "Public bucket")
   - Click "Create bucket"

4. **Set Storage Policies** (if needed):
   ```sql
   -- Allow public read access
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING ( bucket_id = 'recordings' );

   -- Allow authenticated uploads
   CREATE POLICY "Authenticated uploads"
   ON storage.objects FOR INSERT
   WITH CHECK ( bucket_id = 'recordings' );
   ```

### Step 2: Set Matching API Key

You need to set the same API key in **both** places:

#### A. In Call Monitor App
Edit `.env.local`:
```env
NEXT_PUBLIC_LMS_API_KEY=your-super-secret-key-12345
```

#### B. In LMS (Vercel)
1. Go to Vercel Dashboard
2. Select your LMS project
3. Go to Settings → Environment Variables
4. Add: `LMS_API_KEY=your-super-secret-key-12345`
5. Redeploy LMS

**Important**: Use a strong, unique key. This key must match exactly in both apps.

### Step 3: Rebuild APK

```bash
# Build Next.js app
npm run build

# Sync to Android
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 4: Test Complete Flow

1. **In LMS** (https://e2wleadmanager.vercel.app):
   - Create a new lead
   - Click "Call Now" button
   - Note the phone number

2. **In Call Monitor App**:
   - Make a call to that number
   - Let it record for at least 10-15 seconds
   - End the call

3. **Verify Upload**:
   - Check phone: Recording should be on phone
   - Check Supabase: Recording should be in Storage bucket
   - Check LMS: Recording URL should appear in lead's record

### Step 5: Monitor Logs

Watch console logs for:
- ✅ `Supabase bucket 'recordings' already exists`
- ✅ `Recording uploaded to Supabase: https://...`
- ✅ `Found LMS call info for number: +91...`
- ✅ `Recording sent to LMS successfully`

## Troubleshooting

### Upload Fails
- Check Supabase bucket exists and is public
- Verify file size < 50MB
- Check file type is audio (mp3, wav, m4a, aac, 3gp)

### LMS Not Receiving URL
- Verify API keys match exactly
- Check phone number format matches (with/without country code)
- Check time window (±3 minutes)
- Check LMS logs in Vercel dashboard

### "Bucket not found" Error
- Go to Supabase dashboard
- Create `recordings` bucket manually
- Make it public

### Permission Errors
- Check Supabase Storage policies
- Ensure public read access enabled
- Verify anon key has insert permissions

## How It Works

```
1. User clicks "Call Now" in LMS
   ↓
2. LMS stores call info (phone, time)
   ↓
3. User makes call from phone
   ↓
4. App detects outgoing call
   ↓
5. App stores LMS call info locally
   ↓
6. Call ends, recording saved
   ↓
7. App uploads recording to Supabase
   ↓
8. Supabase returns public URL
   ↓
9. App checks for LMS call info
   ↓
10. If found, sends URL to LMS
    ↓
11. LMS stores URL in database
    ↓
12. URL appears in LMS interface
```

## File Structure

```
src/
├── services/
│   ├── supabaseUpload.ts       # Supabase upload logic
│   ├── lmsApi.ts               # LMS API calls
│   └── googleDriveService.ts   # LMS call tracking (localStorage)
├── hooks/
│   ├── useGoogleDriveUpload.ts # Upload hook (now uses Supabase)
│   └── useLMSIntegration.ts    # LMS integration hook
└── config/
    └── lms.config.ts           # LMS configuration
```

## Environment Variables Reference

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://wkwrrdcjknvupwsfdjtd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# LMS Configuration
NEXT_PUBLIC_LMS_URL=https://e2wleadmanager.vercel.app
NEXT_PUBLIC_LMS_API_KEY=your-super-secret-key-12345
```

## Success Criteria

- ✅ APK builds without errors
- ✅ App detects outgoing calls
- ✅ Recordings upload to Supabase automatically
- ✅ Public URLs generated
- ✅ LMS receives recording URLs
- ✅ URLs appear in LMS lead details
- ✅ Recordings playable from LMS interface

## Need Help?

Check these files for implementation details:
- **Upload Logic**: `src/services/supabaseUpload.ts`
- **LMS API**: `src/services/lmsApi.ts`
- **Call Tracking**: `src/services/googleDriveService.ts`
- **React Hook**: `src/hooks/useGoogleDriveUpload.ts`
- **Configuration**: `src/config/lms.config.ts`
