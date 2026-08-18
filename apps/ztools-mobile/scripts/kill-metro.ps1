# Stop any process listening on Metro port 8081 (stale bundler).
$port = 8081
$connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $connections) {
  Write-Host "No process on port $port."
  exit 0
}

$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $pids) {
  $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
  if ($proc) {
    Write-Host "Stopping $($proc.ProcessName) (PID $procId) on port $port..." -ForegroundColor Yellow
    Stop-Process -Id $procId -Force
  }
}

Start-Sleep -Seconds 1
Write-Host "Port $port is free." -ForegroundColor Green
