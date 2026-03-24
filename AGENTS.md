# Project Agent Guide — PromoGrind

## Studio identity

- Studio: VaultSpark Studios
- Studio site repo: `VaultSparkStudios/VaultSparkStudios.github.io`
- Studio public URL: `https://vaultsparkstudios.com/`

## Project identity

- Repo: `VaultSparkStudios/promogrind`
- Slug: `promogrind`
- Public URL: `https://vaultsparkstudios.com/promogrind/`
- Type: App / product — sportsbook promo conversion tool

## Read order

1. `context/PROJECT_BRIEF.md`
2. `context/SOUL.md`
3. `context/BRAIN.md`
4. `context/CURRENT_STATE.md`
5. `context/DECISIONS.md`
6. `context/TASK_BOARD.md`
7. `context/LATEST_HANDOFF.md`

## Expectations

- Preserve project identity
- Preserve existing functionality unless explicitly asked otherwise
- Update memory files after meaningful work
- Append to historical records instead of rewriting them away
- Treat `context/LATEST_HANDOFF.md` as the single authoritative active handoff file

## Session aliases

If the user says only `start`, follow `prompts/start.md`.

If the user says only `closeout`, follow `prompts/closeout.md`.

## Escalate before changing

- Affiliate link structure or monetization logic
- Calculator math (hedge, arb, EV formulas)
- Public-facing legal or compliance copy
- SEO meta tags or sitemap
- Launch dates or release decisions

## Tech stack

- React 18 + Vite 6
- Vanilla CSS (no framework)
- localStorage for persistence
- Zero backend — static hosting only
- Deploy targets: Vercel (primary), Netlify, GitHub Pages

## Deployment standards

Before making deployment, domain, or GitHub Pages changes, read:

- `docs/DEPLOYMENT_GUIDE.md`
- `docs/RELEASE_PLAN.md`
