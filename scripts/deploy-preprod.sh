#!/usr/bin/env bash
# PreProd deploy on JustXSystems VPS (deploy@193.203.161.219).
# URL: https://justxsystems.com/zigma-technologies (subdirectory / basePath).
# Default path for GitHub Actions on every master push.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/scripts/deploy.sh" --env preprod "$@"
