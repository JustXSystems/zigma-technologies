#!/usr/bin/env bash
# Weekly / scheduled Meridian autopilot on the Production VPS.
# Install: crontab -e → 30 3 * * 1 /var/www/zigma-technologies/scripts/meridian-cron.sh >> …/storage/meridian/cron.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load Meridian/DB keys from .env (PM2 already has them for the app; cron does not)
if [[ -f .env ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^(MERIDIAN_|DB_|NEXT_PUBLIC_SITE_URL)= ]] || continue
    key="${line%%=*}"
    val="${line#*=}"
    val="${val%\"}"
    val="${val#\"}"
    export "$key=$val"
  done < .env
fi

mkdir -p storage/meridian
echo "==> Meridian cron $(date -u +%Y-%m-%dT%H:%M:%SZ) @ $ROOT"
node packages/meridian/bin/meridian.mjs autopilot --profile packages/meridian/profiles/zigma.prod.json
echo "==> Done $(date -u +%Y-%m-%dT%H:%M:%SZ)"
