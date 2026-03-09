# DNS Troubleshooting Guide

## Test if Your Android Device Can Reach Supabase:

### Step 1: Open Chrome on Android Device
Open the Chrome browser on your Android device/emulator and try to visit:
```
https://wkwrrdcjknvupwsfdjtd.supabase.co
```

**Expected Results:**
- ✅ **If it loads** (shows any page/error):  
  → DNS is working! The app error is something else.
  
- ❌ **If it says "Can't reach this page"**:  
  → DNS is broken. Try the fixes below.

---

## Quick Fixes (In Order of Easiest → Hardest):

### Fix 1: Restart Device (30 seconds) ⭐
- Close your app completely
- Restart Android device/emulator
- Reopen app

### Fix 2: Airplane Mode Toggle (10 seconds) ⭐⭐
- Swipe down from top
- Enable Airplane Mode → Wait 5 seconds → Disable
- Wait for WiFi to reconnect

### Fix 3: Switch WiFi Network (1 minute)
- Turn on mobile hotspot from another phone
- Connect Android device to that hotspot
- Test app again

### Fix 4: Forget WiFi Network (1 minute)
- Settings → Network & Internet → WiFi
- Long-press your network → "Forget"
- Reconnect (enter password)

### Fix 5: Change DNS (Only if Nothing Else Works) (2 minutes)
1. Settings → Network & Internet → WiFi
2. Long-press your network → Modify Network
3. Advanced Options → IP Settings → **Static**
4. Set:
   - DNS 1: `8.8.8.8`
   - DNS 2: `8.8.4.4`
5. Save and reconnect

---

## Why Not Just Use Static DNS Everywhere?

- ✅ Most routers provide working DNS automatically
- ✅ Dynamic DNS adapts to network changes
- ❌ Static DNS requires manual setup on each network
- ❌ You'll forget to change it when switching WiFi

**Bottom Line:** Only use static DNS if your router/network has DNS issues.

---

## Still Not Working?

Your network might be **blocking Supabase**:
- Corporate WiFi often blocks cloud storage
- School networks may have restrictions
- Try using **mobile data** or **different WiFi**

---

## Test Supabase from Your Computer:

Open PowerShell and run:
```powershell
curl https://wkwrrdcjknvupwsfdjtd.supabase.co/rest/v1/
```

If this works on your computer but not on Android, it's definitely a device DNS issue.
