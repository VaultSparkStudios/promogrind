#!/usr/bin/env bash
# Studio OS Enforcer — local run
# Usage: bash scripts/enforcer.sh [repo-name]
# Requires: gh CLI authenticated with access to all VaultSparkStudios repos

set -euo pipefail

ORG="VaultSparkStudios"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="$SCRIPT_DIR/../portfolio/PROJECT_REGISTRY.json"

REQUIRED_FILES=(
  "CLAUDE.md"
  "AGENTS.md"
  "context/PROJECT_BRIEF.md"
  "context/SOUL.md"
  "context/BRAIN.md"
  "context/CURRENT_STATE.md"
  "context/TRUTH_AUDIT.md"
  "context/TASK_BOARD.md"
  "context/LATEST_HANDOFF.md"
  "context/DECISIONS.md"
  "context/SELF_IMPROVEMENT_LOOP.md"
  "context/PORTFOLIO_CARD.md"
  "context/PROJECT_STATUS.json"
  "docs/CREATIVE_DIRECTION_RECORD.md"
  "prompts/start.md"
  "prompts/closeout.md"
  "logs/WORK_LOG.md"
)

TOTAL=${#REQUIRED_FILES[@]}

GREEN="\033[32m"
GOLD="\033[33m"
RED="\033[31m"
RESET="\033[0m"

# Repo list: argument or all from registry
if [ -n "${1:-}" ]; then
  REPOS=("$1")
else
  mapfile -t REPOS < <(jq -r '.projects[] | select(.studioOsApplied == true and .repoExists != false and .status != "archived") | .repo | split("/")[1]' "$REGISTRY")
fi

PASS=0
FAIL=0

echo ""
echo "══════════════════════════════════════"
echo "  VaultSpark Studio OS Enforcer"
echo "  $(date)"
echo "══════════════════════════════════════"
echo ""

for REPO in "${REPOS[@]}"; do
  echo -e "${RESET}── $REPO ──"

  TREE=$(gh api "repos/$ORG/$REPO/git/trees/HEAD?recursive=1" --jq '[.tree[].path]' 2>/dev/null || echo "[]")

  if [ "$TREE" = "[]" ]; then
    echo -e "  ${GOLD}⚠ Could not fetch tree (private / no access)${RESET}"
    continue
  fi

  MISSING=()
  for FILE in "${REQUIRED_FILES[@]}"; do
    IN_TREE=$(echo "$TREE" | jq -r --arg f "$FILE" 'index($f) != null')
    if [ "$IN_TREE" = "false" ]; then
      MISSING+=("$FILE")
    fi
  done

  PRESENT=$(( TOTAL - ${#MISSING[@]} ))

  if [ ${#MISSING[@]} -eq 0 ]; then
    echo -e "  ${GREEN}✓ Fully compliant ($PRESENT/$TOTAL)${RESET}"
    PASS=$(( PASS + 1 ))
  else
    PCT=$(( PRESENT * 100 / TOTAL ))
    if [ "$PCT" -ge 70 ]; then COLOR=$GOLD; else COLOR=$RED; fi
    echo -e "  ${COLOR}✗ $PRESENT/$TOTAL files — missing:${RESET}"
    for F in "${MISSING[@]}"; do
      echo "      - $F"
    done
    FAIL=$(( FAIL + 1 ))
  fi

  # SIL freshness check
  SIL_CONTENT=$(gh api "repos/$ORG/$REPO/contents/context/SELF_IMPROVEMENT_LOOP.md" \
    --jq '.content' 2>/dev/null | base64 -d 2>/dev/null || echo "")

  if [ -n "$SIL_CONTENT" ]; then
    LAST_DATE=$(echo "$SIL_CONTENT" | sed -n 's/^### \([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\).*/\1/p' | head -1 || echo "")
    if [ -n "$LAST_DATE" ] && [ "$LAST_DATE" != "YYYY-MM-DD" ]; then
      TODAY=$(date +%Y-%m-%d)
      DAYS_AGO=$(( ( $(date -d "$TODAY" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$TODAY" +%s) - $(date -d "$LAST_DATE" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$LAST_DATE" +%s) ) / 86400 ))
      if [ "$DAYS_AGO" -gt 14 ]; then
        echo -e "  ${GOLD}⚠ SIL last updated $DAYS_AGO days ago${RESET}"
      fi
    fi
  fi

  echo ""
done

echo "Semantic validation (local files)..."
node "$SCRIPT_DIR/validate-compliance.mjs"

echo "══════════════════════════════════════"
echo -e "  ${GREEN}Compliant: $PASS${RESET}   ${RED}Violations: $FAIL${RESET}"
echo "══════════════════════════════════════"
echo ""
