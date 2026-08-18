. "$PSScriptRoot\android-env.ps1" | Out-Null

Write-Host "Resetting ADB and stopping emulators...`n" -ForegroundColor Cyan

& adb kill-server 2>$null
Get-Process -Name "adb" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$procs = Get-Process -Name "qemu-system-x86_64", "qemu-system-aarch64", "emulator", "crashpad_handler" -ErrorAction SilentlyContinue
if ($procs) {
  Write-Host "Stopping stuck emulator processes..." -ForegroundColor Yellow
  $procs | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
} else {
  Write-Host "No emulator processes running." -ForegroundColor Green
}

$avdDir = Join-Path $env:USERPROFILE ".android\avd"
$lockFiles = Get-ChildItem -Path $avdDir -Recurse -Filter "*.lock" -ErrorAction SilentlyContinue
if ($lockFiles) {
  Write-Host "Removing stale AVD lock files (these freeze a dead emulator window)..." -ForegroundColor Yellow
  $lockFiles | ForEach-Object {
    Write-Host "  $($_.FullName)"
    cmd /c "rmdir /s /q `"$($_.FullName)`"" | Out-Null
    if (Test-Path $_.FullName) {
      Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
} else {
  Write-Host "No AVD lock files." -ForegroundColor Green
}

& adb start-server 2>$null

Write-Host "`nADB status:" -ForegroundColor Cyan
& adb devices

Write-Host "`nDone. Start fresh with: npm run emulator:start" -ForegroundColor Green
