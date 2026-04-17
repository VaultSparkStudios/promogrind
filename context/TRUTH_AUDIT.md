<!-- truth-audit-version: 1.1 -->
# Truth Audit

Overall status: green
Last reviewed: 2026-04-17 (post-S63 closeout — 20-item sprint tranche; 288/288 tests, build green, bundle 329.3KB/425KB)
Key source-of-truth changes this session:
- `supabase/functions/_shared/validate.ts` is now the single source of truth for VALID_CALCULATOR_SLUGS and VALID_PROMO_TYPES (previously each edge function had its own inline arrays)
- `src/lib/featureFlags.js` is now the client source of truth for remote feature flag resolution; `FEATURE_FLAGS` in launchState.js remains the build-time fallback
- `scripts/migration-feature-flags.sql` defines the feature_flags table schema — NOT YET applied in Supabase (human action required)
- `.github/workflows/ci.yml` now runs Deno tests in CI — Deno edge tests are no longer drift-prone (CI catches regressions)
- `supabase/functions/stack-builder/index.ts` response schema changed: `plan: string` replaced with `steps[]`, `summary`, `assumptions[]`, `estimatedTotal` — any consumer of the old schema must update
- `docs/STARTUP_BRIEF.md` refreshed to S63 state
- Code remains ahead of production: S62 AI edge function updates (promo-advisor SSE, validate.ts import, stack-builder JSON schema) and S63 changes NOT YET deployed to Supabase
Public-safe summary only. Sensitive verification notes are maintained privately.
