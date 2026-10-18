#!/usr/bin/env bash
# Apply SEO Phase 1.6 nginx config (www/http → https://zigma-technologies.com).
# Run on Production VPS as a user with passwordless or interactive sudo:
#   sudo bash scripts/apply-nginx-apex-redirect.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/scripts/nginx-zigma-apex.conf"
DEST=/etc/nginx/sites-available/zigma
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="/root/zigma.nginx.bak-${STAMP}"

[[ -f "$SRC" ]] || { echo "ERROR: missing $SRC" >&2; exit 1; }
[[ "$(id -u)" -eq 0 ]] || { echo "ERROR: run as root (sudo bash $0)" >&2; exit 1; }

echo "==> Backup $DEST → $BACKUP"
cp -a "$DEST" "$BACKUP"

echo "==> Install new config"
cp "$SRC" "$DEST"

echo "==> nginx -t"
if ! nginx -t; then
  echo "ERROR: nginx -t failed — restoring backup" >&2
  cp -a "$BACKUP" "$DEST"
  nginx -t
  exit 1
fi

echo "==> reload nginx"
systemctl reload nginx

echo "==> Verify redirects"
curl -sI http://zigma-technologies.com/projects | tr -d '\r' | grep -iE '^(HTTP|location)' || true
curl -sI http://www.zigma-technologies.com/projects | tr -d '\r' | grep -iE '^(HTTP|location)' || true
curl -sI https://www.zigma-technologies.com/projects | tr -d '\r' | grep -iE '^(HTTP|location)' || true
curl -sI https://zigma-technologies.com/projects | tr -d '\r' | grep -iE '^(HTTP)' || true

echo "Done. Expect: first three → 301 to https://zigma-technologies.com/projects ; last → 200."
