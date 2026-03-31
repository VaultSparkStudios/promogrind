# PromoGrind Feature-Flag Activation Matrix

Last updated: 2026-03-31
Source of truth: `src/launchState.js`

This document exists to prevent rollout drift. Do not enable a flag because the UI
"looks ready." Enable it only after the required backend, secret, and user-facing
truth conditions are all satisfied.

| Flag | Surface | Default | Enable only when | Keep public copy at |
|---|---|---|---|---|
| `VITE_PG_FEATURE_AI_SCAN` | Bet Slip Scan | Off | `ANTHROPIC_API_KEY` set and `supabase/functions/parse-bet-slip` deployed | beta |
| `VITE_PG_FEATURE_PROMO_ADVISOR` | Promo Advisor | Off | `ANTHROPIC_API_KEY` set and `supabase/functions/promo-advisor` deployed | beta |
| `VITE_PG_FEATURE_PROMO_CHAT` | PromoChat | Off | `ANTHROPIC_API_KEY` set and `supabase/functions/promo-chat` deployed | beta |
| `VITE_PG_FEATURE_LIVE_SCANNER` | Live Scanner | Off | Odds backend deployed and `ODDS_API_KEY` configured | beta |
| `VITE_PG_FEATURE_STACK_BUILDER` | Stack Builder | Off | `ANTHROPIC_API_KEY` set and `supabase/functions/stack-builder` deployed | beta |
| `VITE_PG_FEATURE_AI_ACTION_PLAN` | AI Action Plan | Off | `ANTHROPIC_API_KEY` set and `supabase/functions/ai-action-plan` deployed | beta |
| `VITE_PG_FEATURE_PUSH_ALERTS` | Push Alerts | Off | VAPID keys generated, push subscription migration run, and `supabase/functions/send-daily-brief` deployed | beta |
| `VITE_PG_FEATURE_PAID_CHECKOUT` | Paid Checkout | Off | Live Stripe products created, live secrets configured, and webhook deployment confirmed | disabled / not live |

## Activation Rules

- Keep flags off by default in all environments unless the required service is live.
- Do not treat a deployed function alone as sufficient if its secret or backing service is still missing.
- Do not update landing-page or comparison-page copy from "beta" to "live" until the flag is on in production.
- If a service degrades or secrets are revoked, turn the flag off first and then investigate.

## Manual Verification Before Enabling Any Flag

1. Confirm the backend dependency is deployed in the target environment.
2. Confirm required secrets are present.
3. Confirm the surface no longer shows placeholder/test/beta messaging.
4. Confirm one real end-to-end happy path manually.
5. Confirm public copy still tells the truth.

## Current Recommendation

- Keep every feature flag off for public launch except core free calculators and non-dependent tools.
- Treat feature activation as a staged rollout, not part of the initial soft launch.
