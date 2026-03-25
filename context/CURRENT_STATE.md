# Current State

## Snapshot

- Date: 2026-03-24
- Overall status: Pre-launch — Vault Member auth gate implemented, awaiting Supabase project creation + affiliate links
- Current phase: Launch prep — auth + Supabase setup + affiliate links remaining

## What exists

- Systems: Full React/Vite app (v3) — 11 calculators, sportsbook tracker, P/L ledger, knowledge base
- Routing: URL-based routing via react-router-dom — each calculator has its own shareable URL (e.g. `/promogrind/bonus-bet`)
- Auth gate: `src/auth.js` — checks Supabase session on load; redirects unauthenticated users to `vaultsparkstudios.com/vault-member/?next=<origin>`
- Auth gate in App.jsx: renders loading screen until session confirmed, then shows app
- Cross-domain token flow: vault-member page sends access_token + refresh_token via URL hash; PromoGrind calls `supabase.auth.setSession()` on receipt
- Affiliate links: wired into Tracker "Sign Up →" buttons — pull from `src/books.js` (still placeholder URLs, need real links)
- Footer: FTC affiliate disclosure + 1-800-GAMBLER responsible gambling copy — live
- OG image: `public/og-image.png` (1200×630) — live, social shares show preview
- CI: `.github/workflows/ci.yml` — build validation on every push/PR
- Deploy: `.github/workflows/deploy-pages.yml` — auto-deploys to GitHub Pages on push to main
- SEO: canonical, sitemap, robots.txt all pointing to `vaultsparkstudios.com/promogrind/`; Google Fonts loaded
- Studio site: PromoGrind listed in `#vault-tools` section on `vaultsparkstudios.com`

- Important paths:
  - Entry point: `src/main.jsx` (BrowserRouter wrapper)
  - Auth gate: `src/auth.js` ← Supabase client + session check
  - All calculator UI + KB: `src/App.jsx` (auth gate at top of App component)
  - Math formulas: `src/math.js`
  - Sportsbook + affiliate data: `src/books.js` ← **edit affiliate links here**
  - Env template: `.env.example` ← copy to `.env` and fill in Supabase values
  - Admin CLI: `scripts/generate-invite-codes.js` ← requires `.env.admin` with service role key
  - Deploy workflow: `.github/workflows/deploy-pages.yml`
  - OG image source: `scripts/og-image.svg` (run `npm run og` to regenerate PNG)

## In progress

- Nothing active — session closed cleanly

## Blockers

- Blocker: Supabase project not yet created — `src/auth.js` will throw until VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set in `.env`
- Owner: Studio
- Unblock path: Create project at supabase.com → run `VaultSparkStudios.github.io/supabase-schema.sql` in SQL Editor → fill in `.env`

- Blocker: Affiliate links still placeholder in `src/books.js`
- Owner: Studio
- Unblock path: Use personal "Refer a Friend" links from each sportsbook app immediately (no application needed). Apply to partner programs for higher CPAs.

- Blocker: GitHub Pages source not yet set to "GitHub Actions" in repo settings
- Owner: Studio
- Unblock path: `github.com/VaultSparkStudios/promogrind` → Settings → Pages → Source → GitHub Actions

## Next 3 moves

1. Create Supabase project, run schema, fill in `.env` — this unblocks the auth gate
2. Generate initial invite codes: `node scripts/generate-invite-codes.js 10 "launch batch"`
3. Insert affiliate/referral links into `src/books.js`
