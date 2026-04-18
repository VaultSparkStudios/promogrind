#!/usr/bin/env bash
# check-repo-lock.sh
# Checks whether a target project repo has an active session lock before
# studio-ops performs cross-repo writes. Call before any commit/push to
# a non-studio-ops repo.
#
# Usage:
#   ./scripts/check-repo-lock.sh <repo-local-path> [<repo-local-path> ...]
#
# Exit codes:
#   0 — all clear, no active locks
#   1 — one or more repos are locked (active session in progress)
#
# Also checks for remote divergence (requires network — skipped if offline).
#
# Example:
#   ./scripts/check-repo-lock.sh \
#     "C:/Users/p4cka/documents/development/StatsForge" \
#     "C:/Users/p4cka/documents/development/Velaxis"

set -euo pipefail

LOCK_FILE="context/.session-lock"
LOCKED=()
DIVERGED=()
CHECKED=0

for REPO_PATH in "$@"; do
  CHECKED=$((CHECKED + 1))
  REPO_NAME=$(basename "$REPO_PATH")
  LOCK_PATH="$REPO_PATH/$LOCK_FILE"

  # 1. Lock file check
  if [ -f "$LOCK_PATH" ]; then
    LOCK_CONTENT=$(cat "$LOCK_PATH" 2>/dev/null || echo "unknown")
    echo "⚠  LOCKED: $REPO_NAME — active session detected"
    echo "   Lock: $LOCK_CONTENT"
    LOCKED+=("$REPO_NAME")
    continue
  fi

  # 2. Remote divergence check (optional — skip if not a git repo or offline)
  if [ -d "$REPO_PATH/.git" ]; then
    REMOTE_CHECK=$(git -C "$REPO_PATH" fetch --dry-run 2>&1 || true)
    LOCAL_HEAD=$(git -C "$REPO_PATH" rev-parse HEAD 2>/dev/null || echo "")
    REMOTE_HEAD=$(git -C "$REPO_PATH" rev-parse "@{u}" 2>/dev/null || echo "")
    if [ -n "$LOCAL_HEAD" ] && [ -n "$REMOTE_HEAD" ] && [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
      AHEAD=$(git -C "$REPO_PATH" rev-list --count "@{u}..HEAD" 2>/dev/null || echo 0)
      BEHIND=$(git -C "$REPO_PATH" rev-list --count "HEAD..@{u}" 2>/dev/null || echo 0)
      if [ "$BEHIND" -gt 0 ] 2>/dev/null; then
        echo "⚠  DIVERGED: $REPO_NAME — remote has $BEHIND commit(s) ahead of local"
        DIVERGED+=("$REPO_NAME")
        continue
      fi
    fi
  fi

  echo "✓  CLEAR: $REPO_NAME"
done

echo ""
echo "Checked: $CHECKED repo(s)"

if [ ${#LOCKED[@]} -gt 0 ]; then
  echo "LOCKED (skip these): ${LOCKED[*]}"
fi
if [ ${#DIVERGED[@]} -gt 0 ]; then
  echo "DIVERGED (git pull first): ${DIVERGED[*]}"
fi

BLOCKED=$((${#LOCKED[@]} + ${#DIVERGED[@]}))
if [ "$BLOCKED" -gt 0 ]; then
  echo ""
  echo "ACTION: Do NOT write to locked/diverged repos. Add them to TASK_BOARD ## Blocked."
  exit 1
fi

echo "All repos clear — safe to proceed."
exit 0
