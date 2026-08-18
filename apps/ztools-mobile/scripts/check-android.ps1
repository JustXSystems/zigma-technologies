# ZTools — verify Android emulator setup on Windows
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }

Write-Host "`n=== ZTools Android emulator check ===`n" -ForegroundColor Cyan
Write-Host "SDK path: $sdk"

if (-not (Test-Path $sdk)) {
  Write-Host "FAIL: Android SDK not found. Install Android Studio first." -ForegroundColor Red
  exit 1
}

$adb = Join-Path $sdk "platform-tools\adb.exe"
$emu = Join-Path $sdk "emulator\emulator.exe"

if (-not (Test-Path $adb)) {
  Write-Host "FAIL: adb missing. Android Studio -> SDK Manager -> install Platform-Tools." -ForegroundColor Red
  exit 1
}
Write-Host "OK   adb found" -ForegroundColor Green

if (-not (Test-Path $emu)) {
  Write-Host "FAIL: emulator missing. Android Studio -> SDK Manager -> install Android Emulator." -ForegroundColor Red
  exit 1
}
Write-Host "OK   emulator found" -ForegroundColor Green

$images = Join-Path $sdk "system-images"
if (-not (Test-Path $images)) {
  Write-Host "FAIL: No system-images folder. SDK Manager -> install a system image (e.g. API 34 Google Play)." -ForegroundColor Red
} else {
  $count = (Get-ChildItem $images -Recurse -Filter "build.prop" -ErrorAction SilentlyContinue | Measure-Object).Count
  if ($count -eq 0) {
    Write-Host "FAIL: No Android system image installed." -ForegroundColor Red
  } else {
    Write-Host "OK   system image(s) installed" -ForegroundColor Green
  }
}

Write-Host "`nVirtual devices (AVDs):" -ForegroundColor Cyan
& $emu -list-avds
$avds = & $emu -list-avds 2>$null
if (-not $avds) {
  Write-Host "FAIL: No AVD created. Android Studio -> Device Manager -> Create Virtual Device." -ForegroundColor Red
}

Write-Host "`nConnected devices:" -ForegroundColor Cyan
& $adb devices

if (-not $env:ANDROID_HOME) {
  Write-Host "`nWARN: ANDROID_HOME is not set (add it to Windows Environment Variables)." -ForegroundColor Yellow
  Write-Host "  ANDROID_HOME = $sdk"
}

Write-Host "`nEmulator .env should use:" -ForegroundColor Cyan
Write-Host "  EXPO_PUBLIC_ZTOOLS_API_URL=http://10.0.2.2:3000"
Write-Host ""
