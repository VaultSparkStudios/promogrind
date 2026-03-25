# Decisions

Append new entries. Do not erase historical reasoning unless it is wrong.

## Entry template

### YYYY-MM-DD - Decision title

- Status:
- Context:
- Decision:
- Alternatives considered:
- Why this was chosen:
- Follow-up:

---

### 2026-03-24 - Zero-backend static architecture

- Status: Decided
- Context: Need to ship a promo conversion tool quickly with no hosting costs and maximum reliability.
- Decision: Pure static app — React + Vite, localStorage for persistence, no server, deployable to Vercel/Netlify/GitHub Pages for free.
- Alternatives considered: Node.js backend with user accounts; Supabase for persistence.
- Why this was chosen: Zero ops burden, zero cost, instant global CDN delivery, no auth complexity. Users get isolated data in their own browser. Tool works offline.
- Follow-up: Revisit when live odds API (v2 paid tier) requires a backend proxy for API key security.

### 2026-03-24 - Affiliate links as primary monetization

- Status: Decided
- Context: Need a revenue model that doesn't conflict with the free-tool positioning.
- Decision: Embed affiliate/referral links in `src/books.js` pointing to sportsbook partner programs. Revenue comes from CPA commissions when users sign up.
- Alternatives considered: Subscription paywall; ads.
- Why this was chosen: Aligns incentives (tool recommends books that reward the operator), doesn't degrade user experience, proven model in this vertical.
- Follow-up: Apply to DraftKings Partners, FanDuel Partners, BetMGM Partners. Use personal referral links as immediate placeholder.

### 2026-03-24 - Vanilla CSS, no UI framework

- Status: Decided
- Context: Choosing a styling approach for the app.
- Decision: Vanilla CSS with theme constants in `src/theme.js`. No Tailwind, no MUI, no styled-components.
- Alternatives considered: Tailwind CSS; shadcn/ui.
- Why this was chosen: Smallest possible bundle, fastest load, no dependency churn, full control over every pixel.
- Follow-up: None — locked unless a major redesign is warranted.

### 2026-03-24 - Vault Member auth gate via Supabase

- Status: Decided + implemented
- Context: Owner wants PromoGrind restricted to Vault Members only, with invite-code-based friend access. App was previously zero-backend static.
- Decision: Supabase handles auth (email+password), invite code validation, and vault_members records. PromoGrind adds a session gate in `src/auth.js` + `src/App.jsx`. Cross-domain sessions use URL hash token handoff (Supabase standard pattern). The gate is generic — any future tool copies `src/auth.js` + adds Supabase env vars to join the system.
- Alternatives considered: VPS (IONOS/DigitalOcean) — rejected as over-engineered for current needs; full self-hosted auth — rejected as ops burden without benefit at this stage.
- Why this was chosen: Supabase free tier covers the full use case (50K MAU, managed Postgres, built-in email auth). Near-zero ops. Invite code + account creation + welcome email all handled. VPS remains the right answer later when VaultFront needs a game backend.
- Follow-up: When VaultFront backend launches, Supabase continues as the auth/DB layer alongside the VPS game server.

### 2026-03-24 - Public repo visibility

- Status: Decided
- Context: Deciding whether PromoGrind should be public or private on GitHub.
- Decision: Public repo under VaultSparkStudios. Consistent with all other VaultSpark project repos.
- Alternatives considered: Private repo (to prevent competitor copying).
- Why this was chosen: Studio pattern is public repos. Open source positioning builds trust and discoverability. Affiliate links are in `src/books.js` and easily swapped by anyone forking, so obscuring the source provides little protection.
- Follow-up: If a proprietary paid tier is built, keep that code in a separate private repo.

### 2026-03-24 - VaultSparked as studio-wide membership tier

- Status: Decided + implemented
- Context: Owner wanted a Pro tier for PromoGrind that could extend across all future studio tools and games without per-product upsell complexity.
- Decision: VaultSparked — $24.99/month additive membership. Every new feature and tool included automatically. Plan identifier: `vault_sparked` in subscriptions table. `isPro()` in PromoGrind accepts both `vault_sparked` and legacy `pro` plan.
- Alternatives considered:
  - PromoGrind-only Pro plan — rejected as too narrow, creates fragmented subscription UX as studio grows
  - Per-game/per-tool pricing — rejected as user-hostile and ops-heavy
  - Lower price ($9.99) — rejected; additive model with full studio access justifies premium price
- Why this was chosen: One subscription, one checkout flow, zero per-product billing. Future features fold in automatically — no "new plan" needed. VaultSparked name ties to top rank "The Sparked", unique and ownable commercially.
- Follow-up: Do not activate live Stripe until LLC + EIN obtained. Test mode safe now.
  Edge function secrets needed: `STRIPE_VAULT_SPARKED_PRICE_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
