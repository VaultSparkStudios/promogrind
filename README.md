# PromoGrind

PromoGrind is a sportsbook-promotion decision workspace from VaultSpark Studios LLC. It combines calculators, offer tracking, workflow tools, a profit-and-loss ledger, educational material, and beta-gated artificial-intelligence helpers. Outputs are models based on user inputs; execution, eligibility, limits, voids, taxes, and changing odds can alter real results.

## Product posture

- Public app, currently pre-launch.
- React and Vite client with Supabase authentication, data, and edge functions.
- Browser-local operation remains available for core calculators and planning surfaces.
- Artificial-intelligence, billing, scanner, email, and notification surfaces stay hidden or beta-labeled until their dependencies have current proof.
- Must be used only by eligible adults where sports betting is legal. PromoGrind is educational software, not gambling, financial, tax, or legal advice.

## Local development

Requirements: a current Node.js release and npm.

```powershell
npm ci
npm run dev
```

Public browser configuration is documented in `.env.example`. Never commit private credentials. Studio credentials are resolved through the private Studio OS secrets gateway; this public repository intentionally contains no private staging bootstrap.

## Verification

Run the complete local release contract:

```powershell
npm run verify:launch-local
```

Run the focused source-backed release-surface contract:

```powershell
npm run check:release-surface
```

Inspect a deployed origin with the live web contract. The `--url` option selects the origin to probe:

```powershell
npm run verify:web-live -- --url https://promogrind.bet
```

Run the public claims gate directly:

```powershell
node scripts/check-public-claims.mjs
```

A failed live probe is release evidence. Static source files such as `public/_headers` do not prove that a hosting edge delivered those headers.

## Build and preview

```powershell
npm run build
npm run preview
```

`npm run build:pages` creates the GitHub Pages artifact and performs its post-build routing step. Deployment is controlled by repository workflows; do not treat an arbitrary local upload as a supported production release. See `docs/ROLLBACK.md` for the forward-revert rollback procedure.

## Architecture

- `src/` — React application, calculator math, local state, workflow and trust contracts.
- `supabase/functions/` — authenticated edge functions and shared server validation.
- `public/` — static education, legal, agent-readable, localization, and standard-file surfaces.
- `scripts/` — deterministic build, test, security, claims, launch, and evidence checks.
- `context/` — public-safe project state and decision records.
- `docs/` — public-safe product, release, rights, and audit documentation.

## Privacy and trust boundaries

Promo Advisor redacts supported direct identifiers before analysis. Bankroll and active-book personalization are off by default and leave the browser only after explicit consent. Portable Passport and provenance reports are self-attested integrity summaries; they are not independent identity verification. See `/privacy/`, `/data-policy/`, and `/disclaimer/` for the public contracts.

## Contributing and release discipline

Keep changes narrow, add regression coverage, and run `npm run verify:launch-local` before release. Never weaken a gate to make an external dependency appear ready. Production release remains gated by current staging, security-header, email, payment, authentication, and tester evidence.

## Rights

Copyright © 2026 VaultSpark Studios LLC. All rights reserved.

PromoGrind code, content, assets, and designs are proprietary unless an approved file explicitly states otherwise. No open-source license is granted by this repository.
