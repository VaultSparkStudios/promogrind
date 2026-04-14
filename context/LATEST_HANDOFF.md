# Latest Handoff

This repo now keeps only a public-safe handoff summary. Detailed handoff history is maintained privately.

## Current Delta Since S43

- PromoGrind now owns the visible account flow in-app via `src/components/AuthDialog.jsx`; account creation and sign-in no longer use the Vault member page as the primary UX.
- Shared Vault identity remains intact underneath via shared Supabase auth plus shared `display_name` / `username` metadata.
- Active React surfaces now point to PromoGrind-local auth links instead of Vault-branded signup CTAs.
- Validation after the auth change: `npm.cmd test`, `npm.cmd run build`, and `npm.cmd run smoke:launch` all passed.
- Remaining launch blockers are now narrower: Stripe smoke test, real referral links, and one friend-facing manual account-flow check.

## Where We Left Off (Session 43 — CLOSED)

- Shipped: 3 improvements across 3 groups — dashboard extraction, Today dashboard, launch-copy/smoke alignment
- Tests: 133/133 passing · delta: +6
- Build: passing · launch smoke: passing
- Deploy: repo changes committed; Supabase edge-function deploy and Stripe smoke remain pending
- Session type: implementation + closeout

### Shipped this session

**feat(s43): extract dashboard state and align launch copy**
- `src/dashboard/today.js` — shared snapshot helpers for today promos, bankroll posture, unfinished work, and next-best action
- `src/components/dashboard/TodayDashboardPanel.jsx` — dedicated Today panel for expiring promos, unfinished work, bankroll posture, and recent settled profit
- `src/components/dashboard/DailyBriefPage.jsx` — Daily Brief extracted out of `src/App.jsx`
- `src/App.jsx` — dashboard now consumes the extracted model/components; next-best-action logic reads from shared dashboard helpers
- `src/__tests__/dashboard.test.js` — unit coverage for dashboard derivation logic
- `public/landing/index.html`, core SEO calculator pages, comparison pages, and `docs/SEO_TRUST_STRIP_TEMPLATE.md` — PromoGrind-native account wording synced across smoke-covered launch surfaces
- `scripts/validate-launch-smoke.mjs`, `scripts/validate-browser-launch-smoke.mjs` — smoke validators updated to current copy expectations
- `context/CURRENT_STATE.md`, `context/TASK_BOARD.md`, `context/PROJECT_STATUS.json`, `context/TRUTH_AUDIT.md`, `logs/WORK_LOG.md` — memory refreshed to S43 state

### Validation
- `npm.cmd test` → 133/133 passing
- `npm.cmd run build` → passing
- `npm.cmd run smoke:launch` → passing

### Open blockers / follow-ups
- Deploy updated Supabase functions: `promo-chat`, `promo-advisor`, `ai-action-plan`, `stack-builder` (local deploy attempt blocked here because Supabase auth token/login is not configured)
- Apply `scripts/migration-wins-wall.sql` in Supabase SQL Editor
- Run the Stripe flow in `docs/STRIPE_SMOKE_TEST.md`
- Run browser smoke on a host/environment that allows the preview subprocess; this local environment still throws `spawn EPERM`

### Session Intent: Complete all at highest quality · Outcome: Achieved

## Human Action Required
- [ ] **Supabase deploy auth** — run `supabase login` or set `SUPABASE_ACCESS_TOKEN`, then deploy `promo-chat`, `promo-advisor`, `ai-action-plan`, and `stack-builder`
- [ ] **Stripe smoke test** — use the flow in `docs/STRIPE_SMOKE_TEST.md` against the deployed app and confirm `subscriptions` writes + customer-portal redirect
- [ ] **Affiliate/referral links** — paste real referral URLs into `src/books.js` so CTA clicks monetize correctly
- [ ] **wins_wall Supabase table** — apply `scripts/migration-wins-wall.sql` so Dashboard Wins Wall can read server entries

## Where We Left Off (Session 42 — CLOSED)

- Shipped: audit-memory update + security/privacy hardening tranche 1
- Tests: 127/127 passing
- Build: passing
- Deploy: code-only changes in repo; updated edge functions still require deployment
- Session type: audit follow-through + implementation

### Shipped this session

**feat(s42): audit follow-through and hardening tranche 1**
- `docs/REFINEMENT_ROADMAP.md` — public-safe execution roadmap covering modularization, activation loop, feedback loop, personalization, observability, and performance budgets
- `context/TASK_BOARD.md` — expanded with top-priority implementation queue from the audit
- `supabase/functions/_shared/http.ts` — shared CORS + JSON response helper with approved-origin defaults
- `create-checkout`, `promo-chat`, `promo-advisor`, `customer-portal`, `gift-trial` — moved off wildcard CORS and standardized JSON responses
- `src/analytics.js` — replay privacy tightened (`maskAllText`, `blockAllMedia`) and passive sampling reduced
- `extension/popup.js`, `extension/content.js` — canonical domain updated to `promogrind.bet`; dynamic UI now built with DOM APIs instead of string-built `innerHTML`
- `context/CURRENT_STATE.md`, `logs/WORK_LOG.md` — memory refreshed to S42 state

### Open blockers / follow-ups
- Deploy updated Supabase functions: `create-checkout`, `promo-chat`, `promo-advisor`, `customer-portal`, `gift-trial`
- Run browser smoke after deployment
- Start tranche 2 extraction: app shell + dashboard state out of `src/App.jsx`
- Build the "Today" dashboard and post-result feedback loop

### Session Intent: Make the audit durable and implement the highest-leverage hardening items · Outcome: Achieved

---

## Where We Left Off (Session 41 — CLOSED)

- Shipped: Sprint 1 hardening + activation + performance + revenue measurement
- Tests: 127/127 passing
- Build: passing
- Deploy: code pushed to GitHub; Supabase edge function deployment and SQL migration remain manual follow-ups
- Session type: implementation + closeout

### Shipped this session

**feat(s41): Sprint 1 hardening and activation**
- `supabase/functions/_shared/ai-access.ts` — shared server-side AI entitlement/quota helper
- `promo-chat`, `promo-advisor`, `ai-action-plan`, `stack-builder` edge functions — server-side auth, tier checks, quota counting via `vault_events`, and usage metadata
- `src/App.jsx` — sportsbook CTA click tracking, Wins Wall upsert path, Dashboard "Next Best Action" card, PromoChat/PromoAdvisor lazy-load
- `src/components/PromoAdvisorPanel.jsx` — guest calls blocked client-side and remaining quota consumes server response
- `vite.config.js` — analytics split into its own manual chunk
- `scripts/migration-wins-wall.sql` — metadata, unique user/period key, stricter RLS checks, update policy
- `docs/STRIPE_SMOKE_TEST.md` — checkout/webhook/customer-portal smoke checklist
- `context/TASK_BOARD.md` — audit backlog and deployment follow-ups updated

### Validation
- `npm.cmd test` → 127/127 passing
- `npm.cmd run build` → passing
- Main app chunk reduced from ~851 kB to ~392 kB; oversized main app warning cleared

### Open blockers / follow-ups
- Deploy updated Supabase functions: `promo-chat`, `promo-advisor`, `ai-action-plan`, `stack-builder`
- Apply `scripts/migration-wins-wall.sql` in Supabase SQL Editor
- Paste real referral/affiliate links into `src/books.js`
- Run `docs/STRIPE_SMOKE_TEST.md`

### Session Intent: Complete Sprint 1 and close out to GitHub · Outcome: Achieved

---

## Where We Left Off (Session 40 — CLOSED)

- Shipped: 0 product changes · 2 protocol commits across 2 repos (promogrind, vaultspark-studio-ops)
- Tests: 127/127 passing · delta: 0 · Deploy: N/A (no code changes)
- Session type: protocol alignment pass

### Shipped this session

**chore(s40): protocol alignment with studio-ops** (promogrind `70d1a73`)
- `context/DECISIONS.md` — CANON-007 staging disposition (`stagingType: "local"` while FORGE; Hetzner required at SPARKED transition) + protocol alignment pass log
- `context/TASK_BOARD.md → Later` — Hetzner staging task queued for SPARKED transition

**chore: refresh PromoGrind registry entry to live S39 state** (vaultspark-studio-ops `cbf5a41`)
- `portfolio/PROJECT_REGISTRY.json` — 10 fields corrected: summary (11→53 calculators), currentFocus, nextMilestone, runtimeUrl (vaultsparkstudios.com/promogrind/ → https://promogrind.bet), localPath slug casing, lastInitiated, stagingType (github-pages → local per enum), supabaseHost, revenueModel, stripeLiveKeyConfigured (false → true), stripeProductionPriceIds (empty → 7 live IDs)

### Alignment items completed
- Session lock written (`context/.session-lock`)
- Auto-memory `user_profile.md` refreshed (removed stale promogrind.com migration claim; promoted promogrind.bet to live; added LLC status)
- Ops registry entry drift closed
- CANON-007 disposition logged with transition trigger

### Open blockers (unchanged from S39)
- Affiliate/referral links in `src/books.js` — last code blocker before Reddit launch
- `wins_wall` Supabase table (server-side, not in this repo)

### Session Intent: Align PromoGrind with vaultspark-studio-ops protocol · Outcome: Achieved

---

## Where We Left Off (Session 39 — CLOSED)

### Shipped this session (3 commits)

**feat(s39): beta invite code system — redeem-beta-code edge fn + UserMenu UI**

#### Beta Invite Code System
- `beta_codes` Supabase table created (RLS enabled, service-role-only access); 10 PGBETA-XXXX single-use codes seeded (Runner tier, 30 days each)
- New `supabase/functions/redeem-beta-code/index.ts` — auth via JWT, validates code (exists + not exhausted), upserts subscription row (plan='runner', status='active', current_period_end=+30d), marks code used
- New `redeemBetaCode(code)` in `src/auth.js` — calls edge fn with auth header
- `UserMenu.jsx` — "Have a beta invite code?" collapsible section in Subscription panel, only visible to Free Agent tier users; input + Apply button; auto-reloads page on success so tier badge updates immediately
- `.beta-codes` file created (gitignored) — local reference for all 10 codes
- `.gitignore` updated to exclude `.beta-codes`

#### Secrets audit (S39 confirmed)
- `RESEND_API_KEY` — confirmed set (task board was stale from S38)
- Stripe Customer Portal config — `bpc_1TLsRNGMN60PfJYsM0S0ByAh` already active and pinned in edge function
- All Supabase secrets confirmed live: Stripe (sk_live + 7 prices + webhook), ANTHROPIC_API_KEY, VAPID keys, RESEND, DIGEST secrets

#### Existing promo codes (in Stripe, already set up)
- `VAULTFRIEND` — 100% off, 1 month (for paid checkout flow)
- `FOUNDER50` — 50% off, 3 months
- `BETAPASS` — 30% off, forever

**feat(s39): Home tab suite + global text size increase**

#### Home Tab Suite
- 5 new Home tabs: Daily Brief, Get Started, What's New, Pricing (duplicate), About
  - `DailyBriefPage` — today's promo schedule, quick actions 2×2 grid, 9am briefing toggle (localStorage), open bets counter
  - `GetStarted` — 6-step onboarding guide with useNavigate() links to key features
  - `WhatsNew` — static changelog v23.3.0–v23.7.0 with version badge + sprint labels
  - `AboutPage` — full app stats, feature grid, trust badges, contact info, legal links
  - `PricingPage` — duplicate of existing Pricing tab added to Home group
- TABS Home group expanded: Dashboard · Daily Brief · Get Started · What's New · Pricing · About

#### Global Text Size Increase
- `src/lib/shared.js`: S.label 10→11px, S.input 13→14px, S.note 12→13px, S.help 12→13px, S.helpH 14→15px
- `src/ui.jsx`: RR label 12→13px, RR value 13→14px, Tl title 16→18px
- `src/App.jsx` nav: group tabs 10/11→12/13px, sub-item tabs 11→13px, subcat filters 9→11px, pinned favorites 9→11px

Build: ✓ passing · Tests: 127/127

## Human Action Required
- [ ] **Stripe smoke test** — card 4242 4242 4242 4242, verify `subscriptions` table row + customer portal redirect works end-to-end
- [ ] **Affiliate/referral links** — paste personal referral URLs into `referralLink` fields in `src/books.js`
- [ ] **wins_wall Supabase table** — create the table (component handles 404 silently but table needed for community wins wall)

## State at Handoff
- Home tab suite: live — 6 tabs in Home group (Dashboard, Daily Brief, Get Started, What's New, Pricing, About)
- Global text sizes: increased across all shared primitives + nav
- Beta invite system: deployed and live — hand PGBETA-XXXX codes to friends directly
- RESEND drip/digest: active (key confirmed set)
- Stripe Customer Portal: edge function live, UserMenu "Manage billing →" wired
- Build: ✓ passing · Tests: 127/127
- Last remaining code blocker before Reddit launch: affiliate links in src/books.js
