# Latest Handoff

Last updated: 2026-03-24

This is the authoritative active handoff file for the project.

## What was completed

- Full repo created and pushed: `VaultSparkStudios/promogrind` (public)
- Complete studio-system scaffolded: context/, docs/, logs/, plans/, prompts/, specs/
- GitHub Pages deploy workflow live — deploys on every push to main
- CI workflow live — build validation on every push/PR
- All domain/SEO issues fixed: canonical, sitemap (14 real slugs), robots.txt, OG image
- Google Fonts (JetBrains Mono + Space Grotesk) loaded in index.html
- OG image (1200×630) generated and committed to public/
- Removed Vercel/Netlify config — GitHub Pages is sole deploy target
- PromoGrind added to studio site under new `#vault-tools` section
- Affiliate links wired: books.js → Tracker "Sign Up →" buttons (placeholder URLs, need real links)
- Duplicate BOOKS array eliminated — books.js is single source of truth
- URL routing added (react-router-dom) — 14 shareable calculator URLs
- CSV export added to P/L Ledger
- FTC affiliate disclosure + responsible gambling footer added
- Ledger form split into two rows for mobile
- Bug fixed: `b.n` → `b.name` in ledger book dropdown
- Tracker checkbox: role, aria-checked, aria-label, tabIndex, keyboard support, focus ring

## What is mid-flight

- Nothing — session closed cleanly, build passing

## What to do next

1. **Insert affiliate links into `src/books.js`** — replace placeholder `link:` values with real affiliate/referral URLs. This is the only thing blocking monetization.
2. **Enable GitHub Pages** — `github.com/VaultSparkStudios/promogrind` → Settings → Pages → Source → GitHub Actions. Deploy triggers automatically.
3. **Submit sitemap** to Google Search Console once live: `https://vaultsparkstudios.com/promogrind/sitemap.xml`

## Constraints

- All sportsbook links must live in `src/books.js` only — never hardcoded in App.jsx
- Calculator math in `src/math.js` must not be changed without verifying formulas
- App is purely static — no backend, no API keys in client code
- `rel="sponsored"` is already on Sign Up links (correct for affiliate links per Google guidelines)

## Read these first next session

1. `context/CURRENT_STATE.md`
2. `context/TASK_BOARD.md`
3. `src/books.js` (if working on affiliate links)

## Files to update next session if work continues

- `context/CURRENT_STATE.md`
- `context/TASK_BOARD.md`
- `logs/WORK_LOG.md`
