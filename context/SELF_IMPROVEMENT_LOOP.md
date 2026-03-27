# Self-Improvement Loop

This file is the living audit and improvement engine for the project.
The Rolling Status header is overwritten each closeout. Entries are append-only — never delete.

---

<!-- rolling-status-start -->
## Rolling Status (auto-updated each closeout)
Sparkline (last 5 totals): ▁▅▅
3-session avg: Dev 7.0 [N=2] | Align 9.0 [N=2] | Momentum 9.5 [N=2] | Engage 5.5 [N=2] | Process 8.5 [N=2]
Avg total: 39.5 / 50  |  Velocity trend: →  |  Debt: →
Last session: 2026-03-27 | Session 17 | Total: 40/50 | Velocity: 13
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

## 2026-03-27 — Session 16 | Total: 39/50 | Velocity: 12 | Debt: →
Rolling avg (last 3): Dev 7.0 [N=1] | Align 9.0 [N=1] | Momentum 10.0 [N=1] | Engage 5.0 [N=1] | Process 8.0 [N=1]

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | 7 | — | Build clean at 109.61 kB; App.jsx monolith growing (~6,700 lines); established edge fn patterns; no new debt |
| Creative Alignment | 9 | — | All 12 items sharply matched to the math-first, pro-grinder brand; gift trial + AI plan = core identity |
| Momentum | 10 | ↑ | Highest velocity session — all 12 audit brainstorm items shipped in a single session |
| Engagement | 5 | — | Social proof feed + gift viral loop added; still $0 revenue, no real engagement data yet |
| Process Quality | 8 | ↑ | Compacted-resume resume handled cleanly; full closeout executed; all context files updated |
| **Total** | **39/50** | | |

**Top win:** 12 features shipped in a single session — complete implementation of all Highest Leverage + Highest Ceiling audit items, including AI Action Plan, bet slip auto-fill, gift trial, email capture wall, and public REST API.
**Top gap:** Revenue still $0 — all infrastructure exists (Stripe, affiliate links, calc-api) but none is activated; this gap will widen with each unactivated session.
**Intent outcome:** Achieved — "Implement all items that are Highest Leverage Now and Highest Ceiling" — all 12 shipped.

**Brainstorm**
1. Spanish-language SEO pages (top 10) — US Hispanic betting market is $2B+; translating the 10 highest-traffic calculator pages could double organic reach with minimal new code
2. "Beat the House" 7-email drip — day 1/2/3/5/7/10/14 post-signup; each email links to a specific calculator with a worked example; repurposes existing KB content; massive activation lever
3. Promo Report Card weekly email — automated Monday summary: profit this week, top book, one recommended action; lightweight Resend template (Resend key already needed for other functions)

**Committed to TASK_BOARD:** [SIL] Spanish-language top 10 SEO pages (US Hispanic market) · [SIL] "Beat the House" 7-email drip sequence

## 2026-03-27 — Session 17 | Total: 40/50 | Velocity: 13 | Debt: →
Rolling avg (last 3): Dev 7.0 [N=2] | Align 9.0 [N=2] | Momentum 9.5 [N=2] | Engage 5.5 [N=2] | Process 8.5 [N=2]

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | 7 | → | Clean build 109.74 kB; 10 new static pages (zero App.jsx risk); 3 surgical edits only |
| Creative Alignment | 9 | → | Spanish expansion + educational drip = perfect brand fit; polish fixes are invisible but right |
| Momentum | 9 | ↓ | 13 items shipped; both SIL brainstorm items from session 16 executed same session |
| Engagement | 6 | ↑ | Drip extended to 14 days; invite auto-detect closes onboarding loop; Spanish opens new TAM |
| Process Quality | 9 | ↑ | Full closeout + commit + push; all context files current; audit JSON created |
| **Total** | **40/50** | ↑ | |

**Top win:** 10 Spanish SEO pages shipped in one session — new TAM, proper content (not machine-translated), full schema markup, email capture wired, UTM tracked.
**Top gap:** Revenue still $0 — Stripe, affiliate links, and calc-api all undeployed; every session without activation is lost compounding.
**Intent outcome:** Achieved — all "next code session options" completed as directed.

**Brainstorm**
1. hreflang tags — add `<link rel="alternate" hreflang="es">` on all 10 English pages linking to ES equivalents; tells Google these are proper translations; 15-min implementation across 10 files
2. Weekly Promo Report Card email — automated Monday summary: user's profit last 7 days, top book, one action item; lightweight Resend template; highest-retention email type possible
3. Schema markup audit — FAQPage + BreadcrumbList JSON-LD on all 61+ static pages; systematic pass; 30 min with a script; immediate structured data coverage

**Committed to TASK_BOARD:** [SIL] hreflang tags on English+ES page pairs · [SIL] Weekly Promo Report Card email (Monday, Resend)
