# Work Log

Append sessions chronologically. Never delete entries.

---

## 2026-03-24 — Full Build Session

**Session type:** Bootstrap + infrastructure + app improvements

**Completed:**

**Repo & studio-system:**
- Created `VaultSparkStudios/promogrind` (public GitHub repo)
- Extracted source from `promogrind-deploy.zip` (React/Vite, 11 calculators)
- Scaffolded full studio-system: `context/`, `docs/`, `logs/`, `plans/`, `prompts/`, `specs/`
- Wrote all core context files from project knowledge (PROJECT_BRIEF, SOUL, BRAIN, CURRENT_STATE, DECISIONS, TASK_BOARD, LATEST_HANDOFF, OPEN_QUESTIONS, PORTFOLIO_CARD, PROJECT_STATUS.json)
- Wrote AGENTS.md, prompts/start.md, prompts/closeout.md
- Wrote docs/PRODUCT_REQUIREMENTS.md, docs/RELEASE_PLAN.md
- Initial commit pushed

**Deploy infrastructure:**
- Added `.github/workflows/deploy-pages.yml` (GitHub Pages CI/CD, builds with VITE_APP_BASE_PATH=/promogrind/)
- Added `.github/workflows/ci.yml` (build validation on push/PR)
- Added `scripts/postbuild-pages.mjs` (404.html SPA fallback)
- Updated `vite.config.js` to read VITE_APP_BASE_PATH
- Added `build:pages` script to package.json
- Removed `vercel.json` and `netlify.toml` (not needed for GitHub Pages)

**SEO & meta:**
- Fixed canonical URL: `promogrind.com` → `vaultsparkstudios.com/promogrind/`
- Fixed sitemap: all 7 → 14 real route slugs, correct domain
- Fixed robots.txt sitemap pointer
- Added OG image + Twitter image meta tags
- Added `og:url` meta tag
- Loaded JetBrains Mono + Space Grotesk from Google Fonts
- Generated OG image (1200×630): `scripts/og-image.svg` → `public/og-image.png`
- Added `npm run og` script for regeneration

**Studio site:**
- Added PromoGrind to `VaultSparkStudios.github.io` under new `#vault-tools` section
- Added `.promogrind` CSS card theme (emerald)
- Added "Vault Tools" nav link in header + footer
- Merged cleanly with remote changes (vault-sealed card, Projects rename)

**App improvements:**
- Removed duplicate BOOKS array from App.jsx — `src/books.js` is now single source of truth
- Wired affiliate links from books.js into Tracker "Sign Up →" buttons (`rel="sponsored"`)
- Added URL routing via react-router-dom — 14 shareable/SEO-indexable calculator URLs
- Added BrowserRouter in main.jsx with basename from VITE_APP_BASE_PATH
- Added CSV export to P/L Ledger (`↓ Export CSV` button)
- Added FTC affiliate disclosure + responsible gambling footer
- Fixed `b.n` → `b.name` bug in ledger book dropdown (broke after BOOKS migration)
- Split ledger form into two rows for clean mobile layout
- Tracker checkbox: `role="checkbox"`, `aria-checked`, `aria-label`, `tabIndex`, keyboard support (Enter/Space), green focus ring
- Fixed App.jsx comment: "no affiliate links" → accurate description
- Updated sitemap to 14 real route slugs

**Build status:** ✓ Passing (206 kB bundle, 66 kB gzip)

**Files changed:**
- `src/App.jsx`, `src/main.jsx`, `src/books.js` (no content change, now sole BOOKS source)
- `index.html`, `public/sitemap.xml`, `public/robots.txt`, `public/og-image.png`
- `public/favicon.svg`, `public/sitemap.xml`, `public/robots.txt`
- `vite.config.js`, `package.json`, `package-lock.json`
- `.github/workflows/deploy-pages.yml`, `.github/workflows/ci.yml`
- `scripts/postbuild-pages.mjs`, `scripts/og-image.svg`, `scripts/generate-og.mjs`
- `AGENTS.md`, `context/*`, `docs/*`, `logs/*`, `prompts/*`
- `C:/Users/p4cka/documents/Development/VaultSparkStudios.github.io/index.html` (studio site)

**Open problems:**
- Affiliate links in `src/books.js` still placeholder — monetization not live
- GitHub Pages source setting not yet configured in repo settings

**Recommended next action:**
- Insert affiliate links into `src/books.js`, enable GitHub Pages, submit sitemap

---

## 2026-03-26 — Session 9: Third Audit + 20-Feature Implementation (v9.0)

**Session type:** Full audit → brainstorm → 20-feature implementation

**Completed:**

**App.jsx (background agent, worktree isolation):**
- Fixed stale "22 Calculators" header stat → "26"
- 20 new features: Copy My Setup share link, Promo Stacking Calculator, Daily Grind Routine Generator, Profit Goal Milestone, Promo Trade Journal, Odds Comparison Table, Calculator Sub-Categories filter pills, Push Notification Daily Briefing (VaultSparked), Promo Value History Tracker, Kelly Fractional Risk Optimizer, Tax Bracket Timing Advisor, Bet Slip Text Parser, Multi-Book Pending Exposure Dashboard, CLV Leaderboard Column + My Stats, New State Legalized Alert, Promo Arb Finder, Leaderboard Privacy Control, Multi-Currency Mode (USD/CAD/GBP), Sportsbook Account Health Score, Calculator Usage Analytics + Top Tools
- New TABS entries: Promo Stacking (Calculate), Trade Journal (Track), Odds Compare (Track), Promo Arb Finder (Learn)
- New context: CurrencyCtx (display-only FX, USD/CAD/GBP)

**Non-App.jsx (main thread):**
- `public/sitemap.xml`: Added promo-stacking, trade-journal, odds-compare, team-accounts, promo-arb-finder (→47 URLs)
- `public/manifest.json`: Updated tool count description, added Promo Arb Finder shortcut
- `public/sw.js`: Cache version bumped v2→v3
- `public/robots.txt`: Added Disallow for arb-scanner, ev-scanner (pro-gated, no crawl value)
- `index.html`: Updated meta description (27+ calcs), expanded keywords, JSON-LD featureList (→16 items)
- `src/auth.js`: Fixed redirectToLogin to preserve full URL (was only origin, lost path/slug)
- `vite.config.js`: Added Supabase as separate cached chunk
- `.env.example`: Expanded with all edge function secrets and VAPID keys documented
- `package.json`: Added deploy:functions and deploy:brief npm scripts
- `supabase/functions/send-daily-brief/index.ts`: Push notification skeleton (for future VAPID upgrade)
- `scripts/migration-push-subscriptions.sql`: DB migration for server-sent push (future)
- `context/BRAIN.md`: Updated with file-size warning, new strategic beliefs
- `context/DECISIONS.md`: Added 3 session 9 decisions (currency, sub-categories, leaderboard privacy)
- `context/OPEN_QUESTIONS.md`: Resolved 2 stale questions; added 2 new active questions
- `context/CURRENT_STATE.md`, `context/LATEST_HANDOFF.md`, `context/PROJECT_STATUS.json`: Updated to v9.0
- `context/TASK_BOARD.md`: Session 9 completion block added
- `prompts/start.md`: Added OPEN_QUESTIONS.md to read order; added sync.js note
- `memory/project_promogrind.md`: Updated to v9.0

**Build status:** ✓ Clean (verified by agent after implementation)

**Files changed:** src/App.jsx, src/auth.js, vite.config.js, .env.example, package.json, public/*, context/*, prompts/start.md, logs/WORK_LOG.md, scripts/migration-push-subscriptions.sql, supabase/functions/send-daily-brief/index.ts, memory/project_promogrind.md

**Open problems:**
- All external setup items remain unactivated (affiliate links, Odds API, Stripe, Resend, OAuth, Plausible)
- App.jsx approaching ~5,000 lines — plan component extraction or Astro migration for session 10+

**Recommended next action:**
- Activate affiliate links (`src/books.js`) — highest revenue-per-hour task
- Then set Odds API key + deploy odds Edge Function
