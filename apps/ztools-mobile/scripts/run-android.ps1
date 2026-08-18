. "$PSScriptRoot\android-env.ps1" | Out-Null

node "$PSScriptRoot\check-node-version.mjs"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

. "$PSScriptRoot\emulator-network.ps1" | Out-Null

$devices = & adb devices 2>&1 | Out-String
if ($devices -notmatch "emulator-\d+\s+device") {
  Write-Host "Emulator not online yet - waiting up to 2 minutes..." -ForegroundColor Yellow
  Write-Host "(Start it in another terminal: npm run ztools:emulator:start)`n" -ForegroundColor Gray
  & "$PSScriptRoot\emulator-wait.ps1" -TimeoutSec 120
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  . "$PSScriptRoot\emulator-network.ps1" | Out-Null
  $devices = & adb devices 2>&1 | Out-String
}

if ($devices -notmatch "emulator-\d+\s+device") {
  Write-Host "No online emulator found. Start one first:" -ForegroundColor Red
  Write-Host "  npm run ztools:emulator:start"
  exit 1
}

$expoGo = & adb shell pm path host.exp.exponent 2>&1 | Out-String
if ($expoGo -notmatch 'package:') {
  Write-Host ""
  Write-Host "Expo Go is NOT installed on this emulator." -ForegroundColor Red
  Write-Host "Install SDK 57 Expo Go APK from:" -ForegroundColor Yellow
  Write-Host '  https://expo.dev/go?sdkVersion=57&platform=android&device=false' -ForegroundColor White
  exit 1
}

try {
  $null = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/ztools/tools' -TimeoutSec 3 -UseBasicParsing
} catch {
  Write-Host ""
  Write-Host "Website is not running on port 3000." -ForegroundColor Red
  Write-Host "Start it first (separate terminal, repo root): npm run dev`n" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "=== Starting ZTools ===" -ForegroundColor Cyan
Write-Host "1. KEEP THIS TERMINAL OPEN" -ForegroundColor Yellow
Write-Host "2. Wait for 'Android Bundled' below" -ForegroundColor Yellow
Write-Host "3. Open Expo Go on the emulator (do NOT use a stale ZTools home icon)" -ForegroundColor Yellow
Write-Host "4. In Expo Go, tap the ztools project, or scan the QR in this terminal`n" -ForegroundColor Yellow

. "$PSScriptRoot\kill-metro.ps1" | Out-Null

$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
$env:REACT_NATIVE_PACKAGER_HOSTNAME = '10.0.2.2'

# LAN mode: emulator reaches Metro via 10.0.2.2 (more reliable than localhost on Windows).
npx expo start --android --host lan --clear --go
