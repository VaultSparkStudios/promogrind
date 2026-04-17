# Decisions

Public-safe decisions only. Detailed internal decision history is maintained privately.

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
