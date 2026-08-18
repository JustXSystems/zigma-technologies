param(
  [int]$TimeoutSec = 240
)

. "$PSScriptRoot\android-env.ps1" | Out-Null

Write-Host "Waiting for emulator boot (max ${TimeoutSec}s)...`n" -ForegroundColor Cyan

$deadline = (Get-Date).AddSeconds($TimeoutSec)
while ((Get-Date) -lt $deadline) {
  $alive = Get-Process -Name "qemu-system-x86_64", "qemu-system-aarch64", "emulator" -ErrorAction SilentlyContinue
  if (-not $alive) {
    Write-Host "Emulator process exited. Check $env:TEMP\ztools-emulator.log" -ForegroundColor Red
    exit 1
  }

  $out = & adb devices 2>&1 | Out-String
  if ($out -match 'emulator-\d+\s+offline') {
    Write-Host 'Emulator detected but offline - restarting adb...' -ForegroundColor Yellow
    & adb kill-server 2>$null
    Start-Sleep -Seconds 1
    & adb start-server 2>$null
  } elseif ($out -match 'emulator-\d+\s+device') {
    $booted = & adb shell getprop sys.boot_completed 2>$null
    if ("$booted".Trim() -eq "1") {
      Write-Host $out.Trim()
      Write-Host ''
      Write-Host 'Emulator is ready (boot completed).' -ForegroundColor Green
      exit 0
    }
    Write-Host 'Device online, still booting Android...' -ForegroundColor Yellow
  } else {
    Write-Host 'No emulator yet...' -ForegroundColor Gray
  }
  Start-Sleep -Seconds 4
}

Write-Host ''
Write-Host 'Timed out. Try a software-GPU cold boot:' -ForegroundColor Red
Write-Host '  npm run emulator:reset'
Write-Host '  powershell -ExecutionPolicy Bypass -File .\scripts\emulator-start.ps1 -SoftwareGpu'
exit 1
