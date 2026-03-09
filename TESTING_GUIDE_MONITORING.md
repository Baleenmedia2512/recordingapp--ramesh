# Background Monitoring Testing Guide

## 🎯 Quick Test Scenarios

This guide provides step-by-step instructions to validate the native 24/7 call monitoring implementation.

## ⚙️ Prerequisites

1. **Physical Android Device** (emulators don't receive real phone calls)
2. **USB Debugging Enabled**
3. **APK Installed**: `.\build-apk.ps1` → Install via `adb install android/app/build/outputs/apk/debug/app-debug.apk`
4. **Second Phone** for making test calls

## 🧪 Test Suite

### Test 1: Basic Service Lifecycle ✅

**Goal**: Verify service can start, stop, and show status correctly

**Steps**:
1. Open app
2. Should see "Background Monitoring" card at top
3. Status should show "⚫ Stopped" or "✅ Running"
4. Tap "▶️ Start Monitoring" button
5. Verify status changes to "✅ Running"
6. Check notification drawer → See "📞 Monitoring calls in background"
7. Tap "🔄" refresh button → Status should remain "Running"
8. Tap "⏹️ Stop Monitoring" button
9. Verify status changes to "⚫ Stopped"
10. Check notification drawer → Notification should be gone

**Expected Result**: Service starts/stops without errors, notification appears/disappears

**Pass Criteria**: ✅ No errors, status indicator reflects actual state

---

### Test 2: App Killed Detection 🔥

**Goal**: Verify service continues monitoring after app is force-closed

**Steps**:
1. Start monitoring service
2. Note the persistent notification
3. Open Recent Apps switcher
4. Swipe up to kill the app
5. Check notification drawer → Service notification should STILL be visible
6. From second phone, call the test device
7. Should receive notification: "Unknown caller" or contact name
8. Open app again
9. Service status should show "✅ Running"

**Expected Result**: Service survives app termination, calls are detected

**Pass Criteria**: ✅ Notification appears during call despite app being killed

---

### Test 3: Device Reboot Persistence 🔄

**Goal**: Verify service auto-restarts after device reboot

**Steps**:
1. Start monitoring service
2. Verify persistent notification visible
3. Restart the device (long-press power → Restart)
4. After boot completes, check notification drawer
5. Should see "📞 Monitoring calls in background" notification
6. Make a test call
7. Should receive lookup notification

**Expected Result**: Service auto-starts on boot, monitoring continues

**Pass Criteria**: ✅ Service notification appears within 30s of boot completion

**Known Issue**: On Android 12+, may need to open app once after reboot

---

### Test 4: Battery Optimization 🔋

**Goal**: Verify service survives battery saver mode

**Steps**:
1. Start monitoring service
2. Go to: Settings → Battery → Battery Saver
3. Enable "Battery Saver" mode
4. Note the battery optimization warning in app
5. Tap "Disable Battery Optimization" button
6. Grant exemption in system settings
7. Return to app → Warning should disappear
8. Make test call
9. Notification should appear normally
10. Leave device screen-off for 10 minutes
11. Make another test call
12. Should still receive notification

**Expected Result**: Service survives battery optimization and Doze mode

**Pass Criteria**: ✅ Calls detected even with battery saver enabled

---

### Test 5: Known Contact Lookup 📱

**Goal**: Verify contact recognition during calls

**Steps**:
1. Add a contact with name "Test Contact" and phone "+1234567890"
2. Start monitoring service
3. From second phone with number +1234567890, call the test device
4. Wait for notification
5. Should see: "📱 Calling Test Contact - Create lead for this contact?"
6. Answer and end the call
7. Make outgoing call to "Test Contact"
8. Should see same notification

**Expected Result**: Contact name appears in notification

**Pass Criteria**: ✅ Notification shows contact name, not raw phone number

---

### Test 6: Unknown Caller 🤷

**Goal**: Verify handling of numbers not in contacts or LMS

**Steps**:
1. Start monitoring service
2. From unknown number (not in contacts), call test device
3. Wait 2-5 seconds after call starts
4. Should receive notification: "📋 Unknown caller - Add to contacts or create lead"
5. Tap notification (optional: should open app to create lead)

**Expected Result**: Generic unknown caller notification appears

**Pass Criteria**: ✅ Notification appears for unrecognized numbers

---

### Test 7: LMS Lead Detection 📊

**Goal**: Verify lookup against external LMS database

**Steps**:
1. Ensure LMS integration configured (check `src/config/lms.config.ts`)
2. Add test lead to LMS with phone "+1987654321" and name "John Doe"
3. Wait for sync (or manually insert into `leads_metadata` table)
4. Start monitoring service
5. From number +1987654321, call test device
6. Should receive: "📊 Lead calling: John Doe (Interested) - View details"
7. Tap notification → Should open lead details page

**Expected Result**: LMS lead data appears in notification

**Pass Criteria**: ✅ Notification shows lead name and status from LMS

**Note**: Requires network connection and valid Supabase/LMS credentials

---

### Test 8: Network Failure Handling 🌐

**Goal**: Verify graceful degradation when LMS unavailable

**Steps**:
1. Start monitoring service
2. Enable Airplane Mode
3. Make test call from known contact
4. Should still receive notification with contact name (local lookup)
5. Disable Airplane Mode
6. Make call from unknown number
7. Should receive notification after 5s timeout: "Unknown caller"

**Expected Result**: Local contact lookup works offline, LMS lookup times out gracefully

**Pass Criteria**: ✅ No crashes, local lookups work without network

---

### Test 9: Duplicate Call Prevention 🚫

**Goal**: Verify no duplicate notifications for same call

**Steps**:
1. Start monitoring service
2. Make test call that rings for 10+ seconds
3. Let it ring (don't answer)
4. Count notifications received
5. Should see only 1 notification
6. Make another call immediately (within 30s) to same number
7. Should NOT receive duplicate notification

**Expected Result**: One notification per unique call

**Pass Criteria**: ✅ No duplicate notifications for same number within 30s

---

### Test 10: Short Call Handling ⏱️

**Goal**: Verify handling of calls that ring < 3 seconds

**Steps**:
1. Start monitoring service
2. Make test call, let it ring 1 second, then hang up
3. Wait 5 seconds
4. Should see notification (WorkManager delay accommodates this)
5. Make another call, answer immediately (< 2 seconds)
6. Should still receive notification

**Expected Result**: Even short calls trigger notifications

**Pass Criteria**: ✅ Notification appears for calls shorter than 3 seconds

---

## 📊 Test Results Template

Copy this checklist to track your testing:

```
Date: ___________
Device: ___________
Android Version: ___________

[ ] Test 1: Basic Service Lifecycle
[ ] Test 2: App Killed Detection
[ ] Test 3: Device Reboot Persistence
[ ] Test 4: Battery Optimization
[ ] Test 5: Known Contact Lookup
[ ] Test 6: Unknown Caller
[ ] Test 7: LMS Lead Detection
[ ] Test 8: Network Failure Handling
[ ] Test 9: Duplicate Call Prevention
[ ] Test 10: Short Call Handling

Notes:
_________________________________
_________________________________
_________________________________
```

## 🐛 Common Issues

### Issue: Service won't start
**Check**:
- Logcat: `adb logcat -s CallMonitorService`
- Permissions granted in app settings
- Battery optimization disabled

### Issue: No notification during call
**Check**:
- Notification permissions granted (Android 13+)
- Channel not disabled in settings
- Logcat: `adb logcat -s PhoneLookupWorker`

### Issue: Service stops after few hours
**Check**:
- Battery optimization exemption granted
- Device manufacturer restrictions (Xiaomi, Huawei)
- Add to "protected apps" in device settings

### Issue: Contact name not showing
**Check**:
- READ_CONTACTS permission granted
- Contact has phone number in correct format
- Logcat: `adb logcat -s PhoneLookupWorker`

## 📱 Viewing Logs

Real-time monitoring:
```powershell
# All app logs
adb logcat -s CallMonitor:* CallMonitorService:* PhoneLookupWorker:* PhoneStateReceiver:* BootReceiver:*

# Service lifecycle only
adb logcat -s CallMonitorService

# Worker execution only
adb logcat -s PhoneLookupWorker

# Filtered for errors
adb logcat *:E | Select-String "CallMonitor"
```

## ✅ Success Criteria

**All tests must pass before production deployment**:
- ✅ Service survives app termination (Test 2)
- ✅ Service restarts after reboot (Test 3)
- ✅ Contact lookup works offline (Test 8)
- ✅ No duplicate notifications (Test 9)
- ✅ Graceful network failure handling (Test 8)

**Nice to have**:
- ✅ Battery optimization exemption granted (Test 4)
- ✅ LMS integration working (Test 7)
- ✅ Notification actions functional (Test 5)

---

**Next Steps After Testing**:
1. If all tests pass → Deploy to production
2. If issues found → Check troubleshooting section
3. Document device-specific issues (e.g., MIUI quirks)
4. Create user guide for battery optimization settings

**Reference**: See [NATIVE_MONITORING_IMPLEMENTATION.md](./NATIVE_MONITORING_IMPLEMENTATION.md) for architecture details
