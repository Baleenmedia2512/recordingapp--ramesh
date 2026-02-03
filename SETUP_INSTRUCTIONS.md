# 🚦 SETUP INSTRUCTIONS - START HERE

## ⚡ Immediate Next Steps

Follow these steps **in order** to get your Call Monitor app running:

---

## Step 1: Install Dependencies (5 minutes)

Open PowerShell in the project folder and run:

```powershell
npm install
```

**Expected Output:** "added XXX packages" with no errors

**Troubleshooting:**
- If you get errors, ensure Node.js 18+ is installed
- Run: `node --version` (should show v18.x or higher)
- If needed, download from: https://nodejs.org/

---

## Step 2: Create Supabase Project (10 minutes)

### 2.1 Create Account and Project
1. Go to https://supabase.com
2. Click "Start your project" (free)
3. Sign up with GitHub or email
4. Click "New Project"
5. Fill in:
   - **Name:** call-monitor
   - **Database Password:** Choose a strong password (save it!)
   - **Region:** Choose closest to you
   - **Pricing Plan:** Free
6. Click "Create new project"
7. Wait 2-3 minutes for setup

### 2.2 Set Up Database
1. In your Supabase dashboard, click "SQL Editor" (left sidebar)
2. Click "New Query"
3. Open the file: `supabase/schema.sql` in your project
4. Copy ALL the content
5. Paste into Supabase SQL Editor
6. Click "Run" (bottom right)
7. You should see: "Success. No rows returned"

### 2.3 Verify Tables Created
1. Click "Table Editor" (left sidebar)
2. You should see 4 tables:
   - profiles
   - devices
   - call_logs
   - recordings

### 2.4 Get API Credentials
1. Click "Settings" (gear icon, left sidebar)
2. Click "API" in the settings menu
3. You'll see:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **Project API keys:** (expand "anon public")
4. **COPY THESE** - you'll need them next!

---

## Step 3: Configure Environment (2 minutes)

### 3.1 Create .env.local file

In your project folder, create a file named `.env.local` (note the dot at the start):

**On Windows:**
```powershell
# Create the file
New-Item -Path .env.local -ItemType File
```

**Or** just copy the example:
```powershell
Copy-Item .env.example .env.local
```

### 3.2 Edit .env.local

Open `.env.local` in any text editor and replace with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE

# App Configuration
NEXT_PUBLIC_APP_NAME=Call Monitor
NEXT_PUBLIC_APP_VERSION=1.0.0

# Environment
NODE_ENV=development
```

**Replace:**
- `YOUR_PROJECT` with your actual Supabase project URL
- `YOUR_ANON_KEY_HERE` with your anon/public API key

**Save the file!**

---

## Step 4: Test Web Version (5 minutes)

### 4.1 Build the App
```powershell
npm run build
```

**Expected Output:** "Compiled successfully" with build statistics

### 4.2 Start Development Server
```powershell
npm run dev
```

**Expected Output:**
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### 4.3 Open in Browser
1. Open your browser
2. Go to: http://localhost:3000
3. You should see the **Call Monitor login page**

### 4.4 Test Authentication
1. Click "Don't have an account? Sign up"
2. Enter:
   - Full Name: Test User
   - Email: test@example.com
   - Password: test123
3. Click "Sign Up"
4. You should be logged in and see the dashboard!

**✅ SUCCESS!** Your web app is working.

---

## Step 5: Set Up Android (15 minutes)

### 5.1 Prerequisites
- Install Android Studio from: https://developer.android.com/studio
- During installation, include Android SDK and Android Virtual Device

### 5.2 Add Android Platform
```powershell
# Sync the built web app to Capacitor
npx cap sync

# Add Android platform
npx cap add android

# Sync again
npx cap sync android
```

### 5.3 Open in Android Studio
```powershell
npx cap open android
```

**First time?** Android Studio will:
1. Open the project
2. Download Gradle dependencies (3-5 minutes)
3. Index files
4. Wait for "Gradle sync finished" in bottom status bar

### 5.4 Run on Device/Emulator

**Option A: Use a Real Android Device**
1. Enable Developer Options on your phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back → Developer Options
   - Enable "USB Debugging"
2. Connect phone to computer via USB
3. Allow USB debugging on phone
4. In Android Studio, select your device from dropdown
5. Click green "Run" button (▶)

**Option B: Use Android Emulator**
1. In Android Studio, click "Device Manager" (phone icon)
2. Click "Create Device"
3. Choose "Pixel 5" → Next
4. Download "Tiramisu" (API 33) if needed
5. Click "Finish"
6. Select emulator from dropdown
7. Click green "Run" button (▶)

**Wait 30-60 seconds** for app to launch.

### 5.5 Test on Android
1. App should open to login screen
2. Sign up or login
3. App will request permissions - **GRANT THEM**
4. You should see the dashboard
5. On a real device, you'll see your actual call logs!

**✅ SUCCESS!** Your Android app is working.

---

## Step 6: Set Up iOS (macOS only, 15 minutes)

### 6.1 Prerequisites
- macOS computer required
- Install Xcode from Mac App Store (free, ~12 GB)
- Install Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```

### 6.2 Add iOS Platform
```bash
# Add iOS platform
npx cap add ios

# Install CocoaPods dependencies
cd ios/App
pod install
cd ../..

# Sync
npx cap sync ios
```

### 6.3 Open in Xcode
```bash
npx cap open ios
```

### 6.4 Configure Signing
1. In Xcode, click project name in left sidebar
2. Select "App" target
3. Go to "Signing & Capabilities"
4. Select your Team (if you don't have one, click "Add Account")
5. Choose "Automatically manage signing"

### 6.5 Run on Simulator
1. Select "iPhone 14 Pro" from device dropdown (top)
2. Click "Run" button (▶)
3. Wait for simulator to boot and app to install

### 6.6 Test on iOS
1. App should open to login screen
2. Sign up or login
3. You'll see a message about iOS limitations
4. Dashboard will show synced call logs (from Android devices)

**✅ SUCCESS!** Your iOS app is working.

---

## 🎉 You're Done! What Now?

### Your App is Now Running On:
- ✅ Web (http://localhost:3000)
- ✅ Android (device/emulator)
- ✅ iOS (simulator - macOS only)

### Next Actions:

**For Development:**
1. Make changes to code in `src/` folder
2. Save files
3. Web: Auto-reloads
4. Mobile: Run `npm run build && npx cap sync` then rebuild

**For Production:**
1. Read `DEPLOYMENT.md` for publishing to stores
2. Customize branding (colors, icons, names)
3. Test thoroughly on real devices
4. Submit to Google Play Store and Apple App Store

**For Customization:**
- Change colors: Edit `tailwind.config.js`
- Change app name: Edit `capacitor.config.json`
- Add features: Follow patterns in `src/` folder

---

## 🐛 Common Issues & Solutions

### "Cannot find module" errors
```powershell
rm -rf node_modules
rm package-lock.json
npm install
```

### Supabase connection errors
- Check `.env.local` has correct credentials
- Ensure no extra spaces in URL or key
- Restart dev server: `Ctrl+C` then `npm run dev`

### Android build errors
- In Android Studio: File → Invalidate Caches → Restart
- Check Java version: `java --version` (should be 11 or 17)

### iOS build errors
- Run `pod install` in `ios/App` directory
- Clean build: Product → Clean Build Folder in Xcode

### App won't start
- Check console for errors
- Verify Supabase tables are created
- Check network connection

---

## 📞 Need Help?

1. **Check documentation:**
   - README.md - Overview
   - QUICKSTART.md - Quick setup
   - API.md - API reference
   - DEPLOYMENT.md - Publishing

2. **Check logs:**
   - Web: Browser console (F12)
   - Android: Logcat in Android Studio
   - iOS: Console in Xcode

3. **Common fixes:**
   - Restart development server
   - Rebuild app
   - Clear cache
   - Reinstall dependencies

---

## ✨ Success Criteria

You'll know everything is working when:

✅ Web app loads at http://localhost:3000  
✅ You can sign up and login  
✅ Dashboard displays (even if empty)  
✅ No console errors  
✅ Android app requests permissions  
✅ iOS app shows sync message  
✅ Supabase tables are populated  

---

## 🎯 Quick Test Checklist

Run through this to verify everything works:

- [ ] Install dependencies completed
- [ ] Supabase project created
- [ ] Database schema deployed
- [ ] .env.local configured
- [ ] Web app builds successfully
- [ ] Can sign up new user
- [ ] Can login
- [ ] Dashboard loads
- [ ] Android app runs
- [ ] Permissions can be granted
- [ ] iOS app runs (if on macOS)

---

## 🚀 You're Ready!

Your Call Monitor app is now set up and running. You have a fully functional, production-ready application.

**What you can do:**
- View call logs (on Android with real calls)
- Play recordings
- Filter and search calls
- Sync across devices
- Manage permissions

**Time to:**
1. Test on your own device
2. Customize to your needs
3. Deploy to stores (when ready)

---

**Happy coding! 🎉**

For detailed information, see:
- PROJECT_SUMMARY.md - Complete overview
- QUICKSTART.md - Detailed setup
- DEPLOYMENT.md - Publishing guide
