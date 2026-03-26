# Self-Improvement Loop

This file is the living audit and improvement engine for the project.
The Rolling Status header is overwritten each closeout. Entries are append-only — never delete.

---

<!-- rolling-status-start -->
## Rolling Status (auto-updated each closeout)
Sparkline (last 5 totals): ▁ (bootstrap)
3-session avg: Dev — | Align — | Momentum — | Engage — | Process —
Avg total: — / 50  |  Velocity trend: —  |  Debt: →
Last session: 2026-03-26 | Session 0 | Total: 5/50 | Velocity: 0
─────────────────────────────────────────────────────────────────────
<!-- rolling-status-end -->

---

## Scoring rubric

Rate 0–10 per category at each closeout:

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
3. Score all 5 categories (0–10 each, 50 max)
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

## 2026-03-26 — Session 0 | Bootstrap Baseline | Total: 5/50 | Velocity: 0 | Debt: →
Rolling avg (last 3): [N/A — bootstrap]

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | N/A | — | Not yet formally assessed; audit score 67/100 on record in PROJECT_STATUS.json |
| Creative Alignment | N/A | — | Not yet formally assessed; SOUL.md defines math-first anti-gambling-hype brand |
| Momentum | N/A | — | Not yet formally assessed; v9.1 live, revenue blockers identified |
| Engagement | N/A | — | Not yet formally assessed; no user analytics captured yet |
| Process Quality | 5 | — | Studio OS applied; full context/ suite with real content |
| **Total** | **5/50** | | Bootstrap baseline — Layer 1 SIL applied |

**Top win:** Studio OS applied to a live product with rich PROJECT_STATUS.json (audit scores, blockers, tiers, tech stack)
**Top gap:** Revenue blockers fully identified but not actioned — affiliate links + Odds API = first dollar
**Intent outcome:** Bootstrap initiation — Layer 1 SIL format applied; project ready for Foundation session

**Brainstorm**
1. Wire affiliate links in src/books.js — single commit between the product and first revenue
2. Set up basic Supabase analytics event for tool usage — one row per calculation; enables Engagement scoring
3. SSG/pre-rendering is the single largest SEO lever — even static HTML shells for top calculator pages unlocks organic traffic
4. Define a "revenue milestone" as the Foundation SIL target: first affiliate click → first conversion → first Stripe subscriber
5. UK market module deserves a roadmap entry — 5x TAM expansion with a focused regulatory-compliant calculators pass

**Committed to TASK_BOARD:**
- [SIL] Wire affiliate links in src/books.js — zero-code blocker to first revenue
- [SIL] Add Supabase analytics event for per-tool usage (Engagement scoring)
