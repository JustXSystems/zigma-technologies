#!/usr/bin/env bash
# Sync Command Brief artefacts from a GitHub Actions runner → Production desk on VPS.
# Used by Meridian SEO report / Deploy Production so Admin → SEO → Command can open the brief
# without spawning Meridian on the web node.
#
# Env (required): DEST_HOST, DEST_USER, SSH identity via SSH_KEY_PATH or default agent
# Env (optional): REMOTE_DESK (default /var/www/zigma-technologies/storage/meridian/zigma-prod)
#                 LOCAL_DESK  (default storage/meridian/zigma-prod)
set -euo pipefail

LOCAL_DESK="${LOCAL_DESK:-storage/meridian/zigma-prod}"
REMOTE_DESK="${REMOTE_DESK:-/var/www/zigma-technologies/storage/meridian/zigma-prod}"
DEST_HOST="${DEST_HOST:?DEST_HOST required}"
DEST_USER="${DEST_USER:?DEST_USER required}"

if [[ ! -d "$LOCAL_DESK" ]]; then
  echo "No local desk at $LOCAL_DESK — skip sync" >&2
  exit 0
fi

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=20)
if [[ -n "${SSH_KEY_PATH:-}" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY_PATH")
fi

REMOTE="${DEST_USER}@${DEST_HOST}"

echo "Ensuring remote desk: $REMOTE:$REMOTE_DESK"
ssh "${SSH_OPTS[@]}" "$REMOTE" "mkdir -p '$REMOTE_DESK'"

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
  rsync -a --partial \
    -e "ssh ${SSH_OPTS[*]}" \
    "$LOCAL_DESK"/ \
    "$REMOTE:$REMOTE_DESK"/
else
  echo "scp selected desk files → $REMOTE:$REMOTE_DESK/"
  for f in "${FILES[@]}"; do
    if [[ -f "$LOCAL_DESK/$f" ]]; then
      scp "${SSH_OPTS[@]}" "$LOCAL_DESK/$f" "$REMOTE:$REMOTE_DESK/$f"
    fi
  done
fi

# Mark desk refresh for Admin pollers
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
ssh "${SSH_OPTS[@]}" "$REMOTE" "printf '%s\n' '{\"syncedAt\":\"$NOW\",\"source\":\"github-actions\"}' > '$REMOTE_DESK/desk-sync.json'"

echo "Desk sync complete."
