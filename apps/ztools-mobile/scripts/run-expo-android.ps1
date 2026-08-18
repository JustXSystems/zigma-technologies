. "$PSScriptRoot\android-env.ps1" | Out-Null
. "$PSScriptRoot\emulator-network.ps1" | Out-Null

Write-Host "Starting Expo (Android)..." -ForegroundColor Cyan
. "$PSScriptRoot\kill-metro.ps1" | Out-Null

$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
$env:REACT_NATIVE_PACKAGER_HOSTNAME = '127.0.0.1'
npx expo start --android --host localhost --clear --go
