# Permission Fix Guide

## Problem Identified

Your Call Monitor app had **permission handling issues** in the Android native plugin. Even when permissions were granted manually, the app wasn't working because:

1. **Missing Permission Callback** - The `requestAllPermissionsPlugin` method was calling a callback function that didn't exist
2. **No Error Logging** - When permissions failed, there was no debugging information
3. **Android 13+ Compatibility** - The app wasn't handling newer Android permission requirements correctly

## What Was Fixed

### 1. Fixed Permission Request Flow
**File**: `android/app/src/main/java/com/callmonitor/app/CallMonitorPlugin.java`

- **Added proper callback method** (`permissionsCallback`) that actually resolves permission requests
- **Added logging** throughout permission checks to help debug issues
- **Android version compatibility** - Different permissions for Android 13+ vs older versions
- **Immediate return** when permissions are already granted

### 2. Enhanced Logging
Added comprehensive logging with `Log.d()` statements:
- Permission check results
- Permission request status
- Call log retrieval success/failure
- Device information

### 3. Added Debug Tool
**New File**: `src/components/PermissionDebugger.tsx`

A diagnostic panel that shows:
- Platform information
- Current permission status
- Device details
- Call log access test
- Detailed error messages

This appears on the home screen when you're on a native Android device.

## How to Rebuild and Test

### Step 1: Clean Build
```powershell
# Navigate to your project directory
cd "d:\Easy2Work\Call Monitor"

# Clean previous builds
Remove-Item -Recurse -Force android\app\build -ErrorAction SilentlyContinue
```

### Step 2: Sync Capacitor
```powershell
# Copy web assets to Android
npx cap sync android
```

### Step 3: Build APK
```powershell
# Open Android Studio
npx cap open android

# Or build from command line:
cd android
.\gradlew assembleDebug
```

The APK will be at: `android\app\build\outputs\apk\debug\app-debug.apk`

### Step 4: Install & Test
```powershell
# Install on connected device
adb install -r android\app\build\outputs\apk\debug\app-debug.apk

# Check logs in real-time
adb logcat -s CallMonitorPlugin:D
```

## Testing Checklist

After installing the new APK:

### ✅ Initial Launch
1. Open the app
2. You should see "Permissions Required" screen
3. Click "Grant Permissions" button
4. Android should show permission dialogs
5. Grant ALL permissions (especially READ_CALL_LOG and READ_PHONE_STATE)

### ✅ Use Debug Panel
1. After granting permissions, look for "🔧 Debug Tools" panel
2. Click "Run Diagnostics"
3. Check the output shows:
   - `callLogs: true`
   - `phoneState: true`
   - `✅ Successfully retrieved X call log(s)`

### ✅ View Call Logs
1. If permissions are granted correctly, you should see the Dashboard
2. Your recent calls should appear in the list
3. Contact names should show (if Contacts permission granted)

## If Still Not Working

### Check Logcat Logs
```powershell
adb logcat -s CallMonitorPlugin:D
```

Look for:
- `"Checking all permissions..."`
- `"Permission READ_CALL_LOG: true"` (should be true)
- `"Retrieved X call log entries"`

### Manual Permission Check
1. Go to Android Settings
2. Apps → Call Monitor → Permissions
3. Ensure these are granted:
   - **Phone** (includes READ_CALL_LOG)
   - **Contacts** (optional but recommended)
   - **Microphone** (for recording)
   - **Files and media** (for Android 12 and below)
   - **Music and audio** (for Android 13+)
   - **Notifications** (for Android 13+)

### Reset App Data
If permissions seem stuck:
```powershell
# Uninstall completely
adb uninstall com.callmonitor.app

# Reinstall fresh
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

## Common Issues & Solutions

### Issue: "Permission denied" even after granting
**Solution**: Make sure you granted the **Phone** permission (not just Contacts). The Phone permission includes READ_CALL_LOG.

### Issue: Permissions dialog doesn't appear
**Solution**: You may have previously denied and selected "Don't ask again". Go to Settings → Apps → Call Monitor → Permissions and grant manually.

### Issue: App shows green checkmark but no call logs
**Solution**: 
1. Use the Debug Tool to check actual permission status
2. Check logcat for errors
3. Make sure you have some call history on your device

### Issue: Android 13+ specific problems
**Solution**: On Android 13 and above, you need:
- `POST_NOTIFICATIONS` for notifications
- `READ_MEDIA_AUDIO` instead of READ_EXTERNAL_STORAGE

The updated code handles this automatically.

## Key Code Changes Summary

### Before (Broken):
```java
@PluginMethod
public void requestAllPermissionsPlugin(PluginCall call) {
    String[] permissions = {...};
    requestPermissionForAliases(permissions, call, "permissionsCallback");
    // ❌ No permissionsCallback method existed!
}
```

### After (Fixed):
```java
@PluginMethod
public void requestAllPermissionsPlugin(PluginCall call) {
    Log.d(TAG, "Requesting all permissions...");
    
    // Check if already granted
    if (callLogsGranted && phoneStateGranted) {
        JSObject ret = new JSObject();
        ret.put("granted", true);
        call.resolve(ret);
        return;
    }
    
    // Android version-specific permissions
    String[] permissions = {...};
    requestPermissionForAliases(permissions, call, "permissionsCallback");
}

@PluginMethod
public void permissionsCallback(PluginCall call) {
    // ✅ This method now exists!
    boolean granted = checkPermission(READ_CALL_LOG) && 
                     checkPermission(READ_PHONE_STATE);
    JSObject ret = new JSObject();
    ret.put("granted", granted);
    call.resolve(ret);
}
```

## Next Steps

1. **Rebuild** the APK with the fixes
2. **Test** on your device
3. **Use Debug Panel** to verify permissions work
4. **Check logcat** if you encounter issues
5. **Report back** what you see in the Debug Tool output

## Need Help?

If the app still doesn't work after rebuilding:
1. Run the Debug Diagnostics and share the output
2. Share the logcat logs: `adb logcat -s CallMonitorPlugin:D > logs.txt`
3. Confirm your Android version
4. List which permissions show as granted in Settings
