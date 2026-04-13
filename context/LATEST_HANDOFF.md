# Latest Handoff

This repo now keeps only a public-safe handoff summary. Detailed handoff history is maintained privately.

## Where We Left Off (Session 33)
- Shipped: 7 improvements across 4 groups — pricing/tiers, payments, AI gating, UX
- Tests: 127/127 passing · delta: 0
- Deploy: deployed to GitHub Pages (auto on push) · Supabase functions live

## Session Intent
Full pricing + tier strategy implementation: Options A (revenue), B (depth), C (tier overhaul) — all completed.

## Human Action Required
- [ ] **Anthropic API key** — `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` then deploy AI functions to activate PromoChat, PromoAdvisor, AI Action Plan. Get key at console.anthropic.com.
- [ ] **Affiliate/referral links** — open each sportsbook app → Refer a Friend → copy your personal referral link → paste into `referralLink` field in `src/books.js` for DraftKings, FanDuel, BetMGM, Caesars, bet365, ESPN BET, Fanatics, BetRivers.
- [ ] **Custom domain** — check promogrind.io / promogrind.co / promogrind.app / getpromogrind.com → purchase → run domain migration commit.
- [ ] **Stripe webhook test** — make a test purchase to verify `subscriptions` table populates correctly after `checkout.session.completed`.

## State at Handoff
- Pricing: 5 tiers live in UI — Free Agent → Scout ($9.99) → Runner ($19.99) → Closer ($34.99) → The House ($149)
- Stripe: live mode active · 7 price IDs created · stripe-webhook deployed · checkout functional
- PromoChat: gated to Scout+ (was: any free account) · tier-aware daily limits (Scout=20, Runner=50, Closer=∞)
- PromoAdvisor: input sanitized · EV pill · confidence badge · retry button · Runner upsell copy
- auth.js: isScoutPlus() · isRunnerPlus() · isCloserPlus() · getTierName() all exported
- create-checkout: supports scout/runner/closer/house plan IDs + legacy backwards compat
- stripe-webhook: handles checkout.session.completed, invoice.paid, subscription.updated/deleted
- Build: ✓ 3.03s · Tests: 127/127
