# Closeout Protocol

Use this when the user says only `closeout`.

## Required write-back

If meaningful work happened, update in this order:

1. `context/CURRENT_STATE.md`
2. `context/TASK_BOARD.md`
3. `context/LATEST_HANDOFF.md`
4. `logs/WORK_LOG.md`
5. `context/DECISIONS.md` when reasoning changed
6. `docs/RELEASE_PLAN.md` when release scope or timeline changed
7. Any file whose truth changed this session

## Required closeout output

Reply with a concise `Session Closeout` containing:

1. What was completed
2. Files changed
3. Validation status (did the build pass? did the calculators check out?)
4. Open problems
5. Recommended next action
6. Exact files the next AI should read first
