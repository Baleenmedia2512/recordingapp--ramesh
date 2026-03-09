# LMS Integration Implementation - Complete

## 🎉 What Was Implemented

The LMS (Lead Management System) integration has been successfully added to your Call Monitor app without affecting any existing functionality. The app now supports:

1. **Automatic call detection from LMS** - When you click "Call Now" in LMS, the app detects it
2. **Recording upload to Google Drive** - Recordings are uploaded and made accessible
3. **Automatic recording sync to LMS** - Recording URLs are sent back to LMS automatically
4. **Graceful fallback** - If LMS is unavailable, the app continues to work normally

## 📁 Files Created

### Configuration Files
- **`src/config/lms.config.ts`** - LMS connection settings and endpoints
- **`.env.local`** - Updated with LMS environment variables

### Service Files
- **`src/services/lmsApi.ts`** - API functions for communicating with LMS
  - `checkLMSCall()` - Check if a call was initiated from LMS
  - `updateLMSRecording()` - Send recording URL to LMS
  - `testLMSConnection()` - Test if LMS is reachable

- **`src/services/googleDriveService.ts`** - Google Drive and LMS integration
  - `handleOutgoingCall()` - Process outgoing calls and check LMS
  - `sendRecordingToLMS()` - Send recording URLs to LMS
  - `completeRecordingUpload()` - Complete upload flow
  - Storage helpers for LMS call data

### Hook Files
- **`src/hooks/useLMSIntegration.ts`** - React hook for LMS functionality
  - Connection testing
  - Call processing
  - Recording submission
  - Phone state monitoring

### Updated Files
- **`src/pages/_app.tsx`** - Added LMS connection test on app start
- **`src/hooks/useGoogleDriveUpload.ts`** - Enhanced to send recordings to LMS
- **`.env.example`** - Added LMS configuration template

## ⚙️ Configuration Required

### Step 1: Update Environment Variables

Edit `.env.local` and update these values:

```env
# LMS Integration Settings
NEXT_PUBLIC_LMS_URL=http://192.168.1.XXX:3000    # Change XXX to your IP
NEXT_PUBLIC_LMS_API_KEY=your-secret-key-here-change-this-123456
NEXT_PUBLIC_LMS_ENABLED=true
```

**To find your IP address:**
- Windows: Run `ipconfig` in Command Prompt, look for "IPv4 Address"
- Mac/Linux: Run `ifconfig` or `ip addr`

**Important:**
- For local testing, use your computer's IP address (e.g., `http://192.168.1.100:3000`)
- For production, use your deployed LMS domain (e.g., `https://your-lms.com`)
- The API key must match the one in your LMS `.env` file

### Step 2: Ensure LMS APIs are Running

Your LMS should have these endpoints available:
- `POST /api/call-monitor/match-call` - Match incoming call requests
- `POST /api/call-monitor/update-recording` - Receive recording URLs
- `GET /api/health` - Health check endpoint

## 🔄 How It Works

### Call Flow

```
1. User clicks "Call Now" in LMS
   ↓
2. LMS saves call attempt to database
   - Phone number: 9876543210
   - Timestamp: 2024-01-15 14:30:00
   - Status: pending
   ↓
3. Phone dialer opens
   ↓
4. Call Monitor app detects outgoing call
   ↓
5. App calls checkLMSCall(9876543210, 14:30:15)
   - Checks within ±3 minute window
   ↓
6. LMS responds with match
   - isLMSCall: true
   - callLogId: ABC123
   - leadName: "Ramesh"
   ↓
7. App stores LMS call info locally
   ↓
8. Call happens (user records if needed)
   ↓
9. Recording uploads to Google Drive
   ↓
10. App gets shareable URL
    ↓
11. App calls updateLMSRecording(ABC123, url, duration)
    ↓
12. LMS updates database with recording URL
    ↓
13. Sales team can play recording in LMS
```

### Integration Points

#### 1. App Startup (`_app.tsx`)
- Tests LMS connection when app loads
- Logs connection status to console
- App continues normally even if LMS is unavailable

#### 2. Outgoing Call Detection
The app monitors phone state changes and:
- Detects when an outgoing call is made
- Normalizes the phone number
- Checks with LMS if this call was initiated there
- Stores LMS call information for later use

#### 3. Recording Upload
When a recording is uploaded to Google Drive:
- Upload completes successfully
- Direct play link is generated
- App checks if this was an LMS call
- If yes, sends recording URL to LMS
- If no, just saves locally

## 🧪 Testing the Integration

### Prerequisites
- ✅ LMS server running (`npm run dev` in LMS directory)
- ✅ Phone and computer on same WiFi network
- ✅ `.env.local` configured with correct IP and API key
- ✅ New APK built and installed on phone

### Test 1: Connection Test
1. Open Call Monitor app
2. Check logs for: `"✅ LMS integration ready"`
3. If you see `"⚠️ LMS not reachable"`:
   - Verify IP address is correct
   - Ensure LMS server is running
   - Check firewall settings

### Test 2: LMS Call Detection
1. Open LMS web app
2. Click "Call Now" on any lead
3. Make the call from your phone
4. Check Call Monitor logs for:
   - `"📞 Outgoing call detected"`
   - `"✅ LMS call detected!"`
   - Lead name should appear

### Test 3: Recording Upload
1. Continue Test 2 and record the call
2. End call and let recording upload
3. Check logs for:
   - `"📨 Sending recording to LMS..."`
   - `"✅ LMS updated with recording URL!"`
4. Open LMS and check the call log
5. Recording should appear with play button

### Test 4: Regular Call
1. Make a regular call (not from LMS)
2. Check logs for: `"ℹ️ Regular call (not from LMS)"`
3. Recording still works but doesn't sync to LMS

## 🔧 Build New APK

### Development Build
```bash
npm run build
npx cap sync android
npx cap open android
```
Then in Android Studio: **Build → Build APK**

### Production Build
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
```
APK location: `android/app/build/outputs/apk/release/app-release.apk`

## 🐛 Troubleshooting

### "Cannot reach LMS"
**Causes:**
- Wrong IP address in `.env.local`
- LMS server not running
- Phone and computer on different networks
- Firewall blocking connection

**Solutions:**
1. Verify IP: Run `ipconfig` and update `.env.local`
2. Start LMS: `npm run dev` in LMS directory
3. Check WiFi: Ensure same network
4. Test in browser: Open `http://YOUR_IP:3000` on phone

### "No match found" for LMS calls
**Causes:**
- Phone number format mismatch
- Time sync issues
- Called too long after clicking "Call Now"

**Solutions:**
1. Both systems remove formatting from phone numbers
2. Sync device time with internet time
3. Dial within 3 minutes of clicking "Call Now"

### Recording not appearing in LMS
**Causes:**
- Upload failed
- LMS API error
- Recording URL not public

**Solutions:**
1. Check Call Monitor logs for upload success
2. Verify Google Drive file is publicly accessible
3. Check LMS database for recording URL

## 📊 Code Integration Points

### Using LMS Integration in Your Code

```typescript
// Import the hook
import { useLMSIntegration } from '@/hooks/useLMSIntegration';

// In your component
function MyComponent() {
  const { 
    lmsStatus, 
    checkLMSConnection, 
    processOutgoingCall,
    sendRecordingToLMSServer 
  } = useLMSIntegration();

  // Check if LMS is connected
  useEffect(() => {
    checkLMSConnection();
  }, []);

  // Process an outgoing call
  const handleCall = async (phoneNumber: string) => {
    await processOutgoingCall(phoneNumber);
  };

  // Send recording after upload
  const handleRecordingUpload = async (url: string, duration: number) => {
    const success = await sendRecordingToLMSServer(url, duration);
    console.log('Sent to LMS:', success);
  };
}
```

### Manual Call Processing

```typescript
import { checkLMSCall, updateLMSRecording } from '@/services/lmsApi';

// Check if a call is from LMS
const lmsData = await checkLMSCall('9876543210', new Date());
if (lmsData?.isLMSCall) {
  console.log('Lead:', lmsData.leadName);
  // Store callLogId for later
}

// Send recording URL to LMS
const success = await updateLMSRecording(
  'callLogId',
  'https://drive.google.com/...',
  120, // duration in seconds
  'fileId123' // optional recording ID
);
```

## 🔐 Security Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use HTTPS in production** - Don't use `http://` for deployed LMS
3. **Keep API keys secret** - Match between Call Monitor and LMS
4. **Validate uploads** - Ensure recording URLs are from trusted sources

## ✅ What's Protected

The implementation is designed to not affect existing functionality:

- ✅ Regular call recording still works
- ✅ Google Drive upload still works
- ✅ LMS integration is optional (can be disabled)
- ✅ App continues if LMS is unavailable
- ✅ No breaking changes to existing code
- ✅ All features work independently

## 🎯 Success Indicators

You'll know everything is working when:

1. ✅ App starts and shows "LMS integration ready"
2. ✅ Click "Call Now" in LMS
3. ✅ Make call from phone
4. ✅ App logs "LMS call detected"
5. ✅ Recording uploads to Drive
6. ✅ App logs "LMS updated with recording URL"
7. ✅ Open LMS call logs
8. ✅ See and play the recording

## 📱 Next Steps

1. **Configure Environment**
   - Update `.env.local` with your LMS URL
   - Match API key with LMS

2. **Build and Install**
   - Build new APK
   - Install on test device

3. **Test Integration**
   - Follow testing checklist above
   - Verify all flows work

4. **Monitor Logs**
   - Watch for LMS-related messages
   - Check both app and LMS logs

5. **Deploy**
   - Update production URLs
   - Use HTTPS for security
   - Deploy to production devices

## 📞 Support

**Check Logs For:**
- `[LMS]` prefix - All LMS-related messages
- `✅` - Success indicators
- `⚠️` - Warnings (app still works)
- `❌` - Errors needing attention

**Common Log Messages:**
- `"[LMS] Integration disabled"` - LMS is turned off
- `"[LMS] ✅ Connection successful"` - LMS is reachable
- `"[LMS] ✅ Match found!"` - Call was from LMS
- `"[LMS] ✅ Recording updated successfully!"` - Recording sent to LMS

---

**Implementation Complete! 🎉**

All LMS integration features have been added without affecting existing functionality. Configure your environment variables and start testing!
