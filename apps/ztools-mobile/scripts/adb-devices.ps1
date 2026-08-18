. "$PSScriptRoot\android-env.ps1" | Out-Null
Write-Host "ANDROID_HOME = $env:ANDROID_HOME`n" -ForegroundColor Cyan
& adb devices
