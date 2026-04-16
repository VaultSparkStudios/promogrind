# Self-Improvement Loop

This file is the living audit and improvement engine for the project.
The Rolling Status header is overwritten each closeout. Entries are append-only — never delete.

---

<!-- rolling-status-start -->
## Rolling Status (auto-updated each closeout)
Sparkline (last 5 totals): — (initializing)
3-session avg: Dev — | Align — | Momentum — | Engage — | Process —
Avg total: — / 500  |  Velocity trend: —  |  Debt: —
Last session: — | Session — | Total: —/500 | Velocity: —
─────────────────────────────────────────────────────────────────────
<!-- rolling-status-end -->

---

## Scoring rubric

Rate 0–100 per category at each closeout:

| Category | What it measures |
|---|---|
| **Dev Health** | Code quality, CI status, test coverage, technical debt level |
| **Creative Alignment** | Adherence to SOUL.md and CDR — are builds matching the vision? |
| **Momentum** | Commit frequency, feature velocity, milestone progress |
| **Engagement** | Community, player, or user feedback signals |
| **Process Quality** | Handoff freshness, Studio OS compliance, context file accuracy |

---

## Loop protocol

### At closeout (mandatory)

1. Calculate velocity, debt delta, rolling averages, and sparkline (see `prompts/closeout.md`)
2. **Overwrite** the Rolling Status header block with fresh values
3. Score all 5 categories (0–100 each, 500 max)
4. Compare to prior session scores — note trajectory (↑ ↓ →) per category
5. Identify 1 top win, 1 top gap, and log session intent outcome
6. Brainstorm 3–5 innovative solutions, features, or improvements
7. Commit 1–2 brainstorm items to `context/TASK_BOARD.md` — label them `[SIL]`
8. **Append** a new entry using the format below (never edit prior entries)

### At start (mandatory — read Rolling Status header only)

- Read the Rolling Status header block above — do NOT read full entry history at startup
- Note sparkline trajectory, lowest rolling average, and last session total
- Identify any `[SIL]` items on TASK_BOARD not yet actioned
- If a committed item was skipped 2+ sessions in a row, escalate it to **Now** on TASK_BOARD

---

## Entries (append-only below this line — never edit or delete)

### YYYY-MM-DD — Session N | Total: —/500 | Velocity: — | Debt: →
Rolling avg (last 3): Dev — | Align — | Momentum — | Engage — | Process —

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | — | — | |
| Creative Alignment | — | — | |
| Momentum | — | — | |
| Engagement | — | — | |
| Process Quality | — | — | |
| **Total** | **— / 500** | | |

**Top win:** —

**Top gap:** —

**Intent outcome:** —

**Brainstorm**

1.
2.
3.

**Committed to TASK_BOARD:** [SIL] item
