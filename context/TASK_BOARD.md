# Task Board

## Now

- Create Supabase project + run `VaultSparkStudios.github.io/supabase-schema.sql` in SQL Editor
- Fill in `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `assets/supabase-client.js` (studio site) and `promogrind/.env`
- Create `promogrind/.env.admin` with SERVICE_ROLE_KEY for invite code generator
- Generate initial invite codes: `node scripts/generate-invite-codes.js 10 "launch batch"`
- Insert real affiliate/referral links into `src/books.js`
- Enable GitHub Pages: repo Settings → Pages → Source: GitHub Actions

## Next

- Test full auth flow end-to-end: register with invite code → confirm email → access PromoGrind
- Submit sitemap to Google Search Console once live
- Test all 11 calculators against known values before sharing publicly
- Write first SEO content piece targeting "how to convert bonus bets to cash"

## Blocked

- Supabase project not created yet — auth gate redirects until credentials are set in `.env`
- Affiliate program applications (DraftKings, FanDuel, BetMGM) — external approval process, days–weeks
  - Workaround: use personal "Refer a Friend" links immediately

## Later

- Custom domain setup (promogrind.com or similar)
- Analytics integration (Plausible or Fathom — privacy-respecting)
- v2: Live odds scanner via The Odds API (paid tier $29–$79/month)
- v2: Stripe subscription paywall for paid tier

## Completed ✓

- Created `VaultSparkStudios/promogrind` repo (public)
- Extracted and committed full source from deploy zip
- Scaffolded full studio-system (context/, docs/, logs/, plans/, prompts/, specs/)
- GitHub Pages deploy workflow (`.github/workflows/deploy-pages.yml`)
- CI workflow (`.github/workflows/ci.yml`)
- Fixed all domain URLs (canonical, sitemap, robots.txt → vaultsparkstudios.com/promogrind/)
- Google Fonts loaded (JetBrains Mono, Space Grotesk)
- OG image generated (1200×630, `public/og-image.png`)
- Removed vercel.json and netlify.toml (GitHub Pages is deploy target)
- Added PromoGrind to studio site under new #vault-tools section
- Wired affiliate links from books.js into Tracker Sign Up buttons
- Fixed duplicate BOOKS array (books.js is now single source of truth)
- URL routing via react-router-dom — all 14 calculators/views have shareable URLs
- CSV export on P/L Ledger
- FTC affiliate disclosure + responsible gambling footer
- Updated sitemap with 14 real route slugs
- Ledger form split into two rows for mobile
- Fixed `b.n` → `b.name` bug in ledger book dropdown
- Tracker checkbox: full keyboard + ARIA accessibility
- **2026-03-24: Vault Member auth gate implemented**
  - `src/auth.js` — Supabase client, `checkAuth()`, cross-domain token handler
  - `src/App.jsx` — auth gate + loading screen at startup
  - `scripts/generate-invite-codes.js` — admin CLI to create invite codes
  - `.env.example` — credential template (copy to `.env`)
  - `@supabase/supabase-js` npm package installed
