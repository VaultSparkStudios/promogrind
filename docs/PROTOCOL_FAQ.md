<!-- generated-by: codex manual protocol refresh -->

# Protocol FAQ

*Generated: 2026-06-29*

> Cached Q&A from the local Studio OS session protocol. Source: `docs/SESSION_PROTOCOL.md`.

## Q: How should a session start?

> Asked: 2026-06-29 · Model: codex-manual

A session starts with `/start` or `start`. The agent writes `context/.session-lock`, runs the compact preflight scripts, checks context pressure, verifies the project is initiated, renders and validates `docs/STARTUP_BRIEF.md`, then reads only that startup brief for initial context.

Source: `docs/SESSION_PROTOCOL.md` sections 1 and 15.

---

## Q: What should happen if a startup script is missing in this public repo?

> Asked: 2026-06-29 · Model: codex-manual

If a Studio OS script referenced by the protocol is missing, note the missing script explicitly and continue with the manual fallback rather than stopping. Prefer repo-truth files already present in `context/`, `audits/`, and `logs/WORK_LOG.md`.

Source: `AGENTS.md` public-repo protocol shim and `docs/SESSION_PROTOCOL.md` section 1.

---

## Q: What does `/go` do?

> Asked: 2026-06-29 · Model: codex-manual

`/go` means: update memory and task board with Genius List items and implement all refreshed Genius List items at the highest quality bar. It requires session lock, `context/SELF_IMPROVEMENT_LOOP.md`, and `context/TASK_BOARD.md` before any work begins.

Source: `docs/SESSION_PROTOCOL.md` sections 2.0 and 2.7.

---

## Q: When should the Genius List be regenerated?

> Asked: 2026-06-29 · Model: codex-manual

Run `node scripts/cache-genius-list.mjs --check` first. If the cache is fresh, read `.cache/genius-list.json`. If stale, regenerate the list with the repo's Genius List command before executing items.

Source: `docs/SESSION_PROTOCOL.md` section 2.1 and local `/go` skill.

---

## Q: How should context pressure affect `/go`?

> Asked: 2026-06-29 · Model: codex-manual

Run `node scripts/context-meter.mjs --json` before refreshing the list and between Genius List items. `CONTINUE` proceeds, `CONSIDER_CLOSEOUT` should surface the pressure and ask whether to continue, and `CLOSEOUT` stops immediately and prompts for `/closeout`.

Source: `docs/SESSION_PROTOCOL.md` sections 2.0.5 and 2.7.

---

## Q: How are blocked Genius List items handled?

> Asked: 2026-06-29 · Model: codex-manual

Classify each item before execution. Unblocked items are implemented. Human-blocked items require blocker preflight before leaving them blocked. Cross-repo locked and externally blocked items are skipped with a note and retry hint where applicable.

Source: `docs/SESSION_PROTOCOL.md` sections 2.5 and 2.6.

---

## Q: When should specialty protocols be suggested?

> Asked: 2026-06-29 · Model: codex-manual

Before `/go`, check project type and context for specialty fits. Examples include game projects for `/game-loop-review`, infrastructure/internal ops projects for `/infra-debt-sweep`, prose projects for `/novel-continuity-check`, and placeholder soul files for `/soul-interview`.

Source: `docs/SESSION_PROTOCOL.md` specialty suggestion table in section 2.

---

## Q: What is the closeout rule?

> Asked: 2026-06-29 · Model: codex-manual

Never auto-invoke `/closeout`. Suggest it only when context pressure or session state calls for it, then wait for the founder to explicitly request `closeout` or `/closeout`.

Source: `docs/SESSION_PROTOCOL.md` sections 2.7 and 3.

---

## Q: Where does Codex-specific behavior differ?

> Asked: 2026-06-29 · Model: codex-manual

Codex receives slash commands as plain text. It should normalize optional leading slashes, match the command against `AGENTS.md` and `docs/SESSION_PROTOCOL.md`, and execute the matching protocol directly. Codex personal memory lives under `~/.codex/memories/<slug>/` or equivalent.

Source: `docs/SESSION_PROTOCOL.md` Codex notes.

---

## Q: What public-safe rules matter in this repo?

> Asked: 2026-06-29 · Model: codex-manual

Keep deployable code and public-safe docs here. Do not add private Studio OS process docs, secret-handling workflows, or placeholder private tooling. VaultSpark-original code and assets are proprietary by default; do not add open-source licensing unless explicitly instructed by the Studio Owner.

Source: `AGENTS.md` public-safe rule and CANON-008.

---

