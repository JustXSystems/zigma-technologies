#!/usr/bin/env bash
# Fool-proof PM2 start for zigma standalone (PreProd :3001 / Prod :3000).
# Kills orphans on the listen port, then starts via ecosystem so PORT sticks.
#
# Usage:
#   bash scripts/pm2-start-app.sh preprod
#   bash scripts/pm2-start-app.sh prod
set -euo pipefail

ENV_NAME="${1:-}"
APP_DIR="${APP_DIR:-/var/www/zigma-technologies}"

case "$ENV_NAME" in
  preprod)
    PM2_NAME="${PM2_NAME:-zigma-preprod}"
    APP_PORT="${APP_PORT:-3001}"
    ;;
  prod)
    PM2_NAME="${PM2_NAME:-zigma}"
    APP_PORT="${APP_PORT:-3000}"
    ;;
  *)
    echo "Usage: $0 preprod|prod" >&2
    exit 1
    ;;
esac

cd "$APP_DIR"
[[ -f server.js ]] || { echo "ERROR: $APP_DIR/server.js missing" >&2; exit 1; }

free_listen_port() {
  local port="$1"
  echo "==> Freeing TCP :${port}"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
  fi
  if command -v lsof >/dev/null 2>&1; then
    kill -9 $(lsof -ti tcp:"${port}" -sTCP:LISTEN 2>/dev/null) 2>/dev/null || true
  fi
  if command -v ss >/dev/null 2>&1; then
    local pids
    pids="$(ss -lptn "sport = :${port}" 2>/dev/null | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | sort -u || true)"
    for pid in $pids; do
      kill -9 "$pid" 2>/dev/null || true
    done
  fi
  sleep 1
}

pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
free_listen_port "$APP_PORT"

ECO="$(mktemp /tmp/zigma-pm2-XXXXXX.config.cjs)"
cat >"$ECO" <<EOF
module.exports = {
  apps: [{
    name: '${PM2_NAME}',
    script: '${APP_DIR}/server.js',
    cwd: '${APP_DIR}',
    instances: 1,
    exec_mode: 'fork',
    max_restarts: 10,
    min_uptime: '5s',
    env: {
      NODE_ENV: 'production',
      PORT: '${APP_PORT}',
      HOSTNAME: '127.0.0.1',
      ZIGMA_APP_DIR: '${APP_DIR}',
    },
  }],
};
EOF

pm2 start "$ECO"
rm -f "$ECO"
pm2 save
sleep 2
pm2 status "$PM2_NAME"

if ! pm2 describe "$PM2_NAME" 2>/dev/null | grep -q "status.*online"; then
  pm2 logs "$PM2_NAME" --lines 40 --nostream || true
  echo "ERROR: $PM2_NAME failed to stay online" >&2
  exit 1
fi

echo "==> Listening check"
ss -lptn "sport = :${APP_PORT}" || true
echo "==> OK — $PM2_NAME on 127.0.0.1:${APP_PORT}"
