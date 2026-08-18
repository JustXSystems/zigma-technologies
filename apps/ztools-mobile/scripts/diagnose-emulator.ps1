. "$PSScriptRoot\android-env.ps1" | Out-Null

Write-Host "`n=== ZTools emulator diagnostics ===`n" -ForegroundColor Cyan
Write-Host "Note: Metro shows [FAIL] unless you already started" -ForegroundColor Gray
Write-Host "      'npm run ztools:android:emu' in another terminal.`n" -ForegroundColor Gray

$ok = $true

# 1. Emulator
$devices = & adb devices 2>&1 | Out-String
if ($devices -match 'emulator-\d+\s+device') {
  Write-Host "[OK] Emulator online" -ForegroundColor Green
  $devices.Trim().Split("`n") | Where-Object { $_ -match 'emulator' } | ForEach-Object { Write-Host "     $_" }
} else {
  Write-Host "[FAIL] No online emulator" -ForegroundColor Red
  Write-Host "       Run: npm run ztools:emulator:start" -ForegroundColor Yellow
  $ok = $false
}

# 2. adb reverse
$reverses = & adb reverse --list 2>&1 | Out-String
$has8081 = $reverses -match 'tcp:8081'
$has3000 = $reverses -match 'tcp:3000'
if ($has8081 -and $has3000) {
  Write-Host "[OK] Port forwarding (adb reverse)" -ForegroundColor Green
  $reverses.Trim().Split("`n") | Where-Object { $_.Trim() } | ForEach-Object { Write-Host "     $_" }
} else {
  Write-Host "[FAIL] Missing adb reverse for Metro (8081) or API (3000)" -ForegroundColor Red
  Write-Host "       Run: npm run ztools:emulator:network" -ForegroundColor Yellow
  $ok = $false
}

# 3. Next.js API
try {
  $api = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/ztools/tools' -TimeoutSec 4 -UseBasicParsing
  if ($api.StatusCode -eq 200) {
    Write-Host "[OK] Website API on http://localhost:3000" -ForegroundColor Green
  } else {
    Write-Host "[WARN] Website returned $($api.StatusCode)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "[FAIL] Website not running on port 3000" -ForegroundColor Red
  Write-Host "       Run: npm run dev  (from repo root)" -ForegroundColor Yellow
  $ok = $false
}

# 4. Metro (HTTP status, then port listen fallback)
$metroOk = $false
foreach ($url in @('http://127.0.0.1:8081/status', 'http://[::1]:8081/status')) {
  try {
    $metro = Invoke-WebRequest -Uri $url -TimeoutSec 4 -UseBasicParsing
    if ($metro.Content -match 'packager-status:running') {
      Write-Host "[OK] Metro bundler on port 8081 ($url)" -ForegroundColor Green
      $metroOk = $true
      break
    }
  } catch { }
}
if (-not $metroOk) {
  $listening = netstat -ano | Select-String ':8081\s+.*LISTENING'
  if ($listening) {
    Write-Host "[WARN] Port 8081 is in use but Metro did not respond yet" -ForegroundColor Yellow
    Write-Host "       Wait for 'Android Bundled' in the Metro terminal, then press 'r' to reload" -ForegroundColor Yellow
  } else {
    Write-Host "[FAIL] Metro not running on port 8081" -ForegroundColor Red
    Write-Host "       Open a NEW terminal and run: npm run ztools:android:emu" -ForegroundColor Yellow
    Write-Host "       KEEP THAT TERMINAL OPEN while using the app" -ForegroundColor Yellow
    Write-Host "       If stuck on splash, try: npm run ztools:android:tunnel" -ForegroundColor Yellow
    $ok = $false
  }
}

# 5. Expo Go installed
$expoGo = & adb shell pm path host.exp.exponent 2>&1 | Out-String
if ($expoGo -match 'package:') {
  Write-Host "[OK] Expo Go app installed" -ForegroundColor Green
  $version = & adb shell dumpsys package host.exp.exponent 2>&1 | Select-String 'versionName' | Select-Object -First 1
  if ($version) { Write-Host "     $version" -ForegroundColor Gray }
} else {
  Write-Host "[FAIL] Expo Go not installed on emulator" -ForegroundColor Red
  Write-Host "       Install SDK 57 Expo Go:" -ForegroundColor Yellow
  Write-Host '       https://expo.dev/go?sdkVersion=57&platform=android&device=false' -ForegroundColor Yellow
  $ok = $false
}

Write-Host ""
if ($ok) {
  Write-Host "All checks passed. If splash is stuck, reload the app:" -ForegroundColor Green
  Write-Host "  In Metro terminal press 'r' to reload, or close Expo Go and run ztools:android:emu again."
} else {
  Write-Host "Fix the FAIL items above, then run: npm run ztools:android:emu" -ForegroundColor Red
}
Write-Host ""
Write-Host "IMPORTANT: ZTools uses Expo SDK 57." -ForegroundColor Cyan
Write-Host "Play Store Expo Go may be too old. Install matching Expo Go from:" -ForegroundColor Cyan
Write-Host 'https://expo.dev/go?sdkVersion=57&platform=android&device=false'
Write-Host ''

if (-not $ok) { exit 1 }
