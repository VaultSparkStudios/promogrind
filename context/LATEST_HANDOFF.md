# Latest Handoff

Last updated: 2026-03-26 (simplify session — post-v9.0 cleanup)

This is the authoritative active handoff file for the project.

---

## What was completed — simplify session (v9.1)

Code review + cleanup pass on all v8.0/v9.0 changes. No new features — fixes and quality improvements only.

### React Rules of Hooks violations fixed (4)
All were `useState` called inside IIFEs embedded in JSX — hooks called conditionally, which React forbids.

| IIFE location | Fix |
|---|---|
| Share This Week button in Ledger | Extracted → `ShareWeekBtn` component |
| All-Time Report Card in Ledger | Extracted → `ReportCard` component |
| Session Summary modal in App | Extracted → `SessionModal` component |
| Promo Alert Subscription UI in PromoCalendar | Extracted → `PromoAlertPrefs` component |

### New module-level utilities
- `downloadFile(content, filename, mimeType)` — replaced 5 duplicate anchor-click-revoke patterns across `exportBets`, `exportCSV` (Ledger), Tax Export CSV, ICS export, Free Bet Arb export
- `calcROI(profit, wagered)` — replaced 2 duplicate `profit/wagered*100` calculations (Tracker table, Ledger by-book view)

### Code reuse
- Moved `parseNL` to module scope (was being redefined on every `BonusBet` render)

### Efficiency fixes
- Hoisted `cutoff30 = new Date(Date.now()-30d)` and `bets` array outside `BOOKS.map()` in Tracker health score — was creating a new `Date` per book per render
- Added `useMemo` to `filtered` in PromoCalendar (4 filter deps)
- Added `useMemo` to `myAvgClv` in Leaderboard
- Removed redundant `oppLog.slice(0,20)` on read (already capped at write)

### Code quality
- Removed all feature-tracking comments: `// Feature N — ...` inline, `FEATURE N —` prefixes in section headers
- Inlined the Tax Export CSV IIFE (no state, just an unnecessary wrapper)

### Build
- Clean: `✓ built in 3.22s` (298KB app chunk / 84KB gzip)

---

## What was completed — session 9 (v9.0)

### Third Full Audit (v8.0 score: 67/100)
Reviewed all App.jsx code post-session-8.

### 20 Features Implemented (v8.0 brainstorm → all built)
All added to App.jsx (~4,150 → ~5,000 lines). Build: clean.

1. **"Copy My Setup" Share Link** — DailyDashboard panel; encodes state/done books/bankroll into `?setup=<base64>` URL. Load modal on arrival.
2. **Promo Stacking Calculator** (`PromoStacking`) — new Calculate tab tool.
3. **Daily Grind Routine Generator** (`DailyRoutinePanel`) — DailyDashboard.
4. **Profit Goal Milestone Tracker** — DailyDashboard section.
5. **Promo Trade Journal** (`PromoJournal`) — new Track tab tool.
6. **Odds Comparison Table** (`OddsComparisonTable`) — new Track tab tool.
7. **Calculator Sub-Categories** — `subcat` field + filter pills.
8. **Push Notification Daily Briefing** — DailyDashboard; 9am push for VaultSparked users.
9. **Promo Value History Tracker** — PromoCalendar "Track Value" + sparkline.
10. **Kelly Fractional Optimizer** — fraction slider 5–100% with ruin-risk bar.
11. **Tax Bracket Timing Advisor** — Ledger collapsible tax section.
12. **Bet Slip Text Parser** — BetTracker "Paste Slip" button.
13. **Multi-Book Pending Exposure** — DailyDashboard "Open Exposure" table.
14. **CLV Leaderboard Column** — own data + "My Stats" box.
15. **"New State Legalized" Alert** — DailyDashboard dismissable banner.
16. **Promo Arb Finder** (`PromoArbFinder`) — new Learn tab tool.
17. **Leaderboard Privacy Control** — opt-in toggle → Supabase user metadata.
18. **Multi-Currency Mode** — USD/CAD/GBP header selector, `CurrencyCtx`.
19. **Sportsbook Account Health Score** — Tracker per-book 0–100 badge.
20. **Calculator Usage Analytics** — `pg_usage_log` + Top Tools panel in Dashboard.

### Header stat fix
- `"22"` → `"26"` in Calculators stat.

### New TABS items (session 9)
- Calculate: Promo Stacking
- Track: Trade Journal, Odds Compare
- Learn: Promo Arb Finder

### Non-App.jsx (session 9)
- `public/sitemap.xml` — promo-stacking, trade-journal, odds-compare, team-accounts, promo-arb-finder
- `public/manifest.json` — updated tool count, Promo Arb Finder shortcut
- `index.html` — updated description, keywords, JSON-LD featureList

---

## What was completed — session 8 (v8.0)

20 features: Tax Export CSV, Embed Mode + iframe button, Deposit Optimizer, Hedge Validator, Weekly P&L Share Card, Promo Complexity filter, Ledger By-Book view, Free Bet Arb Tracker, Calendar Export .ics, Promo Guarantee Calculator, Book ROI% column, Streak + Consistency score, Promo Alert Subscription UI, Natural Language Input parser, EV Opportunity Log, Welcome Promo Progress Bars, Gut Check validator, Scanner Watchlist, Session Summary modal, Offline Mode indicator.

Non-App.jsx: `src/sync.js` critical fix (all appData now synced), sitemap rebuild (14→40+ URLs), manifest PWA shortcuts, index.html JSON-LD, weekly-digest freq filtering.

---

## Current app state

- **Version**: 9.1 (app) / 3.0.0 (package.json)
- **App.jsx**: ~4,600 lines
- **Build**: clean
- **Calculators**: 27
- **Tabs**: Home(1), Convert(5), Calculate(23), Track(7), Live(2), Learn(10) = 48 tools

---

## Pending external setup (unchanged)

1. Affiliate links in `src/books.js` (all 8 books = placeholder URLs)
2. Odds API key → deploy `odds` edge function; change 120s → 300s refresh
3. Stripe: two products (Monthly $24.99 + Annual $199) → set secrets → deploy `create-checkout` + `stripe-webhook`; update Edge Function to read `body.planId`
4. Resend key → deploy `weekly-digest` edge function
5. Plausible: uncomment line in `index.html`
6. Google + Discord OAuth in Supabase dashboard
7. Google Search Console: submit updated sitemap

---

## Architecture snapshot

- `AppDataCtx` — shared React context, one `loadData()` call, all Track components use `syncAppData(d)`
- `CurrencyCtx` — display-only FX context. `useCurrency()` → `{sym, rate, fmt}`. Never affects stored values or input parsing.
- `syncAppData(d)` — only correct way to save from Track components
- `useCalcMemory(key, defaults)` — localStorage + URL param init for calculators
- `DEFAULT_SLUG = "dashboard"` — Home tab is default landing
- `isPro()` accepts `pro` AND `vault_sparked` plans
- `src/sync.js` `tracker` JSONB column = all non-ledger appData fields
- Calculate sub-categories: items have `subcat` field; filter pills in App component for Calculate group
- `downloadFile(content, filename, mimeType)` — module utility for all CSV/ICS exports
- `calcROI(profit, wagered)` — module utility for ROI calculation

---

## Critical constraints (unchanged)

- Never commit `.env` or `.env.admin`
- `SUPABASE_SERVICE_ROLE_KEY` — admin CLI only, never browser
- Calculator math: never change without verifying formulas
- All sportsbook links: `src/books.js` only
- Stripe live: blocked until LLC + EIN
- `isPro()` must accept both `pro` AND `vault_sparked` plans
- `syncAppData(d)` is the ONLY correct way to save from Track components
- Default landing = `dashboard`
- `CurrencyCtx` affects display only — never stored values or input parsing
