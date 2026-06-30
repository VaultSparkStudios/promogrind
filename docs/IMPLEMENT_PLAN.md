# S103 Implement Plan

1. `bet-tracker-route-extraction` - shipped; Pending Bet Tracker now lives in `src/components/BetTracker.jsx`.
2. `utility-calculator-pack-extraction` - shipped; Middle, Odds Convert, Rollover, and Income Estimator now live in `src/calculators/UtilityCalculators.jsx`.
3. `tracking-tools-pack-extraction` - shipped; Free Bet Arb Tracker, Promo Trade Journal, and Odds Comparison Table now live in `src/components/TrackingTools.jsx`.
4. `promo-finder-route-extraction` - shipped; Promo Finder now lives in `src/components/PromoFinder.jsx`.
5. `external-proof-evidence` - honestly deferred; requires real mailbox/payment/tester/Brevo/control-plane evidence.

Verification:
- `npx vitest run src/__tests__/appComposition.test.js` passed 2/2.
- `npm run check:hooks` passed.
- `npm test` passed 59 files / 508 tests.
- `src/App.jsx` is 2365 lines under the new <2400 composition ceiling.