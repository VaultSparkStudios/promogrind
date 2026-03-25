# Task Board

## Now (external — no code needed)

- **Stripe test mode setup** (can do now):
  - Create Stripe account + VaultSparked product ($24.99/month) in test mode
  - Set secrets: `supabase secrets set STRIPE_VAULT_SPARKED_PRICE_ID=price_... STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_...`
  - Deploy: `supabase functions deploy create-checkout && supabase functions deploy stripe-webhook`
  - Test checkout with card `4242 4242 4242 4242`
- Wire real affiliate/referral links into `src/books.js`
- Enable OAuth providers (Google, Discord) in Supabase dashboard → Authentication → Providers
- Set Odds API key: `supabase secrets set ODDS_API_KEY=...` → `supabase functions deploy odds`

## Next

- Test VaultSparked upgrade flow end-to-end (checkout → webhook → subscription row → badge shown)
- Test LiveScanner with real Odds API key
- Submit sitemap to Google Search Console once live

## Blocked

- **Stripe live mode** — requires LLC formation + EIN + bank account
- Going live with real payments

## Later

- Custom domain (promogrind.com or similar)
- Analytics integration (Plausible or Fathom)
- Real-time leaderboard (vault points ranking)
- Mobile app wrapper (Capacitor)
- Monthly newsletter system (Resend + Edge Function cron)

## Completed ✓

- Created `VaultSparkStudios/promogrind` repo
- Full React/Vite app v3 — 11 calculators, tracker, ledger, knowledge base
- GitHub Pages deploy + CI workflows (live at vaultsparkstudios.com/promogrind/)
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
  - `LiveScanner` component — arb detection, +EV detection, 2-min auto-refresh, VaultSparked gate with upgrade CTA
  - `scripts/generate-invite-codes.js` — admin CLI for invite code creation
  - `.env.example` — credential template
  - Supabase project live: `fjnpzjjyhnpmunfoycrp.supabase.co`, schema v1+v2 run, invite codes generated
  - GitHub Pages blank-page bug fixed (VITE_ env vars added as GitHub Actions secrets)
- **2026-03-24 VaultSparked membership tier**
  - `isPro()` updated to accept `vault_sparked` OR `pro` plan
  - create-checkout Edge Function (in studio repo) supports `vault_sparked` plan
  - stripe-webhook Edge Function (in studio repo) reads plan from metadata
  - VaultSparked badge + upgrade CTA built in vault-member/index.html (studio repo)
  - Studio Stripe account structure documented
