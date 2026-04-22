<!-- sil-rubric-version: 3.0 -->
<!-- effective: 2026-04-17 (Session 92) -->
<!-- canonical-rubric: docs/SIL_RUBRIC_V3.md -->

# Self-Improvement Loop

This file is the living audit and improvement engine for the project.
The Rolling Status header is overwritten each closeout. Entries are append-only — never delete.

---

<!-- rolling-status-start -->
## Rolling Status (auto-updated each closeout)
Sparkline (last 5 totals): ▆
Avgs — 3: 496 | 5: 496 | 10: 496 | 25: 496 | all: 496
  └ 3-session: Dev 78 | Align 95 | Momentum 82 | Engage 74 | Process 76
Velocity trend: →  |  Protocol velocity: →  |  Debt: down
Momentum runway: ~4.2 sessions  |  Intent rate: achieved with redirect
Last session: 2026-04-22 | Session 66 | Total: 496/1000 | Velocity: 7 | protocolVelocity: 3
─────────────────────────────────────────────────────────────────────
<!-- rolling-status-end -->

---

## Scoring rubric (SIL v3.0 — 10 × 100 = 1000)

Rate 0–100 per category at each closeout. Full rubric, sub-bands, and migration notes in `docs/SIL_RUBRIC_V3.md`.

| # | Category | What it measures |
|---|---|---|
| 1 | **Dev Health** | Code quality · CI status · test coverage · technical debt |
| 2 | **Creative Alignment** | Adherence to SOUL.md + CDR |
| 3 | **Momentum** | Commit frequency · feature velocity · milestone progress |
| 4 | **Engagement** | Community/user signals (product rubric) OR session-frequency/proposal-acceptance/output-consumption/feedback-loop (infrastructure rubric) |
| 5 | **Process Quality** | Handoff freshness · Studio OS compliance · context file accuracy |
| 6 | **Cross-Repo Coherence** | Canon adherence · propagation lag · schema alignment across repos |
| 7 | **Security Posture** | Secrets hygiene · sanitization audit freshness · rotation age · pre-push gate |
| 8 | **Ecosystem Integration** | PROJECT_STATUS.json freshness · Hub tile health · website+social feed parity · beacon uptime |
| 9 | **Capital Efficiency** | Token spend per shipped item · cache hit rate · model-router adherence · runway |
| 10 | **Automation Coverage** | Agent-owned step % · human-blocked time · blocker-preflight success · phantom-blocker rate |

---

## Loop protocol

### At closeout (mandatory)

1. Calculate velocity, debt delta, rolling averages, and sparkline (see `docs/SESSION_PROTOCOL.md § 3.2`)
2. **Overwrite** the Rolling Status header block with fresh values
3. Score all 10 categories (0–100 each, 1000 max)
4. Compare to prior session scores — note trajectory (↑ ↓ →) per category
5. Identify 1 top win, 1 top gap, and log session intent outcome
6. Brainstorm 3–5 innovative solutions, features, or improvements
7. Commit 1–2 brainstorm items to `context/TASK_BOARD.md` — label them `[SIL]`
8. **Append** a new entry using the format below (never edit prior entries)

### At start (mandatory — read Rolling Status header only)

- Read the Rolling Status header block above — do NOT read full entry history at startup
- Note sparkline trajectory, lowest rolling-average category, and last session total
- Identify any `[SIL]` items on TASK_BOARD not yet actioned
- If a committed item was skipped 2+ sessions in a row, escalate it to **Now** on TASK_BOARD

---

## Entries (append-only below this line — never edit or delete)

### YYYY-MM-DD — Session N | Total: —/1000 | Velocity: — | Debt: →
Rolling avg (last 3): Dev — | Align — | Momentum — | Engage — | Process — | Coher — | Sec — | Eco — | Cap — | Auto —

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | — | — | |
| Creative Alignment | — | — | |
| Momentum | — | — | |
| Engagement | — | — | |
| Process Quality | — | — | |
| Cross-Repo Coherence | — | — | |
| Security Posture | — | — | |
| Ecosystem Integration | — | — | |
| Capital Efficiency | — | — | |
| Automation Coverage | — | — | |
| **Total** | **— / 1000** | | |

**Top win:** —

**Top gap:** —

**Intent outcome:** —

**Brainstorm**

1.
2.
3.

### 2026-04-22 — Session 66 | Total: 496/1000 | Velocity: 7 | Debt: down
Rolling avg (last 3): Dev 78 | Align 95 | Momentum 82 | Engage 74 | Process 76 | Coher 18 | Sec 16 | Eco 24 | Cap 17 | Auto 16

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | 78 | → | Startup/render/runtime truth drift was fixed without breaking app validation; last known app verification stayed green at 296/296 tests and build passing. |
| Creative Alignment | 95 | → | Product direction is clearer now: PromoGrind should feel like an elite operator system, not a fragmented utility bundle. |
| Momentum | 82 | ↓ | High-leverage fixes shipped, but this session went into ops repair rather than the planned app-shell decomposition. |
| Engagement | 74 | → | Product retention ideas got sharper, but no new user-facing engagement loop shipped this session. |
| Process Quality | 76 | ↑ | Closeout surfaces, handoff continuity, context validation, and startup rendering are back to a truthful baseline. |
| Cross-Repo Coherence | 18 | → | Public-safe repo fallback behavior improved, but protocol genome still shows real cross-surface fragility. |
| Security Posture | 16 | → | No new leak surface was introduced, but this session still depends on the pre-push scan and existing sanitization gates rather than newly expanded security coverage. |
| Ecosystem Integration | 24 | ↑ | Contracts, runtime pack, IGNIS, state vector, and startup brief now agree on current repo truth again. |
| Capital Efficiency | 17 | ↑ | Generator-level fallbacks and startup-brief repairs reduce repeated diagnostic churn and token waste in future sessions. |
| Automation Coverage | 16 | ↑ | Local generators and doctor path are usable again, but closeout/startup still need more hardened regression coverage. |
| **Total** | **496 / 1000** | | |

**Top win:** repaired the repo’s truth surfaces at the generator level instead of papering over broken outputs, so future sessions start from coherent local truth.

**Top gap:** app-side product work did not advance beyond planning because startup/closeout truth had to be stabilized first.

**Intent outcome:** Achieved with redirect. The session delivered the audit and executed the highest-leverage unblocked work, but that work was ops/truth repair rather than UI or workflow feature depth.

**Brainstorm**

1. Build a single `truth-surface` helper used by startup brief, runtime pack, contracts, doctor, and closeout so public-safe repos stop forking logic.
2. Turn the workflow kernel into an action graph that every calculator, AI output, scanner hit, and community promo can write into.
3. Replace shallow streaks with operator mastery ladders tied to settlement quality, lane diversity, and verified execution discipline.
4. Add a deterministic AI gateway that resolves obvious promo cases without a model call and logs cache hit rates into the daily brief.
