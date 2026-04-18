#!/usr/bin/env bash

set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
LIMIT="${2:-5}"
SIL_FILE="$ROOT/context/SELF_IMPROVEMENT_LOOP.md"
HANDOFF_FILE="$ROOT/context/LATEST_HANDOFF.md"

echo "Session Replay"
echo ""

if [ -f "$HANDOFF_FILE" ]; then
  echo "Latest handoff:"
  awk 'NR<=40 { print }' "$HANDOFF_FILE"
  echo ""
fi

if [ -f "$SIL_FILE" ]; then
  echo "Recent SIL entries:"
  grep -n "^## 20" "$SIL_FILE" | tail -n "$LIMIT" | cut -d: -f2-
fi
