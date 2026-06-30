# S104 Implement Plan

1. `app-jsx-decomposition-finale` - shipped; Promo Calendar, Referral Hub, Team Accounts, Competitor Comparison, onboarding, push enablement, quick-add, weekly report, bankroll wizard, and setup sharing no longer live inline in `src/App.jsx`.
2. `lazy-route-split-refinement` - shipped; extracted route surfaces lazy-load as dedicated chunks instead of staying in the main App bundle.
3. `composition-boundary-hardening` - shipped; `appComposition.test.js` now blocks S104 surfaces from returning inline and enforces the <1500 App shell ceiling.
4. `external-proof-evidence` - honestly deferred; requires real mailbox/payment/tester/Brevo/control-plane evidence.

Verification:
- `npx vitest run src/__tests__/appComposition.test.js` passed 2/2.
- `npm run check:hooks` passed.
- `npm test` passed 59 files / 508 tests.
- `npm run verify:launch-local` passed end to end.
- `node scripts/ops.mjs doctor --update-json` passed 12/12 with blockingFailing 0.
