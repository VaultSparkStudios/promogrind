# Decisions

Public-safe decisions only. Detailed internal decision history is maintained privately.

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
