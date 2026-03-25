# Release Plan

## v1 — Free Tool Launch (Current)

**Target:** Ready now — pending affiliate links and deploy config

**Scope:**
- 11 promo conversion calculators (bonus bet, first-bet hedge, arb, +EV, profit boost, parlay, referral tracker, etc.)
- Sportsbook tracker
- P/L ledger
- Knowledge base for beginners
- Affiliate link integration in `src/books.js`
- SEO meta tags + sitemap

**Deploy targets:** Vercel (primary) or GitHub Pages
**Distribution:** Direct link sharing, SEO organic traffic

**Launch checklist:**
- [ ] Insert affiliate/referral links into `src/books.js`
- [ ] Create Supabase project → run `supabase-schema.sql` in SQL Editor
- [ ] Fill in `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `VaultSparkStudios.github.io/assets/supabase-client.js`
- [ ] Copy `.env.example` → `.env` in PromoGrind, fill in same Supabase values
- [ ] Create `.env.admin` with SERVICE_ROLE_KEY for invite code generator
- [ ] Generate initial invite codes: `node scripts/generate-invite-codes.js 10 "launch batch"`
- [ ] Enable GitHub Pages or connect Vercel
- [ ] Set custom domain (promogrind.com if available)
- [ ] Submit sitemap to Google Search Console
- [ ] Add affiliate disclosure and 21+ notice to app footer
- [ ] Test auth gate + invite code flow end-to-end
- [ ] Test all calculators on mobile
- [ ] Verify localStorage persistence

---

## v2 — Live Odds Scanner (Paid Tier, Future)

**Status:** Planned — not started

**Scope:**
- Live odds fetching via The Odds API (theodds-api.com)
- Automatic arb detection across books
- +EV opportunity scanner
- Subscription paywall ($29–$79/month)
- Free calculators remain free (traffic driver → paid conversion)
- Backend proxy required for API key security

**Requires:**
- Backend (Node.js / serverless function) for Odds API proxy
- Auth layer (accounts)
- Payment processor (Stripe)
- Separate private repo for paid tier code

**Timeline:** After v1 reaches sustained traffic (est. 3–6 months post-launch)
