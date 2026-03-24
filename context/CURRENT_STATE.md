# Current State

## Snapshot

- Date: 2026-03-24
- Overall status: Pre-launch — v3 complete, repo initialized, ready for deployment
- Current phase: Bootstrap / launch prep

## What exists

- Systems: Full React/Vite app (v3) — 11 calculators, sportsbook tracker, P/L ledger, knowledge base, affiliate link integration, SEO meta tags
- Assets: `src/App.jsx` (complete app), `src/math.js` (calculator logic), `src/books.js` (sportsbook data + affiliate link slots), `src/storage.js` (localStorage), `src/theme.js`, `public/` (favicon, robots.txt, sitemap.xml)
- Important paths:
  - Entry point: `src/main.jsx`
  - All calculator UI + KB: `src/App.jsx`
  - Math formulas: `src/math.js`
  - Sportsbook + affiliate data: `src/books.js`
  - Build config: `vite.config.js`
  - Vercel routing: `vercel.json`
  - Netlify routing: `netlify.toml`

## In progress

- Active work: Repo bootstrap complete. Affiliate links in `src/books.js` are placeholder slots — need real links before monetization goes live.

## Blockers

- Blocker: Affiliate links not yet inserted into `src/books.js`
- Owner: Studio
- Unblock path: Apply to DraftKings Partners, FanDuel Partners, BetMGM Partners, etc. Or use personal "Refer a Friend" links from each sportsbook app as an immediate fallback.

- Blocker: GitHub Pages source not yet set to "GitHub Actions" in repo settings
- Owner: Studio
- Unblock path: Go to repo Settings → Pages → Source → GitHub Actions (one-time setup)

## Next 3 moves

1. Insert affiliate links into `src/books.js`
2. Configure GitHub Pages source (Settings → Pages → GitHub Actions)
3. Submit sitemap to Google Search Console once deployed
