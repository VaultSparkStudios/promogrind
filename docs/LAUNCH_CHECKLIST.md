# PromoGrind Launch Checklist

Last updated: 2026-04-24

This checklist reflects the current repo truth for PromoGrind's launch readiness.
Use it to distinguish between a soft public launch that is honest today and a full
activation launch that depends on external systems.

Canonical machine-readable blocker/proof status lives in `context/LAUNCH_PROOFS.json`.

## Launch Readiness Snapshot

- Soft public launch readiness: 75-80%
- Core product readiness: 85-90%
- Full monetized/live-feature launch readiness: 55-65%

## Must Have Before Soft Public Launch

- Shared Vault membership flow rechecked after the website-agent rollout lands
- Free Vault membership messaging consistent across app shell, landing page, and top-intent SEO pages
- Beta messaging present anywhere AI, live scanning, push, or paid checkout are mentioned
- Trust/compliance copy present on high-intent public surfaces:
  - 21+ where legal
  - educational math tool / not gambling advice
  - winnings may be taxable
  - 1-800-GAMBLER
- Canonical PromoGrind URLs used across public copy and redirects
- Core smoke check completed for:
  - app load
  - login flow
  - top calculators
  - landing page
  - key SEO redirects
- Local launch gate completed with `npm run verify:launch-local`

## Can Wait Until After Soft Launch

- Affiliate link activation
- Google Search Console submission
- Live odds activation
- AI feature activation
- Push notification activation
- Paid checkout activation
- Chrome Web Store submission
- Public calc-api docs / marketing decision

## Required for Full Launch

- `VITE_PG_FEATURE_AI_SCAN` on only after `parse-bet-slip` is deployed and `ANTHROPIC_API_KEY` is set
- `VITE_PG_FEATURE_PROMO_ADVISOR` on only after `promo-advisor` is deployed and `ANTHROPIC_API_KEY` is set
- `VITE_PG_FEATURE_PROMO_CHAT` on only after `promo-chat` is deployed and `ANTHROPIC_API_KEY` is set
- `VITE_PG_FEATURE_LIVE_SCANNER` on only after odds backend + `ODDS_API_KEY` are live
- `VITE_PG_FEATURE_STACK_BUILDER` on only after `stack-builder` is deployed and `ANTHROPIC_API_KEY` is set
- `VITE_PG_FEATURE_AI_ACTION_PLAN` on only after `ai-action-plan` is deployed and `ANTHROPIC_API_KEY` is set
- `VITE_PG_FEATURE_PUSH_ALERTS` on only after VAPID keys, push migration, and `send-daily-brief` deployment are complete
- `VITE_PG_FEATURE_PAID_CHECKOUT` on only after live Stripe products, secrets, and webhook deployment are complete
- Real affiliate-approved links inserted in `src/books.js`
- Search Console sitemap submitted

## Stop-Ship Conditions

- Shared Vault membership UX changes and PromoGrind copy no longer matches it
- Any beta-only feature is described publicly as live
- Static marketing pages imply guest/no-account access instead of free Vault membership
- Calculator math regressions or broken top-level redirects

## Recommended Order

1. Recheck the website-agent auth rollout and align copy if needed.
2. Finish the trust/compliance pass on top-intent SEO and comparison pages.
3. Run a soft-launch smoke test across landing, auth, calculators, and redirects.
4. Soft launch with beta-gated premium surfaces still off.
5. Turn on feature flags one by one only as each backend is truly live.

When a manual proof is completed, update `context/LAUNCH_PROOFS.json` directly or use:

```bash
node scripts/update-launch-proof.mjs --proof <affiliateLinks|stripeSmoke|friendBeta> --status complete --evidence "What was verified"
```
