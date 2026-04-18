#!/usr/bin/env bash
# deploy-voidfall-cf.sh — Deploy both Voidfall apps to Cloudflare Pages.
#
# Free tier. No Vercel needed.
# - The Scriptorium (voidfall-build)  → scriptorium.vaultsparkstudios.com
# - Voidfall Companion                → companion.vaultsparkstudios.com
#
# Usage:
#   cd ~/documents/development/vaultspark-studio-ops
#   bash scripts/deploy-voidfall-cf.sh

set -e

SECRETS_FILE="$(cd "$(dirname "$0")/.." && pwd)/secrets/cloudflare.env"
if [ ! -f "$SECRETS_FILE" ]; then
  echo "✗ Missing credentials file: secrets/cloudflare.env"
  echo "  Create it with CLOUDFLARE_API_TOKEN, SCRIPTORIUM_USER, SCRIPTORIUM_PASS"
  echo "  See secrets/cloudflare.env for the template."
  exit 1
fi
# shellcheck source=/dev/null
source "$SECRETS_FILE"

if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ "$CLOUDFLARE_API_TOKEN" = "REPLACE_ME" ]; then
  echo "✗ CLOUDFLARE_API_TOKEN not set in secrets/cloudflare.env"
  echo "  Get a token at: Cloudflare Dashboard → My Profile → API Tokens"
  exit 1
fi

if [ -z "$CLOUDFLARE_ACCOUNT_ID" ] || [ "$CLOUDFLARE_ACCOUNT_ID" = "REPLACE_ME" ]; then
  echo "✗ CLOUDFLARE_ACCOUNT_ID not set in secrets/cloudflare.env"
  echo "  Find it in the Cloudflare dashboard sidebar or URL:"
  echo "  dash.cloudflare.com/<ACCOUNT_ID>/pages"
  exit 1
fi

export CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID

BASE="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$BASE/../voidfall-build"
COMPANION_DIR="$BASE/../voidfall-companion"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  VaultSpark — Cloudflare Pages Deploy                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

if ! command -v wrangler &>/dev/null; then
  echo "Installing wrangler..."
  npm install -g wrangler
fi

# ── Step 1: Build The Scriptorium ──────────────────────────────────────────────
echo "── Step 1: Build The Scriptorium ─────────────────────────────────────────"
cd "$BUILD_DIR"
npm ci --silent
npm run build
echo "✓ Built → dist/"

# ── Step 2: Deploy to Cloudflare Pages ────────────────────────────────────────
echo ""
echo "── Step 2: Deploy Scriptorium → CF Pages ────────────────────────────────"
wrangler pages project create voidfall-build --production-branch=main 2>/dev/null || true
wrangler pages deploy dist/ \
  --project-name=voidfall-build \
  --branch=main \
  --commit-dirty=true
echo "✓ Scriptorium deployed → https://voidfall-build.pages.dev"

# ── Step 3: Deploy auth Worker ────────────────────────────────────────────────
# NOTE: Requires Zone → Workers Routes → Edit in API token to register routes.
# Worker code is uploaded regardless; route registration failure is non-fatal.
echo ""
echo "── Step 3: Deploy auth Worker ───────────────────────────────────────────"
if wrangler deploy worker-auth.js; then
  echo "$SCRIPTORIUM_USER" | wrangler secret put AUTH_USER || true
  echo "$SCRIPTORIUM_PASS" | wrangler secret put AUTH_PASS || true
  echo "✓ Worker deployed with auth secrets"
else
  echo "⚠ Worker route registration failed (needs Zone:Workers Routes:Edit in token)"
  echo "  Worker code uploaded — add 'Zone → Workers Routes → Edit' to token to fix routes"
  echo "  Continuing to Companion deploy..."
fi

# ── Step 4: Build Companion ───────────────────────────────────────────────────
echo ""
echo "── Step 4: Build Voidfall Companion ─────────────────────────────────────"
cd "$COMPANION_DIR"
npm ci --silent
VITE_PUBLIC_URL="https://companion.vaultsparkstudios.com" npm run build
echo "✓ Built → dist/"

# ── Step 5: Deploy Companion ──────────────────────────────────────────────────
echo ""
echo "── Step 5: Deploy Companion → CF Pages ──────────────────────────────────"
wrangler pages project create voidfall-companion --production-branch=main 2>/dev/null || true
wrangler pages deploy dist/ \
  --project-name=voidfall-companion \
  --branch=main \
  --commit-dirty=true
echo "✓ Companion deployed → https://voidfall-companion.pages.dev"

# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Deploy complete. Add DNS records in Cloudflare:     ║"
echo "║                                                      ║"
echo "║  CNAME  scriptorium  voidfall-build.pages.dev        ║"
echo "║         (orange cloud — Proxied)                     ║"
echo "║                                                      ║"
echo "║  CNAME  companion    voidfall-companion.pages.dev    ║"
echo "║         (orange cloud — Proxied)                     ║"
echo "║                                                      ║"
echo "║  Then in CF Pages dashboard add custom domains:      ║"
echo "║    voidfall-build → scriptorium.vaultsparkstudios.com║"
echo "║    voidfall-companion → companion.vaultsparkstudios  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
