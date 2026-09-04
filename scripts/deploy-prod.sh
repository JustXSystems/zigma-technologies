#!/usr/bin/env bash
# Production deploy on Hostinger KVM 2 (deploy@200.234.45.106).
# Used by GitHub Actions (.github/workflows/deploy-prod.yml) and manual SSH deploys.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/zigma-technologies}"
BRANCH="${DEPLOY_BRANCH:-master}"
PM2_NAME="${PM2_NAME:-zigma}"

cd "$APP_DIR"

echo "==> Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ) in $APP_DIR (branch=$BRANCH)"

if [[ ! -f .env ]]; then
  echo "ERROR: $APP_DIR/.env is missing. Create it from .env.example before deploying." >&2
  exit 1
fi

git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> HEAD $(git rev-parse --short HEAD) — $(git log -1 --oneline)"

npm ci
npm run build

if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2 restart "$PM2_NAME" --update-env
  else
    pm2 start npm --name "$PM2_NAME" -- start
    pm2 save
  fi
  pm2 status "$PM2_NAME"
else
  echo "WARNING: pm2 not found — build completed but process was not restarted." >&2
fi

echo "==> Deploy finished OK"
