# Start Protocol

Use this when the user says only `start`.

## Read order

1. `AGENTS.md`
2. `context/PROJECT_BRIEF.md`
3. `context/SOUL.md`
4. `context/BRAIN.md`
5. `context/CURRENT_STATE.md`
6. `context/DECISIONS.md`
7. `context/TASK_BOARD.md`
8. `context/LATEST_HANDOFF.md`
9. Only then task-specific files (e.g., `src/math.js` for calculator work, `src/books.js` for affiliate work)

## Startup rules

- Treat repo files as source of truth, not prior chat memory
- Do not edit code during startup unless the user explicitly asks for implementation immediately
- Use `context/LATEST_HANDOFF.md` as the active handoff source
- Note assumptions clearly
- Verify affiliate link slots in `src/books.js` are still placeholder vs. real before making any link-related recommendations

## Required startup output

Reply with a concise `Startup Brief` containing:

1. Project identity
2. Current state and version
3. Active priorities (from TASK_BOARD)
4. Important constraints (calculator math integrity, affiliate link structure, legal copy)
5. Likely next best move
6. Blockers or ambiguities
