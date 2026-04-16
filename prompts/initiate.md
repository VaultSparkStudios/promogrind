<!-- template-version: 1.0 -->
# INITIATE

Used only when `prompts/start.md` classifies the repo as:
- **A — Bootstrap**
- **B — Foundation**

If the repo qualifies for **C — Returning**, stop and use `prompts/start.md` instead.

---

## A · Bootstrap

Use this path when `context/SELF_IMPROVEMENT_LOOP.md` is missing or has no dated entries.

### Goal

Create the minimum truthful startup memory so later `start` runs can follow the normal returning-session path.

### Required reads

1. `AGENTS.md`
2. `README.md` if present
3. `context/PROJECT_BRIEF.md` if present
4. `context/CURRENT_STATE.md` if present
5. Any task-specific file the user explicitly mentioned

### Required outputs

1. Confirm the repo is in **Bootstrap** state.
2. State the safest next action using only files that already exist.
3. If any required context file is missing, name it explicitly rather than inventing content.
4. Do not fabricate a full startup brief.

### Bootstrap brief format

```md
STARTUP STATUS: Bootstrap

- Session memory is not established yet.
- Source of truth available now: {files that exist}
- Missing startup context: {files that do not exist}
- Safest next action: {one concrete next step}
```

Stop after emitting that brief unless the user asks for implementation work.

---

## B · Foundation

Use this path when `context/SELF_IMPROVEMENT_LOOP.md` has exactly one baseline-style entry and the repo is still mostly template-level context.

### Goal

Turn a template-aligned repo into a truthful working baseline without pretending it already has returning-session memory.

### Required reads

1. `AGENTS.md`
2. `context/PROJECT_BRIEF.md`
3. `context/SOUL.md`
4. `context/BRAIN.md`
5. `context/CURRENT_STATE.md`
6. `context/DECISIONS.md`
7. `context/TASK_BOARD.md`
8. `context/LATEST_HANDOFF.md` if present
9. `context/SELF_IMPROVEMENT_LOOP.md`

### Required checks

1. Identify whether the core context is still template-only or already project-specific.
2. Name the top contradiction or gap across `CURRENT_STATE`, `TASK_BOARD`, and `LATEST_HANDOFF`.
3. Name the single highest-leverage next tranche.

### Foundation brief format

```md
STARTUP STATUS: Foundation

- Context maturity: template-heavy / mixed / mostly project-specific
- Highest-confidence current focus: {one line}
- Top gap: {one line}
- Highest-leverage next tranche: {one line}
```

Stop after emitting that brief unless the user asks for implementation work.

---

## Guardrails

- Repo files are source of truth, not prior chat memory.
- If context is missing, say it is missing.
- Do not write new strategy or internal/private process details into this public repo.
- Do not claim a repo is launch-ready unless the existing files support that claim.
