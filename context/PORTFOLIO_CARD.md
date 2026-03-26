# Portfolio Card

## Snapshot

- Name: PromoGrind
- Slug: promogrind
- Medium: Web app / tool (PWA, Capacitor-ready for mobile)
- Status: Active — live at vaultsparkstudios.com/promogrind/
- Stage: Pre-revenue (feature-complete, external setup pending)
- Priority: High
- Owner: VaultSpark Studios
- Health: Green
- Last updated: 2026-03-26 (v9.0)

## Quick overview

- One-line summary: Free sportsbook promo conversion tool — 27 calculators, P/L tracker, live scanner, knowledge base. Monetizes via affiliate CPAs + VaultSparked subscriptions ($24.99/mo or $199/yr).
- Current focus: Revenue activation — affiliate links, Stripe, Odds API
- Next milestone: First affiliate link live = first revenue-capable user flow
- Blockers: Affiliate links (placeholder URLs), Odds API key not set, Stripe test mode not configured

## Tool count

- 27 calculators (Convert: 5, Calculate: 23)
- 7 Track tools
- 2 Live scanner tools (VaultSparked-gated)
- 10 Learn tools
- 1 Dashboard (Home)
- **Total: 48 tools**

## Revenue model

1. **Affiliate CPAs:** $25–$75+ per sportsbook signup via affiliate links in `src/books.js`. Nothing activated yet — zero revenue.
2. **VaultSparked subscriptions:** $24.99/mo or $199/yr. Live scanner + daily briefing + all pro tools. Stripe infrastructure built; pending test mode setup.

## Top blockers

1. Affiliate links — placeholder URLs in `src/books.js` (zero revenue until inserted)
2. Stripe test mode — needs two products created (Monthly + Annual)
3. Odds API — scanner non-functional for paying users until key is set
4. LLC + EIN — blocks Stripe live mode

## Tech stack

- React 18 + Vite 6, Vanilla CSS, single-file SPA (src/App.jsx ~5,000 lines)
- Supabase (auth, cloud sync, vault points, referrals, leaderboard, subscriptions)
- GitHub Pages (auto-deploy on push to main via GitHub Actions)
- PWA (service worker v3, manifest with shortcuts)
- Capacitor (mobile build config ready — needs Xcode/Android Studio)

## Links

- Repo: `https://github.com/VaultSparkStudios/promogrind`
- Live URL: `https://vaultsparkstudios.com/promogrind/`
- Key docs: `context/LATEST_HANDOFF.md`, `docs/RELEASE_PLAN.md`, `context/TASK_BOARD.md`

## Cross-studio value

- Standalone monetizable product: first VaultSpark tool with real recurring revenue potential
- SEO moat: knowledge base + calculator pages are rankable once SSG is added
- Shared auth: uses same Supabase project as other VaultSpark tools (VaultSparked membership is cross-product)
- Affiliate infrastructure: `src/books.js` pattern is reusable across any sports betting tool
