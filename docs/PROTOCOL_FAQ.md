<!-- generated-by: scripts/render-protocol-faq.mjs -->
<!-- protocol-source-sha256: fd54f733f96691a18808921cfc892286b2bce0de614b998a68ea0669b6bc0358 -->
<!-- faq-definition-sha256: 17eebb51c54510d4156658180f615d1232d7df445b88c648c64bf31bfa7ea475 -->

# Protocol FAQ

*Reviewed: 2026-09-30*

> Deterministic, reviewed Q&A derived from the local protocol contract. Freshness is content-addressed; elapsed time alone never makes an unchanged protocol stale.

## Q: How should a session start?

> Reviewed: 2026-09-30 · Reviewer: codex-manual

Start with `/start` or `start`. Pull and reconcile the current branch as the protocol directs, write `context/.session-lock`, run compact preflights and the context meter, verify project initiation, render and validate `docs/STARTUP_BRIEF.md`, and load context in the canonical order.

Source: docs/SESSION_PROTOCOL.md sections 1 and 15.

---

## Q: What should happen if a Studio OS script is missing in this public repo?

> Reviewed: 2026-09-30 · Reviewer: codex-manual

Name the missing script explicitly and continue with the protocol's manual fallback. Prefer repo-truth files in `context/`, `audits/`, and `logs/WORK_LOG.md`; do not invent a placeholder copy of private operations tooling.

Source: AGENTS.md public-repo protocol shim.

---

## Q: What does `/arc` require?

> Reviewed: 2026-09-30 · Reviewer: codex-manual

`/arc` is one continuous mission: `/start` → `/audit` → `/implement` → `/closeout`. It completes the selected, premise-verified outcomes and their acceptance checks, preserves existing authorization, and records unresolved requirements honestly. Spare budget or an empty list does not authorize additional scope.

Source: docs/SESSION_PROTOCOL.md section 2B.

---

## Q: How is the Unified Genius List refreshed and executed?

> Reviewed: 2026-09-30 · Reviewer: codex-manual

Run the cache check first. If stale, regenerate from live repo truth. Verify every item's premise against current code, classify its execution state, implement every unblocked item at the highest justified depth, and record honest deferrals rather than silently skipping them.

Source: docs/SESSION_PROTOCOL.md sections 2.1 through 2.7.

---

## Q: How should context pressure affect a long mission?

> Reviewed: 2026-09-30 · Reviewer: codex-manual

Run `node scripts/context-meter.mjs --json` before list refresh and between items. Continue on `CONTINUE`; follow the protocol's escalation behavior for `CONSIDER_CLOSEOUT`; stop implementation and execute the authorized closeout path on `CLOSEOUT`.

Source: docs/SESSION_PROTOCOL.md section 2.0.5.

---

## Q: When may an item be labeled human-blocked?

> Reviewed: 2026-09-30 · Reviewer: codex-manual

Only after secrets discovery and blocker preflight prove there is no agent path. Ready credentials must be resolved through the secrets gateway and used by the agent. Human-blocked is reserved for the narrow founder-only cases defined by CANON-019.

Source: AGENTS.md hard gates and docs/SESSION_PROTOCOL.md blocker handling.

---

## Q: What is the audit-to-implementation rule?

> Reviewed: 2026-09-30 · Reviewer: codex-manual

The audit must be ranked, evidence-backed, and checked against live code so phantom items are rejected. Implementation root-fixes every accepted item, verifies in proportion to risk, and treats the audit artifact as the execution source of truth rather than refreshing a report in place of shipping.

Source: docs/SESSION_PROTOCOL.md sections 2B and 2C.

---

## Q: What must closeout prove?

> Reviewed: 2026-09-30 · Reviewer: codex-manual

Write back canonical context surfaces, score SIL v3 out of 1000, run doctor until `blockingFailing` is zero, verify suite exit codes directly, commit and push according to the declared workflow, ship the Ark update, remove the session lock, and leave zero agent-started shells running.

Source: docs/SESSION_PROTOCOL.md section 3.

---

## Q: Where does Codex-specific behavior differ?

> Reviewed: 2026-09-30 · Reviewer: codex-manual

Codex receives slash commands as text, normalizes an optional leading slash, and executes the matching protocol from `AGENTS.md` and `docs/SESSION_PROTOCOL.md`. Personal project memory lives under the Codex memory root, while repo truth remains in the canonical project files.

Source: docs/SESSION_PROTOCOL.md Codex notes.

---

## Q: What public-safe and licensing rules apply here?

> Reviewed: 2026-09-30 · Reviewer: codex-manual

Keep deployable code and public-safe documentation in this repository. Do not copy private Studio OS procedures or secret workflows here. VaultSpark-original work is proprietary by default; do not add an open-source license unless the Studio Owner explicitly directs it or an upstream legal obligation applies.

Source: AGENTS.md public-safe rule and CANON-008.

---
