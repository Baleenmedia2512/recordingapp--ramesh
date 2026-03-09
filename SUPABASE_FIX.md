# 🔧 Fix Supabase Upload Error

## Current Error
```
❌ Supabase upload error: StorageUnknownError: Failed to fetch
```

## Root Cause
The Supabase storage bucket "recordings" doesn't exist yet.

## ✅ Quick Fix (5 minutes)

### Step 1: Go to Supabase Dashboard
Visit: https://supabase.com/dashboard/project/wkwrrdcjknvupwsfdjtd

### Step 2: Create Storage Bucket
1. Click **"Storage"** in the left sidebar
2. Click **"New bucket"** button
3. Enter bucket name: `recordings`
4. ✅ Check **"Public bucket"** (important!)
5. Click **"Create bucket"**

### Step 3: Set Storage Policies (Optional but Recommended)
1. Click on the **"recordings"** bucket
2. Go to **"Policies"** tab
3. Click **"New Policy"**
4. Select **"For full customization"**
5. Add this policy:

```sql
-- Allow anyone to read recordings
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'recordings' );

-- Allow anyone to upload recordings  
CREATE POLICY "Public Upload Access"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'recordings' );
```

### Step 4: Test Upload
1. Rebuild app: `npm run build`
2. Sync: `npx cap sync android`
3. Install APK on phone
4. Make a test call
5. Check if recording uploads successfully

## ✅ How to Verify It's Fixed

After setup, you should see in the app logs:
```
✅ Bucket already exists
✅ File uploaded to Supabase: call-recordings/1234567890_recording.m4a
🔗 Public URL: https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/...
```

## 📱 What Happens Next

Once configured:
1. ✅ Every call recording automatically uploads to Supabase
2. ✅ Public URL generated for each recording
3. ✅ URL automatically sent to LMS (if enabled)
4. ✅ Recordings accessible from anywhere via URL

## 🆘 Still Having Issues?

### Issue: "Permission Denied"
**Fix**: Make sure the bucket is set to **Public** in Supabase Dashboard

### Issue: "Bucket not found"
**Fix**: Double-check bucket name is exactly `recordings` (lowercase, no spaces)

### Issue: "Network error"
**Fix**: 
- Check phone has internet connection
- Check Supabase project is active (not paused)
- Verify `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` is correct

## 📊 Storage Usage

Free Supabase tier includes:
- ✅ 1 GB storage
- ✅ 2 GB bandwidth/month
- ✅ Unlimited API requests

Good for ~1000-2000 call recordings depending on length.

## 🔐 Security Note

The bucket is set to **public** which means:
- ✅ Anyone with the URL can listen to recordings
- ✅ Anyone can upload to the bucket

If you need private storage:
1. Change bucket to "Private"
2. Update storage policies to require authentication
3. Update app code to use authenticated uploads

---

**Need help?** Check the full guide: `SUPABASE_STORAGE_SETUP.md`
