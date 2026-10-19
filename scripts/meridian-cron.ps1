# Meridian weekly autopilot (Windows). Paired with phase10-schtasks.xml / Task Scheduler.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$logDir = Join-Path $Root 'storage\meridian'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'cron.log'
function Write-Log($m) { Add-Content -Path $log -Value ("[{0}] {1}" -f (Get-Date -Format o), $m) }
Write-Log "Meridian cron start @ $Root"
if (Test-Path (Join-Path $Root '.env')) {
  Get-Content (Join-Path $Root '.env') | ForEach-Object {
    if ($_ -match '^(MERIDIAN_|DB_|NEXT_PUBLIC_SITE_URL)=(.*)$') {
      Set-Item -Path "Env:$($matches[1])" -Value $matches[2].Trim('"')
    }
  }
}
# Prefer unlock-secrets via Meridian hydrate inside the binary
& node packages/meridian/bin/meridian.mjs autopilot --profile packages/meridian/profiles/zigma.prod.json
Write-Log "Meridian cron done exit=$LASTEXITCODE"
exit $LASTEXITCODE
