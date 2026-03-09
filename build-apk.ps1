# Build APK Script for Call Monitor App
# This script builds the complete APK from source

Write-Host "🚀 Starting Call Monitor APK Build Process..." -ForegroundColor Green

# Step 1: Build Next.js app
Write-Host "📦 Step 1: Building Next.js app..." -ForegroundColor Yellow
npm run build

if (-not $?) {
    Write-Host "❌ Next.js build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Sync with Capacitor
Write-Host "🔄 Step 2: Syncing with Capacitor..." -ForegroundColor Yellow
npx cap sync android

if (-not $?) {
    Write-Host "❌ Capacitor sync failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Build APK
Write-Host "🔨 Step 3: Building Android APK..." -ForegroundColor Yellow
Set-Location android
.\gradlew.bat assembleDebug

if (-not $?) {
    Write-Host "❌ APK build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# Get APK info
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
$apkInfo = Get-ChildItem $apkPath

Write-Host "✅ APK BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "📱 APK Location: $($apkInfo.FullName)" -ForegroundColor Cyan
Write-Host "📏 APK Size: $([math]::Round($apkInfo.Length/1024/1024, 2)) MB" -ForegroundColor Cyan
Write-Host "🕐 Built on: $($apkInfo.LastWriteTime)" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔧 To install on device:" -ForegroundColor Yellow
Write-Host "   adb install `"$($apkInfo.FullName)`"" -ForegroundColor White
Write-Host ""
Write-Host "📋 App Details:" -ForegroundColor Yellow
Write-Host "   App Name: Call Monitor" -ForegroundColor White
Write-Host "   Package: com.callmonitor.app" -ForegroundColor White
Write-Host "   Version: 1.0 (Debug Build)" -ForegroundColor White