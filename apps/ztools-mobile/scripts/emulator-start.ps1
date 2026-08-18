param(
  [string]$AvdName = '',
  [switch]$FastBoot,
  [switch]$SoftwareGpu,
  [switch]$Foreground
)

. "$PSScriptRoot\android-env.ps1" | Out-Null

# If qemu is dead but lock files remain, the window looks stuck and adb hangs.
$qemu = Get-Process -Name "qemu-system-x86_64", "qemu-system-aarch64", "emulator" -ErrorAction SilentlyContinue
if (-not $qemu) {
  $lockFiles = Get-ChildItem -Path (Join-Path $env:USERPROFILE ".android\avd") -Recurse -Filter "*.lock" -ErrorAction SilentlyContinue
  if ($lockFiles) {
    Write-Host "Clearing stale AVD locks from a crashed emulator..." -ForegroundColor Yellow
    foreach ($lock in $lockFiles) {
      cmd /c "rmdir /s /q `"$($lock.FullName)`"" | Out-Null
      if (Test-Path $lock.FullName) {
        Remove-Item $lock.FullName -Recurse -Force -ErrorAction SilentlyContinue
      }
    }
  }
} else {
  Write-Host "Stopping previous emulator instance..." -ForegroundColor Yellow
  $qemu | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

& adb kill-server 2>$null
Start-Sleep -Milliseconds 400
& adb start-server 2>$null

if (-not $AvdName) {
  $avds = @( & emulator -list-avds )
  if ($avds.Count -eq 0) {
    Write-Host "No AVD found. Android Studio -> Device Manager -> Create Virtual Device." -ForegroundColor Red
    exit 1
  }
  if ($avds.Count -gt 1) {
    Write-Host "Multiple AVDs found. Pass a name:" -ForegroundColor Yellow
    $avds | ForEach-Object { Write-Host "  $_" }
    Write-Host ""
    Write-Host "Example: npm run emulator:start -- Pixel_7"
    exit 1
  }
  $AvdName = $avds[0].Trim()
}

$emu = Join-Path $env:ANDROID_HOME "emulator\emulator.exe"
$gpu = if ($SoftwareGpu) { "swiftshader_indirect" } else { "auto" }

# Cold boot by default: snapshot restore is the usual cause of a fully frozen screen.
$argList = @("-avd", $AvdName, "-gpu", $gpu, "-no-snapshot-save")
if (-not $FastBoot) {
  $argList += "-no-snapshot-load"
}

$cold = -not $FastBoot
Write-Host "Starting emulator: $AvdName  (gpu=$gpu, coldBoot=$cold)" -ForegroundColor Cyan
Write-Host "The emulator window is separate. This terminal stays usable." -ForegroundColor Gray

if ($Foreground) {
  Write-Host "Foreground mode: this terminal stays attached until you close the emulator."
  Write-Host ""
  & $emu @argList
  exit $LASTEXITCODE
}

$proc = Start-Process -FilePath $emu -ArgumentList $argList -PassThru -WindowStyle Normal

Write-Host "Emulator PID $($proc.Id)."
Write-Host "Wait for the Android home screen (about 1 to 3 minutes on cold boot)."
Write-Host ""
Write-Host "Then: npm run emulator:wait"
Write-Host "Then: npm run android:emu"
