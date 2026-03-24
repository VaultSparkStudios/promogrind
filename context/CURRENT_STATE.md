# Current State

## Snapshot

- Date: 2026-03-24
- Overall status: Pre-launch — repo live, app fully built, all infrastructure complete
- Current phase: Launch prep — one blocker remaining (affiliate links)

## What exists

- Systems: Full React/Vite app (v3) — 11 calculators, sportsbook tracker, P/L ledger, knowledge base
- Routing: URL-based routing via react-router-dom — each calculator has its own shareable URL (e.g. `/promogrind/bonus-bet`)
- Affiliate links: wired into Tracker "Sign Up →" buttons — pull from `src/books.js` (still placeholder URLs, need real links)
- Footer: FTC affiliate disclosure + 1-800-GAMBLER responsible gambling copy — live
- OG image: `public/og-image.png` (1200×630) — live, social shares show preview
- CI: `.github/workflows/ci.yml` — build validation on every push/PR
- Deploy: `.github/workflows/deploy-pages.yml` — auto-deploys to GitHub Pages on push to main
- SEO: canonical, sitemap, robots.txt all pointing to `vaultsparkstudios.com/promogrind/`; Google Fonts loaded
- Studio site: PromoGrind listed in new `#vault-tools` section on `vaultsparkstudios.com`

- Important paths:
  - Entry point: `src/main.jsx` (BrowserRouter wrapper)
  - All calculator UI + KB: `src/App.jsx`
  - Math formulas: `src/math.js`
  - Sportsbook + affiliate data: `src/books.js` ← **edit affiliate links here**
  - Deploy workflow: `.github/workflows/deploy-pages.yml`
  - OG image source: `scripts/og-image.svg` (run `npm run og` to regenerate PNG)

## In progress

- Nothing active — session closed cleanly

## Blockers

- Blocker: Affiliate links still placeholder in `src/books.js`
- Owner: Studio
- Unblock path: Use personal "Refer a Friend" links from each sportsbook app immediately (no application needed). Apply to partner programs for higher CPAs.

- Blocker: GitHub Pages source not yet set to "GitHub Actions" in repo settings
- Owner: Studio
- Unblock path: `github.com/VaultSparkStudios/promogrind` → Settings → Pages → Source → GitHub Actions

## Next 3 moves

1. Insert affiliate/referral links into `src/books.js`
2. Enable GitHub Pages (Settings → Pages → GitHub Actions)
3. Submit sitemap to Google Search Console once live
