#!/usr/bin/env bash
# Sync Command Brief artefacts from a GitHub Actions runner → Production desk on VPS.
# Used by Meridian SEO report / Deploy Production so Admin → SEO → Command can open the brief
# without spawning Meridian on the web node.
#
# Best-effort: SSH / firewall timeouts warn and exit 0 so site deploy is never blocked.
#
# Env (required): DEST_HOST, DEST_USER, SSH identity via SSH_KEY_PATH or default agent
# Env (optional): REMOTE_DESK (default /var/www/zigma-technologies/storage/meridian/zigma-prod)
#                 LOCAL_DESK  (default storage/meridian/zigma-prod)
#                 DESK_SYNC_STRICT=1  → exit non-zero on SSH failure (default soft)
set -euo pipefail

LOCAL_DESK="${LOCAL_DESK:-storage/meridian/zigma-prod}"
REMOTE_DESK="${REMOTE_DESK:-/var/www/zigma-technologies/storage/meridian/zigma-prod}"
DEST_HOST="${DEST_HOST:?DEST_HOST required}"
DEST_USER="${DEST_USER:?DEST_USER required}"
STRICT="${DESK_SYNC_STRICT:-0}"

soft_fail() {
  local msg="$1"
  echo "::warning::Desk sync skipped — $msg (Command Brief still in Actions artifact)"
  if [[ "$STRICT" == "1" ]]; then
    exit 1
  fi
  exit 0
}

if [[ ! -d "$LOCAL_DESK" ]]; then
  echo "No local desk at $LOCAL_DESK — skip sync" >&2
  exit 0
fi

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -o ConnectionAttempts=2 -o ServerAliveInterval=5 -o ServerAliveCountMax=2)
if [[ -n "${SSH_KEY_PATH:-}" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY_PATH")
fi

REMOTE="${DEST_USER}@${DEST_HOST}"

echo "Probing SSH ${DEST_HOST}:22 …"
if ! timeout 18 bash -c "echo >/dev/tcp/${DEST_HOST}/22" 2>/dev/null; then
  soft_fail "TCP ${DEST_HOST}:22 unreachable from this runner (Hostinger firewall / UFW / rate-limit)"
fi

echo "Ensuring remote desk: $REMOTE:$REMOTE_DESK"
if ! ssh "${SSH_OPTS[@]}" "$REMOTE" "mkdir -p '$REMOTE_DESK'"; then
  soft_fail "ssh mkdir failed for $REMOTE:$REMOTE_DESK"
fi

# Prefer rsync (delta); fall back to scp of known brief files
FILES=(
  command-brief.html
  command-brief.md
  command-brief.json
  growth-desk.html
  growth-desk.md
  growth-desk.json
  growth-radar.md
  growth-radar.json
  city-draft.md
  city-draft.json
  city-pages-readiness.json
  review-kit.md
  review-kit.json
  seo-report.json
  seo-report.md
  seo-report-latest.html
  seo-live-verify.json
  seo-report-sources.json
  report-latest.json
  report-latest.html
  job-status.json
)

if command -v rsync >/dev/null 2>&1; then
  echo "rsync desk → $REMOTE:$REMOTE_DESK/"
  # shellcheck disable=SC2029
  if ! rsync -a --partial \
    -e "ssh ${SSH_OPTS[*]}" \
    "$LOCAL_DESK"/ \
    "$REMOTE:$REMOTE_DESK"/; then
    soft_fail "rsync to $REMOTE:$REMOTE_DESK failed"
  fi
else
  echo "scp selected desk files → $REMOTE:$REMOTE_DESK/"
  for f in "${FILES[@]}"; do
    if [[ -f "$LOCAL_DESK/$f" ]]; then
      if ! scp "${SSH_OPTS[@]}" "$LOCAL_DESK/$f" "$REMOTE:$REMOTE_DESK/$f"; then
        soft_fail "scp $f failed"
      fi
    fi
  done
fi

# Mark desk refresh for Admin pollers
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if ! ssh "${SSH_OPTS[@]}" "$REMOTE" "printf '%s\n' '{\"syncedAt\":\"$NOW\",\"source\":\"github-actions\"}' > '$REMOTE_DESK/desk-sync.json'"; then
  soft_fail "could not write desk-sync.json"
fi

echo "Desk sync complete."
