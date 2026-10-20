#!/usr/bin/env bash
# Apply a CI release on the VPS (fool-proof, parameterized).
#
# Prefer --stage DIR from a delta-rsync of package-release --stage-dir (warm deploys).
# --tarball remains for rollback / manual one-shots.
#
# Preserves: .env, runtime CMS uploads under public/assets/{images,svg,video,uploads}
#   (merge without --delete so server-only uploads survive).
#
# Usage:
#   ./scripts/apply-release.sh --env preprod --stage /tmp/zigma-release-stage
#   ./scripts/apply-release.sh --env prod --stage /tmp/zigma-release-stage --confirm-prod DEPLOY_PROD
#   ./scripts/apply-release.sh --env prod --tarball ./release.tgz --confirm-prod DEPLOY_PROD
#
set -euo pipefail

ENV_NAME=""
TARBALL=""
STAGE_SRC=""
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
Usage: apply-release.sh --env preprod|prod (--stage DIR | --tarball FILE) [options]

Required:
  --env preprod|prod
  --stage DIR             release folder (from package-release --stage-dir / rsync)
  OR --tarball PATH       release .tgz (rollback / legacy)

Components (defaults: extract+restart+healthcheck ON; db ops OFF):
  --extract / --no-extract
  --restart / --no-restart
  --healthcheck / --no-healthcheck
  --preserve-uploads / --no-preserve-uploads
      Keep existing public/assets uploads + CMS files not in the release (default ON)
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
    --stage) STAGE_SRC="${2:-}"; shift 2 ;;
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
if [[ -n "$STAGE_SRC" && -n "$TARBALL" ]]; then
  die "Pass only one of --stage or --tarball"
fi
if [[ -z "$STAGE_SRC" && -z "$TARBALL" ]]; then
  usage
  die "need --stage DIR or --tarball FILE"
fi
if [[ -n "$TARBALL" ]]; then
  [[ -f "$TARBALL" ]] || die "Tarball not found: $TARBALL"
fi
if [[ -n "$STAGE_SRC" ]]; then
  [[ -d "$STAGE_SRC" ]] || die "Stage dir not found: $STAGE_SRC"
  [[ -f "$STAGE_SRC/server.js" ]] || die "Invalid stage: missing server.js in $STAGE_SRC"
  [[ -f "$STAGE_SRC/release-manifest.json" ]] || die "Invalid stage: missing release-manifest.json in $STAGE_SRC"
fi

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
  die "--migrations requires --migration-files (e.g. migrate-catalog-discovery.sql,migrate-catalog-background.sql)"
fi

log "Apply release plan"
log "  env=$ENV_NAME dir=$APP_DIR"
if [[ -n "$STAGE_SRC" ]]; then
  log "  stage=$STAGE_SRC"
else
  log "  tarball=$TARBALL"
fi
log "  extract=$DO_EXTRACT preserve_uploads=$PRESERVE_UPLOADS restart=$DO_RESTART health=$DO_HEALTHCHECK"
log "  db_backup=$DO_DB_BACKUP migrations=$DO_MIGRATIONS"
[[ "$DRY_RUN" -eq 1 ]] && { log "Dry-run only — exiting."; exit 0; }

[[ -d "$APP_DIR" ]] || die "App dir missing: $APP_DIR"
[[ -w "$APP_DIR" ]] || die "App dir not writable by $(id -un): $APP_DIR (fix ownership/permissions on the VPS)"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  die "$APP_DIR/.env missing — create from .env.example before applying a release"
fi

command -v rsync >/dev/null 2>&1 || die "rsync not found on VPS (apt install rsync)"

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
  command -v mysqldump >/dev/null 2>&1 || die "mysqldump not found on VPS"
  command -v gzip >/dev/null 2>&1 || die "gzip not found on VPS"

  # Prefer paths the deploy user can write. /var/backups/zigma often needs root.
  REQUESTED_BACKUP_ROOT="${BACKUP_ROOT:-}"
  BACKUP_ROOT=""
  for candidate in \
    "$REQUESTED_BACKUP_ROOT" \
    "${APP_DIR}/storage/db-backups" \
    "${HOME}/zigma-backups" \
    "/tmp/zigma-backups"
  do
    [[ -n "$candidate" ]] || continue
    if mkdir -p "$candidate" 2>/dev/null && [[ -w "$candidate" ]]; then
      BACKUP_ROOT="$candidate"
      break
    fi
  done
  [[ -n "$BACKUP_ROOT" ]] || die "No writable DB backup directory (tried \$BACKUP_ROOT, APP_DIR/storage/db-backups, ~/zigma-backups, /tmp/zigma-backups)"

  OUT="$BACKUP_ROOT/${ENV_NAME}-${DB_NAME}-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
  export MYSQL_PWD="${DB_PASSWORD}"
  if ! mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
    --single-transaction --no-tablespaces --routines --triggers "$DB_NAME" | gzip >"$OUT"; then
    unset MYSQL_PWD
    rm -f "$OUT"
    die "mysqldump failed (check DB_* in .env and that deploy can connect)"
  fi
  unset MYSQL_PWD
  [[ -s "$OUT" ]] || die "DB backup file empty: $OUT"
  log "Backup written: $OUT ($(wc -c <"$OUT" | tr -d ' ') bytes)"
fi

if [[ "$DO_MIGRATIONS" -eq 1 ]]; then
  log "Apply migrations: $MIGRATION_FILES"
  DB_HOST="$(env_get DB_HOST)"; DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="$(env_get DB_PORT)"; DB_PORT="${DB_PORT:-3306}"
  DB_NAME="$(env_get DB_NAME)"
  DB_USER="$(env_get DB_USER)"
  DB_PASSWORD="$(env_get DB_PASSWORD)"
  # Migrations run before install; SQL ships in --stage or inside --tarball.
  MIG_STAGE="$(mktemp -d /tmp/zigma-migrations.XXXXXX)"
  export MYSQL_PWD="${DB_PASSWORD}"
  IFS=',' read -r -a MIGS <<<"$MIGRATION_FILES"
  for raw in "${MIGS[@]}"; do
    name="$(echo "$raw" | xargs)"
    [[ -n "$name" ]] || continue
    file=""
    if [[ -n "$STAGE_SRC" && -f "$STAGE_SRC/scripts/$name" ]]; then
      file="$STAGE_SRC/scripts/$name"
    elif [[ -n "$TARBALL" && -f "$TARBALL" ]]; then
      tar -xzf "$TARBALL" -C "$MIG_STAGE" --wildcards --no-anchored "scripts/$name" 2>/dev/null || true
      for candidate in "$MIG_STAGE/scripts/$name" "$MIG_STAGE/./scripts/$name"; do
        [[ -f "$candidate" ]] && { file="$candidate"; break; }
      done
    fi
    if [[ -z "$file" && -f "scripts/$name" ]]; then
      file="scripts/$name"
    fi
    [[ -n "$file" && -f "$file" ]] || { rm -rf "$MIG_STAGE"; die "Migration not found in stage/tarball or $APP_DIR/scripts: $name"; }
    log "  mysql < $name (from $file)"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" <"$file"
  done
  unset MYSQL_PWD
  rm -rf "$MIG_STAGE"
fi

if [[ "$DO_EXTRACT" -eq 1 ]]; then
  STAGE_OWNED=0
  if [[ -n "$STAGE_SRC" ]]; then
    STAGE="$STAGE_SRC"
    log "Install from stage dir $STAGE (no tar extract)"
  else
    STAGE="$(mktemp -d /tmp/zigma-apply.XXXXXX)"
    STAGE_OWNED=1
    log "Extract tarball → $STAGE"
    tar -xzf "$TARBALL" -C "$STAGE"
  fi

  [[ -f "$STAGE/release-manifest.json" ]] || die "Invalid release: missing release-manifest.json"
  [[ -f "$STAGE/server.js" ]] || die "Invalid release: missing server.js (standalone)"

  REL_ENV="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$STAGE/release-manifest.json','utf8')).env||'')")"
  REL_BASE="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$STAGE/release-manifest.json','utf8')).basePath||'')")"
  [[ "$REL_ENV" == "$ENV_NAME" ]] || die "Release env mismatch: release=$REL_ENV apply=$ENV_NAME"
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

  # Meridian is control-plane — not in website release by default.
  # Remember before rsync so we can wipe stale packages/meridian from older deploys.
  SHIPPED_MERIDIAN=0
  if [[ -f "$STAGE/packages/meridian/bin/meridian.mjs" ]]; then
    SHIPPED_MERIDIAN=1
  fi

  log "Install release files into $APP_DIR"
  # Standalone ships a lean node_modules. Leftover full-npm trees (eslint, babel, …)
  # from older git/npm deploys block rsync --delete and can crash the new process.
  if [[ -d "$APP_DIR/node_modules" ]]; then
    log "Preparing node_modules for clean replace (chmod + prune stale trees)"
    chmod -R u+w "$APP_DIR/node_modules" 2>/dev/null || true
    if [[ -d "$STAGE/node_modules" ]]; then
      # Drop destination tree so rsync copies a clean standalone set (avoids undeletable nests).
      rm -rf "$APP_DIR/node_modules" 2>/dev/null || true
      if [[ -d "$APP_DIR/node_modules" ]]; then
        log "WARNING: could not fully remove $APP_DIR/node_modules — rsync --delete will try"
      fi
    fi
  fi

  # VPS deploy users often cannot chown/chgrp/utime the app root dir (rsync code 23).
  # Excluded paths are not deleted unless --delete-excluded (which we do not use).
  set +e
  rsync -a --delete --no-owner --no-group --omit-dir-times \
    --exclude '.env' \
    --exclude '.env.*' \
    --exclude '.git/' \
    --exclude 'storage/' \
    --exclude 'apps/' \
    --exclude 'src/' \
    --exclude 'coverage/' \
    --exclude 'docs/' \
    --exclude '.well-known/' \
    --exclude 'public/assets/uploads/resumes/' \
    --exclude 'public/assets/uploads/documents/' \
    "$STAGE"/ "$APP_DIR"/
  RSYNC_RC=$?
  set -e
  # 0 = ok; 23 = partial transfer (dir utime/attrs, or undeletable leftovers we excluded/pruned)
  if [[ "$RSYNC_RC" -ne 0 && "$RSYNC_RC" -ne 23 ]]; then
    die "rsync failed with code $RSYNC_RC"
  fi
  [[ -f "$APP_DIR/server.js" && -f "$APP_DIR/release-manifest.json" ]] \
    || die "rsync finished (rc=$RSYNC_RC) but server.js / release-manifest.json missing"
  if [[ "$RSYNC_RC" -eq 23 ]]; then
    log "rsync reported code 23 (attrs / leftover paths) — release files present, continuing"
  fi

  # Restore .env
  cp --no-preserve=ownership "/tmp/zigma-env-backup-$$.env" "$APP_DIR/.env" 2>/dev/null \
    || cp -f "/tmp/zigma-env-backup-$$.env" "$APP_DIR/.env"
  rm -f "/tmp/zigma-env-backup-$$.env"

  # Merge preserved media back (server-only files win if not in release — we copy preserved over)
  if [[ -n "$MEDIA_BAK" && -d "$MEDIA_BAK" ]]; then
    for d in public/assets/images public/assets/svg public/assets/video public/assets/uploads; do
      if [[ -d "$MEDIA_BAK/$d" ]]; then
        mkdir -p "$APP_DIR/$d"
        # Do not delete release files; add/overwrite with preserved runtime files
        rsync -a --no-owner --no-group --omit-dir-times "$MEDIA_BAK/$d"/ "$APP_DIR/$d"/ || true
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

  # Remove stale Meridian from previous releases (old CLI + new npm scripts = "Unknown act action")
  if [[ "$SHIPPED_MERIDIAN" -eq 0 ]]; then
    log "Control plane: Meridian not in this release — clearing stale packages/meridian"
    rm -rf "$APP_DIR/packages/meridian"
    mkdir -p "$APP_DIR/packages/meridian/bin"
    cat >"$APP_DIR/packages/meridian/README-CONTROL-PLANE.txt" <<'EOF'
Meridian is NOT shipped with the website (product plane).

Use:
  GitHub Actions → "Meridian SEO report"
  or Deploy Meridian → /var/www/zigma-meridian
  then: export MERIDIAN_HOME=/var/www/zigma-meridian
        npm run seo:report

See packages/meridian/ARCHITECTURE.md in the git repo.
EOF
    cat >"$APP_DIR/packages/meridian/bin/meridian.mjs" <<'EOF'
#!/usr/bin/env node
/* CONTROL_PLANE_STUB — not shipped with the website */
console.error('Meridian control plane is not shipped with the website.');
console.error('Use GitHub → Meridian SEO report, or Deploy Meridian + MERIDIAN_HOME=/var/www/zigma-meridian');
console.error('See packages/meridian/ARCHITECTURE.md');
process.exit(2);
EOF
  fi

  # Keep --stage dirs (delta cache for next rsync). Only delete temp extract dirs.
  if [[ "$STAGE_OWNED" -eq 1 ]]; then
    rm -rf "$STAGE"
  fi
  log "Install complete. release=$(cat release-manifest.json)"
else
  log "Skip extract"
fi

# After extract (so new SQL is on disk): ensure gallery-background column (idempotent).
if [[ -f scripts/migrate-catalog-background.sql ]]; then
  log "Ensure schema: catalog_items.background_image_url"
  DB_HOST="$(env_get DB_HOST)"; DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="$(env_get DB_PORT)"; DB_PORT="${DB_PORT:-3306}"
  DB_NAME="$(env_get DB_NAME)"
  DB_USER="$(env_get DB_USER)"
  DB_PASSWORD="$(env_get DB_PASSWORD)"
  if [[ -n "$DB_NAME" && -n "$DB_USER" ]] && command -v mysql >/dev/null 2>&1; then
    export MYSQL_PWD="${DB_PASSWORD}"
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" <scripts/migrate-catalog-background.sql; then
      log "Schema ensure OK (background_image_url)"
    else
      log "WARNING: schema ensure failed — app will retry on first catalog request"
    fi
    unset MYSQL_PWD
  else
    log "Skip schema ensure (mysql CLI or DB_* missing) — app self-heal on request"
  fi
fi

if [[ "$DO_RESTART" -eq 1 ]]; then
  command -v pm2 >/dev/null 2>&1 || die "pm2 not found"
  log "PM2 restart $PM2_NAME (standalone server.js on :$APP_PORT)"
  if [[ ! -f server.js ]]; then
    die "server.js missing after extract — cannot start standalone"
  fi
  if [[ -f scripts/pm2-start-app.sh ]]; then
    chmod +x scripts/pm2-start-app.sh
    bash scripts/pm2-start-app.sh "$ENV_NAME"
  else
    die "scripts/pm2-start-app.sh missing from release — repackage"
  fi
else
  log "Skip restart"
fi

if [[ "$DO_HEALTHCHECK" -eq 1 && "$DO_RESTART" -eq 1 ]]; then
  HEALTH_URL="http://127.0.0.1:${APP_PORT}${HEALTH_PATH}"
  log "Healthcheck $HEALTH_URL (retries)"
  CODE=""
  for attempt in $(seq 1 20); do
    CODE="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 2 --max-time 15 "$HEALTH_URL" 2>/dev/null || true)"
    case "$CODE" in
      200|301|302|307|308)
        log "Healthcheck OK (HTTP $CODE) on attempt $attempt"
        break
        ;;
    esac
    log "  attempt $attempt: HTTP ${CODE:-000} — waiting for Next ready…"
    sleep 2
  done
  case "$CODE" in
    200|301|302|307|308) ;;
    *)
      log "Healthcheck failed (HTTP ${CODE:-000}) — recent PM2 logs:"
      pm2 logs "$PM2_NAME" --lines 80 --nostream 2>&1 || true
      pm2 describe "$PM2_NAME" 2>&1 || true
      die "Healthcheck failed (HTTP ${CODE:-000}). See PM2 logs above."
      ;;
  esac
  ASSET="assets/images/zigma-technologies-logo.png"
  if [[ -f "public/${ASSET}" ]]; then
    AURL="http://127.0.0.1:${APP_PORT}${EXPECT_BASE_PATH}/${ASSET}"
    ACODE=""
    for attempt in $(seq 1 10); do
      ACODE="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 2 --max-time 15 "$AURL" 2>/dev/null || true)"
      [[ "$ACODE" == "200" ]] && break
      sleep 1
    done
    [[ "$ACODE" == "200" ]] || die "Asset healthcheck failed ($AURL → HTTP $ACODE)"
    log "Asset healthcheck OK"
  fi
fi

log "Apply release finished OK ($ENV_NAME)"
