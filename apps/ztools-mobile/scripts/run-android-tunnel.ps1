. "$PSScriptRoot\android-env.ps1" | Out-Null
. "$PSScriptRoot\emulator-network.ps1" | Out-Null

node "$PSScriptRoot\check-node-version.mjs"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$devices = & adb devices 2>&1 | Out-String
if ($devices -notmatch "emulator-\d+\s+device") {
  Write-Host "No online emulator found." -ForegroundColor Red
  exit 1
}

Write-Host "Starting Metro via tunnel (fallback only)..." -ForegroundColor Cyan
Write-Host "If this fails, use: npm run ztools:go`n" -ForegroundColor Yellow

. "$PSScriptRoot\kill-metro.ps1" | Out-Null
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
npx expo start --android --host tunnel --clear --go
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Tunnel failed (ngrok/network). Use regular mode instead:" -ForegroundColor Red
  Write-Host "  npm run ztools:go" -ForegroundColor White
  exit $LASTEXITCODE
}
