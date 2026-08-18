# Resolve Android SDK without requiring ANDROID_HOME in Windows user env.
$sdk = if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) {
  $env:ANDROID_HOME
} elseif (Test-Path "$env:LOCALAPPDATA\Android\Sdk") {
  "$env:LOCALAPPDATA\Android\Sdk"
} else {
  $null
}

if (-not $sdk) {
  Write-Host "Android SDK not found. Install Android Studio first." -ForegroundColor Red
  exit 1
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$paths = @(
  (Join-Path $sdk 'platform-tools'),
  (Join-Path $sdk 'emulator'),
  (Join-Path $sdk 'cmdline-tools\latest\bin')
)
foreach ($p in $paths) {
  if ((Test-Path $p) -and ($env:Path -notlike "*$p*")) {
    $env:Path = "$p;$env:Path"
  }
}

return $sdk
