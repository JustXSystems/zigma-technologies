#!/usr/bin/env bash
# Optional: install a GitHub Actions self-hosted runner on the Production VPS.
# Near-instant deploys / desk writes (no cloud→VPS SCP for large standalones).
#
# Prerequisites (on VPS as root or sudo):
#   1. Create a runner in GitHub → Settings → Actions → Runners → New self-hosted runner
#   2. Copy the token from that UI into RUNNER_TOKEN below
#   3. Labels MUST include: zigma-prod
#
# Usage:
#   export RUNNER_TOKEN=...   # from GitHub UI (expires ~1h)
#   export GITHUB_OWNER=JustXSystems
#   export GITHUB_REPO=zigma-technologies
#   sudo -E bash scripts/install-github-runner-zigma.sh
set -euo pipefail

OWNER="${GITHUB_OWNER:-JustXSystems}"
REPO="${GITHUB_REPO:-zigma-technologies}"
TOKEN="${RUNNER_TOKEN:?Set RUNNER_TOKEN from GitHub → Settings → Actions → Runners}"
LABELS="${RUNNER_LABELS:-zigma-prod,self-hosted,linux,x64}"
INSTALL_DIR="${RUNNER_DIR:-/opt/actions-runner-zigma}"
USER_NAME="${RUNNER_USER:-github-runner}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo -E bash $0)" >&2
  exit 1
fi

id -u "$USER_NAME" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "$USER_NAME"
mkdir -p "$INSTALL_DIR"
chown "$USER_NAME:$USER_NAME" "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Latest linux-x64 runner (pin via RUNNER_VERSION if needed)
VER="${RUNNER_VERSION:-2.321.0}"
TGZ="actions-runner-linux-x64-${VER}.tar.gz"
if [[ ! -f "$TGZ" ]]; then
  curl -fsSL -o "$TGZ" \
    "https://github.com/actions/runner/releases/download/v${VER}/${TGZ}"
fi
sudo -u "$USER_NAME" tar xzf "$TGZ"

sudo -u "$USER_NAME" ./config.sh \
  --url "https://github.com/${OWNER}/${REPO}" \
  --token "$TOKEN" \
  --name "zigma-prod-$(hostname -s)" \
  --labels "$LABELS" \
  --work "_work" \
  --unattended \
  --replace

./svc.sh install "$USER_NAME"
./svc.sh start

echo "Runner installed. Labels: $LABELS"
echo "Pair with: Deploy PreProd (self-hosted) workflow, or set runs-on: [self-hosted, zigma-prod] on a copy of Deploy Production when ready."
echo "Meridian SEO report still defaults to ubuntu-latest + desk rsync (correct for Hostinger without a runner)."
