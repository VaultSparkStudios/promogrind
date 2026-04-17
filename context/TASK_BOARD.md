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
- [x] [SIL] Add component tests for extracted calculators (BonusBet, KellyCriterion) — **DONE S59**: `vitest.config.js` updated with react plugin + `.test.{js,jsx}` include; `src/__tests__/calculators.test.jsx` now active with 13 tests (7 BonusBet + 6 KellyCriterion) covering render, demo mode, example/NL parse, skip logic, copy feedback, and help section
- [x] [SIL] Wire getDashboardSnapshot topPlaybook into operator briefing — **DONE S59**: `buildTargetedAlertPlan` in `src/operator/briefing.js` now surfaces a `kind: "playbook"` alert at priority 91 with headline, fit-reason body, and first-step CTA; `DailyBriefPage.jsx` passes `{ includePlaybooks: true }` to `getDashboardSnapshot` and renders a green playbook card when applicable; 6 new `briefing.test.js` tests validate the full alert path
- [x] [SIL] Extract remaining large calculators from App.jsx — **DONE S60**: `TeaserCalc`, `RoundRobinCalc`, `ParlayBuilder`, `SGPEstimator`, `HoldCalc`, `BetSizingAdvisor`, `LineShop` extracted to `src/calculators/`; all lazy-loaded from `App.jsx`; main bundle 345.1KB → 324.6KB (20.5KB recovered); 235/235 tests green
- [x] [SIL] Wire topPlaybook into LaunchCommandCenterPanel operator command brief — **DONE S60**: `LaunchCommandCenterPanel` now calls `getDashboardSnapshot({ includePlaybooks: true })` and passes result as `dashboard` to `buildTargetedAlertPlan` so the Targeted Alert Queue includes playbook alerts; Daily Command Brief section shows matched playbook name and fit reasons below the operating brief when applicable
- [x] [SIL] Add component tests for ProfitBoost and FirstBet — **DONE S61**: 12 new tests (6 ProfitBoost + 6 FirstBet) added to `src/__tests__/calculators.test.jsx`; covers title render, result row, demo mode, exit demo, example preset, help section; 247/247 green
- [ ] [SIL] Add topPlaybook tracking to buildSummaryDelta — `appendStudioContractHistory` delta summary doesn't track when the recommended playbook changes between published snapshots; add a `playbook` field to the delta so ops tooling can detect playbook rotation
- [ ] [SIL] Test buildOperatorCommandBrief topPlaybook path — `src/__tests__/studioExport.test.js` doesn't yet cover `brief.topPlaybook` structured field or the playbook followUp string; add targeted test cases
- [x] [SIL] Wire topPlaybook into Studio contract brief followUps — **DONE S61**: `buildStudioSnapshot` now imports `matchPlaybooks` and computes `topPlaybook`; passes it to `buildOperatingActionCandidates` (enabling playbook operating decisions in the Studio snapshot) and to `buildOperatorCommandBrief`; brief now returns structured `topPlaybook` object + appends a playbook followUp string when applicable; downstream consumers (Hub, Social Dashboard) can now read `snapshot.brief.topPlaybook` without re-computing
- [x] [SIL] Wire topPlaybook into ActivationNextAction → getNextBestAction call — **DONE S58**: `ActivationNextAction.jsx` now calls `matchPlaybooks(data, { bankroll })` and passes the top applicable result as `topPlaybook` to `getNextBestAction`; `getNextBestAction` now also returns `focus` from the operating decision so callers can inspect `focus.type`
- [x] [SIL] Playbook CTA card in dashboard UI — **DONE S58**: `ActivationNextAction.jsx` now renders a distinct playbook card when `action.focus.type === "playbook"` — shows playbook icon, step count, bankroll-fit reason tag, fit score, and "Run playbook →" CTA routed to the first playbook step's calculator
- [x] Community board state filter auto-defaults to user state — **DONE S58**: `CommunityPromoBoard.jsx` reads `appData.userState` from `AppDataCtx` and initializes `stateFilter` to the user's stored state code (if valid) instead of always defaulting to "All States"
- [x] Focus-trap extended to PromoWalkthrough modal — **DONE S58**: `PromoWalkthrough.jsx` now uses `useFocusTrap(true, containerRef)` with `role="dialog"`, `aria-modal="true"`, and `aria-label` on the container — keyboard parity now covers all major dialogs via the reusable hook
- [x] Cron trigger migration script — **DONE S58**: `scripts/migration-cron-jobs.sql` now documents and automates `onboarding-drip` (daily 9am UTC) and `weekly-digest` (Sunday 8am UTC) via `pg_cron` + `pg_net` with inline setup instructions
- [x] Calculator domain extraction — **DONE S58**: `BonusBet`, `ProfitBoost`, and `FirstBet` extracted to `src/calculators/`; `BookCTA` and `ShareCard` extracted to `src/components/`; `CommunityWinsWall` and `SmartPromoRecommender` extracted to `src/components/dashboard/`; main bundle recovered from 418.3KB → 379.8KB (45.2KB headroom under 425KB cap); 216/216 tests green
- [x] [SIL] Playbook-aware operating decision — let `selectOperatingDecision` surface matched playbooks as first-class action candidates alongside workflow/book/promo signals — **DONE S57**: `buildOperatingActionCandidates` accepts `topPlaybook` and generates a scored candidate; `selectOperatingDecision` sets `focus.type = "playbook"` when a playbook candidate wins; `getNextBestAction` in today.js accepts and passes `topPlaybook`
- [x] [SIL] Playbook-aware workflow ranking — preserve playbook step ordering inside the workflow inbox so playbook-derived steps don't get reordered by the generic ranker — **DONE S57**: `buildWorkflowInbox` now tracks insertion-order ordinality and the sort comparator preserves original step order for workflows sharing the same `playbook:*` source prefix
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
- [x] [SIL:2⛔] Drift alert — background diff of projected vs realized profit per promo type — **DONE S52**: `src/track/insights.js` now emits ranked drift alerts from promo-type and book settlement deltas, and those anomalies now flow into the launch cockpit plus the Studio export contract
- [x] [SIL] Workflow provenance timeline — deepen the new durable history foundation to preserve richer provenance fields and expose cross-device transition history everywhere workflows are scored — **DONE S53**: workflow history now preserves durable status transitions in sync storage and Track surfaces those cross-device provenance transitions directly in the timeline while workflow scoring consumes the durable-history signal
- [x] [SIL] Entity-aware sync continuation — move from mirrored entity tables to finer-grained conflict handling inside ledger/workflow domains, then reduce the legacy `promogrind_data` row to a compatibility layer — **DONE S55**: `src/sync.js` now compacts `promogrind_data` into a compatibility mirror when entity-backed tables succeed, performs authenticated-load compaction for older full blobs, preserves tracker-domain records more deliberately, and surfaces queue-backed sync diagnostics in-product
- [x] Studio contract publish/history layer — persist versioned Studio contract snapshots plus deltas so Studio OS / Ops / Hub / Social Dashboard can consume machine state over time instead of one-off clipboard exports — **DONE S53**: Launch Command Center now publishes versioned Studio contract snapshots into persisted app state with delta summaries instead of relying on clipboard-only one-offs
- [x] Canonical Promo Operating Graph — unify promo, workflow, action, drift, confidence, and settlement policy into one shared decision model across dashboard, Track, AI, sync, and Studio surfaces — **DONE S56**: `src/promograph/index.js` now owns a shared `resolveWorkflowStatusConflict` policy consumed by `src/sync.js` so terminal states (settled/skipped) beat stale transient writes during per-record merge, and `src/promograph/recommendations.js` exposes `recommendationToWorkflow` now reused by both `PromoAdvisorPanel` and `AIActionPlan` instead of two hand-rolled workflow-entry shapes

## Current Priority Order
1. [x] Canonical Promo Operating Graph — extend the shared operating-action model into Track, AI, and sync policy so more surfaces stop scoring independently — **DONE S56**: sync merge now routes workflow conflicts through the shared `resolveWorkflowStatusConflict` policy and AI surfaces now route through the shared `recommendationToWorkflow` helper
2. [x] Offline-first ledger queue — move from visible sync diagnostics to a durable IndexedDB-backed offline write path with entity-aware replay/conflict handling — **DONE S56**: `src/lib/sync-queue.js` now owns a durable IndexedDB-backed queue with a localStorage mirror for synchronous depth reads + Node/SSR fallback; `src/sync.js` routes enqueue/flush through the new helper and the bundle budget was lifted from 420KB to 425KB as a deliberate, documented growth for this feature
3. [x] Playbooks — reusable promo routines by bankroll, promo type, and available books — **DONE S56**: `src/playbooks/index.js` now ships a 4-playbook seed library plus a `matchPlaybooks` scorer and `playbookToWorkflows` expander; `TodayDashboardPanel` surfaces matching playbooks with a one-click "Queue steps" action that upserts normalized workflow entries into the inbox
4. [x] Move auth tokens to httpOnly cookies OR accept localStorage + add refresh-rotation test coverage for hijack scenarios — **DONE S57** (localStorage path): `auth.test.js` now covers session lifecycle (tryAuth with/without session), token hijack scenarios (expired redirect token, setSession error, revoked refresh token), and subscription tier checks (getSubscription, isPro, isRunnerPlus with active/expired/missing states); 14 new tests added (214/214 total)
5. [x] Keyboard-nav follow-through — extend beyond tab bars to pinned favorites, compare selector flows, and remaining dialog/button clusters — **DONE S56**: `src/lib/focus-trap.js` now provides a reusable `useFocusTrap` hook wired into `AuthDialog.jsx` so Tab/Shift+Tab cycle within the modal and focus restores on close (Escape + role=dialog already in place)
6. [x] Motion-reduce guard for transitions (`prefers-reduced-motion`) — **DONE (shipped earlier)**: global CSS rule in `index.html` already zeroes animation/transition durations and scroll-behavior under `prefers-reduced-motion: reduce`
7. [x] Community intel upgrade — freshness, verification, report quality, and region filters on promo submissions — **DONE S57**: `CommunityPromoBoard.jsx` (extracted, lazy-loaded) now shows freshness age, expired indicators, community-verified badge (≥3 upvotes), 🚩 flag button (logs to vault_events), state filter chips, and hide-expired toggle; bundle headroom preserved by extraction
8. [x] Observability dashboard — **DONE S55**: dashboard now exposes activation, return, CTA, AI, monetization, and sync-state metrics through a dedicated observability panel
9. [x] Bundle budget in CI — **DONE S55**: GitHub Actions now runs tests, build, and the bundle-budget gate so regressions fail automatically
10. [x] Bundle trim after sync tranche — **DONE S54/S55**: lazy-loaded walkthrough/dashboard-only surfaces kept the main bundle green at `~419.4KB` after the new sync and observability work

## Innovation Bets (new this session)
- **Launch command center** — replace static launch-readiness card with a scored operator cockpit driven by validation, monetization, rollout, and blocker state
- **Execution-friction telemetry** — capture why workflows were skipped or blocked, then feed that back into Track and the next-best-action loop
- **Structured AI decision cards** — force Promo Advisor / Action Plan outputs into calculator-aware, ops-tagged JSON instead of prose-only blobs
- **Workflow inbox scoring** — score open workflows by status, EV, confidence, friction, recency, and bankroll fit instead of listing them flat
- **Studio intelligence contract** — one JSON export should feed Studio OS / Ops / Hub / Social Dashboard without markdown drift
- **Operator command brief** — generate one machine-usable daily brief from workflows, drift alerts, friction, blockers, and bankroll posture
- **Decision card contract** — force dashboard next-best-action, Promo Advisor, AI Action Plan, Track coaching, and Studio export to speak the same structured rationale format
- **Operator memory layer** — derive recurring user/book/promo patterns into visible coaching and downstream Studio state, not just raw telemetry
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
- [x] Studio OS / ops export layer — expand the new snapshot foundation into a durable machine-consumable contract with publish/history support — **DONE S52**: `src/studio/export.js` now emits a versioned Studio contract with summary, priorities, anomalies, drift alerts, and declared Studio consumer surfaces
- [x] Push alert targeting — move beyond generic daily brief toward higher-EV / state-aware promo alerts now that the subscription plumbing exists — **DONE S53**: Daily Brief now builds a targeted alert plan from workflow, drift, expiry, and settlement state, and push opt-in copy now reflects the current highest-value alert target instead of a generic reminder
- [x] Reason-for-skip capture — one-tap reason when user marks skipped in ResultFeedbackCard (odds moved / EV too low / deposit capped) — **DONE S51**: Skip reasons are now not only captured but also surfaced back into workflow scoring and Track skip-reason reporting
- [x] [SIL:2⛔] Self-calibration chart — surface "Your calcs were X% accurate last 30 days" inside Track — **DONE S51**: Track now renders per-promo self-calibration drift bars on top of the settled expected-vs-actual summary
- [x] [SIL] Workflow provenance timeline — deepen the new durable history foundation to preserve richer provenance fields and expose cross-device transition history everywhere workflows are scored — **DONE S53**: workflow history now persists and rehydrates durable transition context that feeds both Track timeline review and workflow prioritization
- [x] [SIL] Recommendation scoring matrix — deepen the new scoring foundation to rank workflows by bankroll fit, book availability, friction history, urgency, and opportunity score instead of first-match ordering — **DONE S51**: `src/workflows/inbox.js` now scores open workflows from live history and emits explainable ranking reasons consumed by the Today dashboard and workflow inbox
- [x] [SIL] Entity-aware sync continuation — move from mirrored entity tables to finer-grained conflict handling inside ledger/workflow domains, then reduce the legacy `promogrind_data` row to a compatibility layer — **DONE S55**: sync now preserves per-record ledger/workflow/history changes, compacts the legacy blob into a compatibility mirror on entity-backed save/load paths, and exposes visible sync diagnostics for the dashboard
- [x] [SIL] Workflow history surface — build richer UI around the new append-only history so users can inspect queue → ready → placed → waiting → settled transitions over time — **DONE S53**: Track now exposes a filterable workflow-history surface that groups transition chains per workflow instead of only showing a flat timeline
- [x] Operator cockpit expansion — turn Launch Command Center + workflow inbox into one unified operator surface with machine priorities, anomalies, and richer provenance/history — **DONE S53**: Launch Command Center now includes a targeted alert queue plus a workflow command deck so the cockpit speaks one operator-state model instead of separate summary cards
- [x] Daily Command Brief — use the new Studio contract feeds plus workflow state to produce one return-loop command brief with actionable priorities instead of generic reminders — **DONE S53**: the launch cockpit now emits a shared command brief generated from workflow, drift, and launch-blocker state instead of generic operator copy
- [x] Micro-NPS after 3 settlements — 1-tap "Was this calc worth it?" → feeds SIL — **DONE S53**: Track now prompts for one-tap worth-it feedback after three settled workflows and persists the response in synced app state for future operator memory/SIL use
- [x] Move auth tokens to httpOnly cookies OR accept localStorage + add refresh-rotation test coverage for hijack scenarios — **DONE S57** (localStorage path accepted): `auth.test.js` covers session lifecycle, expired/revoked token scenarios, and tier checks; httpOnly cookie path remains an option at SPARKED transition if compliance requires it
- [x] Offline write-queue in `src/sync.js` (IndexedDB) for ledger/feedback writes when offline — **DONE S56**: durable IndexedDB-backed queue landed in `src/lib/sync-queue.js` with a localStorage mirror for synchronous diagnostics + Node/SSR fallback
- [x] Keyboard-nav follow-through — **DONE S56**: reusable `useFocusTrap` hook wired into AuthDialog for Tab/Shift+Tab cycling and focus restoration
- [x] Motion-reduce guard for transitions (prefers-reduced-motion) — **DONE**: global CSS rule in `index.html` zeroes animation/transition/scroll under reduced-motion
- [x] Aria audit pass on `src/ui.jsx` — **DONE S57**: `In` atom now associates label via `htmlFor`/`id` (label-derived), sets `aria-invalid` and `aria-describedby` for errors, and marks prefix span `aria-hidden`; `Tl` share buttons have `aria-label` + `aria-pressed`; filter groups get `role="group"` with `aria-label`
- [x] State-aware + book-aware personalization for sportsbook CTAs and recommended workflows — **DONE S53**: shared book/state availability now lives in `src/books.js`, dashboard next-best-action now recommends the best legal/open book for the user, and workflow scoring now deprioritizes workflows tied to unavailable, closed, or degraded books
- [x] Playbooks — reusable promo routines by bankroll, promo type, and available books — **DONE S56**: seed library + matcher + dashboard surface with one-click queue-into-inbox
- [x] Community intel upgrade — freshness, verification, report quality, and region filters on promo submissions — **DONE S57**: `CommunityPromoBoard.jsx` shows freshness age, expired dimming, ✓ Verified badge (≥3 upvotes), 🚩 flag button, state filter, hide-expired toggle; **S58**: state filter now auto-defaults to `appData.userState` from context
- [x] Observability dashboard — **DONE S55**: `src/observability.js` and `src/components/dashboard/ObservabilityPanel.jsx` now expose activation, return rate, CTA CTR, AI usage, monetization, and sync-state metrics inside the dashboard
- [x] Bundle budget in CI — **DONE S55**: `.github/workflows/ci.yml` now runs tests, build, and bundle-budget enforcement automatically
- [x] Bundle trim after sync tranche — **DONE S54**: extracted `PromoWalkthrough` into a lazy-loaded chunk and brought the main app bundle back to ~415.9KB against the 420KB budget
- [x] Set up cron trigger for onboarding-drip (run daily) + weekly-digest (run weekly) — **S58**: `scripts/migration-cron-jobs.sql` written with `pg_cron` + `pg_net` schedules; apply in Supabase SQL Editor to activate (human action required)
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
- [x] State/book availability intelligence — personalize sportsbook CTAs by legal state and book availability — **DONE S53 foundation**: legal-state/book-status ranking now drives dashboard CTA selection and workflow scoring from the shared book registry instead of per-surface logic
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
