# Latest Handoff

This repo now keeps only a public-safe handoff summary. Detailed handoff history is maintained privately.

## Where We Left Off (Session 33 — continued)
- Shipped: pricing/tiers, payments, AI gating, UX, **domain migration**
- Tests: 127/127 passing · delta: 0
- Deploy: deployed to promogrind.bet via GitHub Pages · Supabase functions live

## Session Intent
Full pricing + tier strategy implementation + Stripe live + domain promogrind.bet — all completed.

## Human Action Required
- [ ] **Namecheap nameservers** — point both domains to Cloudflare: `journey.ns.cloudflare.com` + `piers.ns.cloudflare.com` (Namecheap → Domain List → each domain → Nameservers → Custom DNS). Once active, promogrind.bet goes live.
- [ ] **Anthropic API key** — `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` then deploy AI functions to activate PromoChat, PromoAdvisor, AI Action Plan. Get key at console.anthropic.com.
- [ ] **GitHub Secrets** — set `VITE_PG_FEATURE_PROMO_CHAT=true` and `VITE_PG_FEATURE_PROMO_ADVISOR=true` after Anthropic key is live.
- [ ] **Affiliate/referral links** — open each sportsbook app → Refer a Friend → copy your personal referral link → paste into `referralLink` field in `src/books.js` for DraftKings, FanDuel, BetMGM, Caesars, bet365, ESPN BET, Fanatics, BetRivers.
- [ ] **Stripe webhook smoke test** — make a test purchase (card 4242 4242 4242 4242) and verify `subscriptions` table row is created.

## State at Handoff
- Domain: promogrind.bet purchased + Cloudflare zones created (CF zone IDs: .bet=58c495f2…, .app=9ac7ffec…) · promogrind.app → promogrind.bet 301 redirect configured · awaiting Namecheap nameserver update to go live
- GitHub Pages: custom domain set to promogrind.bet · CNAME updated · base path changed from /promogrind/ to /
- Pricing: 5 tiers live in UI — Free Agent → Scout ($9.99) → Runner ($19.99) → Closer ($34.99) → The House ($149)
- Stripe: live mode active · 7 price IDs created · stripe-webhook deployed · checkout functional
- PromoChat: gated to Scout+ (was: any free account) · tier-aware daily limits (Scout=20, Runner=50, Closer=∞)
- PromoAdvisor: input sanitized · EV pill · confidence badge · retry button · Runner upsell copy
- auth.js: isScoutPlus() · isRunnerPlus() · isCloserPlus() · getTierName() all exported
- create-checkout: supports scout/runner/closer/house plan IDs + legacy backwards compat
- stripe-webhook: handles checkout.session.completed, invoice.paid, subscription.updated/deleted
- sitemap.xml: 143 URLs migrated from vaultsparkstudios.github.io/promogrind/ → promogrind.bet/
- Build: ✓ passing · Tests: 127/127
