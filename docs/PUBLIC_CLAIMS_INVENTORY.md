# Public Claims Inventory

Point-in-time receipt: 2026-07-31 (Session 121)

## Mechanical coverage

- Command: `node scripts/check-public-claims.mjs`
- Result: pass
- Files scanned: 315
- Rules: 18 multilingual rules
- Locales: English, Spanish, Portuguese, plus cross-language patterns
- Surfaces: `src/`, `public/`, `supabase/functions/`, `index.html`, and `README.md`
- Exclusions: generated build output, dependencies, and test fixtures; tests exercise the rules separately

The scanner blocks absolute legality, recurring-income hype, guarantees and risk-free language, typical or achievable earnings ranges, monthly-profit benchmarks, pure-profit claims, and capital/outcome risk erasure. Explicit negations such as “does not guarantee a financial outcome” remain allowed.

## Findings remediated

- 33 violations surfaced when Edge functions and the expanded rule set were first enabled.
- Static English, Spanish, Portuguese, and United Kingdom pages were rewritten around current user inputs, modeled scenarios, execution boundaries, and realized outcomes.
- Edge-authored onboarding email, weekly digest, heuristic advisor, and stack-builder prompt copy now names changing prices, limits, eligibility, stake acceptance, void, grading, and execution risk.
- Unsupported annual-report and brand-comparison aggregates were removed and replaced with public corrections plus an inspectable evidence method.
- The former hard-coded income predictor is now a zero-default scenario planner: every return assumption is entered by the user, and the execution-risk haircut is explicit.

## Evidence posture

PromoGrind currently has no sourceable aggregate dataset that supports population earnings, median returns, typical monthly profit, or operator-wide realized-value rankings. Those claims remain intentionally unpublished. Exact calculator outputs are permitted only as input-specific models; they are not realized outcomes or forecasts.

Re-run both commands after public or Edge copy changes:

```text
npm run test:public-claims
node scripts/check-public-claims.mjs
```
