<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-05-18 -->

# Implement Plan — PromoGrind S91

## Optimal Order

| Order | Audit # | Slug | Reason |
|---:|---:|---|---|
| 1 | 6 | execution-doc-noop-guard | Establish idempotent run surface before code edits. |
| 2 | 1 | s90-command-ribbon | Highest user-visible leverage; same Today surface as share action. |
| 3 | 5 | share-briefing-button | Shares imports/state with the command ribbon and costs little. |
| 4 | 2 | terms-and-deadline-promos | Same recommender card surface; zero new network/API cost. |
| 5 | 3 | conflict-aware-tracker | Tracker-only safety wiring. |
| 6 | 4 | kelly-sandbox-profile | Profile-only education loop; independent after tracker/dashboard work. |

## Verification Surface

- `npm test -- dashboard.test.js`
- `npm test -- promoConflict.test.js`
- `npm test`

## Execution Log

- Shipped all 6 S91 audit items from `docs/AUDIT_2026-05-18.md`.
- Verification passed: `npm test -- dashboard.test.js`, `npm test -- promoConflict.test.js`, and full `npm run verify:launch-local`.
