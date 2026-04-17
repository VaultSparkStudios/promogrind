#!/usr/bin/env bash
# Deploy PromoGrind Supabase Edge Functions
# Usage: bash scripts/deploy-edge-functions.sh [--all | function-name ...]
# Requires: supabase CLI installed and logged in (supabase login)
# Project ref: fjnpzjjyhnpmunfoycrp

set -euo pipefail

PROJECT_REF="fjnpzjjyhnpmunfoycrp"
SUPABASE="supabase"

ALL_FUNCTIONS=(
  "promo-advisor"
  "promo-chat"
  "ai-action-plan"
  "stack-builder"
  "create-checkout"
  "customer-portal"
  "redeem-beta-code"
  "gift-trial"
  "stripe-webhook"
  "send-daily-brief"
  "parse-bet-slip"
)

# Functions updated in S62 (prompt caching + userContext)
S62_FUNCTIONS=(
  "promo-advisor"
  "promo-chat"
  "ai-action-plan"
)

deploy_function() {
  local fn="$1"
  echo "→ Deploying $fn..."
  $SUPABASE functions deploy "$fn" --project-ref "$PROJECT_REF" --no-verify-jwt
  echo "  ✓ $fn deployed"
}

if [[ "${1:-}" == "--all" ]]; then
  echo "Deploying all ${#ALL_FUNCTIONS[@]} functions..."
  for fn in "${ALL_FUNCTIONS[@]}"; do deploy_function "$fn"; done
elif [[ "${1:-}" == "--s62" ]]; then
  echo "Deploying S62-updated functions (prompt caching + userContext)..."
  for fn in "${S62_FUNCTIONS[@]}"; do deploy_function "$fn"; done
elif [[ $# -gt 0 ]]; then
  for fn in "$@"; do deploy_function "$fn"; done
else
  echo "Deploying S62-updated functions by default (prompt caching + userContext)..."
  for fn in "${S62_FUNCTIONS[@]}"; do deploy_function "$fn"; done
fi

echo ""
echo "Deploy complete. Verify at: https://supabase.com/dashboard/project/$PROJECT_REF/functions"
