#!/usr/bin/env bash

set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT_STATUS="$ROOT/context/PROJECT_STATUS.json"
TRUTH_AUDIT="$ROOT/context/TRUTH_AUDIT.md"
CURRENT_STATE="$ROOT/context/CURRENT_STATE.md"
LATEST_HANDOFF="$ROOT/context/LATEST_HANDOFF.md"
START_PROMPT="$ROOT/prompts/start.md"
CLOSEOUT_PROMPT="$ROOT/prompts/closeout.md"
START_TEMPLATE="$ROOT/docs/templates/project-system/START_PROMPT.template.md"
CLOSEOUT_TEMPLATE="$ROOT/docs/templates/project-system/CLOSEOUT_PROMPT.template.md"

normalized_equal() {
  local left="$1"
  local right="$2"
  cmp -s \
    <(grep -v '^<!-- synced-from:' "$left") \
    <(grep -v '^<!-- synced-from:' "$right")
}

if [ ! -f "$PROJECT_STATUS" ]; then
  echo "Missing $PROJECT_STATUS" >&2
  exit 1
fi

PROJECT_NAME=$(node -e "const fs=require('fs'); const s=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); process.stdout.write(s.name || 'Unknown Project');" "$PROJECT_STATUS")
TODAY=$(date +%Y-%m-%d)

SCHEMA_STATUS="green"
PROMPT_STATUS="green"
DERIVED_STATUS="green"
HANDOFF_STATUS="green"
CONTRADICTION_STATUS="green"

CONTRADICTIONS=()

if node -e "const fs=require('fs'); const s=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); process.exit(Object.prototype.hasOwnProperty.call(s,'stage') ? 0 : 1)" "$PROJECT_STATUS"; then
  SCHEMA_STATUS="red"
  CONTRADICTIONS+=("`context/PROJECT_STATUS.json` still emits deprecated \`stage\`.")
fi

if ! normalized_equal "$START_PROMPT" "$START_TEMPLATE"; then
  PROMPT_STATUS="red"
  CONTRADICTIONS+=("`prompts/start.md` and `docs/templates/project-system/START_PROMPT.template.md` are out of sync.")
fi

if ! normalized_equal "$CLOSEOUT_PROMPT" "$CLOSEOUT_TEMPLATE"; then
  PROMPT_STATUS="red"
  CONTRADICTIONS+=("`prompts/closeout.md` and `docs/templates/project-system/CLOSEOUT_PROMPT.template.md` are out of sync.")
fi

if [ ! -f "$LATEST_HANDOFF" ]; then
  HANDOFF_STATUS="red"
  CONTRADICTIONS+=("`context/LATEST_HANDOFF.md` is missing.")
fi

if [ ! -f "$CURRENT_STATE" ]; then
  DERIVED_STATUS="red"
  CONTRADICTIONS+=("`context/CURRENT_STATE.md` is missing.")
fi

overall="green"
for status in "$SCHEMA_STATUS" "$PROMPT_STATUS" "$DERIVED_STATUS" "$HANDOFF_STATUS" "$CONTRADICTION_STATUS"; do
  if [ "$status" = "red" ]; then
    overall="red"
    break
  fi
  if [ "$status" = "yellow" ]; then
    overall="yellow"
  fi
done

score_for() {
  case "$1" in
    green) echo 5 ;;
    yellow) echo 3 ;;
    red) echo 1 ;;
    *) echo 0 ;;
  esac
}

schema_score=$(score_for "$SCHEMA_STATUS")
prompt_score=$(score_for "$PROMPT_STATUS")
derived_score=$(score_for "$DERIVED_STATUS")
handoff_score=$(score_for "$HANDOFF_STATUS")
contradiction_score=$(score_for "$CONTRADICTION_STATUS")
total=$((schema_score + prompt_score + derived_score + handoff_score + contradiction_score))

if [ ${#CONTRADICTIONS[@]} -eq 0 ]; then
  CONTRADICTIONS=("None recorded.")
fi

{
  echo "<!-- truth-audit-version: 1.0 -->"
  echo "# Truth Audit — $PROJECT_NAME"
  echo
  echo "Last reviewed: $TODAY"
  echo "Overall status: $overall"
  echo "Next action: Resolve any red contradiction before new protocol surface area is added."
  echo
  echo "---"
  echo
  echo "## Source Hierarchy"
  echo
  echo "1. \`context/PROJECT_STATUS.json\`"
  echo "2. \`context/LATEST_HANDOFF.md\`"
  echo "3. \`context/CURRENT_STATE.md\`"
  echo "4. Derived founder-facing Markdown"
  echo
  echo "---"
  echo
  echo "## Protocol Genome (/25)"
  echo
  echo "| Dimension | Score | Notes |"
  echo "|---|---|---|"
  echo "| Schema alignment | $schema_score | |"
  echo "| Prompt/template alignment | $prompt_score | |"
  echo "| Derived-view freshness | $derived_score | |"
  echo "| Handoff continuity | $handoff_score | |"
  echo "| Contradiction density | $contradiction_score | |"
  echo "| **Total** | **$total / 25** | |"
  echo
  echo "---"
  echo
  echo "## Contradictions"
  echo
  for contradiction in "${CONTRADICTIONS[@]}"; do
    echo "- $contradiction"
  done
} > "$TRUTH_AUDIT"

echo "Wrote $(realpath --relative-to="$ROOT" "$TRUTH_AUDIT" 2>/dev/null || echo "context/TRUTH_AUDIT.md")"
echo "overall=$overall total=$total"
