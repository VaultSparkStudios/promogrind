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
