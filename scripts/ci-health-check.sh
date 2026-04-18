#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CI Health Check — VaultSpark Studio Ops
# Surfaces failing CI repos across all registered VaultSparkStudios projects.
#
# Usage: bash scripts/ci-health-check.sh
# Requires: gh CLI authenticated with read access to VaultSparkStudios org
#
# Output:
#   - Lists all repos with failing CI workflows
#   - Shows the workflow name and last failure date
#   - Flags repos that were silent-failing (no recent runs at all)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ORG="VaultSparkStudios"
REGISTRY="portfolio/PROJECT_REGISTRY.json"

echo "════════════════════════════════════════"
echo "  CI Health Check — VaultSpark Studios"
echo "  $(date +%Y-%m-%d)"
echo "════════════════════════════════════════"
echo ""

# Validate registry
SCHEMA_VERSION=$(jq -r '.schemaVersion // "unknown"' "$REGISTRY")
PROJECT_COUNT=$(jq '.projects | length' "$REGISTRY")
echo "Registry: schema=$SCHEMA_VERSION | projects=$PROJECT_COUNT"
echo ""

if [ "$SCHEMA_VERSION" = "unknown" ]; then
  echo "ERROR: Invalid registry schema — run from vaultspark-studio-ops root"
  exit 1
fi

# Get all repos with repoExists != false
REPOS=$(jq -r '.projects[] | select(.repoExists != false) | .repo | split("/")[1]' "$REGISTRY")

FAILING=()
NO_RUNS=()
PASSING=()

for REPO in $REPOS; do
  # Get last workflow run for any workflow in this repo
  RUNS=$(gh api "repos/$ORG/$REPO/actions/runs?per_page=5" \
    --jq '.workflow_runs[:5] | map({status: .status, conclusion: .conclusion, name: .name, date: (.created_at | split("T")[0])})' \
    2>/dev/null || echo "[]")

  if [ "$RUNS" = "[]" ] || [ -z "$RUNS" ]; then
    NO_RUNS+=("$REPO")
    continue
  fi

  # Check most recent run
  LAST_CONCLUSION=$(echo "$RUNS" | jq -r '.[0].conclusion // "pending"')
  LAST_STATUS=$(echo "$RUNS" | jq -r '.[0].status // "unknown"')
  LAST_WORKFLOW=$(echo "$RUNS" | jq -r '.[0].name // "unknown"')
  LAST_DATE=$(echo "$RUNS" | jq -r '.[0].date // "unknown"')

  if [ "$LAST_CONCLUSION" = "failure" ] || [ "$LAST_CONCLUSION" = "startup_failure" ]; then
    FAILING+=("$REPO | $LAST_WORKFLOW | $LAST_DATE")
  elif [ "$LAST_STATUS" = "in_progress" ]; then
    PASSING+=("$REPO [running] | $LAST_WORKFLOW")
  else
    PASSING+=("$REPO [✓ $LAST_CONCLUSION] | $LAST_DATE")
  fi
done

echo "── Failing CI ──────────────────────────"
if [ ${#FAILING[@]} -eq 0 ]; then
  echo "  No failing CI detected ✓"
else
  for F in "${FAILING[@]}"; do
    echo "  ✗ $F"
  done
fi

echo ""
echo "── No recent runs (possible issue) ─────"
if [ ${#NO_RUNS[@]} -eq 0 ]; then
  echo "  All repos have recent workflow runs ✓"
else
  for R in "${NO_RUNS[@]}"; do
    echo "  ? $R — no workflow runs found (may be private with no CI, or API access needed)"
  done
fi

echo ""
echo "── Passing ──────────────────────────────"
for P in "${PASSING[@]}"; do
  echo "  ✓ $P"
done

echo ""
echo "════════════════════════════════════════"
echo "  Summary"
echo "  Failing:  ${#FAILING[@]}"
echo "  No runs:  ${#NO_RUNS[@]}"
echo "  Passing:  ${#PASSING[@]}"
echo "════════════════════════════════════════"

if [ ${#FAILING[@]} -gt 0 ]; then
  echo ""
  echo "Action: Open the Actions tab for each failing repo and investigate."
  echo "Common causes: expired secrets, dependency updates, test failures."
fi
