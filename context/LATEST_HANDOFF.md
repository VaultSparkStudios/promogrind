# Latest Handoff

This repo now keeps only a public-safe handoff summary. Detailed handoff history is maintained privately.

## Session 47 (2026-04-15) — IN PROGRESS

**Session Intent:** Upgrade PromoGrind's operator intelligence, feedback loop, and launch-readiness truthfulness in one integrated tranche rather than adding more isolated features.

## Current Delta (Session 47 — in progress)

- Launch readiness is being upgraded into a scored command-center model derived from validation, monetization, affiliate coverage, rollout, and blocker state.
- Result feedback now captures skip reasons, execution friction, and notes so Track can learn from blocked workflows, not just settled outcomes.
- Promo Advisor now requests and normalizes richer machine-usable fields (`promoType`, `calculatorSlug`, `confidence`, `riskFlags`, `opportunityScore`, `opsTags`) and the app shell now supports quick routing into recommended calculators.
- AI Action Plan output is being moved toward richer structured actions with priority, target book, calculator slug, and ops tags.
- Remaining work in this tranche: validate repo state, deploy updated edge functions, and continue the deeper roadmap items (PromoGraph, workflow inbox, personalized action ranking, Studio OS export layer) in follow-up sessions.

## Session 46 (2026-04-15) — CLOSED

**Session Intent:** Complete the active Now bucket, finish repo-side launch-readiness work for social/friend sharing, push to GitHub, and close out memory/context cleanly.

## Where We Left Off (Session 46 — CLOSED)

- Shipped: 6 improvements across 4 groups — route extraction, onboarding progress, push-brief wiring, launch-readiness truthfulness
- Tests: 153/153 passing · delta: +3
- Deploy: pending — repo changes committed; S45 edge-function hardening and `send-daily-brief` still require deployment
- Session type: implementation + closeout

## Current Delta Since S45

- Extracted Home `Get Started`, `What's New`, and `About` into `src/routes/HomeRoutes.jsx` and moved onboarding progress state into `src/onboarding.js`.
- Added a visible onboarding-progress card to the dashboard and a matching progress strip in the Home setup flow so friend-facing users can see what remains before launch confidence is real.
- Upgraded Daily Brief from a localStorage-only toggle to real browser push-subscription attempts via `src/sw-register.js`, with authenticated writes to `push_subscriptions` when VAPID config is present.
- Updated `supabase/functions/send-daily-brief/index.ts` so the payload now targets `https://promogrind.bet/#/daily-brief` instead of the deprecated Vault path.
- Tightened launch-readiness truthfulness: monetization readiness now counts referral links as well as affiliate links, and the launch blocker list now reflects the true remaining manual work.
- Added onboarding + monetization test coverage and re-validated the repo end-to-end.
- Validation after closeout: `npm.cmd test`, `npm.cmd run build`, `npm.cmd run check:bundle`, `npm.cmd run smoke:launch`, and `npm.cmd run smoke:browser` all passed.
- Remaining manual / external blockers: deploy S45 edge-function hardening, deploy/enable the Daily Brief push path, run Stripe smoke, finish the remaining referral links, and perform the friend-facing pass.

### Shipped this session

**feat(s46): close repo-side launch readiness and refresh closeout memory**
- `src/routes/HomeRoutes.jsx`, `src/onboarding.js`, `src/App.jsx` — extracted Home launch routes, durable onboarding-state helpers, and app-shell wiring updates
- `src/components/dashboard/TodayDashboardPanel.jsx`, `src/components/dashboard/DailyBriefPage.jsx`, `src/sw-register.js` — dashboard onboarding progress, real push-subscription wiring, and Daily Brief toggle upgrades
- `src/books.js`, `src/dashboard/today.js`, `src/launchState.js`, `.env.example` — launch-readiness truthfulness, monetization helper updates, and explicit VAPID public-key guidance
- `supabase/functions/send-daily-brief/index.ts` — live PromoGrind Daily Brief target path
- `src/__tests__/onboarding.test.js`, `src/__tests__/books.test.js` — onboarding + monetization helper coverage
- `context/CURRENT_STATE.md`, `context/TASK_BOARD.md`, `context/LATEST_HANDOFF.md`, `context/SELF_IMPROVEMENT_LOOP.md`, `context/TRUTH_AUDIT.md`, `context/PROJECT_STATUS.json`, `logs/WORK_LOG.md`, `audits/2026-04-15-2.json` — closeout memory refreshed to S46 state

## Session 45 (2026-04-15) — CLOSED

**Session Intent:** Audit project with score, produce refinement plan covering features/depth/UX/feedback/security/speed, and recommend a single top-priority combined list. Innovative, genius-level thinking.

## Where We Left Off (Session 45 — CLOSED)

- Shipped: 10 improvements across 6 groups — trust/confidence layer, promo intake, shadow-book projection, accessibility/loading polish, edge hardening, performance/security guardrails
- Tests: 150/150 passing · delta: +16
- Deploy: pending — repo changes committed; S45 edge-function rate-limit hardening still requires deployment
- Session type: implementation + recovery + closeout

## Current Delta Since S44

- Recovered an interrupted S45 refinement tranche and stabilized the worktree back to green validation.
- Added calculator trust badges plus adaptive accuracy aggregation scoped by calculator, promo type, and book.
- Added sensitivity helpers/chips to Bonus Bet, Profit Boost, and First Bet so result rows show how much profit moves if hedge odds drift.
- Added a new Home `Promo Intake` route with deterministic pasted-promo parsing and calculator recommendation.
- Added Shadow Book Mode to quantify first-month upside from books the user has not opened yet.
- Added reusable state primitives in `src/ui.jsx`, upgraded a few loading surfaces, and added `Escape` close support / dialog semantics to `AuthDialog`.
- Added Cloudflare Pages security headers in `public/_headers`, image optimization prebuild output (`og-image.avif` + `og-image.webp`), and a bundle-budget guard script.
- Added durable `vault_events`-backed rate limiting on top of first-line in-memory burst limiting for `promo-chat`, `promo-advisor`, `ai-action-plan`, and `stack-builder`.
- Added keyboard navigation for the primary and secondary tab bars (`ArrowLeft`, `ArrowRight`, `Home`, `End`) plus ARIA tab semantics.
- Confirmed the repo no longer contains the old orphan root `.jsx` duplicates called out in the audit backlog.
- Validation after recovery: `npm.cmd test`, `npm.cmd run build`, `npm.cmd run check:bundle`, `npm.cmd run smoke:launch`, and `npm.cmd run smoke:browser` all passed (`smoke:browser` required elevated execution in this environment).
- Remaining S45 code follow-ups: broader keyboard-nav polish outside the tab bars and continued `App.jsx` route extraction.
- Remaining manual / external blockers: Stripe smoke, remaining referral links, friend-facing browser/account-flow pass, and deployment of the S45 edge-function hardening changes.

### Shipped this session

**feat(s45): recover refinement tranche, harden edges, and close out validation**
- `src/intake/parse.js`, `src/components/PromoIntakePanel.jsx`, `src/routes/PromoIntakeRoute.jsx` — deterministic pasted-promo parsing, normalized promo card, calculator recommendation, and first extracted route pattern
- `src/lib/shadow.js`, `src/components/ShadowBookPanel.jsx` — first-month upside projection for books the user has not opened yet
- `src/components/CalculatorTrustBadge.jsx`, `src/lib/shared.js`, `src/components/SensitivityChip.jsx`, `src/track/insights.js` — adaptive trust score, sensitivity bands, and safer feedback UUID generation
- `src/ui.jsx`, `src/components/AuthDialog.jsx`, `src/components/LiveScanner.jsx`, `src/components/PromoChat.jsx`, `src/App.jsx` — state primitives, improved loading surfaces, keyboard-accessible tab bars, and better auth-dialog semantics
- `public/_headers`, `index.html`, `package.json`, `scripts/optimize-images.mjs`, `scripts/check-bundle-budget.mjs`, `public/og-image.avif`, `public/og-image.webp` — security headers, motion guard, image optimization pipeline, and bundle-budget enforcement
- `supabase/functions/_shared/http.ts`, `promo-chat`, `promo-advisor`, `ai-action-plan`, `stack-builder` — durable `vault_events`-backed rate limiting layered on top of burst protection
- `context/CURRENT_STATE.md`, `context/TASK_BOARD.md`, `context/LATEST_HANDOFF.md`, `logs/WORK_LOG.md`, `context/SELF_IMPROVEMENT_LOOP.md`, `context/TRUTH_AUDIT.md`, `context/PROJECT_STATUS.json`, `audits/2026-04-15.json` — closeout memory refreshed to S45 state

## Where We Left Off (Session 44 — CLOSED)

- Shipped: 4 improvements across 4 groups — track analytics, post-result workflow capture, browser smoke coverage, referral-link monetization
- Tests: 134/134 passing · delta: +1
- Build: passing · browser launch smoke: passing
- Deploy: repo changes committed; manual Stripe smoke and remaining referral-link setup still pending
- Session type: implementation + closeout

### Shipped this session

**feat(s44): close launch-readiness gaps around tracking and monetization**
- `src/track/insights.js` — pure analytics model for result-feedback normalization, hit-rate aggregation, and best-book ranking
- `src/components/TrackInsights.jsx` — new Track `Edge` dashboard with realized P/L, promo-type hit rate, calculator accuracy, and unsettled workflow settlement queue
- `src/components/ResultFeedbackCard.jsx` — reusable "placed / skipped / settled / actual profit / calculator accurate?" capture surface for key workflows
- `src/App.jsx` — wired the Track `Edge` tab plus post-result capture into Bonus Bet, Profit Boost, and First Bet Safety Net flows
- `src/__tests__/trackInsights.test.js` — coverage for the new analytics helpers
- `scripts/validate-browser-launch-smoke.mjs` — validates launch routes plus built-client markers for age gate, auth dialog, sportsbook CTA, pricing, auth menu billing, and mobile layout hooks
- `src/books.js` — configured personal referral URLs for DraftKings, FanDuel, and Caesars
- `context/CURRENT_STATE.md`, `context/TASK_BOARD.md`, `context/PROJECT_STATUS.json`, `context/TRUTH_AUDIT.md`, `logs/WORK_LOG.md` — memory refreshed to S44 state

### Validation
- `npm.cmd test` → 134/134 passing
- `npm.cmd run build` → passing
- `node scripts\validate-browser-launch-smoke.mjs` → passing

### Open blockers / follow-ups
- Run the Stripe flow in `docs/STRIPE_SMOKE_TEST.md`
- Paste the remaining personal referral links into `src/books.js`
- Manually run a friend-facing account-flow/browser pass against the deployed app

### Session Intent: Implement all genius hit list items at highest/optimal quality · Outcome: Achieved

## Current Delta Since S43

- Session 44 intent: implement the current Genius hit list at highest quality, anchored to the forced Track analytics dashboard, the post-result feedback loop, and expanded browser smoke coverage.
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
- [ ] **Deploy S45 edge-function hardening** — deploy `promo-chat`, `promo-advisor`, `ai-action-plan`, and `stack-builder` so the durable rate limits added this session are live
- [ ] **Stripe smoke test** — use the flow in `docs/STRIPE_SMOKE_TEST.md` against the deployed app and confirm `subscriptions` writes + customer-portal redirect
- [ ] **Affiliate/referral links** — paste the remaining real referral URLs into `src/books.js` so CTA clicks monetize correctly
- [ ] **Friend beta pass** — create/sign in with a friend-facing PromoGrind account and verify the project-local auth + calculator flow feels launch-ready

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
