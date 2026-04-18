#!/usr/bin/env bash
# push-voidfall-repos.sh — Push Voidfall repos to GitHub after agent commits.
#
# The agent (running in a sandboxed environment) cannot push to private repos
# because the secrets/github-public_repo.txt token only has public_repo scope.
# Run this script locally to push the committed changes.
#
# Usage:
#   bash scripts/push-voidfall-repos.sh
#
# Or with a custom token (if your local git credentials aren't set up):
#   GH_TOKEN=ghp_xxxx bash scripts/push-voidfall-repos.sh

set -e

BASE="$(cd "$(dirname "$0")/.." && pwd)"

# Adjust these paths if your local layout differs
VOIDFALL_BUILD="$BASE/../voidfall-build"
VOIDFALL_COMPANION="$BASE/../voidfall-companion"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  VaultSpark — Voidfall Repo Push                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

push_repo() {
  local path="$1"
  local name="$2"
  local branch="${3:-master}"

  if [ ! -d "$path" ]; then
    echo "⚠  $name not found at $path — skipping"
    return
  fi

  echo "── $name ─────────────────────────────────────────"
  cd "$path"
  git log --oneline -3
  echo ""

  if [ -n "$GH_TOKEN" ]; then
    REMOTE=$(git remote get-url origin | sed "s|https://|https://${GH_TOKEN}@|")
    git push "$REMOTE" "$branch"
  else
    git push origin "$branch"
  fi

  echo "✓ $name pushed"
  echo ""
}

push_repo "$VOIDFALL_BUILD"    "voidfall-build (The Scriptorium)"  "master"
push_repo "$VOIDFALL_COMPANION" "voidfall-companion"                "master"

echo "╔══════════════════════════════════════════════════╗"
echo "║  All done. Next steps:                           ║"
echo "║                                                   ║"
echo "║  1. vercel.com/new → Import voidfall-build       ║"
echo "║     → Name: The Scriptorium                      ║"
echo "║     → Add AUTH_USER + AUTH_PASS env vars         ║"
echo "║     → Add domain: scriptorium.vaultsparkstudios  ║"
echo "║                                                   ║"
echo "║  2. vercel.com/new → Import voidfall-companion   ║"
echo "║     → Name: Voidfall Companion                   ║"
echo "║     → Add VITE_SUPABASE_URL + ANON_KEY (optional)║"
echo "║     → Add domain: companion.vaultsparkstudios    ║"
echo "║                                                   ║"
echo "║  3. Add VERCEL_TOKEN + VERCEL_ORG_ID to both     ║"
echo "║     repos' GitHub Secrets for CI/CD auto-deploy  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
