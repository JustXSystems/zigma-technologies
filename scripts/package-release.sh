#!/usr/bin/env bash
# Build a deployable release tarball from a completed `next build` (output: 'standalone').
#
# Usage (after npm ci && npm run build with the correct NEXT_PUBLIC_* for the target env):
#   ./scripts/package-release.sh --env preprod --stage-dir dist/zigma-preprod-stage
#   ./scripts/package-release.sh --env prod --stage-dir dist/zigma-prod-stage --out dist/zigma-prod.tgz
#
# Hot path for GitHub→VPS: rsync --stage-dir (delta). Optional --out .tgz is for Actions
# artifacts / rollback only — do not SCP the full tarball every deploy.
#
# Stage / tarball includes:
#   - Next standalone server + traced node_modules
#   - .next/static
#   - public/ (seed assets; excludes private uploads bodies)
#   - scripts/ (*.sh, *.mjs, *.sql — apply-release, db tools, migrations)
#   - package.json / package-lock.json / next.config.ts / .env.example
#   - release-manifest.json
#
# Does NOT include: .env, node_modules (full), storage/exports, private resumes/documents.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

die() { echo "ERROR: $*" >&2; exit 1; }

ENV_NAME=""
OUT=""
STAGE_DIR=""
INCLUDE_UPLOADS_GITKEEP=1

usage() {
  cat <<'EOF'
Usage: package-release.sh --env preprod|prod [--stage-dir DIR] [--out path.tgz]

Run from repo root after a successful next build with env-specific NEXT_PUBLIC_*.
Prefer --stage-dir for delta rsync deploys; --out is optional (rollback artifact).
At least one of --stage-dir or --out is required.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV_NAME="${2:-}"; shift 2 ;;
    --out) OUT="${2:-}"; shift 2 ;;
    --stage-dir) STAGE_DIR="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

[[ -n "$ENV_NAME" ]] || { usage; exit 1; }
case "$ENV_NAME" in
  preprod|prod) ;;
  *) echo "ERROR: --env must be preprod or prod" >&2; exit 1 ;;
esac
[[ -n "$STAGE_DIR" || -n "$OUT" ]] || { usage; die "need --stage-dir and/or --out"; }

[[ -f .next/BUILD_ID ]] || { echo "ERROR: .next missing — run npm run build first" >&2; exit 1; }
[[ -d .next/standalone ]] || {
  echo "ERROR: .next/standalone missing — set output:'standalone' in next.config and rebuild" >&2
  exit 1
}

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/zigma-release.XXXXXX")"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT
if [[ -n "$STAGE_DIR" && "$STAGE_DIR" != /* && "$STAGE_DIR" != [A-Za-z]:* ]]; then
  STAGE_DIR="$ROOT/$STAGE_DIR"
fi
if [[ -n "$OUT" && "$OUT" != /* && "$OUT" != [A-Za-z]:* ]]; then
  OUT="$ROOT/$OUT"
fi

echo "==> Staging release ($ENV_NAME) → $STAGE"
mkdir -p "$STAGE"

# Standalone server tree (includes minimal node_modules + server.js)
cp -a .next/standalone/. "$STAGE/"

# Never ship secrets if a local/contaminated standalone copied .env
rm -f "$STAGE/.env"
rm -f "$STAGE"/.env.local "$STAGE"/.env.* 2>/dev/null || true
# Keep .env.example if present
find "$STAGE" -maxdepth 3 -type f -name '.env' -delete 2>/dev/null || true
find "$STAGE" -maxdepth 3 -type f -name '.env.*' ! -name '.env.example' -delete 2>/dev/null || true

# Some Next layouts nest server.js (e.g. monorepo / package name). Flatten to STAGE root.
if [[ ! -f "$STAGE/server.js" ]]; then
  NESTED="$(find "$STAGE" -maxdepth 4 -type f -name server.js | head -n1 || true)"
  [[ -n "$NESTED" ]] || die "standalone server.js not found under $STAGE"
  NEST_DIR="$(dirname "$NESTED")"
  echo "==> Flattening nested standalone from $NEST_DIR"
  # Move nested tree up without clobbering accidentally; prefer rsync then cleanup
  rsync -a "$NEST_DIR"/ "$STAGE"/
  # Remove empty nest path if it was a subdirectory of STAGE
  case "$NEST_DIR" in
    "$STAGE"/*) rm -rf "$NEST_DIR" ;;
  esac
[[ -f "$STAGE/server.js" ]] || die "server.js still missing after flatten"
fi

# Drop non-runtime trees Next may have traced into standalone (mobile app, source, etc.)
rm -rf \
  "$STAGE/apps" \
  "$STAGE/src" \
  "$STAGE/storage" \
  "$STAGE/.git" \
  "$STAGE/.github" \
  "$STAGE/.cursor" \
  "$STAGE/coverage" \
  "$STAGE/docs" \
  "$STAGE/tests" \
  "$STAGE/__tests__"

# Static assets Next does not copy into standalone by default
mkdir -p "$STAGE/.next"
cp -a .next/static "$STAGE/.next/static"

# Public seed assets (never ship private form uploads)
if [[ -d public ]]; then
  mkdir -p "$STAGE/public"
  # Copy everything under public except private upload bodies
  rsync -a \
    --exclude 'assets/uploads/resumes/***' \
    --exclude 'assets/uploads/documents/***' \
    public/ "$STAGE/public/"
  mkdir -p \
    "$STAGE/public/assets/uploads/resumes" \
    "$STAGE/public/assets/uploads/documents"
  # keep gitkeeps if present
  [[ -f public/assets/uploads/resumes/.gitkeep ]] && cp -a public/assets/uploads/resumes/.gitkeep "$STAGE/public/assets/uploads/resumes/" || true
  [[ -f public/assets/uploads/documents/.gitkeep ]] && cp -a public/assets/uploads/documents/.gitkeep "$STAGE/public/assets/uploads/documents/" || true
fi

# Ops scripts + SQL migrations — replace any traced/partial scripts dir from standalone.
# MUST include *.sql: apply-release runs migrate-catalog-background.sql on every deploy.
rm -rf "$STAGE/scripts"
mkdir -p "$STAGE/scripts"
shopt -s nullglob
SCRIPT_FILES=(scripts/*.sh scripts/*.mjs scripts/*.sql)
shopt -u nullglob
((${#SCRIPT_FILES[@]} > 0)) || die "No scripts/*.{sh,mjs,sql} to package"
cp -a "${SCRIPT_FILES[@]}" "$STAGE/scripts/"
[[ -f "$STAGE/scripts/apply-release.sh" ]] || die "apply-release.sh missing after staging scripts"
[[ -f "$STAGE/scripts/migrate-catalog-background.sql" ]] || die "migrate-catalog-background.sql missing after staging scripts"
[[ -f "$STAGE/scripts/schema.sql" ]] || die "schema.sql missing after staging scripts"
echo "==> Staged ${#SCRIPT_FILES[@]} scripts/ files (sh+mjs+sql), including apply-release + migrations"
cp -a package.json package-lock.json "$STAGE/"
[[ -f next.config.ts ]] && cp -a next.config.ts "$STAGE/"
[[ -f .env.example ]] && cp -a .env.example "$STAGE/"

# Meridian SEO ops toolkit — NOT part of the website blast radius by default.
# Size note: Meridian source is ~1 MiB; the ~100 MiB tarball is Next standalone.
# Ship Meridian via workflow "Deploy Meridian" → /opt/zigma-meridian (set MERIDIAN_HOME).
# Opt-in only: SHIP_MERIDIAN=1 ./scripts/package-release.sh --env prod ...
mkdir -p "$STAGE/storage/meridian"
if [[ "${SHIP_MERIDIAN:-0}" == "1" && -d packages/meridian ]]; then
  mkdir -p "$STAGE/packages"
  rsync -a \
    --exclude 'out/' \
    --exclude 'node_modules/' \
    --exclude '.git/' \
    --exclude 'coverage/' \
    --exclude '**/*.test.mjs' \
    --exclude '**/*.test.js' \
    packages/meridian/ "$STAGE/packages/meridian/"
  [[ -f "$STAGE/packages/meridian/bin/meridian.mjs" ]] || die "packages/meridian missing after staging"
  echo "==> Staged packages/meridian (SHIP_MERIDIAN=1 — prefer separate Deploy Meridian workflow)"
else
  echo "==> Skipped packages/meridian in website tarball (deploy Meridian separately; SHIP_MERIDIAN=1 to bundle)"
fi

# Ops scripts (db:import / db:export) need a root-resolvable mysql2 tree.
# Do NOT hand-copy dep names — versions drift (e.g. sql-escaper). Install the
# package into the stage so npm pulls the full runtime dependency tree.
echo "==> Ensuring mysql2 for ops scripts (db:import on VPS)"
[[ -f "$STAGE/package.json" ]] || die "package.json missing from stage"
[[ -d node_modules/mysql2 ]] || die "node_modules/mysql2 missing — run npm ci before package-release"
MYSQL2_VER="$(node -p "require('./node_modules/mysql2/package.json').version")"
npm install --prefix "$STAGE" "mysql2@${MYSQL2_VER}" \
  --omit=dev --no-audit --no-fund --no-save --no-package-lock --prefer-offline \
  || die "npm install mysql2@${MYSQL2_VER} into release stage failed"
(
  cd "$STAGE"
  node --input-type=module -e "import('mysql2/promise').then(() => console.log('mysql2 resolve OK')).catch((e) => { console.error(e); process.exit(1) })"
) || die "mysql2 does not resolve from staged release (ops scripts would fail on VPS)"

BASE_PATH_VAL="$(node -e "console.log(require('./.next/routes-manifest.json').basePath||'')")"
cat > "$STAGE/release-manifest.json" <<EOF
{
  "app": "zigma-technologies",
  "env": "$ENV_NAME",
  "gitSha": "$(git rev-parse HEAD 2>/dev/null || echo unknown)",
  "gitShort": "$SHA",
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "basePath": "$BASE_PATH_VAL",
  "standalone": true,
  "node": "$(node -v)"
}
EOF

if [[ "$ENV_NAME" == "preprod" && "$BASE_PATH_VAL" != "/zigma-technologies" ]]; then
  echo "ERROR: PreProd release basePath must be /zigma-technologies (got '${BASE_PATH_VAL}')" >&2
  exit 1
fi
if [[ "$ENV_NAME" == "prod" && -n "$BASE_PATH_VAL" ]]; then
  echo "ERROR: Prod release must have empty basePath (got '${BASE_PATH_VAL}')" >&2
  exit 1
fi

require_in_tree() {
  local root="$1" rel="$2"
  [[ -e "$root/$rel" ]] || die "release missing required path: $rel (under $root)"
}
require_in_tree "$STAGE" "scripts/apply-release.sh"
require_in_tree "$STAGE" "scripts/migrate-catalog-background.sql"
require_in_tree "$STAGE" "scripts/schema.sql"
require_in_tree "$STAGE" "server.js"
require_in_tree "$STAGE" ".next/BUILD_ID"
require_in_tree "$STAGE" ".next/static"
if [[ "${SHIP_MERIDIAN:-0}" == "1" ]]; then
  require_in_tree "$STAGE" "packages/meridian/bin/meridian.mjs"
fi

if [[ -n "$STAGE_DIR" ]]; then
  mkdir -p "$STAGE_DIR"
  # Mirror into a durable stage dir for delta rsync (GitHub → VPS).
  rsync -a --delete "$STAGE"/ "$STAGE_DIR"/
  STAGE_BYTES="$(du -sb "$STAGE_DIR" 2>/dev/null | awk '{print $1}' || echo 0)"
  echo "==> Wrote stage dir $STAGE_DIR ($(numfmt --to=iec-i --suffix=B "$STAGE_BYTES" 2>/dev/null || echo "${STAGE_BYTES} bytes"))"
fi

if [[ -n "$OUT" ]]; then
  mkdir -p "$(dirname "$OUT")"
  # Optional rollback / Actions artifact — not the live deploy hot path.
  GZIP=-9 tar -C "$STAGE" -czf "$OUT" .
  BYTES="$(wc -c < "$OUT" | tr -d ' ')"
  echo "==> Wrote $OUT ($BYTES bytes / $(numfmt --to=iec-i --suffix=B "$BYTES" 2>/dev/null || true)) [artifact only]"
  if (( BYTES > 120000000 )); then
    echo "==> NOTE: tarball > 120 MiB — prefer rsync --stage-dir for live deploys." >&2
  fi
fi

echo "==> basePath='${BASE_PATH_VAL:-<empty>}' env=$ENV_NAME sha=$SHA"
echo "==> Verified server.js, .next/BUILD_ID, .next/static, apply-release + SQL in release"
