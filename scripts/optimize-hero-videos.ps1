<#
.SYNOPSIS
  Re-encode background / hero videos for fast web playback (desktop 1080p, mobile 720p, poster).

.DESCRIPTION
  Default mode: for each input MP4/MOV/WebM writes to -OutDir:
    <name>-1080.mp4    desktop: H.264, no audio, faststart, capped bitrate
    <name>-720.mp4     mobile:  same, smaller
    <name>-poster.webp first frame, shown instantly while the video streams
  Originals are never modified. Upload the results in Admin -> Media.

  -InPlace mode: replaces each oversized .mp4 with its 1080p version under the SAME filename,
  so every page that uses it gets the light file with no admin changes. Originals are copied to
  storage\video-originals\<timestamp>\ first. Files already at or below -MinMbps and 1080p are
  skipped, so re-running is safe. Same rules as scripts/optimize-videos-in-place.sh (VPS).

  Requires ffmpeg on PATH (winget install Gyan.FFmpeg).

.EXAMPLE
  .\scripts\optimize-hero-videos.ps1 -Path public\assets\video

.EXAMPLE
  .\scripts\optimize-hero-videos.ps1 -Path public\assets\video -InPlace -WhatIf

.EXAMPLE
  .\scripts\optimize-hero-videos.ps1 -Path D:\raw\hero.mov -OutDir D:\web -DesktopCrf 24
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [string[]]$Path,
  [string]$OutDir = (Join-Path $env:USERPROFILE 'Videos\zigma-hero-optimized'),
  [ValidateRange(18, 35)]
  [int]$DesktopCrf = 26,
  [ValidateRange(18, 35)]
  [int]$MobileCrf = 28,
  [switch]$Force,
  [switch]$InPlace,
  [double]$MinMbps = 5
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    throw 'ffmpeg not found. Install it with: winget install Gyan.FFmpeg'
  }
}

$pattern = if ($InPlace) { '^\.(mp4|m4v)$' } else { '^\.(mp4|mov|webm|m4v)$' }
$files = foreach ($p in $Path) {
  $item = Get-Item -LiteralPath $p
  if ($item.PSIsContainer) {
    Get-ChildItem -LiteralPath $item.FullName -File | Where-Object { $_.Extension -match $pattern -and -not $_.Name.StartsWith('.') }
  } else {
    $item
  }
}
if (-not $files) { throw "No video files found in: $($Path -join ', ')" }

# Even dimensions, never upscale, Rec.709 8-bit for universal hardware decoding.
function Get-Scale([int]$Height) { "scale=-2:'min($Height,ih)':flags=lanczos,format=yuv420p" }

function Invoke-Encode([string]$In, [string]$Out, [int]$Height, [int]$Crf, [string]$MaxRate, [string]$BufSize) {
  & ffmpeg -hide_banner -loglevel error -y -i $In -map 0:v:0 -an -sn -dn `
    -vf (Get-Scale $Height) -c:v libx264 -preset slow -profile:v high -crf $Crf `
    -maxrate $MaxRate -bufsize $BufSize -g 48 -keyint_min 24 `
    -movflags +faststart -map_metadata -1 $Out
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed for $Out" }
}

function Format-MB([long]$Bytes) { '{0:N1} MB' -f ($Bytes / 1MB) }

function Get-Probe([string]$File) {
  $bps = & ffprobe -v error -show_entries format=bit_rate -of default=nw=1:nk=1 $File | Select-Object -First 1
  $h = & ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=nw=1:nk=1 $File | Select-Object -First 1
  [pscustomobject]@{ Mbps = [math]::Round([double]("0$bps".Trim()) / 1e6, 1); Height = [int]("0$h".Trim()) }
}

if ($InPlace) {
  $backup = Join-Path (Get-Location) ("storage\video-originals\" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
  $rows = foreach ($f in $files) {
    $probe = Get-Probe $f.FullName
    $row = [pscustomobject]@{ File = $f.Name; Before = Format-MB $f.Length; After = ''; Result = '' }
    if ($probe.Mbps -le $MinMbps -and $probe.Height -le 1080) {
      $row.Result = "skip ($($probe.Mbps) Mbps, $($probe.Height)p)"
    } elseif (-not $PSCmdlet.ShouldProcess($f.Name, "re-encode in place ($($probe.Mbps) Mbps, $($probe.Height)p)")) {
      $row.Result = "would replace ($($probe.Mbps) Mbps, $($probe.Height)p)"
    } else {
      Write-Host "==> $($f.Name)" -ForegroundColor Cyan
      $tmp = Join-Path $f.DirectoryName ".$($f.BaseName).optimizing.mp4"
      try {
        Invoke-Encode $f.FullName $tmp 1080 $DesktopCrf '4M' '8M'
        $new = (Get-Item -LiteralPath $tmp).Length
        if ($new * 100 -gt $f.Length * 85) {
          Remove-Item -LiteralPath $tmp
          $row.Result = 'kept (not much smaller)'
        } else {
          New-Item -ItemType Directory -Force -Path $backup | Out-Null
          Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $backup $f.Name)
          Move-Item -LiteralPath $tmp -Destination $f.FullName -Force
          $row.After = Format-MB $new
          $row.Result = 'replaced'
        }
      } catch {
        Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue
        $row.Result = "failed: $($_.Exception.Message)"
      }
    }
    $row
  }
  $rows | Format-Table -AutoSize | Out-Host
  if (Test-Path $backup) { Write-Host "Originals: $backup" -ForegroundColor Green }
  return
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$rows = foreach ($f in $files) {
  $base = [IO.Path]::GetFileNameWithoutExtension($f.Name)
  $desk = Join-Path $OutDir "$base-1080.mp4"
  $mob = Join-Path $OutDir "$base-720.mp4"
  $poster = Join-Path $OutDir "$base-poster.webp"
  Write-Host "==> $($f.Name)" -ForegroundColor Cyan

  if ($Force -or -not (Test-Path $desk)) { Invoke-Encode $f.FullName $desk 1080 $DesktopCrf '4M' '8M' }
  if ($Force -or -not (Test-Path $mob)) { Invoke-Encode $f.FullName $mob 720 $MobileCrf '2M' '4M' }
  if ($Force -or -not (Test-Path $poster)) {
    & ffmpeg -hide_banner -loglevel error -y -i $f.FullName -frames:v 1 -vf (Get-Scale 1080) -c:v libwebp -quality 72 $poster
    if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed for $poster" }
  }

  [pscustomobject]@{
    Source   = $f.Name
    Original = Format-MB $f.Length
    Desktop  = Format-MB (Get-Item $desk).Length
    Mobile   = Format-MB (Get-Item $mob).Length
    Poster   = '{0:N0} KB' -f ((Get-Item $poster).Length / 1KB)
    Saved    = '{0:P0}' -f (1 - (Get-Item $desk).Length / $f.Length)
  }
}

$rows | Format-Table -AutoSize | Out-Host
Write-Host "Output: $OutDir" -ForegroundColor Green
