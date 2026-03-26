# Latest Handoff

Last updated: 2026-03-26 (session 10 — audit #4 + 15 features + 5 SEO pages)

This is the authoritative active handoff file for the project.

---

## What was completed — session 10 (v10.0)

### Audit #4 (v9.1 score: 68 → session 10 score: 71/100)
- Code Quality: 76 (unchanged)
- Feature Completeness: 78 (+4)
- UX/Polish: 71 (+3)
- Revenue & Monetization: 42 (unchanged — external blockers)
- SEO: 36 → improving with 5 static pages (will re-score next audit)
- Infrastructure: 66 (+2)
- Growth/Retention: 65 (+4)

### 15 Features Implemented (App.jsx: 4,600 → 5,128 lines)

1. **Weekly Grind Report** — Mon–Sun P/L summary card in DailyDashboard; bets, profit, win rate, best day; one-click copy as formatted text
2. **Promo Walkthroughs** — 3-step modal guides (DraftKings $200 BB / FanDuel Profit Boost / BetMGM First Bet Insurance); deep-links to calculators on step 3+
3. **Bet ROI Heatmap Calendar** — 91-day GitHub contribution graph in Ledger; green/red cells by daily P/L; collapsible
4. **Calculator Comparison Mode** — ⊞ Compare button in Calculate group; split-pane with dropdown for second calc
5. **Bankroll Allocation Wizard** — DailyDashboard; per-book split with tier weighting + est. CPA table
6. **Odds Movement Highlights** — ▲▼ badges in OddsComparisonTable when line moves ≥0.01 decimal
7. **Demo Mode** — ▶ Demo button on BonusBet/ProfitBoost/FirstBet; pre-fills values + step callout box
8. **VaultSparked Upsell Moments** — 3 contextual CTAs: (A) after profitable BonusBet ×3, (B) after 5 ledger entries, (C) after 3-day login streak
9. **Book-Specific P/L in Tracker** — per-book sub-row showing bets/P/L/ROI from ledger data
10. **Social Proof Counter** — live "X grinders this week" stat in header via Supabase vault_events count
11. **Promo ROI League Table** — ranks promos by avg reported value in PromoCalendar; collapsible
12. **Calculator Favorites Strip** — pin/unpin calcs; pinned pills strip above sub-tabs in Calculate group
13. **Push Expiry Reminders** — 🔔 toggle on PromoCalendar cards; fires browser Notification when promo <24h from expiry
14. **Win Streak Visualization** — current streak (🔥/❄), longest all-time, last-10 dots in Ledger stats
15. **Copy Result as Text Card** — 📋 button on BonusBet/ProfitBoost/FirstBet/KellyCriterion result cards

### 5 Static SEO Landing Pages
Created at `public/{slug}/index.html` — real HTML content indexed by Google, instant JS redirect for humans:
- `public/bonus-bet/` — "Bonus Bet Converter"
- `public/arb-calculator/` — "Sports Betting Arbitrage Calculator"
- `public/kelly-criterion/` — "Kelly Criterion Calculator"
- `public/no-vig/` — "No-Vig Fair Odds Calculator"
- `public/profit-boost/` — "Profit Boost Calculator"

Each has H1/H2, 200-300 words, JSON-LD (HowTo or FAQPage), canonical URL, robots: index. sitemap.xml updated with 5 new URLs at priority 0.9.

### Build
- Clean: `✓ built in 3.58s`
- App chunk: 331.74 kB / **91.52 kB gzip** (same as before — features are lightweight)
- App.jsx: 5,128 lines

### New localStorage keys (session 10)
- `pg_calc_favorites` — array of pinned calc slugs
- `pg_upsell_bb_count` — count of profitable BonusBet results seen
- `pg_upsell_bb_dismissed` — upsell A dismissed flag
- `pg_upsell_ledger_dismissed` — upsell B dismissed flag
- `pg_upsell_streak_dismissed` — upsell C dismissed flag

---

## Current app state

- **Version**: 10.0 (app) / 3.0.0 (package.json)
- **App.jsx**: 5,128 lines
- **Build**: clean — 91.5KB gzip
- **Calculators**: 27
- **Tabs**: Home(1), Convert(5), Calculate(23), Track(7), Live(2), Learn(10) = 48 tools
- **Static SEO pages**: 5

---

## Pending external setup (unchanged)

1. Affiliate links in `src/books.js` (all 8 books = placeholder URLs) — revenue blocker
2. Odds API key → deploy `odds` edge function; change 120s → 300s refresh
3. Stripe: two products (Monthly $24.99 + Annual $199) → set secrets → deploy `create-checkout` + `stripe-webhook`; update Edge Function to read `body.planId`
4. Resend key → deploy `weekly-digest` edge function
5. Plausible: uncomment line in `index.html`
6. Google + Discord OAuth in Supabase dashboard
7. Google Search Console: submit updated sitemap (now 52+ URLs)

---

## Architecture snapshot

- `AppDataCtx` — shared React context, one `loadData()` call, all Track components use `syncAppData(d)`
- `CurrencyCtx` — display-only FX context. `useCurrency()` → `{sym, rate, fmt}`. Never affects stored values.
- `syncAppData(d)` — only correct way to save from Track components
- `useCalcMemory(key, defaults)` — localStorage + URL param init for calculators
- `DEFAULT_SLUG = "dashboard"` — Home tab is default landing
- `isPro()` accepts `pro` AND `vault_sparked` plans
- `downloadFile(content, filename, mimeType)` — module utility for all CSV/ICS exports
- `calcROI(profit, wagered)` — module utility

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
