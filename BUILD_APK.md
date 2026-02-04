# 📦 Build APK - Simple Guide

## Method 1: Using Android Studio (EASIEST)

Android Studio is already open. Follow these steps:

1. **Wait for Gradle Sync** 
   - Bottom status bar shows "Gradle Build Running..." 
   - Wait until it says "BUILD SUCCESSFUL"

2. **Build APK**
   - Click: `Build` menu → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - Wait 1-2 minutes for build to complete
   - A notification will pop up saying "APK(s) generated successfully"

3. **Find Your APK**
   - Click "locate" in the notification OR
   - Navigate to: `android\app\build\outputs\apk\debug\app-debug.apk`

4. **Install on Phone**
   - Transfer `app-debug.apk` to your phone via USB/email/cloud
   - On phone: Open the APK file and install
   - Enable "Install from Unknown Sources" if prompted

---

## Method 2: Using Command Line

In Android Studio Terminal (bottom panel), run:

```bash
# For debug APK (for testing)
cd android
gradlew.bat assembleDebug

# APK location: android\app\build\outputs\apk\debug\app-debug.apk
```

For release APK (signed):
```bash
gradlew.bat assembleRelease
# Requires signing configuration
```

---

## APK Locations

- **Debug APK** (for testing): `android\app\build\outputs\apk\debug\app-debug.apk`
- **Release APK** (for distribution): `android\app\build\outputs\apk\release\app-release.apk`

---

## Install APK on Phone

### Option A: USB Transfer
1. Connect phone to PC via USB
2. Enable File Transfer mode on phone
3. Copy APK to phone's Downloads folder
4. On phone: Open Files app → Downloads → Tap the APK

### Option B: Wireless
1. Upload APK to Google Drive/Dropbox
2. Download on phone
3. Tap the APK to install

**First time installation:**
- Android will ask "Install from Unknown Source?"
- Enable it for your file manager/browser
- Then install the app

---

## ⚠️ Important Notes

- **Debug APK**: Use for testing only (larger size, not optimized)
- **File size**: ~15-30 MB
- **Permissions**: App needs Phone, Microphone, Storage, and Notifications
- **Testing calls**: Must test on real phone, not emulator

---

## Troubleshooting

**Build fails in Android Studio?**
- Go to `Tools` → `SDK Manager` 
- Install Android SDK Platform 34
- Click "Sync Project with Gradle Files" (elephant icon)

**Can't install APK on phone?**
- Enable "Install Unknown Apps" in phone Settings
- Check phone has enough storage space
- Disable Play Protect temporarily

**Need help?**
- Check Android Studio's "Build" output panel for errors
- Post error messages for debugging
