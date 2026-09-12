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

# Ops scripts + lockfiles for on-box tools (db:import, apply-release)
mkdir -p "$STAGE/scripts"
cp -a scripts/*.sh scripts/*.mjs "$STAGE/scripts/" 2>/dev/null || true
cp -a package.json package-lock.json next.config.ts "$STAGE/" 2>/dev/null || true
[[ -f .env.example ]] && cp -a .env.example "$STAGE/"

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
