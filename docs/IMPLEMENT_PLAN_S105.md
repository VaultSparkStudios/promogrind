# S105 Implement Plan

1. `promo-decision-tool-ownership` - shipped; remaining promo decision tools moved from `src/App.jsx` into `src/calculators/PromoDecisionCalculators.jsx`.
2. `lead-capture-honesty-gate` - shipped; capture now requires browser-provided public config and launch smoke rejects placeholder keys.
3. `daily-dashboard-ownership-next` - shipped; dashboard route moved into `src/components/dashboard/DailyDashboard.jsx`.
4. `external-proof-evidence` - honestly deferred; real-world proof cannot be manufactured.

Verification:
- `npx vitest run src/__tests__/appComposition.test.js src/__tests__/distExposure.test.js` passed 4/4.
- `node scripts/validate-launch-smoke.mjs` passed.
- `npm test` passed 59 files / 508 tests.
- `npm run verify:launch-local` passed end to end.
