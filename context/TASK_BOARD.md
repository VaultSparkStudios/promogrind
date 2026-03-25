# Task Board

## Now (external — no code needed)

- Create Supabase project + run both SQL schema files (supabase-schema.sql + supabase-schema-v2.sql)
- Fill in `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `assets/supabase-client.js` (studio site) and `promogrind/.env`
- Create `promogrind/.env.admin` with SERVICE_ROLE_KEY
- Generate initial invite codes: `node scripts/generate-invite-codes.js 10 "launch batch"`
- Deploy Supabase Edge Functions: `supabase functions deploy odds && supabase functions deploy stripe-webhook && supabase functions deploy create-checkout`
- Set Edge Function secrets: `ODDS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `APP_URL`
- Create Stripe account → product → Pro price → webhook endpoint (pointing to `supabase/functions/v1/stripe-webhook`)
- Insert real affiliate/referral links into `src/books.js`
- Enable GitHub Pages: repo Settings → Pages → Source: GitHub Actions
- Configure OAuth providers in Supabase dashboard (Google + Discord)

## Next

- Test full auth flow end-to-end: register with invite → confirm email → access PromoGrind
- Test password reset flow end-to-end
- Test Stripe checkout → webhook → subscription update
- Test LiveScanner with real Odds API key
- Submit sitemap to Google Search Console once live

## Blocked

- Everything above is unblocked at the code level; external accounts/credentials needed

## Later

- Custom domain (promogrind.com or similar)
- Analytics integration (Plausible or Fathom)
- Real-time leaderboard (vault points ranking)
- Mobile app wrapper (Capacitor)

## Completed ✓

- Created `VaultSparkStudios/promogrind` repo
- Full React/Vite app v3 — 11 calculators, tracker, ledger, knowledge base
- GitHub Pages deploy + CI workflows
- URL routing — all tools have shareable URLs
- OG image, SEO, canonical, sitemap, robots.txt
- FTC disclosure + responsible gambling footer
- Affiliate links wired from books.js into Tracker
- CSV export on Ledger
- Mobile-friendly layout fixes
- **2026-03-24 v3.1: Full backend feature set**
  - `src/auth.js` — Supabase auth gate, `isPro()`, `startCheckout()` for Stripe
  - `src/sync.js` — cloud sync (promogrind_data table), vault events (award_vault_points RPC)
  - `src/App.jsx` — LIVE tab group (arb-scanner, ev-scanner), proStatus state, daily login event, calc tracking, Pro badge in header
  - `LiveScanner` component — arb detection, +EV detection, 2-min auto-refresh, Pro gate with Stripe CTA
  - `scripts/generate-invite-codes.js` — admin CLI for invite code creation
  - `.env.example` — credential template
  - `supabase/functions/` in studio repo: `odds/`, `stripe-webhook/`, `create-checkout/`
  - `supabase-schema-v2.sql` in studio repo: promogrind_data, vault_events, subscriptions tables + RPCs
