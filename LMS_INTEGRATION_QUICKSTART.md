# LMS Integration - Quick Start Guide

## ⚡ Quick Setup (5 Minutes)

### 1. Configure Environment Variables

Open `.env.local` and update these 3 values:

```env
NEXT_PUBLIC_LMS_URL=http://192.168.1.XXX:3000
NEXT_PUBLIC_LMS_API_KEY=your-secret-key-here-change-this-123456
NEXT_PUBLIC_LMS_ENABLED=true
```

**Find your IP:** Run `ipconfig` in Command Prompt (Windows)

### 2. Start LMS Server

```bash
cd path/to/your/lms
npm run dev
```

### 3. Build APK

```bash
npm run build
npx cap sync android
npx cap open android
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK**

### 4. Install on Phone

- Find APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Transfer to phone
- Install (allow "Install from unknown sources" if needed)

### 5. Test

1. Open Call Monitor app
2. Check logs: Should see "✅ LMS integration ready"
3. In LMS: Click "Call Now" on any lead
4. Make the call from phone
5. Record the call
6. Check LMS: Recording should appear!

## 📋 Pre-Flight Checklist

- [ ] Updated `.env.local` with correct IP
- [ ] LMS server is running
- [ ] Phone and computer on same WiFi
- [ ] Built new APK
- [ ] Installed APK on phone
- [ ] Opened Call Monitor app
- [ ] Saw "LMS integration ready" message

## 🎯 Test Flow

```
LMS: Click "Call Now" 
  ↓
Phone: Dialer opens
  ↓
Phone: Make call + record
  ↓
Phone: End call
  ↓
App: Uploads to Drive
  ↓
LMS: Recording appears! 🎵
```

## ⚠️ Troubleshooting Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| "Cannot reach LMS" | Check IP address, ensure same WiFi |
| "No match found" | Make call within 3 min of clicking "Call Now" |
| Recording not in LMS | Check logs for "LMS updated" message |
| Build fails | Run `cd android && ./gradlew clean` |

## 📱 What Changed in Your App

**New Features Added:**
- ✅ Automatic LMS call detection
- ✅ Recording URL auto-sync to LMS
- ✅ Connection status monitoring

**Nothing Broken:**
- ✅ Regular calls still work
- ✅ Recording still works
- ✅ Google Drive upload still works
- ✅ All existing features intact

## 🔍 Check Log Messages

**On App Start:**
```
✅ LMS integration ready
```

**On Call:**
```
📞 Outgoing call detected: 9876543210
[LMS] Checking if call is from LMS
[LMS] ✅ Match found! Lead: Ramesh
```

**After Recording:**
```
📨 Sending recording to LMS...
[LMS] ✅ Recording updated successfully!
```

## 📞 Need Help?

See full documentation: `LMS_INTEGRATION_README.md`

---

**Ready to test!** Follow the 5-minute setup above and start testing the integration.
