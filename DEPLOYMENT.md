# Deployment Guide - Call Monitor

## 🚀 Quick Deployment Checklist

### Prerequisites
- [ ] Supabase account created
- [ ] Database schema deployed
- [ ] Environment variables configured
- [ ] Google Play Developer account (Android)
- [ ] Apple Developer account (iOS)

---

## 📦 Supabase Setup

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - Project name: `call-monitor`
   - Database password: (save this securely)
   - Region: Choose closest to your users

### 2. Deploy Database Schema

1. Open SQL Editor in Supabase dashboard
2. Copy content from `supabase/schema.sql`
3. Run the SQL script
4. Verify tables are created:
   - profiles
   - devices
   - call_logs
   - recordings

### 3. Configure Storage (Optional)

If storing recordings in Supabase Storage:

1. Go to Storage section
2. Create new bucket: `call-recordings`
3. Set as private
4. Configure policies:

```sql
-- Allow users to upload their recordings
CREATE POLICY "Users can upload recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'call-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their recordings
CREATE POLICY "Users can view recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'call-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 4. Get API Credentials

1. Go to Settings → API
2. Copy:
   - Project URL
   - Project API keys → anon (public)
3. Update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🤖 Android Deployment

### 1. Prepare Build Configuration

Edit `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "com.callmonitor.app"
        minSdkVersion 22
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }
    
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 2. Generate Signing Key

```bash
# Generate keystore (run once)
keytool -genkey -v -keystore call-monitor.keystore -alias call-monitor -keyalg RSA -keysize 2048 -validity 10000

# Save the keystore in android/app/
```

### 3. Configure Signing

Create `android/key.properties`:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=call-monitor
storeFile=call-monitor.keystore
```

Update `android/app/build.gradle`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### 4. Build Release APK/AAB

```bash
# Build the web app
npm run build

# Sync with Capacitor
npx cap sync android

# Open Android Studio
npx cap open android
```

In Android Studio:
1. Build → Generate Signed Bundle/APK
2. Choose Android App Bundle (AAB) for Play Store
3. Select release signing config
4. Build

Output: `android/app/release/app-release.aab`

### 5. Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Complete store listing:
   - App name: Call Monitor
   - Description: (from README)
   - Screenshots: (capture from device)
   - Category: Tools
4. Upload AAB to Internal Testing
5. Fill privacy policy, content rating
6. Submit for review

---

## 🍎 iOS Deployment

### 1. Configure Xcode Project

```bash
npm run build
npx cap sync ios
npx cap open ios
```

### 2. Update Info.plist

Add permission descriptions in `ios/App/App/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access to record VoIP calls</string>
<key>NSContactsUsageDescription</key>
<string>This app needs access to contacts to display caller names</string>
```

### 3. Configure Signing

In Xcode:
1. Select project in navigator
2. Select App target
3. Signing & Capabilities:
   - Team: Select your Apple Developer team
   - Bundle Identifier: `com.callmonitor.app`
   - Signing Certificate: Development/Distribution

### 4. Build Archive

1. Product → Scheme → Edit Scheme
2. Set Run/Archive to Release
3. Product → Archive
4. Wait for build to complete

### 5. Upload to App Store Connect

1. Window → Organizer
2. Select archive
3. Click "Distribute App"
4. Choose "App Store Connect"
5. Upload
6. Wait for processing

### 6. App Store Connect Setup

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. My Apps → + → New App
3. Fill details:
   - Name: Call Monitor
   - Bundle ID: com.callmonitor.app
   - SKU: CALLMONITOR001
4. App Information:
   - Subtitle, Description, Keywords
   - Screenshots (required sizes)
   - Support URL, Privacy Policy URL
5. Select build
6. Submit for Review

---

## 🌐 Web Deployment (Optional)

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy to Netlify

```bash
# Build
npm run build

# Deploy dist folder
netlify deploy --prod --dir=out
```

---

## 🔧 Post-Deployment Configuration

### 1. Configure Deep Links (Optional)

#### Android
Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https"
          android:host="callmonitor.app" />
</intent-filter>
```

#### iOS
Add to Xcode capabilities:
1. Associated Domains
2. Add: `applinks:callmonitor.app`

### 2. Configure Push Notifications (Optional)

#### Firebase Cloud Messaging (FCM)

1. Create Firebase project
2. Add Android/iOS apps
3. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
4. Install Capacitor push plugin:

```bash
npm install @capacitor/push-notifications
```

### 3. Analytics Integration (Optional)

```bash
npm install @capacitor/app
npm install firebase
```

---

## 📊 Monitoring

### 1. Supabase Monitoring

- Dashboard → Database → Performance
- Check query performance
- Monitor storage usage

### 2. Error Tracking

Consider integrating:
- Sentry
- Firebase Crashlytics
- Bugsnag

### 3. User Analytics

Options:
- Google Analytics
- Mixpanel
- Amplitude

---

## 🔄 Update Process

### Release New Version

1. Update version in:
   - `package.json`
   - `android/app/build.gradle` (versionCode & versionName)
   - `ios/App/App.xcodeproj` (Version & Build)

2. Build and test:
```bash
npm run build
npx cap sync
```

3. Create release builds (follow steps above)

4. Submit updates to stores

### Over-The-Air Updates (Optional)

Consider Capacitor Live Updates or CodePush for instant updates without store approval.

---

## 🔐 Security Checklist

- [ ] Environment variables not committed
- [ ] API keys secured
- [ ] HTTPS enabled
- [ ] RLS policies tested
- [ ] Encryption keys secured
- [ ] ProGuard enabled (Android)
- [ ] Code obfuscation enabled
- [ ] Sensitive logs removed
- [ ] Privacy policy published
- [ ] Terms of service created

---

## 📱 Store Optimization

### Google Play Store
- Title: Call Monitor - Call Logs & Recordings
- Short description: Track call history and play recordings
- Keywords: call log, call recorder, call history, phone calls

### Apple App Store
- Title: Call Monitor
- Subtitle: View Call History & Recordings
- Keywords: call,log,recorder,history,monitor,phone

---

## 🎯 Launch Checklist

- [ ] Database schema deployed
- [ ] Environment variables configured
- [ ] Android app built and signed
- [ ] iOS app built and signed
- [ ] Store listings completed
- [ ] Privacy policy published
- [ ] Screenshots uploaded
- [ ] App descriptions written
- [ ] Support email configured
- [ ] Initial testing completed
- [ ] Beta testing done
- [ ] Apps submitted for review

---

## 📞 Support

For deployment issues:
- Android: Check Logcat
- iOS: Check Xcode console
- Backend: Check Supabase logs
- Build: Check terminal output

---

**Next Steps**: After deployment, monitor user feedback and analytics to improve the app.
