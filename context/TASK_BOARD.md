# Task Board

Public-safe roadmap only. Detailed backlog sequencing is maintained privately.

## Human Action Required
- [x] **Google Search Console** — verified promogrind.bet via Cloudflare DNS TXT, sitemap submitted at https://promogrind.bet/sitemap.xml
- [x] **RESEND_API_KEY** — confirmed set in Supabase secrets (S39 audit)
- [x] **Stripe Customer Portal** — config `bpc_1TLsRNGMN60PfJYsM0S0ByAh` active, pinned in edge function (S38/S39)
- [x] **Deploy S45 edge-function hardening** — `promo-chat`, `promo-advisor`, `ai-action-plan`, and `stack-builder` were redeployed to production on 2026-04-15
- [x] **Deploy `send-daily-brief` + keep push schema live** — `send-daily-brief` was deployed to production on 2026-04-15
- [ ] **Set `VITE_VAPID_PUBLIC_KEY` in production** — required for the new Daily Brief push toggle to create real browser subscriptions on the live frontend
- [ ] **Stripe smoke test** — card 4242 4242 4242 4242, verify `subscriptions` table row + "Manage billing →" portal redirect
- [ ] **Affiliate/referral links** — remaining monetization gaps are `BetMGM`, `bet365`, and `BetRivers`; ESPN BET/TheScore BET and Fanatics are now configured with real personal links
- [ ] **Friend beta pass** — manually create/sign in with a friend-facing PromoGrind account, confirm the new in-app auth flow feels project-local, and verify shared-account messaging stays secondary

## Now
- [x] PromoGraph domain layer — normalize promos, workflows, recommendations, execution state, and settlements into one shared model
- [x] Workflow inbox foundation — calculators, Promo Advisor, and AI Action Plan can now save canonical workflow entries into one shared inbox surface
- [x] Entity-aware sync foundation — `sync.js` now tracks per-entity timestamps and queues failed remote writes for later flush instead of relying only on one blob timestamp
- [x] Workflow history persistence foundation — `sync.js` now appends workflow lifecycle events locally and can hydrate/persist `workflow_state` + `workflow_history` tables when the new Supabase schema is present
- [x] Ledger + tracker entity-sync foundation — `sync.js` can now hydrate/persist `ledger_state` and `tracker_state` so those domains no longer depend only on the shared `promogrind_data` row
- [x] Workflow inbox — save AI/advisor/calculator outputs as queued → ready → placed → waiting → settled workflows — **DONE S51**: Workflow inbox cards now expose explicit queued → ready → placed → waiting controls, keep workflow/result-feedback state in sync, and route waiting items back into Track for settlement
- [x] Workflow provenance foundation — Track now exposes source-level provenance plus a recent workflow timeline
- [x] Self-calibration foundation — Track now summarizes expected vs actual settled profit drift for the current workflow loop
- [x] Studio export foundation — Launch Command Center can now emit a structured Studio snapshot covering launch, growth, workflows, and intelligence signals
- [x] Truth-drift sweep — fixed stale launch-test count and remaining legacy `vaultsparkstudios.com/promogrind` links in active repo surfaces
- [x] Personalized action ranking — next-best-action should rank by bankroll, legal state, book roster, execution history, and skip reasons — **DONE S51**: Workflow ranking now uses bankroll load, book activation, historical promo/book outcomes, friction, skip reasons, urgency, and explainable score summaries that feed dashboard next-best-action copy
- [ ] [SIL:2⛔] Drift alert — background diff of projected vs realized profit per promo type
- [ ] [SIL] Workflow provenance timeline — deepen the new durable history foundation to preserve richer provenance fields and expose cross-device transition history everywhere workflows are scored
- [ ] [SIL] Entity-aware sync continuation — move from mirrored entity tables to finer-grained conflict handling inside ledger/workflow domains, then reduce the legacy `promogrind_data` row to a compatibility layer

## Innovation Bets (new this session)
- **Launch command center** — replace static launch-readiness card with a scored operator cockpit driven by validation, monetization, rollout, and blocker state
- **Execution-friction telemetry** — capture why workflows were skipped or blocked, then feed that back into Track and the next-best-action loop
- **Structured AI decision cards** — force Promo Advisor / Action Plan outputs into calculator-aware, ops-tagged JSON instead of prose-only blobs
- **Workflow inbox scoring** — score open workflows by status, EV, confidence, friction, recency, and bankroll fit instead of listing them flat
- **Studio intelligence contract** — one JSON export should feed Studio OS / Ops / Hub / Social Dashboard without markdown drift
- **Truth drift sentinel** — derive launch-validation stats and canonical URLs from live repo truth, not stale copied strings
- **Offline-first sync queue** — failed remote writes should accumulate safely and flush once auth/network comes back, instead of disappearing behind a single pending flag
- **Quick-calc event routing** — AI recommendations can now deep-link directly into the right calculator instead of stopping at explanation
- **Adaptive trust score** — per-calculator × promo-type × book accuracy, visible on results
- **Sensitivity chips** — hover bands show how much output moves per 10% input change
- **Shadow book mode** — quantify weekly value of creating an account at un-owned books (drives affiliate conversion)
- **Promo intake normalizer** — paste text → PromoCard; cuts entry time from 60s to ~3s
- **Drift alert (deferred to Next)** — background diff projected vs realized per promo type; surfaces cold promo classes
- **Reason-for-skip capture (deferred to Next)** — one-tap reason when user marks skipped; becomes promo-quality signal
- **Self-calibration chart (deferred to Next)** — "Your calcs were 92% accurate last 30 days" makes the loop visible
- **Micro-NPS after 3 settlements (deferred to Next)** — 1-tap "was this worth it?" → silScore input
- [x] Audit tranche 2 — extract dashboard state from `src/App.jsx` into focused modules
- [x] Build a true "Today" dashboard: expiring promos, unfinished work, next-best action, bankroll posture, recent settled profit
- [x] Launch copy alignment — sync smoke-covered marketing pages + trust-strip template to PromoGrind-native account wording and update smoke validators
- [x] Project-local auth UX — keep account creation on PromoGrind while preserving shared Vault identity + shared username metadata
- [x] Result feedback loop — ask "placed / skipped / settled / actual profit / calculator accurate?" after key workflows
- [x] Deploy updated AI edge functions: `promo-chat`, `promo-advisor`, `ai-action-plan`, `stack-builder`
- [x] Browser smoke expansion — cover age gate, first calculator result, sportsbook CTA, pricing, auth menu, and 375px mobile layout
- [x] Domain migration — promogrind.bet purchased, Cloudflare zones + CNAME + redirect configured, GitHub Pages custom domain set
- [x] NS switch confirmed — promogrind.bet live on Cloudflare (DNS verified S37)
- [x] PostHog analytics — src/analytics.js, user identity on auth, key events tracked
- [x] Sentry error monitoring — ErrorBoundary in main.jsx, project created, VITE_SENTRY_DSN set
- [x] Cloudflare Web Analytics — free, no-cookie, beacon live in index.html
- [x] AI edge functions deployed — promo-chat + promo-advisor + ai-action-plan
- [x] All 9 GitHub Secrets set
- [x] Stripe live secrets deployed — all 7 price IDs + webhook + STRIPE_TEST_MODE=false
- [x] Age gate + compliance pages (Income Access audit)
- [x] Contrast audit — WCAG AA compliant across dark + light themes (S36)
- [x] UserMenu — 12 sports avatar emoji, editable display name, tier badge, animated dropdown (S37)
- [x] Header — sticky + backdrop-blur, responsive, auth always visible top-right (S37)
- [x] Tab bar — sticky, 44px touch targets, iOS momentum scroll, tap-delay suppression (S37)
- [x] Responsive overhaul — iOS zoom prevention, safe-area insets, scrollbar polish, touch-action (S37)
- [x] sitemap.xml — /about/ and /compliance/ added, 145 URLs total (S37)
- [x] manifest.json path fixed — /promogrind/manifest.json → /manifest.json (S37)
- [x] Promo Advisor — guest sign-in gate, explicit auth headers on edge function (S37)
- [x] Branding softened — "Free Vault Membership" → "Free PromoGrind Account" everywhere (S37)
- [x] Stripe Customer Portal edge function — `supabase/functions/customer-portal/index.ts` deployed (S38)
- [x] manageBilling() in auth.js — calls customer-portal, dispatches pg:billing-unavailable if no sub (S38)
- [x] UserMenu "Manage billing →" wired to manageBilling() — no longer links to VaultSpark (S38)
- [x] RESEND URL migration — onboarding-drip (11 URLs) + weekly-digest + create-checkout updated to promogrind.bet (S38)
- [x] onboarding-drip + create-checkout re-deployed (S38)
- [x] Beta invite code system — `beta_codes` table + `redeem-beta-code` edge function deployed (S39)
- [x] UserMenu — "Have a beta invite code?" section for Free Agent tier (S39)
- [x] Home tab suite — Daily Brief, Get Started, What's New, Pricing, About tabs added to Home group (S39)
- [x] Global text size increase — all nav/label/input/note/help/RR text bumped 1–2px (S39)
- [x] Sprint 1 hardening — shared server-side AI entitlement/quota helper wired into PromoChat, PromoAdvisor, AI Action Plan, and Stack Builder
- [x] Sprint 1 revenue measurement — sportsbook CTA click tracking added for calculator result CTAs
- [x] Sprint 1 activation UX — Dashboard now shows one prioritized next-best action
- [x] Sprint 1 performance — PromoChat/PromoAdvisor lazy-loaded and analytics split into its own build chunk
- [x] Sprint 1 Wins Wall support — migration tightened with unique user/period upsert support and client publish path updated

## Next
- [ ] Studio OS / ops export layer — expand the new snapshot foundation into a durable machine-consumable contract with publish/history support
- [ ] [SIL:2⛔] Drift alert — background diff of projected vs realized profit per promo type
- [ ] Push alert targeting — move beyond generic daily brief toward higher-EV / state-aware promo alerts now that the subscription plumbing exists
- [x] Reason-for-skip capture — one-tap reason when user marks skipped in ResultFeedbackCard (odds moved / EV too low / deposit capped) — **DONE S51**: Skip reasons are now not only captured but also surfaced back into workflow scoring and Track skip-reason reporting
- [x] [SIL:2⛔] Self-calibration chart — surface "Your calcs were X% accurate last 30 days" inside Track — **DONE S51**: Track now renders per-promo self-calibration drift bars on top of the settled expected-vs-actual summary
- [ ] [SIL] Workflow provenance timeline — deepen the new durable history foundation to preserve richer provenance fields and expose cross-device transition history everywhere workflows are scored
- [x] [SIL] Recommendation scoring matrix — deepen the new scoring foundation to rank workflows by bankroll fit, book availability, friction history, urgency, and opportunity score instead of first-match ordering — **DONE S51**: `src/workflows/inbox.js` now scores open workflows from live history and emits explainable ranking reasons consumed by the Today dashboard and workflow inbox
- [ ] [SIL] Entity-aware sync continuation — move from mirrored entity tables to finer-grained conflict handling inside ledger/workflow domains, then reduce the legacy `promogrind_data` row to a compatibility layer
- [ ] [SIL] Workflow history surface — build richer UI around the new append-only history so users can inspect queue → ready → placed → waiting → settled transitions over time
- [ ] Micro-NPS after 3 settlements — 1-tap "Was this calc worth it?" → feeds SIL
- [ ] Move auth tokens to httpOnly cookies OR accept localStorage + add refresh-rotation test coverage for hijack scenarios
- [ ] Offline write-queue in `src/sync.js` (IndexedDB) for ledger/feedback writes when offline
- [ ] Keyboard-nav follow-through — extend beyond tab bars to pinned favorites, compare selector flows, and remaining dialog/button clusters
- [ ] Motion-reduce guard for transitions (prefers-reduced-motion)
- [ ] Aria audit pass on `src/ui.jsx` (currently 0 aria attrs)
- [ ] State-aware + book-aware personalization for sportsbook CTAs and recommended workflows
- [ ] Playbooks — reusable promo routines by bankroll, promo type, and available books
- [ ] Community intel upgrade — freshness, verification, report quality, and region filters on promo submissions
- [ ] Observability dashboard — activation, return rate, CTA CTR, AI usage, and monetization health
- [ ] Bundle budget in CI — fail or warn when first-load bundle exceeds target
- [ ] Bundle trim after sync tranche — main chunk is now ~413.9KB against a 420KB budget, so the next structural pass should claw back a few KB before more UI expansion
- [ ] Set up cron trigger for onboarding-drip (run daily) + weekly-digest (run weekly)
- [ ] Stripe smoke test — follow `docs/STRIPE_SMOKE_TEST.md`, verify subscriptions table row + customer portal redirect
- [ ] VAPID public key rollout + real browser subscription verification
- [x] Apply `scripts/migration-wins-wall.sql` in Supabase SQL Editor, then verify Dashboard Wins Wall loads server entries
- [x] [SIL:2⛔] EV + analytics dashboard in Track tab — aggregate P/L, hit rate by promo type, best books
- [x] Security/privacy hardening tranche 1 — restricted CORS helper, safer extension DOM rendering, analytics masking defaults

## Later
- [ ] **CANON-007 staging (at SPARKED transition)** — stand up `promogrind.staging.vaultsparkstudios.com` on Hetzner before flipping vaultStatus to sparked; required once paying users exist
- [ ] Reddit launch posts: r/sportsbook + r/matchedbetting
- [ ] YouTube: 5 explainer screen recordings
- [ ] Android: `npm run build:cap` → Play Store
- [ ] PWA screenshots → Chrome Web Store submission ($5 fee)
- [ ] Apply to DraftKings/FanDuel affiliate programs (Income Access network)
- [ ] AI abuse analytics — review `vault_events` quota logs for cost spikes, blocked users, and plan-limit tuning
- [ ] Service worker improvement: stale-while-revalidate + offline ledger queue
- [ ] App.jsx component extraction (ongoing — extract 2-3 calculators per session into src/calculators/)
- [ ] Calculator receipt exports — generate shareable math receipts with inputs, formula, hedge, profit both outcomes, timestamp, and disclaimer
- [ ] State/book availability intelligence — personalize sportsbook CTAs by legal state and book availability
- [ ] Creator/referral landing packs — UTM-aware landing pages with creator attribution and calculator presets
- [ ] Feature flag admin surface — server-controlled rollout, kill switches, beta cohorts, and tier gating
- [ ] Observability dashboard — activation, calculator completion, sportsbook CTA CTR, AI quota usage, checkout conversion, retained ledger users
- [ ] Bundle budget in CI — warn/fail when main app chunk exceeds target size
- [ ] Offline-first ledger queue — queue writes, show sync status, and resolve conflicts per entity timestamp
- [ ] AI response schema validation — validate JSON server-side, include assumptions/confidence, and add advice guardrails
- [ ] Calculator domain extraction — move calculators into dedicated modules with shared hooks and tests
- [ ] Dashboard domain extraction — isolate activity feed, next-best-action, wins wall, and onboarding surfaces

## Deferred to Project Agents
- cross-repo item owned by another repo agent:
