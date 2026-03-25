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

- Status: Superseded (backend added in session 2)
- Context: Need to ship a promo conversion tool quickly with no hosting costs and maximum reliability.
- Decision: Pure static app — React + Vite, localStorage for persistence, no server, deployable to Vercel/Netlify/GitHub Pages for free.
- Alternatives considered: Node.js backend with user accounts; Supabase for persistence.
- Why this was chosen: Zero ops burden, zero cost, instant global CDN delivery, no auth complexity. Users get isolated data in their own browser. Tool works offline.
- Follow-up: Backend added in session 2 via Supabase (auth gate, cloud sync, subscriptions).

### 2026-03-24 - Affiliate links as primary monetization

- Status: Decided — links not yet wired (placeholders in src/books.js)
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
- Context: Owner wants PromoGrind restricted to Vault Members only, with invite-code-based friend access.
- Decision: Supabase handles auth (email+password), invite code validation, and vault_members records. Cross-domain sessions use URL hash token handoff (Supabase standard pattern).
- Alternatives considered: VPS (IONOS/DigitalOcean) — rejected as over-engineered; full self-hosted auth — rejected as ops burden.
- Why this was chosen: Supabase free tier covers full use case. Near-zero ops. Invite code + account creation + welcome email all handled.
- Follow-up: When VaultFront backend launches, Supabase continues as auth/DB layer alongside VPS game server.

### 2026-03-24 - Public repo visibility

- Status: Decided
- Context: Deciding whether PromoGrind should be public or private on GitHub.
- Decision: Public repo under VaultSparkStudios.
- Alternatives considered: Private repo.
- Why this was chosen: Studio pattern is public repos. Open source builds trust and discoverability. Affiliate links are easily swapped by anyone forking — obscuring source provides little protection.
- Follow-up: If proprietary paid tier is built, keep that code in a separate private repo.

### 2026-03-24 - VaultSparked as studio-wide membership tier

- Status: Decided + implemented
- Context: Owner wanted a Pro tier for PromoGrind extensible across all future studio tools.
- Decision: VaultSparked — $24.99/month additive membership. Every new feature and tool included automatically. `isPro()` accepts both `vault_sparked` and legacy `pro` plan.
- Alternatives considered: PromoGrind-only Pro plan; per-tool pricing; $9.99 lower price.
- Why this was chosen: One subscription, one checkout, zero per-product billing. Future features fold in automatically.
- Follow-up: Do not activate live Stripe until LLC + EIN obtained.

### 2026-03-25 - No separate domain; stays on vaultsparkstudios.com

- Status: Decided
- Context: promogrind.com and similar domains were evaluated but no suitable name was available at an acceptable price/quality tradeoff.
- Decision: PromoGrind stays permanently at vaultsparkstudios.com/promogrind/. No separate domain.
- Alternatives considered: promogrind.com; other TLDs.
- Why this was chosen: Domain search came up empty for good options. SEO equity concentrates on the studio domain rather than splitting. Subdirectory routing already working cleanly.
- Follow-up: None — URL is stable, canonical is set. If a compelling domain appears later, migration is a Vite base path change + redirect.

### 2026-03-25 - Odds API cost managed by VaultSparked gate

- Status: Decided
- Context: The Odds API charges ~$0.002/request. With 2-min auto-refresh, a single active user generates ~720 req/day.
- Decision: Free users are fully gated out of the scanner (upgrade wall). Only VaultSparked subscribers ($24.99/mo) trigger API calls. At 5-min refresh, API cost per subscriber is ~$1.44/mo — 94% margin.
- Alternatives considered: Open free scanner with rate limiting; cached shared results.
- Why this was chosen: VaultSparked gate already existed. API cost is naturally bounded by subscription revenue. No additional infrastructure needed.
- Follow-up: When 10+ concurrent VaultSparked users exist, add shared odds cache in Supabase (one API call serves all concurrent users). Also change refresh from 120s → 300s immediately on Odds API activation.

### 2026-03-25 - Props scanner as opt-in toggle

- Status: Decided + implemented
- Context: Player prop markets generate more arb/EV opportunities but each sport has 5-20+ distinct market keys, increasing API request size and cost.
- Decision: Props added as a PROPS toggle in the scanner UI. Off by default. When enabled, adds the top 4-5 prop market keys for the selected sport.
- Alternatives considered: Always-on props; separate props tab.
- Why this was chosen: Cost-conscious. Users who want prop scanning can enable it. Default behavior (h2h + spreads + totals) covers most opportunities without ballooning API costs.
- Follow-up: Monitor API usage after launch. If prop market cost is negligible, make it default-on.

### 2026-03-25 - Leaderboard anonymization

- Status: Decided + implemented
- Context: Vault points leaderboard displays all users — need to balance engagement with privacy.
- Decision: Users displayed as "Grinder #XXXX" (last 4 chars of UUID, uppercase). No email or real name shown.
- Alternatives considered: Show email (too invasive); let users set display names (extra DB column + UI).
- Why this was chosen: Immediate implementation with zero schema changes. Engaging enough for gamification. Can upgrade to user-chosen display names later.
- Follow-up: Add optional display_name field to profiles table if users request it.
