# Decisions

Public-safe decisions only. Detailed internal decision history is maintained privately.

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
