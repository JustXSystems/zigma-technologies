#!/usr/bin/env bash
# Ensure ffmpeg + ffprobe for Media library video compress (idempotent).
#
# Order:
#   1) Already on PATH or under $APP_DIR/tools/ffmpeg
#   2) apt install ffmpeg (when root/sudo available)
#   3) John Van Sickle static build → $APP_DIR/tools/ffmpeg (no root)
#
# Usage:
#   bash scripts/ensure-ffmpeg.sh
#   APP_DIR=/var/www/zigma-technologies bash scripts/ensure-ffmpeg.sh
#   bash scripts/ensure-ffmpeg.sh --print-bins   # → ffmpeg_path<TAB>ffprobe_path
#
set -euo pipefail

PRINT_BINS=0
FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --print-bins) PRINT_BINS=1; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${APP_DIR:-${ZIGMA_APP_DIR:-}}"
if [[ -z "$APP_DIR" ]]; then
  if [[ -f "$SCRIPT_DIR/../server.js" ]]; then
    APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
  else
    APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
  fi
fi

TOOL_DIR="${ZIGMA_FFMPEG_DIR:-$APP_DIR/tools/ffmpeg}"
log() { echo "==> [ensure-ffmpeg] $*" >&2; }

is_working() {
  local bin="$1"
  [[ -n "$bin" && -x "$bin" ]] || return 1
  "$bin" -version >/dev/null 2>&1
}

resolve_from_path() {
  command -v "$1" 2>/dev/null || true
}

find_pair() {
  local ff fp
  ff=""
  fp=""

  if is_working "$TOOL_DIR/ffmpeg" && is_working "$TOOL_DIR/ffprobe"; then
    echo "$TOOL_DIR/ffmpeg"$'\t'"$TOOL_DIR/ffprobe"
    return 0
  fi

  ff="$(resolve_from_path ffmpeg)"
  fp="$(resolve_from_path ffprobe)"
  if is_working "$ff" && is_working "$fp"; then
    echo "$ff"$'\t'"$fp"
    return 0
  fi
  return 1
}

emit_ok() {
  local pair="$1"
  if [[ "$PRINT_BINS" -eq 1 ]]; then
    printf '%s\n' "$pair"
  else
    log "OK — $(echo "$pair" | tr '\t' ' + ')"
  fi
}

if [[ "$FORCE" -eq 0 ]]; then
  if PAIR="$(find_pair)"; then
    emit_ok "$PAIR"
    exit 0
  fi
fi

OS="$(uname -s 2>/dev/null || echo unknown)"
ARCH_RAW="$(uname -m 2>/dev/null || echo unknown)"
case "$ARCH_RAW" in
  x86_64|amd64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) ARCH="" ;;
esac

try_apt() {
  command -v apt-get >/dev/null 2>&1 || return 1
  if [[ "$(id -u)" -eq 0 ]]; then
    log "Installing ffmpeg via apt (root)…"
    DEBIAN_FRONTEND=noninteractive apt-get update -y >/dev/null
    DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg
    return 0
  fi
  if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    log "Installing ffmpeg via sudo apt…"
    sudo -n DEBIAN_FRONTEND=noninteractive apt-get update -y >/dev/null
    sudo -n DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg
    return 0
  fi
  return 1
}

try_static() {
  [[ "$OS" == "Linux" ]] || {
    log "Static ffmpeg auto-install is Linux-only (OS=$OS). Install ffmpeg manually for this host."
    return 1
  }
  [[ -n "$ARCH" ]] || {
    log "Unsupported arch: $ARCH_RAW"
    return 1
  }
  command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1 || {
    log "Need curl or wget to download static ffmpeg"
    return 1
  }
  command -v tar >/dev/null 2>&1 || {
    log "Need tar to extract static ffmpeg"
    return 1
  }

  local url="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-${ARCH}-static.tar.xz"
  local tmp staging
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/zigma-ffmpeg.XXXXXX")"
  staging="$tmp/bundle.tar.xz"
  log "Downloading static ffmpeg ($ARCH) → $TOOL_DIR"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 3 --retry-delay 2 -o "$staging" "$url"
  else
    wget -q -O "$staging" "$url"
  fi

  mkdir -p "$tmp/extract" "$TOOL_DIR"
  tar -xJf "$staging" -C "$tmp/extract"
  local extracted
  extracted="$(find "$tmp/extract" -type f -name ffmpeg | head -n1 || true)"
  [[ -n "$extracted" ]] || {
    rm -rf "$tmp"
    log "Archive did not contain ffmpeg"
    return 1
  }
  local src_dir
  src_dir="$(dirname "$extracted")"
  cp -f "$src_dir/ffmpeg" "$src_dir/ffprobe" "$TOOL_DIR/"
  chmod +x "$TOOL_DIR/ffmpeg" "$TOOL_DIR/ffprobe"
  # Lightweight marker for operators / support.
  cat >"$TOOL_DIR/README.txt" <<EOF
Static ffmpeg/ffprobe installed by scripts/ensure-ffmpeg.sh
Source: $url
Installed: $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
  rm -rf "$tmp"
  is_working "$TOOL_DIR/ffmpeg" && is_working "$TOOL_DIR/ffprobe"
}

log "ffmpeg/ffprobe missing — installing…"

if try_apt; then
  if PAIR="$(find_pair)"; then
    emit_ok "$PAIR"
    exit 0
  fi
  log "apt finished but binaries still not usable — trying static build"
fi

if try_static; then
  if PAIR="$(find_pair)"; then
    emit_ok "$PAIR"
    exit 0
  fi
fi

log "FAILED to provide ffmpeg/ffprobe. Install manually:"
log "  sudo apt-get install -y ffmpeg"
log "  # or static: see scripts/optimize-videos-in-place.sh header"
exit 1
