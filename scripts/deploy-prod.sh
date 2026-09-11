#!/usr/bin/env bash
# Production deploy on Zigma Technologies VPS (deploy@200.234.45.106).
# URL: https://zigma-technologies.com (domain root, no basePath).
# Manual / selective only — requires --confirm-prod DEPLOY_PROD.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

EXTRA=()
if [[ " $* " != *" --confirm-prod "* ]]; then
  if [[ "${CONFIRM_PROD:-}" == "DEPLOY_PROD" ]]; then
    EXTRA+=(--confirm-prod DEPLOY_PROD)
  fi
fi

exec bash "$ROOT/scripts/deploy.sh" --env prod "${EXTRA[@]}" "$@"
