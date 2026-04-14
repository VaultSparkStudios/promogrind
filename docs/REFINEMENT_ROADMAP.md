# Refinement Roadmap

Public-safe execution roadmap derived from the 2026-04-14 audit.

## Objective

Turn PromoGrind from a high-scope calculator product into a trusted operating system for promo grinders:

- faster first-use success
- stronger daily return loop
- safer backend/privacy posture
- lower maintenance drag
- better monetization at the moment of user value

## Priority Order

### 1. Platform Hardening

- Break `src/App.jsx` into domain modules: shell, dashboard, calculators, onboarding, community, AI, alerts, monetization.
- Replace client-side trust shortcuts with server-verified entitlements where missing.
- Restrict edge-function CORS to approved origins and standardize JSON responses.
- Reduce extension DOM injection risk by replacing string-built UI with DOM-built nodes.
- Tighten analytics privacy defaults and lower passive replay sampling.

### 2. Activation Loop

- Redesign the default experience around a high-signal "Today" dashboard.
- Add one-click resume for unfinished calculations, open promos, expiring offers, and unsettled ledger items.
- Convert onboarding from static education into guided actions with completion state and next-best-action prompts.
- Instrument the full activation funnel: first result, first save, first ledger entry, first return visit, first CTA click.

### 3. Feedback Loop

- Add post-result prompts: placed, skipped, settled, actual profit, calculator accuracy.
- Turn settled outcomes into personalized recommendations and user-visible confidence signals.
- Add per-promo confidence and friction scores: EV quality, rollover friction, time sensitivity, hedge complexity.

### 4. Product Depth

- Add promo intake normalization: pasted text, screenshot parse, extension capture.
- Build saved playbooks by promo type, bankroll tier, and available books.
- Add state-aware and book-aware personalization for CTAs and workflows.
- Expand community proof into verified promo intel with freshness and report quality controls.

### 5. Performance + Ops

- Set bundle budgets in CI for the main app chunk and analytics chunk.
- Move more non-core surfaces off the initial render path.
- Expand browser smoke coverage for mobile and conversion-critical flows.
- Add an observability dashboard for activation, retention, AI usage, and monetization.

## Immediate Build Sequence

1. Harden privacy/security defaults.
2. Fix outdated distribution surfaces and extension safety.
3. Extract app shell and dashboard state out of `App.jsx`.
4. Build the "Today" dashboard and result-to-settlement feedback loop.
5. Ship promo intake and playbooks.
