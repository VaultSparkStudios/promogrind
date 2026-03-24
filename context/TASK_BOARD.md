# Task Board

## Now

- Insert real affiliate/referral links into `src/books.js`
- Enable GitHub Pages: repo Settings → Pages → Source: GitHub Actions

## Next

- Submit sitemap to Google Search Console once live
- Test all 11 calculators against known values before sharing publicly
- Write first SEO content piece targeting "how to convert bonus bets to cash"

## Blocked

- Affiliate program applications (DraftKings, FanDuel, BetMGM) — external approval process, days–weeks
  - Workaround: use personal "Refer a Friend" links immediately

## Later

- Custom domain setup (promogrind.com or similar)
- Analytics integration (Plausible or Fathom — privacy-respecting)
- v2: Live odds scanner via The Odds API (paid tier $29–$79/month)
- v2: Backend proxy for API key security, auth layer, Stripe payments

## Completed This Session ✓

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
