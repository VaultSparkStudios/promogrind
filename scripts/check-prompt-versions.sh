#!/usr/bin/env bash
# check-prompt-versions.sh — Local prompt version drift detector
#
# Compares template-version headers in studio-ops prompts vs docs/templates/ vs child repos.
# Exits non-zero if any drift is detected.
#
# Usage:
#   ./scripts/check-prompt-versions.sh          # check all projects
#   ./scripts/check-prompt-versions.sh --fail   # exit 1 on any drift

set -euo pipefail

STUDIO_OPS_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

FAIL_ON_DRIFT=false
for arg in "$@"; do
  [ "$arg" = "--fail" ] && FAIL_ON_DRIFT=true
done

extract_version() {
  local file="$1"
  local marker="$2"
  sed -n "s/^<!-- $marker: \\([0-9.]*\\) -->$/\\1/p" "$file" 2>/dev/null | head -1
}

# ── Canonical sources ─────────────────────────────────────────────────────────
TEMPLATE_START="$STUDIO_OPS_ROOT/docs/templates/project-system/START_PROMPT.template.md"
TEMPLATE_CLOSEOUT="$STUDIO_OPS_ROOT/docs/templates/project-system/CLOSEOUT_PROMPT.template.md"
PROMPT_START="$STUDIO_OPS_ROOT/prompts/start.md"
PROMPT_CLOSEOUT="$STUDIO_OPS_ROOT/prompts/closeout.md"

CANONICAL_START=$(extract_version "$TEMPLATE_START" "template-version")
CANONICAL_CLOSEOUT=$(extract_version "$TEMPLATE_CLOSEOUT" "template-version")
CANONICAL_START=${CANONICAL_START:-unknown}
CANONICAL_CLOSEOUT=${CANONICAL_CLOSEOUT:-unknown}

echo "════════════════════════════════════════════════"
echo "  Prompt Version Drift Detector — Studio OS"
echo "  Canonical: start=$CANONICAL_START  closeout=$CANONICAL_CLOSEOUT"
echo "════════════════════════════════════════════════"
echo ""

DRIFT=0
MISSING=0

# ── Step 1: Check that studio-ops prompts/ match docs/templates/ ──────────────
echo "── studio-ops internal sync ──"

LIVE_START=$(extract_version "$PROMPT_START" "template-version")
LIVE_CLOSEOUT=$(extract_version "$PROMPT_CLOSEOUT" "template-version")
LIVE_START=${LIVE_START:-none}
LIVE_CLOSEOUT=${LIVE_CLOSEOUT:-none}

if [ "$LIVE_START" != "$CANONICAL_START" ]; then
  echo "  ⚠  prompts/start.md: v$LIVE_START (template is v$CANONICAL_START) — OUT OF SYNC"
  DRIFT=$((DRIFT + 1))
else
  echo "  ✓  prompts/start.md: v$LIVE_START"
fi

if [ "$LIVE_CLOSEOUT" != "$CANONICAL_CLOSEOUT" ]; then
  echo "  ⚠  prompts/closeout.md: v$LIVE_CLOSEOUT (template is v$CANONICAL_CLOSEOUT) — OUT OF SYNC"
  DRIFT=$((DRIFT + 1))
else
  echo "  ✓  prompts/closeout.md: v$LIVE_CLOSEOUT"
fi

echo ""

# ── Step 2: Check all child project repos ─────────────────────────────────────
echo "── child repos (local filesystem) ──"

while IFS=$'\t' read -r SLUG NAME LOCAL_PATH; do
  [ -n "${SLUG:-}" ] || continue
  [ "$SLUG" = "studio-ops" ] && continue

  if [ -z "$LOCAL_PATH" ] || [ ! -d "$LOCAL_PATH" ]; then
    echo "  —  $NAME ($SLUG): localPath not accessible — skipping"
    MISSING=$((MISSING + 1))
    continue
  fi

  START_FILE="$LOCAL_PATH/prompts/start.md"
  CLOSEOUT_FILE="$LOCAL_PATH/prompts/closeout.md"
  REPO_DRIFT=0

  if [ -f "$START_FILE" ]; then
    VER=$(extract_version "$START_FILE" "template-version")
    VER=${VER:-none}
    if [ "$VER" != "$CANONICAL_START" ]; then
      echo "  ⚠  $NAME ($SLUG): start.md v$VER → v$CANONICAL_START"
      DRIFT=$((DRIFT + 1))
      REPO_DRIFT=$((REPO_DRIFT + 1))
    fi
  else
    echo "  ✗  $NAME ($SLUG): start.md MISSING"
    MISSING=$((MISSING + 1))
    REPO_DRIFT=$((REPO_DRIFT + 1))
  fi

  if [ -f "$CLOSEOUT_FILE" ]; then
    VER=$(extract_version "$CLOSEOUT_FILE" "template-version")
    VER=${VER:-none}
    if [ "$VER" != "$CANONICAL_CLOSEOUT" ]; then
      echo "  ⚠  $NAME ($SLUG): closeout.md v$VER → v$CANONICAL_CLOSEOUT"
      DRIFT=$((DRIFT + 1))
      REPO_DRIFT=$((REPO_DRIFT + 1))
    fi
  else
    echo "  ✗  $NAME ($SLUG): closeout.md MISSING"
    MISSING=$((MISSING + 1))
    REPO_DRIFT=$((REPO_DRIFT + 1))
  fi

  if [ "$REPO_DRIFT" -eq 0 ]; then
    echo "  ✓  $NAME ($SLUG): v$CANONICAL_START / v$CANONICAL_CLOSEOUT"
  fi

done < <(node -e "
  const fs = require('fs');
  const reg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  reg.projects
    .filter(p => p.studioOsApplied && p.status !== 'archived')
    .forEach(p => console.log([p.slug, p.name, p.localPath || ''].join('\t')));
" "$STUDIO_OPS_ROOT/portfolio/PROJECT_REGISTRY.json")

echo ""
echo "════════════════════════════════════════════════"
echo "  Summary"
echo "  Drifted: $DRIFT file(s)"
echo "  Missing/inaccessible: $MISSING"
if [ "$DRIFT" -eq 0 ] && [ "$MISSING" -eq 0 ]; then
  echo "  Status: ALL CURRENT ✓"
else
  echo "  Status: DRIFT DETECTED"
  echo "  Fix: run scripts/propagate-templates.sh --apply"
fi
echo "════════════════════════════════════════════════"

if $FAIL_ON_DRIFT && [ "$DRIFT" -gt 0 ]; then
  exit 1
fi
