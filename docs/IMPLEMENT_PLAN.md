<!-- generated-by: /implement skill v1.0 (S89) -->
<!-- generated-at: 2026-05-17 -->

# Implementation Plan — PromoGrind S89

> Optimal-efficiency sequencing of `docs/AUDIT_2026-05-17.md`.
> Sequence ≠ raw priority — grouped by surface, foundation-first, token-cost last.

| Seq | Slug | Tier | Surface | Effort | Priority |
|----:|------|:-:|---|---|:-:|
| 1 | anti-tilt-circuit-breaker | 🔥 | dashboard/lib | 2h | 45.0 |
| 2 | causal-promo-explainer | 🔥 | recommender | 2h | 32.0 |
| 3 | edge-decay-radar | 🔥 | recommender/lib | 4h | 31.3 |
| 4 | operator-twin | 🔥 | dashboard/ai | 4h | 38.7 |
| 5 | adversarial-receipt-replay | 🔥 | profile/lib | 2h | 40.5 |
| 6 | public-passport | ⚡ | profile/lib | 4h | 31.0 |
| 7 | launch-proof-resilience-replay | ⚡ | scripts | 4h | 21.7 |
| 8 | calculator-pre-warm | ⚡ | app/routing | 2h | 21.0 |
| 9 | app-jsx-decomposition-finale | 💡 | app shell | 4h | 10.8 |
| 10 | token-budget-self-binding | ⚡ | ai gateway | 1h | 30.9 |

**Rationale:** items 1-4 share dashboard/recommender surface; 5-6 share Profile; 7 hardens launch gate before infra; 10 last to measure token impact.

## Verification

- Per-item Vitest where applicable
- `npm test` after each batch
- `npm run verify:launch-local` at end
