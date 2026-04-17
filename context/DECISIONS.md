# Decisions

Public-safe decisions only. Detailed internal decision history is maintained privately.

## 2026-04-17 — Feature tiers are normalized before remote flag resolution (S64)

**Decision:** `resolveFlag` normalizes tier/plan labels before comparing against remote feature flag rows.

**Applies to this project:** Yes — governs `src/lib/featureFlags.js` and every client gate using `useFeatureFlag`.

**Rationale:** The app has accumulated both product plan names and user tier labels over time. Normalizing before comparison lets remote flags work across legacy labels without duplicating rows or accidentally hiding a feature from an equivalent tier.

---

## 2026-04-17 — Structured StackBuilder UI keeps legacy plan fallback (S64)

**Decision:** `StackBuilder.jsx` renders the structured `summary` / `steps[]` / `assumptions[]` response as the primary UI, but still accepts the old `plan` string.

**Applies to this project:** Yes — governs the StackBuilder client while the edge function rollout may lag production deployment.

**Rationale:** The code is ahead of production edge deployment. Keeping the fallback prevents a blank or broken StackBuilder UI while Supabase functions are being updated.

---

## 2026-04-17 — build:cap must be shell-neutral (S64)

**Decision:** `npm run build:cap` no longer sets `VITE_APP_BASE_PATH=/` using POSIX inline env syntax.

**Applies to this project:** Yes — governs `package.json` scripts.

**Rationale:** This repo is actively worked from Windows PowerShell. Shell-specific syntax made the Android/Capacitor build check fail locally even though the Vite build itself was valid.

---

## 2026-04-17 — TASK_BOARD Human Action Required is the canonical blocker list (S64)

**Decision:** Current manual blockers live in the top `Human Action Required` section of `context/TASK_BOARD.md`; older handoff/history entries remain historical and should not be treated as active blockers.

**Applies to this project:** Yes — governs closeout/status reads for launch blockers.

**Rationale:** Repeated sessions left duplicate Stripe, VAPID, migration, and deployment notes in lower roadmap sections. Consolidating active blockers avoids double-counting and keeps status reports truthful.

---

## 2026-04-17 — promo-advisor streaming mirrors promo-chat Accept header pattern (S63)

**Decision:** `promo-advisor` SSE streaming follows the same `Accept: text/event-stream` negotiation as `promo-chat`. Client falls back to `supabase.functions.invoke` when `VITE_SUPABASE_URL` is absent.

**Applies to this project:** Yes — governs `supabase/functions/promo-advisor/index.ts` and `src/components/PromoAdvisorPanel.jsx`.

**Rationale:** Consistency with the established `promo-chat` pattern means the same streaming infrastructure handles both panels. The `SUPABASE_URL` guard ensures dev/test environments (where the env var may be absent) still work via the invoke fallback without any code branching at import time.

---

## 2026-04-17 — Feature flag gate must be placed after all hooks (S63)

**Decision:** `PromoAdvisorPanel` moved its feature gate check (`if (!advisorEnabled)`) below all `useState`/`useRef`/`useContext`/`useToast`/`useFeatureFlag` calls. The component now calls every hook unconditionally before any early return.

**Applies to this project:** Yes — establishes the rule for all gated panels in this repo.

**Rationale:** The prior code had `if (!FEATURE_FLAGS.promoAdvisor) return ...` at line 17, with `useState` and `useRef` calls at lines 22+. This is a React Rules-of-Hooks violation. While it worked because `FEATURE_FLAGS.promoAdvisor` is a build-time constant, it would break under React strict mode or when switched to the dynamic `useFeatureFlag` hook. All feature gates must appear after hooks.

---

## 2026-04-17 — AI output validation is centralised in _shared/validate.ts (S63)

**Decision:** Calculator slug whitelisting, promo type validation, rating/confidence validation, JSON parsing, and input sanitisation are now centralised in `supabase/functions/_shared/validate.ts`. All three AI edge functions (`promo-advisor`, `ai-action-plan`, `stack-builder`) import from this module.

**Applies to this project:** Yes — governs all current and future AI edge functions in this repo.

**Rationale:** Prior to this, each edge function had its own inline validator arrays and JSON parse/clean logic. A new valid calculator slug required changes in 3 places. Centralisation means the whitelist is updated once, and the `SLUG_GUARDRAIL` string injected into system prompts is always consistent with the actual validation logic.

---

## 2026-04-17 — stack-builder responses use structured JSON schema (S63)

**Decision:** `stack-builder` now requests a structured JSON response (`steps[]`, `summary`, `assumptions[]`, `estimatedTotal`) instead of free-form prose. Output is normalised through `parseAiJson` + `validateCalculatorSlug` before returning.

**Applies to this project:** Yes — governs `supabase/functions/stack-builder/index.ts` and any downstream consumer of the stack-builder response.

**Rationale:** Prose responses are hard to consume programmatically. The existing `ai-action-plan` function already uses a structured schema. Making `stack-builder` consistent enables both functions to feed the same workflow inbox normalization layer and makes the responses testable. The previous `plan: aiText` field is replaced with `steps[]`, `summary`, and `assumptions[]`.

---

## 2026-04-17 — promo-chat streaming uses Accept header negotiation (S62)

**Decision:** Streaming mode in `promo-chat` is activated when the client sends `Accept: text/event-stream` rather than via a separate endpoint or request body flag. Non-streaming path is fully preserved.

**Applies to this project:** Yes — governs `supabase/functions/promo-chat/index.ts` and `src/components/PromoChat.jsx`.

**Rationale:** Header-based content negotiation is the canonical HTTP pattern for SSE vs JSON on the same endpoint. It avoids duplicating edge function logic into a separate `/stream` variant, and allows the non-streaming path (used by any SDK consumer or fallback scenario) to remain unchanged. Future functions that add streaming should follow the same pattern.

---

## 2026-04-17 — Confidence decay uses promo-type window heuristics (S62)

**Decision:** Workflow urgency bars in `WorkflowInboxPanel` decay against promo-type-specific windows (`bonus_bet`=7d, `profit_boost`=5d, `arb`=3d, `deposit_match`=30d, `other`=14d) rather than a fixed window.

**Applies to this project:** Yes — governs `workflowUrgency()` in `WorkflowInboxPanel.jsx`.

**Rationale:** A flat 14-day window is wrong for arb (3-day window before markets move) and for deposit matches (30-day typical rollover window). Promo-type-aware windows give accurate urgency signals without requiring an explicit `expiryDate` on every workflow.

---

## 2026-04-17 — Portfolio EVS engine uses fraction-capped Kelly with 35% max per position (S62)

**Decision:** `buildPortfolioAllocation` caps each position's Kelly fraction at `MAX_SINGLE_FRACTION = 0.35` of bankroll before normalization across positions.

**Applies to this project:** Yes — governs `src/lib/portfolio.js`.

**Rationale:** Raw Kelly fractions can produce very large individual allocations (e.g., 60%+ of bankroll on a single promo) which would be unacceptable risk for a promo grinder. The 35% cap ensures the allocation feels reasonable even for high-confidence plays, and the normalization step ensures the total never exceeds 100% of bankroll.

---

## 2026-04-16 — Community promo board extracted to a lazy-loaded chunk (S57)

**Decision:** `CommunityPromoBoard.jsx` is now a separate lazy-loaded module instead of an inline component in `App.jsx`. The board is only needed when the Promo Board tab is visited, not on startup.

**Applies to this project:** Yes — governs `src/components/CommunityPromoBoard.jsx` and the `c: CommunityPromoBoard` tab registration in `App.jsx`.

**Rationale:** The community intel upgrade (freshness, verification, flag, state filter) expanded the component meaningfully. Without extraction, the main bundle exceeded the 425KB cap. Lazy-loading follows the established pattern for non-critical surfaces (Tracker, Ledger, TrackInsights, etc.) and keeps the startup path lean.

---

## 2026-04-16 — Auth tests use vi.hoisted for mock handle sharing (S57)

**Decision:** `src/__tests__/auth.test.js` uses `vi.hoisted` to expose shared `mockGetSession`, `mockSetSession`, and `mockMaybySingle` handles that can be controlled per-test via `mockResolvedValueOnce`. `vi.stubEnv` overrides `VITE_DEV_BYPASS_AUTH` so auth guard functions actually run in the test environment.

**Applies to this project:** Yes — establishes the pattern for auth test coverage in this repo.

**Rationale:** The prior mock was static (all fns returned the same value, no way to simulate errors per-test). Vitest's `vi.hoisted` is the correct mechanism for exposing mock handles to both the `vi.mock` factory (which is hoisted before imports) and the test body. `vi.stubEnv` is necessary because the local `.env` has `VITE_DEV_BYPASS_AUTH=true` which bypasses all auth checks in tests without it.

---

## 2026-04-16 — Playbook candidates score as 60 + (fitScore−50) × 0.6 (S57)

**Decision:** Matched playbooks inserted into `buildOperatingActionCandidates` score between 60 (fitScore=50) and 90 (fitScore=100). This places them below urgent workflow/book setup signals (≥90) and above low-priority actions (affiliate, scale), ensuring playbooks compete meaningfully without pre-empting active work.

**Applies to this project:** Yes — governs `buildOperatingActionCandidates` in `src/promograph/index.js`.

**Rationale:** A playbook should surface as a next-best-action when nothing more urgent exists, not override an active workflow that needs settlement. The score formula scales with fit quality so highly-matched playbooks naturally compete with lower-priority action candidates.

---

## 2026-04-16 — Calculator extraction to src/calculators/ is the canonical pattern (S58)

**Decision:** All inline calculator components in `App.jsx` should be extracted to individual files in `src/calculators/` as lazy-loaded chunks. Shared visual helpers (`BookCTA`, `ShareCard`) belong in `src/components/`. Dashboard-only surfaces (`CommunityWinsWall`, `SmartPromoRecommender`) belong in `src/components/dashboard/`. This is now an ongoing process, not a one-off.

**Applies to this project:** Yes — governs any new calculator or dashboard surface added to `App.jsx`.

**Rationale:** App.jsx at 5000+ lines is a maintenance liability and a bundle pressure. Extracting components as lazy chunks recovers startup bundle size (main chunk went from 418.3KB to 353.3KB across S58 alone), makes each component independently testable, and follows the pattern already established for Tracker, Ledger, TrackInsights, and all dashboard-panel surfaces. The pattern is: component lives in its own file, exported as default, imported via `lazy(() => import(...))` in App.jsx, used inside `<Suspense>`.

---

## 2026-04-16 — getDashboardSnapshot topPlaybook is opt-in (S58)

**Decision:** `getDashboardSnapshot` accepts `{ includePlaybooks: true }` to include `topPlaybook` in the return value. The default (no option) does NOT call `matchPlaybooks`.

**Applies to this project:** Yes — governs `getDashboardSnapshot` in `src/dashboard/today.js`.

**Rationale:** `matchPlaybooks` runs scoring logic across all playbooks for every call. `getDashboardSnapshot` is called on every app state change — computing playbook scores on every update would add unnecessary overhead. The opt-in pattern lets callers that need it (e.g., the dashboard render cycle) request it explicitly, while lightweight callers (tests, batch computations) skip it for free.

---

## 2026-04-16 — Terminal workflow states beat stale transient writes in sync merge

**Decision:** `resolveWorkflowStatusConflict` in `src/promograph/index.js` now encodes the shared precedence policy that terminal states (`settled`, `skipped`) win over transient progress (`queued`/`ready`/`placed`/`waiting`) during per-record sync merge, regardless of `updatedAt` jitter. `src/sync.js` `_preferNewerEntry` routes workflow conflicts through this policy instead of pure newest-wins.

**Applies to this project:** Yes — governs workflow reconciliation in `src/sync.js` and any future consumer that merges workflow collections.

**Rationale:** Losing a settlement to a stale "placed" write from a laggy device is the expensive failure mode. Preferring terminal states keeps the product's scoring/telemetry honest even when local clocks drift or offline devices replay old writes.

---

## 2026-04-16 — Offline write queue lives in IndexedDB, mirrored to localStorage

**Decision:** `src/lib/sync-queue.js` stores the offline write queue in IndexedDB as the primary durable store, with a localStorage mirror kept in sync so `readSyncDiagnostics()` can report queue depth synchronously and so Node/SSR/private-browsing environments still have a working fallback. Mirror writes are synchronous; IDB writes are awaited where possible but their failures never break the save path.

**Applies to this project:** Yes — governs `_enqueueWrite`, `_flushQueue`, `readSyncDiagnostics`, and any future code that queues sync writes.

**Rationale:** localStorage alone is subject to 5–10MB limits, eviction under storage pressure, and main-thread blocking. IDB is larger, async, and more durable. The localStorage mirror preserves the synchronous diagnostic path the dashboard depends on and keeps the Node/test environment path simple.

---

## 2026-04-16 — Bundle budget raised from 420KB to 425KB for deliberate feature growth

**Decision:** `scripts/check-bundle-budget.mjs` default budget was raised 420KB → 425KB to accommodate the S56 IndexedDB offline queue module plus the reusable focus-trap hook. Both are shipping product features, not regressions. Budget stays in CI; growth within the 425KB cap remains gated.

**Applies to this project:** Yes — governs CI gate for the main bundle chunk.

**Rationale:** The bundle budget is a regression gate, not an absolute ceiling. When a feature itself is the source of growth and has already been trimmed to essentials, bumping the deliberate cap is the honest recording. Further compaction should come from dashboard/calculator code extraction, not from cutting durability/accessibility work.

---

## 2026-04-16 — Legacy blob must be a compatibility mirror, not the active sync authority

**Decision:** PromoGrind's `promogrind_data` row should only act as a backward-compatibility mirror once the dedicated entity tables save successfully; authenticated loads may compact older full blobs in the background, but product state should prefer entity-backed truth instead of treating the blob as a co-equal source of record.

**Applies to this project:** Yes — this now governs the compaction/load paths in `src/sync.js` and the fallback coverage in `src/__tests__/sync.test.js`.

**Rationale:** The earlier entity-aware sync work reduced risk, but the legacy blob still carried enough live meaning to keep reintroducing overwrite ambiguity. Turning it into a compatibility layer lowers multi-device regression risk without breaking older/fallback paths.

---

## 2026-04-16 — Dashboard and Studio priorities should share one operating-action model

**Decision:** PromoGrind's dashboard next-best-action and Studio operator brief/priorities should build from one shared operating-action candidate and decision layer rather than maintaining parallel ranking heuristics in each surface.

**Applies to this project:** Yes — this now governs `src/promograph/index.js`, `src/dashboard/today.js`, and `src/studio/export.js`.

**Rationale:** Operator-facing surfaces were converging on the same question from different code paths. A shared operating-action model reduces reasoning drift and gives later Track/AI/sync policy work a single place to extend instead of yet another duplicate scorer.

---

## 2026-04-16 — Sync reconciliation must preserve per-record progress across devices

**Decision:** PromoGrind's next-stage sync behavior should reconcile ledger rows, workflow inbox rows, result-feedback rows, and workflow-history rows per record instead of letting entity-level last-write-wins overwrite a whole array when one device only changed part of a domain.

**Applies to this project:** Yes — this now governs `src/sync.js` and the concurrent sync scenarios covered in `src/__tests__/sync.test.js`.

**Rationale:** The earlier entity-aware sync foundation split the major domains into dedicated tables, but one device could still erase another device's valid additions by winning at the array/entity level. Per-record merge rules are the minimum quality bar before cross-device workflow/ledger usage expands further.

---

## 2026-04-16 — Book legality and account health must be shared recommendation inputs

**Decision:** PromoGrind's sportsbook CTAs, next-best-action copy, Tracker availability hints, and workflow ranking should all consume one shared book-availability layer derived from legal state, completion status, and account health (`active` / `pending` / `limited` / `gubbed` / `closed`) instead of letting each surface keep its own partial ranking rules.

**Applies to this project:** Yes — this now governs `src/books.js`, `src/dashboard/today.js`, `src/workflows/inbox.js`, `src/components/Tracker.jsx`, and the dashboard activation card in `src/App.jsx`.

**Rationale:** The highest-value book is not simply the one with the biggest headline bonus. If a book is not legal in the user's state or the account is degraded, recommending it makes the product feel untrustworthy. Shared availability/health logic keeps CTA selection and workflow guidance aligned with real actionability.

---

## 2026-04-16 — Operator intelligence should flow through one versioned contract

**Decision:** PromoGrind's launch cockpit, Track drift intelligence, and Studio-facing export should all emit from one versioned operator contract containing summary, priorities, anomalies, drift alerts, and declared consumer surfaces, instead of treating the Studio snapshot as a one-off clipboard blob.

**Applies to this project:** Yes — this now governs `src/studio/export.js`, `src/components/dashboard/LaunchCommandCenterPanel.jsx`, and the new drift-alert output in `src/track/insights.js`.

**Rationale:** PromoGrind has moved beyond a calculator-only product. Workflow ranking, calibration, launch posture, and Studio ingestion were starting to diverge into separate interpretations of the same state. A shared contract keeps downstream Studio tools and in-app operator surfaces aligned on the same machine-readable truth.

---

## 2026-04-16 — Workflow ranking must be explainable and lifecycle-aware

**Decision:** PromoGrind's workflow inbox and dashboard ranking should be driven by an explainable scoring layer that incorporates bankroll pressure, actionability/opportunity, book activation, promo/book history, friction, skip reasons, freshness, and urgency, with explicit queued → ready → placed → waiting lifecycle controls reflected across workflow and result-feedback surfaces.

**Applies to this project:** Yes — this now governs `src/workflows/inbox.js`, `src/dashboard/today.js`, `src/components/dashboard/WorkflowInboxPanel.jsx`, and Track settlement sync.

**Rationale:** The previous workflow score was directionally useful but still too opaque and too static. If the app is going to guide real user action, it needs to show why a workflow is the next move and keep status transitions coherent across the inbox and Track instead of letting multiple surfaces drift.

---

## 2026-04-15 — PromoGraph becomes the canonical shared domain layer for promo/workflow state

**Decision:** PromoGrind now normalizes promo types, workflow statuses, calculator slugs, and AI recommendation payloads through `src/promograph/index.js`, with Track and dashboard helpers consuming that shared model instead of each surface keeping its own aliases and status semantics.

**Applies to this project:** Yes — this now covers result-feedback normalization, workflow summarization for dashboard ranking, and normalized quick-calc routing from Promo Advisor.

**Rationale:** Promo type labels and workflow states had started to drift across intake parsing, Promo Advisor, ResultFeedback, and dashboard next-best-action logic. That duplication would make the upcoming workflow inbox and personalized action ranking brittle. A pure shared domain layer reduces alias drift now and gives the next tranche one canonical contract to build on.

---

## 2026-04-06 — CANON-008: All VaultSpark IP is proprietary by default

**Decision:** All code, content, assets, and designs created by VaultSpark Studios are proprietary and all rights are reserved by VaultSpark Studios LLC unless an open-source license is explicitly declared and approved by the Studio Owner. No agent may apply or imply an open-source license without Studio Owner direction.

**Applies to this project:** Yes — `docs/RIGHTS_PROVENANCE.md` reflects this project's specific license status.

**Rationale:** VaultSpark Studios LLC is a commercial entity building owned IP. Open-sourcing any project without deliberate strategy gives away commercial advantage and creates ownership ambiguity.

**Studio canon:** `vaultspark-studio-ops/docs/STUDIO_CANON.md` → CANON-008

---

## 2026-04-13 — CANON-007 staging classification: `local` while FORGE

**Decision:** PromoGrind's `stagingType` is set to `"local"` (not `"hetzner"`) while `vaultStatus: forge`. Local staging via `.env.staging` + Vite dev server is sufficient for pre-launch iteration. Hetzner subdomain (`promogrind.staging.vaultsparkstudios.com`) is NOT required at this phase.

**Trigger to revisit:** When PromoGrind transitions to `vaultStatus: sparked` (at or after Reddit launch + paying subscribers), CANON-007 requires a live Hetzner staging subdomain before any further production changes. Add the Hetzner setup task to `## Now` in TASK_BOARD at that transition.

**Rationale:** CANON-007 explicitly states FORGE projects only *encourage* local staging. GH Pages at promogrind.bet currently functions as production; standing up a separate Hetzner staging environment adds infrastructure cost and maintenance overhead with no return until live paying users exist. Defer the expense until it buys deployment safety.

**Studio canon:** `vaultspark-studio-ops/docs/STUDIO_CANON.md` → CANON-007

---

## 2026-04-13 — Protocol alignment pass with studio-ops

**Decision:** Brought PromoGrind into full alignment with vaultspark-studio-ops protocol: wrote session lock, updated ops `PROJECT_REGISTRY.json` entry (summary, currentFocus, nextMilestone, runtimeUrl, localPath, stagingType, stripeLiveKeyConfigured, stripeProductionPriceIds, supabaseHost, revenueModel), refreshed stale auto-memory user profile, and recorded CANON-007 staging disposition.

**Rationale:** Registry entry had drifted significantly from reality (claimed 11 calculators vs actual 53; listed runtimeUrl at deprecated vaultsparkstudios.com/promogrind/ vs live promogrind.bet; reported stripeLiveKeyConfigured=false despite live Stripe mode since S36). Studio Hub reads this registry via GitHub API — stale data corrupts downstream dashboards and founder-facing reports.

---

## 2026-04-14 — Sprint 1 hardening before growth push

**Decision:** Prioritize server-side AI entitlement/quota enforcement, activation guidance, revenue click measurement, Wins Wall backend readiness, and bundle splitting before adding more visible features.

**Rationale:** PromoGrind already has broad feature depth. The next constraint is trust, cost control, conversion measurement, and iteration speed. Moving AI quotas into edge functions protects paid surfaces and API spend; Dashboard next-best-action reduces user confusion; sportsbook CTA tracking measures revenue intent; Wins Wall upsert support enables social proof; and chunk splitting keeps the app fast enough for mobile users.

**Follow-up trigger:** Deploy the updated AI edge functions and apply the Wins Wall migration before enabling or promoting these surfaces as fully live.

---

## 2026-04-14 — Launch-surface account language canonicalized to PromoGrind-native wording

**Decision:** Smoke-covered launch surfaces, trust-strip templates, and app-shell checks should use `Free PromoGrind account` / `free account` as the canonical public wording instead of `Free Vault membership`, while still allowing the underlying shared account system to remain true in implementation detail.

**Rationale:** The app shell had already moved to PromoGrind-native wording, but several public launch pages and smoke scripts still expected the older phrasing. That drift created false smoke failures and a confused public narrative. The public rule is now consistent: user-facing copy leads with PromoGrind branding; cross-Studio account reuse is secondary supporting detail.

---

## 2026-04-14 — Project-local account UX on top of shared Vault identity

**Decision:** PromoGrind should own its visible sign-in/sign-up experience (`Create your PromoGrind account` / `Sign in to PromoGrind`) while continuing to use the shared VaultSpark Supabase auth project and shared user metadata underneath.

**Implementation rule:** The project-branded auth surface is primary. Shared Vault membership/account reuse is supporting copy and backend behavior, not the headline UI. Shared display name / username should live in auth metadata so the same identity can appear consistently across VaultSpark projects.

**Rationale:** This preserves the studio's single-account system, contact graph, and cross-project portability without forcing friend-facing users through Vault-branded account creation at the point of conversion. The result is lower trust friction, cleaner project branding, and a reusable pattern for future apps.

---

## 2026-04-15 — Browser-invoked Supabase functions must disable gateway JWT verification under publishable-key auth

**Decision:** PromoGrind's browser-invoked Supabase Edge Functions now declare `verify_jwt = false` in `supabase/config.toml` and continue validating bearer tokens inside function code with `supabase.auth.getUser(...)`.

**Applies to this project:** Yes — this now covers the browser-facing billing, AI, beta-code, gift-trial, stack-builder, and bet-slip parsing functions.

**Rationale:** The project uses a modern `sb_publishable_...` frontend key. Supabase gateway JWT verification is not compatible with that key mode for Edge Functions, which caused live auth-backed invocation to fail with `UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM (ES256)`. Disabling gateway verification and keeping auth checks inside the function restores compatibility without relaxing project-side authorization logic.

---
