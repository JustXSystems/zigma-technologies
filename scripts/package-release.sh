#!/usr/bin/env bash
# Build a deployable release tarball from a completed `next build` (output: 'standalone').
#
# Usage (after npm ci && npm run build with the correct NEXT_PUBLIC_* for the target env):
#   ./scripts/package-release.sh --env preprod
#   ./scripts/package-release.sh --env prod --out dist/zigma-prod.tgz
#
# The tarball includes:
#   - Next standalone server + traced node_modules
#   - .next/static
#   - public/ (seed assets; excludes private uploads bodies)
#   - scripts/ (db-export/import, apply-release, deploy helpers)
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
INCLUDE_UPLOADS_GITKEEP=1

usage() {
  cat <<'EOF'
Usage: package-release.sh --env preprod|prod [--out path.tgz]

Run from repo root after a successful next build with env-specific NEXT_PUBLIC_*.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV_NAME="${2:-}"; shift 2 ;;
    --out) OUT="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

[[ -n "$ENV_NAME" ]] || { usage; exit 1; }
case "$ENV_NAME" in
  preprod|prod) ;;
  *) echo "ERROR: --env must be preprod or prod" >&2; exit 1 ;;
esac

[[ -f .next/BUILD_ID ]] || { echo "ERROR: .next missing — run npm run build first" >&2; exit 1; }
[[ -d .next/standalone ]] || {
  echo "ERROR: .next/standalone missing — set output:'standalone' in next.config and rebuild" >&2
  exit 1
}

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
OUT="${OUT:-$ROOT/dist/zigma-${ENV_NAME}-${SHA}-${STAMP}.tgz}"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/zigma-release.XXXXXX")"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

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

# Ops scripts — replace any traced/partial scripts dir from standalone.
rm -rf "$STAGE/scripts"
mkdir -p "$STAGE/scripts"
shopt -s nullglob
SCRIPT_FILES=(scripts/*.sh scripts/*.mjs)
shopt -u nullglob
((${#SCRIPT_FILES[@]} > 0)) || die "No scripts/*.sh or scripts/*.mjs to package"
cp -a "${SCRIPT_FILES[@]}" "$STAGE/scripts/"
[[ -f "$STAGE/scripts/apply-release.sh" ]] || die "apply-release.sh missing after staging scripts"
echo "==> Staged ${#SCRIPT_FILES[@]} script file(s) including apply-release.sh"
cp -a package.json package-lock.json "$STAGE/"
[[ -f next.config.ts ]] && cp -a next.config.ts "$STAGE/"
[[ -f .env.example ]] && cp -a .env.example "$STAGE/"

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

mkdir -p "$(dirname "$OUT")"
tar -C "$STAGE" -czf "$OUT" .
BYTES="$(wc -c < "$OUT" | tr -d ' ')"
echo "==> Wrote $OUT ($BYTES bytes)"
echo "==> basePath='${BASE_PATH_VAL:-<empty>}' env=$ENV_NAME sha=$SHA"

# Hard guarantee for the VPS apply step.
# Do not use `tar | grep -q` under pipefail: grep -q closes the pipe early →
# tar "stdout: write error" → false failure even when the file is present.
VERIFY_LIST="$(tar -tzf "$OUT")"
if ! grep -Exq '(\./)?scripts/apply-release\.sh' <<<"$VERIFY_LIST"; then
  echo "ERROR: tarball is missing scripts/apply-release.sh — listing scripts/ entries:" >&2
  grep -E 'scripts/' <<<"$VERIFY_LIST" | head -50 >&2 || true
  exit 1
fi
echo "==> Verified scripts/apply-release.sh is in the tarball"
