#!/usr/bin/env bash
# Re-encode oversized CMS videos IN PLACE on a VPS (same filename, so no DB / admin changes).
#
#   bash scripts/optimize-videos-in-place.sh                 # dry run: lists what would change
#   bash scripts/optimize-videos-in-place.sh --apply         # back up originals, then replace
#   bash scripts/optimize-videos-in-place.sh --apply --crf 24 --dir /var/www/zigma-technologies/public/assets/video
#
# - Only .mp4/.m4v above --min-mbps (default 5) or taller than --height (default 1080) are touched,
#   so re-running is safe and skips files that are already optimized.
# - Originals are copied to storage/video-originals/<timestamp>/ (outside public/) before replacing.
# - A file is only replaced when the result is at least 15% smaller.
# - Restore: cp storage/video-originals/<timestamp>/<file> public/assets/video/
#
# Needs ffmpeg + ffprobe. Without sudo, a static build works:
#   mkdir -p ~/bin && cd ~/bin && curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | tar xJ --strip-components=1 --wildcards '*/ffmpeg' '*/ffprobe'
#   export PATH="$HOME/bin:$PATH"
set -euo pipefail

APP_DIR="${ZIGMA_APP_DIR:-/var/www/zigma-technologies}"
DIR="$APP_DIR/public/assets/video"
APPLY=0
CRF=26
HEIGHT=1080
MIN_MBPS=5

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=1 ;;
    --dir) DIR="$2"; shift ;;
    --crf) CRF="$2"; shift ;;
    --height) HEIGHT="$2"; shift ;;
    --min-mbps) MIN_MBPS="$2"; shift ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null \
  || { echo "ffmpeg/ffprobe not found (apt install ffmpeg, or see the static-build note at the top)" >&2; exit 1; }
[[ -d "$DIR" ]] || { echo "Not a directory: $DIR" >&2; exit 1; }

BACKUP="$APP_DIR/storage/video-originals/$(date +%Y%m%d-%H%M%S)"
mb() { awk -v b="$1" 'BEGIN { printf "%.1f MB", b / 1048576 }'; }

shopt -s nullglob nocaseglob
changed=0; skipped=0; saved=0
for f in "$DIR"/*.mp4 "$DIR"/*.m4v; do
  name="$(basename "$f")"
  [[ "$name" == .* ]] && continue
  size=$(stat -c %s "$f")
  bps=$(ffprobe -v error -show_entries format=bit_rate -of default=nw=1:nk=1 "$f" | head -n1 || echo 0)
  h=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=nw=1:nk=1 "$f" | head -n1 || echo 0)
  [[ "$bps" =~ ^[0-9]+$ ]] || bps=0
  [[ "$h" =~ ^[0-9]+$ ]] || h=0
  mbps=$(awk -v b="$bps" 'BEGIN { printf "%.1f", b / 1e6 }')

  if awk -v b="$bps" -v m="$MIN_MBPS" -v h="$h" -v H="$HEIGHT" 'BEGIN { exit !(b <= m * 1e6 && h <= H) }'; then
    echo "skip   $name  (${mbps} Mbps, ${h}p, $(mb "$size"))"
    skipped=$((skipped + 1)); continue
  fi
  if [[ $APPLY -eq 0 ]]; then
    echo "would  $name  (${mbps} Mbps, ${h}p, $(mb "$size"))"
    continue
  fi

  tmp="$DIR/.${name%.*}.optimizing.mp4"
  echo "encode $name  (${mbps} Mbps, ${h}p, $(mb "$size")) ..."
  if ! nice -n 10 ffmpeg -hide_banner -loglevel error -y -i "$f" -map 0:v:0 -an -sn -dn \
      -vf "scale=-2:'min($HEIGHT,ih)':flags=lanczos,format=yuv420p" \
      -c:v libx264 -preset slow -profile:v high -crf "$CRF" -maxrate 4M -bufsize 8M -g 48 -keyint_min 24 \
      -movflags +faststart -map_metadata -1 "$tmp"; then
    rm -f "$tmp"; echo "  ! ffmpeg failed, original kept" >&2; continue
  fi

  new=$(stat -c %s "$tmp")
  if (( new * 100 > size * 85 )); then
    rm -f "$tmp"; echo "  - result $(mb "$new") is not much smaller, original kept"; continue
  fi

  mkdir -p "$BACKUP"
  cp -p "$f" "$BACKUP/$name"
  chmod --reference="$f" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$f"
  echo "  ✓ $(mb "$size") → $(mb "$new")"
  changed=$((changed + 1)); saved=$((saved + size - new))
done

echo
if [[ $APPLY -eq 0 ]]; then
  echo "Dry run only. Re-run with --apply to back up and replace the files marked 'would'."
else
  echo "Replaced $changed file(s), skipped $skipped, saved $(mb "$saved")."
  if [[ $changed -gt 0 ]]; then echo "Originals: $BACKUP"; fi
fi
