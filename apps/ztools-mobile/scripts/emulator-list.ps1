. "$PSScriptRoot\android-env.ps1" | Out-Null
Write-Host "ANDROID_HOME = $env:ANDROID_HOME`n" -ForegroundColor Cyan
Write-Host "Virtual devices:" -ForegroundColor Cyan
& emulator -list-avds
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
