#!/usr/bin/env bash
# Shared deploy logic for TWO separate Hostinger VPS environments.
#
# PreProd (JustXSystems VPS) — deploy@193.203.161.219
#   URL:  https://justxsystems.com/zigma-technologies  (subdirectory / basePath)
#   Dir:  /var/www/zigma-technologies · PM2 zigma-preprod · :3001
#
# Production (Zigma Technologies VPS) — deploy@200.234.45.106
#   URL:  https://zigma-technologies.com  (domain root, no basePath)
#   Dir:  /var/www/zigma-technologies · PM2 zigma · :3000
#
# The script runs ON the target VPS (via SSH). It does not choose the host —
# GitHub Actions / your laptop SSH session selects which machine.
#
# Used by:
#   scripts/deploy-preprod.sh  → .github/workflows/deploy-preprod.yml
#   scripts/deploy-prod.sh     → .github/workflows/deploy-prod.yml
#
# .env and untracked uploads under public/assets stay on the server
# (git reset --hard does not delete untracked files; this script never runs git clean).
set -euo pipefail

ENV_NAME=""
BRANCH="${DEPLOY_BRANCH:-master}"
DO_SYNC=1
DO_INSTALL=1
DO_BUILD=1
DO_RESTART=1
DO_DB_BACKUP=0
DO_MIGRATIONS=0
MIGRATION_FILES=""
DO_CLEAR_NEXT=0
DO_HEALTHCHECK=1
CONFIRM_PROD=""
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: deploy.sh --env preprod|prod [options]

Environments (run this script on the matching VPS):
  --env preprod   JustXSystems VPS — subdirectory justxsystems.com/zigma-technologies
  --env prod      Zigma Technologies VPS — domain-root zigma-technologies.com

Component toggles (default: sync+install+build+restart ON; DB ops OFF):
  --sync / --no-sync              git fetch + checkout + reset --hard origin/<branch>
  --install / --no-install        npm ci
  --build / --no-build            npm run build
  --restart / --no-restart        pm2 restart (or start) the env process
  --db-backup / --no-db-backup    mysqldump from .env DB_* before migrations
  --migrations / --no-migrations  apply SQL migration files
  --migration-files LIST          comma-separated filenames under scripts/
                                  Required when --migrations is set.
  --clear-next / --no-clear-next  rm -rf .next before build
  --healthcheck / --no-healthcheck  curl localhost after restart
  --branch NAME                   git branch (default: master)
  --confirm-prod PHRASE           must be DEPLOY_PROD when --env prod
  --dry-run                       print plan only; do not mutate

Examples:
  ./scripts/deploy.sh --env preprod
  ./scripts/deploy.sh --env prod --confirm-prod DEPLOY_PROD
  ./scripts/deploy.sh --env prod --confirm-prod DEPLOY_PROD --no-install --no-build --restart
EOF
}

log() { echo "==> $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV_NAME="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --sync) DO_SYNC=1; shift ;;
    --no-sync) DO_SYNC=0; shift ;;
    --install) DO_INSTALL=1; shift ;;
    --no-install) DO_INSTALL=0; shift ;;
    --build) DO_BUILD=1; shift ;;
    --no-build) DO_BUILD=0; shift ;;
    --restart) DO_RESTART=1; shift ;;
    --no-restart) DO_RESTART=0; shift ;;
    --db-backup) DO_DB_BACKUP=1; shift ;;
    --no-db-backup) DO_DB_BACKUP=0; shift ;;
    --migrations) DO_MIGRATIONS=1; shift ;;
    --no-migrations) DO_MIGRATIONS=0; shift ;;
    --migration-files) MIGRATION_FILES="${2:-}"; shift 2 ;;
    --clear-next) DO_CLEAR_NEXT=1; shift ;;
    --no-clear-next) DO_CLEAR_NEXT=0; shift ;;
    --healthcheck) DO_HEALTHCHECK=1; shift ;;
    --no-healthcheck) DO_HEALTHCHECK=0; shift ;;
    --confirm-prod) CONFIRM_PROD="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1 (see --help)" ;;
  esac
done

[[ -n "$ENV_NAME" ]] || { usage; die "--env is required"; }

case "$ENV_NAME" in
  preprod|staging|jx)
    ENV_NAME="preprod"
    # JustXSystems VPS — path deploy
    APP_DIR="${APP_DIR:-/var/www/zigma-technologies}"
    PM2_NAME="${PM2_NAME:-zigma-preprod}"
    APP_PORT="${APP_PORT:-3001}"
    EXPECT_BASE_PATH="/zigma-technologies"
    HEALTH_PATH="/zigma-technologies"
    PUBLIC_HINT="https://justxsystems.com/zigma-technologies"
    SSH_HINT="deploy@193.203.161.219 (JustXSystems VPS)"
    ;;
  prod|production)
    ENV_NAME="prod"
    # Zigma Technologies VPS — domain root
    APP_DIR="${APP_DIR:-/var/www/zigma-technologies}"
    PM2_NAME="${PM2_NAME:-zigma}"
    APP_PORT="${APP_PORT:-3000}"
    EXPECT_BASE_PATH=""
    HEALTH_PATH="/"
    PUBLIC_HINT="https://zigma-technologies.com"
    SSH_HINT="deploy@200.234.45.106 (Zigma Technologies VPS)"
    ;;
  *)
    die "--env must be preprod or prod (got: $ENV_NAME)"
    ;;
esac

if [[ "$ENV_NAME" == "prod" ]]; then
  if [[ "$CONFIRM_PROD" != "DEPLOY_PROD" ]]; then
    die "Production deploy requires --confirm-prod DEPLOY_PROD (got: '${CONFIRM_PROD:-}')."
  fi
fi

if [[ "$DO_MIGRATIONS" -eq 1 && -z "$MIGRATION_FILES" ]]; then
  die "--migrations requires --migration-files <comma-separated scripts/*.sql names>"
fi

if [[ $((DO_SYNC + DO_INSTALL + DO_BUILD + DO_RESTART + DO_DB_BACKUP + DO_MIGRATIONS)) -eq 0 ]]; then
  die "Nothing to do — enable at least one component."
fi

log "Deploy plan $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "  env=$ENV_NAME  host_hint=$SSH_HINT"
log "  dir=$APP_DIR  branch=$BRANCH  pm2=$PM2_NAME  port=$APP_PORT"
log "  sync=$DO_SYNC install=$DO_INSTALL build=$DO_BUILD restart=$DO_RESTART"
log "  db_backup=$DO_DB_BACKUP migrations=$DO_MIGRATIONS clear_next=$DO_CLEAR_NEXT healthcheck=$DO_HEALTHCHECK"
log "  public=$PUBLIC_HINT"
[[ "$DRY_RUN" -eq 1 ]] && { log "Dry-run only — exiting."; exit 0; }

[[ -d "$APP_DIR" ]] || die "App directory missing: $APP_DIR (are you on the correct VPS? expected $SSH_HINT)"
cd "$APP_DIR"

# CMS media dirs must exist for MediaPicker uploads (do not rely on git-tracked files alone)
mkdir -p \
  public/assets/images \
  public/assets/svg \
  public/assets/video \
  public/assets/uploads/resumes \
  public/assets/uploads/documents

if [[ ! -f .env ]]; then
  die "$APP_DIR/.env is missing. Create it from .env.example before deploying."
fi

env_get() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" .env | tail -n1 | sed 's/\r$//' || true)"
  [[ -n "$line" ]] || { echo ""; return 0; }
  echo "${line#*=}" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

DB_HOST="$(env_get DB_HOST)"
DB_PORT="$(env_get DB_PORT)"
DB_NAME="$(env_get DB_NAME)"
DB_USER="$(env_get DB_USER)"
DB_PASSWORD="$(env_get DB_PASSWORD)"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"

if [[ "$ENV_NAME" == "preprod" ]]; then
  if ! grep -qE '^NEXT_PUBLIC_BASE_PATH=/zigma-technologies[[:space:]]*$' .env; then
    die "PreProd .env must set NEXT_PUBLIC_BASE_PATH=/zigma-technologies (no trailing slash)."
  fi
  if ! grep -qE '^NEXT_PUBLIC_SITE_URL=https://justxsystems.com/zigma-technologies[[:space:]]*$' .env; then
    log "WARNING: NEXT_PUBLIC_SITE_URL should be https://justxsystems.com/zigma-technologies"
  fi
else
  if grep -qE '^NEXT_PUBLIC_BASE_PATH=.+' .env; then
    die "Production .env must NOT set NEXT_PUBLIC_BASE_PATH (domain-root deploy on Zigma VPS)."
  fi
fi

if [[ "$DO_SYNC" -eq 1 ]]; then
  log "Sync git → origin/$BRANCH"
  git fetch origin
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
  log "HEAD $(git rev-parse --short HEAD) — $(git log -1 --oneline)"
else
  log "Skip git sync (HEAD $(git rev-parse --short HEAD 2>/dev/null || echo unknown))"
fi

if [[ "$DO_DB_BACKUP" -eq 1 ]]; then
  log "Database backup"
  [[ -n "$DB_NAME" ]] || die "DB_NAME missing in .env"
  [[ -n "$DB_USER" ]] || die "DB_USER missing in .env"
  BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/zigma}"
  mkdir -p "$BACKUP_ROOT"
  STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  OUT="$BACKUP_ROOT/${ENV_NAME}-${DB_NAME}-${STAMP}.sql.gz"
  export MYSQL_PWD="${DB_PASSWORD}"
  mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
    --single-transaction --routines --triggers "$DB_NAME" | gzip >"$OUT"
  unset MYSQL_PWD
  log "Backup written: $OUT"
fi

if [[ "$DO_MIGRATIONS" -eq 1 ]]; then
  log "Apply migrations: $MIGRATION_FILES"
  [[ -n "$DB_NAME" ]] || die "DB_NAME missing in .env"
  [[ -n "$DB_USER" ]] || die "DB_USER missing in .env"
  export MYSQL_PWD="${DB_PASSWORD}"
  IFS=',' read -r -a MIGS <<<"$MIGRATION_FILES"
  for raw in "${MIGS[@]}"; do
    name="$(echo "$raw" | xargs)"
    [[ -n "$name" ]] || continue
    file="scripts/$name"
    [[ -f "$file" ]] || die "Migration file not found: $file"
    log "  applying $file"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" <"$file"
  done
  unset MYSQL_PWD
fi

if [[ "$DO_INSTALL" -eq 1 ]]; then
  log "npm ci"
  npm ci
else
  log "Skip npm ci"
fi

if [[ "$DO_CLEAR_NEXT" -eq 1 ]]; then
  log "Clear .next"
  rm -rf .next
fi

if [[ "$DO_BUILD" -eq 1 ]]; then
  log "npm run build"
  npm run build
  if [[ -f .next/routes-manifest.json ]]; then
    ACTUAL_BASE="$(node -e "console.log(require('./.next/routes-manifest.json').basePath || '')")"
    if [[ "$ACTUAL_BASE" != "$EXPECT_BASE_PATH" ]]; then
      die "Build basePath mismatch: expected '${EXPECT_BASE_PATH}' got '${ACTUAL_BASE}'"
    fi
    log "Verified basePath='${ACTUAL_BASE:-<empty>}'"
  else
    die ".next/routes-manifest.json missing after build"
  fi
else
  log "Skip build"
fi

if [[ "$DO_RESTART" -eq 1 ]]; then
  if ! command -v pm2 >/dev/null 2>&1; then
    die "pm2 not found — cannot restart"
  fi
  log "PM2 restart $PM2_NAME"
  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2 restart "$PM2_NAME" --update-env
  else
    PORT="${PORT:-$APP_PORT}" pm2 start npm --name "$PM2_NAME" -- start -- -p "$APP_PORT"
    pm2 save
  fi
  pm2 status "$PM2_NAME"
else
  log "Skip PM2 restart"
fi

if [[ "$DO_HEALTHCHECK" -eq 1 && "$DO_RESTART" -eq 1 ]]; then
  log "Healthcheck http://127.0.0.1:${APP_PORT}${HEALTH_PATH}"
  sleep 2
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "http://127.0.0.1:${APP_PORT}${HEALTH_PATH}" || true)"
  case "$CODE" in
    200|301|302|307|308) log "Healthcheck OK (HTTP $CODE)" ;;
    *) die "Healthcheck failed (HTTP ${CODE:-none}). Check: pm2 logs $PM2_NAME --lines 80" ;;
  esac

  # Prove CMS media rewrite serves from disk (admin MediaPicker + backgrounds)
  ASSET_REL="assets/images/zigma-technologies-logo.png"
  if [[ -f "public/${ASSET_REL}" ]]; then
    ASSET_URL="http://127.0.0.1:${APP_PORT}${EXPECT_BASE_PATH}/${ASSET_REL}"
    log "Asset healthcheck ${ASSET_URL}"
    ACODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$ASSET_URL" || true)"
    ATYPE="$(curl -s -o /dev/null -w '%{content_type}' --max-time 15 "$ASSET_URL" || true)"
    if [[ "$ACODE" != "200" ]]; then
      die "Asset healthcheck failed (HTTP ${ACODE}). CMS media rewrite broken — admin background previews will fail."
    fi
    log "Asset healthcheck OK (HTTP $ACODE, type=${ATYPE})"
  else
    log "Skip asset healthcheck (public/${ASSET_REL} missing)"
  fi
fi

log "Deploy finished OK ($ENV_NAME @ $SSH_HINT → $PUBLIC_HINT)"
log "Note: runtime uploads live under public/assets/{images,svg,video} (untracked). Never git clean -fd here."