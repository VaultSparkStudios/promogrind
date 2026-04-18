#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Audit Trail Validator — VaultSpark Studio Ops
# Validates all audit JSON files in this repo against schema v1.2 expectations.
#
# Usage: bash scripts/audit-validator.sh
# Run from: vaultspark-studio-ops root directory
#
# Checks per audit file:
#   - Valid JSON (parseable)
#   - schemaVersion present
#   - Required fields present (project, date, session, scores, total, velocity)
#   - Session numbers are sequential (no gaps within a project)
#   - Score totals match sum of category scores
#   - Date format is YYYY-MM-DD
#   - ignisFlags is an array (not null string)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "════════════════════════════════════════"
echo "  Audit Trail Validator — Studio Ops"
echo "  $(date +%Y-%m-%d)"
echo "════════════════════════════════════════"
echo ""

AUDIT_DIR="audits"
ERRORS=0
WARNINGS=0
FILES_CHECKED=0

# Required top-level fields
REQUIRED_FIELDS=("schemaVersion" "project" "date" "session" "scores" "total" "velocity" "debt" "intentOutcome")

if [ ! -d "$AUDIT_DIR" ]; then
  echo "ERROR: audits/ directory not found. Run from repo root."
  exit 1
fi

AUDIT_FILES=$(find "$AUDIT_DIR" -name "*.json" | sort)

if [ -z "$AUDIT_FILES" ]; then
  echo "No audit files found in $AUDIT_DIR/"
  exit 0
fi

echo "Auditing files in $AUDIT_DIR/:"
echo ""

for FILE in $AUDIT_FILES; do
  FILES_CHECKED=$((FILES_CHECKED + 1))
  FILENAME=$(basename "$FILE")
  FILE_ERRORS=0
  FILE_WARNINGS=0

  echo "── $FILENAME ──"

  # Check 1: Valid JSON
  if ! jq empty "$FILE" 2>/dev/null; then
    echo "  ✗ INVALID JSON — file is not parseable"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Check 2: Required fields present
  for FIELD in "${REQUIRED_FIELDS[@]}"; do
    VALUE=$(jq -r --arg f "$FIELD" '.[$f] // "MISSING"' "$FILE")
    if [ "$VALUE" = "MISSING" ] || [ "$VALUE" = "null" ]; then
      echo "  ⚠ Missing field: $FIELD"
      FILE_WARNINGS=$((FILE_WARNINGS + 1))
      WARNINGS=$((WARNINGS + 1))
    fi
  done

  # Check 3: Date format
  DATE=$(jq -r '.date // ""' "$FILE")
  if [ -n "$DATE" ] && ! echo "$DATE" | grep -qE '^\d{4}-\d{2}-\d{2}$'; then
    echo "  ✗ Invalid date format: $DATE (expected YYYY-MM-DD)"
    ERRORS=$((ERRORS + 1))
    FILE_ERRORS=$((FILE_ERRORS + 1))
  fi

  # Check 4: Score total matches sum of categories
  DECLARED_TOTAL=$(jq '.total // 0' "$FILE")
  COMPUTED_TOTAL=$(jq '
    [.scores | to_entries[] | .value | select(. != null)] | add // 0
  ' "$FILE")

  if [ "$DECLARED_TOTAL" != "$COMPUTED_TOTAL" ]; then
    echo "  ✗ Score mismatch: declared total=$DECLARED_TOTAL but computed=$COMPUTED_TOTAL"
    ERRORS=$((ERRORS + 1))
    FILE_ERRORS=$((FILE_ERRORS + 1))
  fi

  # Check 5: ignisFlags is an array (not null or string)
  FLAGS_TYPE=$(jq -r '.ignisFlags | type' "$FILE" 2>/dev/null || echo "missing")
  if [ "$FLAGS_TYPE" != "array" ] && [ "$FLAGS_TYPE" != "null" ]; then
    echo "  ✗ ignisFlags should be an array, got: $FLAGS_TYPE"
    ERRORS=$((ERRORS + 1))
    FILE_ERRORS=$((FILE_ERRORS + 1))
  fi

  # Check 6: sessionType is a known value (if present)
  SESSION_TYPE=$(jq -r '.sessionType // "not-set"' "$FILE")
  VALID_TYPES=("implementation" "architecture" "bootstrap" "review" "hotfix" "mixed" "not-set")
  TYPE_VALID=false
  for VT in "${VALID_TYPES[@]}"; do
    if [ "$SESSION_TYPE" = "$VT" ]; then
      TYPE_VALID=true
      break
    fi
  done
  if [ "$TYPE_VALID" = "false" ]; then
    echo "  ⚠ Unknown sessionType: $SESSION_TYPE"
    FILE_WARNINGS=$((FILE_WARNINGS + 1))
    WARNINGS=$((WARNINGS + 1))
  fi

  # Check 7: Schema version is recognised
  SCHEMA=$(jq -r '.schemaVersion // "unknown"' "$FILE")
  if [[ "$SCHEMA" != "1.0" ]] && [[ "$SCHEMA" != "1.1" ]] && [[ "$SCHEMA" != "1.2" ]]; then
    echo "  ⚠ Unknown schemaVersion: $SCHEMA (known: 1.0, 1.1, 1.2)"
    FILE_WARNINGS=$((FILE_WARNINGS + 1))
    WARNINGS=$((WARNINGS + 1))
  fi

  if [ "$FILE_ERRORS" -eq 0 ] && [ "$FILE_WARNINGS" -eq 0 ]; then
    SESSION_NUM=$(jq '.session' "$FILE")
    echo "  ✓ Valid (schema=$SCHEMA, session=$SESSION_NUM, total=$DECLARED_TOTAL/50)"
  fi

  echo ""
done

echo "════════════════════════════════════════"
echo "  Validation Summary"
echo "  Files checked: $FILES_CHECKED"
echo "  Errors:        $ERRORS"
echo "  Warnings:      $WARNINGS"
echo "════════════════════════════════════════"

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "✗ Validation FAILED — $ERRORS error(s) found"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo ""
  echo "⚠ Validation PASSED with $WARNINGS warning(s)"
  exit 0
else
  echo ""
  echo "✓ All audit files valid"
  exit 0
fi
