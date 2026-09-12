#!/usr/bin/env bash
# Apply a CI release tarball on the VPS (fool-proof, parameterized).
#
# Preserves: .env, runtime CMS uploads under public/assets/{images,svg,video,uploads}
#   (merge without --delete so server-only uploads survive).
#
# Usage:
#   ./scripts/apply-release.sh --env preprod --tarball /tmp/zigma-preprod.tgz
#   ./scripts/apply-release.sh --env prod --tarball ./release.tgz --confirm-prod DEPLOY_PROD \
#       --restart --healthcheck --no-db-backup
#
set -euo pipefail

ENV_NAME=""
TARBALL=""
APP_DIR="${APP_DIR:-/var/www/zigma-technologies}"
DO_EXTRACT=1
DO_RESTART=1
DO_HEALTHCHECK=1
DO_DB_BACKUP=0
DO_MIGRATIONS=0
MIGRATION_FILES=""
CONFIRM_PROD=""
DRY_RUN=0
PRESERVE_UPLOADS=1

usage() {
  cat <<'EOF'
Usage: apply-release.sh --env preprod|prod --tarball FILE [options]

Required:
  --env preprod|prod
  --tarball PATH          release .tgz from package-release.sh / GitHub Actions

Components (defaults: extract+restart+healthcheck ON; db ops OFF):
  --extract / --no-extract
  --restart / --no-restart
  --healthcheck / --no-healthcheck
  --preserve-uploads / --no-preserve-uploads
      Keep existing public/assets uploads + CMS files not in the tarball (default ON)
  --db-backup / --no-db-backup
  --migrations / --no-migrations
  --migration-files LIST  scripts/*.sql names (required with --migrations)
  --confirm-prod PHRASE   must be DEPLOY_PROD for --env prod
  --dry-run
  --app-dir PATH          default /var/www/zigma-technologies
EOF
}

log() { echo "==> $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV_NAME="${2:-}"; shift 2 ;;
    --tarball) TARBALL="${2:-}"; shift 2 ;;
    --app-dir) APP_DIR="${2:-}"; shift 2 ;;
    --extract) DO_EXTRACT=1; shift ;;
    --no-extract) DO_EXTRACT=0; shift ;;
    --restart) DO_RESTART=1; shift ;;
    --no-restart) DO_RESTART=0; shift ;;
    --healthcheck) DO_HEALTHCHECK=1; shift ;;
    --no-healthcheck) DO_HEALTHCHECK=0; shift ;;
    --preserve-uploads) PRESERVE_UPLOADS=1; shift ;;
    --no-preserve-uploads) PRESERVE_UPLOADS=0; shift ;;
    --db-backup) DO_DB_BACKUP=1; shift ;;
    --no-db-backup) DO_DB_BACKUP=0; shift ;;
    --migrations) DO_MIGRATIONS=1; shift ;;
    --no-migrations) DO_MIGRATIONS=0; shift ;;
    --migration-files) MIGRATION_FILES="${2:-}"; shift 2 ;;
    --confirm-prod) CONFIRM_PROD="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[[ -n "$ENV_NAME" ]] || { usage; die "--env required"; }
[[ -n "$TARBALL" ]] || { usage; die "--tarball required"; }
[[ -f "$TARBALL" ]] || die "Tarball not found: $TARBALL"

case "$ENV_NAME" in
  preprod)
    PM2_NAME="${PM2_NAME:-zigma-preprod}"
    APP_PORT="${APP_PORT:-3001}"
    EXPECT_BASE_PATH="/zigma-technologies"
    HEALTH_PATH="/zigma-technologies"
    ;;
  prod)
    PM2_NAME="${PM2_NAME:-zigma}"
    APP_PORT="${APP_PORT:-3000}"
    EXPECT_BASE_PATH=""
    HEALTH_PATH="/"
    if [[ "$CONFIRM_PROD" != "DEPLOY_PROD" ]]; then
      die "Production apply requires --confirm-prod DEPLOY_PROD"
    fi
    ;;
  *) die "--env must be preprod or prod" ;;
esac

if [[ "$DO_MIGRATIONS" -eq 1 && -z "$MIGRATION_FILES" ]]; then
  die "--migrations requires --migration-files"
fi

log "Apply release plan"
log "  env=$ENV_NAME dir=$APP_DIR tarball=$TARBALL"
log "  extract=$DO_EXTRACT preserve_uploads=$PRESERVE_UPLOADS restart=$DO_RESTART health=$DO_HEALTHCHECK"
log "  db_backup=$DO_DB_BACKUP migrations=$DO_MIGRATIONS"
[[ "$DRY_RUN" -eq 1 ]] && { log "Dry-run only — exiting."; exit 0; }

[[ -d "$APP_DIR" ]] || die "App dir missing: $APP_DIR"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  die "$APP_DIR/.env missing — create from .env.example before applying a release"
fi

# --- optional DB backup / migrations (same as deploy.sh) ---
env_get() {
  local key="$1" line
  line="$(grep -E "^${key}=" .env | tail -n1 | sed 's/\r$//' || true)"
  [[ -n "$line" ]] || { echo ""; return 0; }
  echo "${line#*=}" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

if [[ "$DO_DB_BACKUP" -eq 1 ]]; then
  log "Database backup"
  DB_HOST="$(env_get DB_HOST)"; DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="$(env_get DB_PORT)"; DB_PORT="${DB_PORT:-3306}"
  DB_NAME="$(env_get DB_NAME)"
  DB_USER="$(env_get DB_USER)"
  DB_PASSWORD="$(env_get DB_PASSWORD)"
  [[ -n "$DB_NAME" && -n "$DB_USER" ]] || die "DB_NAME/DB_USER missing in .env"
  BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/zigma}"
  mkdir -p "$BACKUP_ROOT"
  OUT="$BACKUP_ROOT/${ENV_NAME}-${DB_NAME}-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
  export MYSQL_PWD="${DB_PASSWORD}"
  mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
    --single-transaction --routines --triggers "$DB_NAME" | gzip >"$OUT"
  unset MYSQL_PWD
  log "Backup written: $OUT"
fi

if [[ "$DO_MIGRATIONS" -eq 1 ]]; then
  log "Apply migrations: $MIGRATION_FILES"
  DB_HOST="$(env_get DB_HOST)"; DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="$(env_get DB_PORT)"; DB_PORT="${DB_PORT:-3306}"
  DB_NAME="$(env_get DB_NAME)"
  DB_USER="$(env_get DB_USER)"
  DB_PASSWORD="$(env_get DB_PASSWORD)"
  export MYSQL_PWD="${DB_PASSWORD}"
  IFS=',' read -r -a MIGS <<<"$MIGRATION_FILES"
  for raw in "${MIGS[@]}"; do
    name="$(echo "$raw" | xargs)"
    [[ -n "$name" ]] || continue
    file="scripts/$name"
    [[ -f "$file" ]] || die "Migration not found: $file"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" <"$file"
  done
  unset MYSQL_PWD
fi

if [[ "$DO_EXTRACT" -eq 1 ]]; then
  STAGE="$(mktemp -d /tmp/zigma-apply.XXXXXX)"
  log "Extract tarball → $STAGE"
  tar -xzf "$TARBALL" -C "$STAGE"

  [[ -f "$STAGE/release-manifest.json" ]] || die "Invalid release: missing release-manifest.json"
  [[ -f "$STAGE/server.js" ]] || die "Invalid release: missing server.js (standalone)"

  REL_ENV="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$STAGE/release-manifest.json','utf8')).env||'')")"
  REL_BASE="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$STAGE/release-manifest.json','utf8')).basePath||'')")"
  [[ "$REL_ENV" == "$ENV_NAME" ]] || die "Release env mismatch: tarball=$REL_ENV apply=$ENV_NAME"
  [[ "$REL_BASE" == "$EXPECT_BASE_PATH" ]] || die "Release basePath mismatch: expected '${EXPECT_BASE_PATH}' got '${REL_BASE}'"

  # Backup .env always
  cp -a .env "/tmp/zigma-env-backup-$$.env"

  # Preserve runtime media dirs
  MEDIA_BAK=""
  if [[ "$PRESERVE_UPLOADS" -eq 1 ]]; then
    MEDIA_BAK="$(mktemp -d /tmp/zigma-media-bak.XXXXXX)"
    for d in public/assets/images public/assets/svg public/assets/video public/assets/uploads; do
      if [[ -d "$d" ]]; then
        mkdir -p "$MEDIA_BAK/$(dirname "$d")"
        cp -a "$d" "$MEDIA_BAK/$d"
      fi
    done
    log "Preserved runtime media under $MEDIA_BAK"
  fi

  log "Install release files into $APP_DIR"
  # Replace app code but never delete .env via rsync exclude
  rsync -a --delete \
    --exclude '.env' \
    --exclude '.env.*' \
    --exclude '.git/' \
    --exclude 'storage/exports/' \
    --exclude 'public/assets/uploads/resumes/' \
    --exclude 'public/assets/uploads/documents/' \
    "$STAGE"/ "$APP_DIR"/

  # Restore .env
  cp -a "/tmp/zigma-env-backup-$$.env" "$APP_DIR/.env"
  rm -f "/tmp/zigma-env-backup-$$.env"

  # Merge preserved media back (server-only files win if not in release — we copy preserved over)
  if [[ -n "$MEDIA_BAK" && -d "$MEDIA_BAK" ]]; then
    for d in public/assets/images public/assets/svg public/assets/video public/assets/uploads; do
      if [[ -d "$MEDIA_BAK/$d" ]]; then
        mkdir -p "$APP_DIR/$d"
        # Do not delete release files; add/overwrite with preserved runtime files
        rsync -a "$MEDIA_BAK/$d"/ "$APP_DIR/$d"/
      fi
    done
    rm -rf "$MEDIA_BAK"
  fi

  mkdir -p \
    public/assets/images \
    public/assets/svg \
    public/assets/video \
    public/assets/uploads/resumes \
    public/assets/uploads/documents

  chmod +x scripts/*.sh 2>/dev/null || true
  rm -rf "$STAGE"
  log "Extract complete. release=$(cat release-manifest.json)"
else
  log "Skip extract"
fi

if [[ "$DO_RESTART" -eq 1 ]]; then
  command -v pm2 >/dev/null 2>&1 || die "pm2 not found"
  log "PM2 restart $PM2_NAME (standalone server.js)"
  # Prefer standalone server.js at app root
  if [[ ! -f server.js ]]; then
    die "server.js missing after extract — cannot start standalone"
  fi
  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    # Update to node server.js if still on legacy npm start
    pm2 delete "$PM2_NAME" || true
  fi
  PORT="${PORT:-$APP_PORT}" HOSTNAME="${HOSTNAME:-127.0.0.1}" \
    pm2 start "$APP_DIR/server.js" --name "$PM2_NAME" --update-env
  pm2 save
  pm2 status "$PM2_NAME"
else
  log "Skip restart"
fi

if [[ "$DO_HEALTHCHECK" -eq 1 && "$DO_RESTART" -eq 1 ]]; then
  log "Healthcheck http://127.0.0.1:${APP_PORT}${HEALTH_PATH}"
  sleep 3
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "http://127.0.0.1:${APP_PORT}${HEALTH_PATH}" || true)"
  case "$CODE" in
    200|301|302|307|308) log "Healthcheck OK (HTTP $CODE)" ;;
    *) die "Healthcheck failed (HTTP ${CODE:-none}). pm2 logs $PM2_NAME --lines 80" ;;
  esac
  ASSET="assets/images/zigma-technologies-logo.png"
  if [[ -f "public/${ASSET}" ]]; then
    AURL="http://127.0.0.1:${APP_PORT}${EXPECT_BASE_PATH}/${ASSET}"
    ACODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$AURL" || true)"
    [[ "$ACODE" == "200" ]] || die "Asset healthcheck failed ($AURL → HTTP $ACODE)"
    log "Asset healthcheck OK"
  fi
fi

log "Apply release finished OK ($ENV_NAME)"
