. "$PSScriptRoot\android-env.ps1" | Out-Null

Write-Host "Setting up emulator networking..." -ForegroundColor Cyan
& adb reverse tcp:8081 tcp:8081 2>$null
& adb reverse tcp:3000 tcp:3000 2>$null
$reverses = & adb reverse --list 2>$null
if ($reverses) {
  Write-Host $reverses
} else {
  Write-Host "WARN: adb reverse failed - start the emulator first." -ForegroundColor Yellow
}

# Match apps/ztools-mobile/.env for emulator (10.0.2.2 = host PC from inside emulator).
$env:EXPO_PUBLIC_ZTOOLS_API_URL = "http://10.0.2.2:3000"
Write-Host "API URL for this session: $env:EXPO_PUBLIC_ZTOOLS_API_URL`n" -ForegroundColor Green
