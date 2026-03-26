# Latest Handoff

Last updated: 2026-03-26 (session 11 — audit #5 + 15 features + push system + 13 SEO pages)

This is the authoritative active handoff file for the project.

---

## What was completed — session 11 (v11.0)

### Audit #5 (v10.0 score: 71 → session 11 projected: 74/100)
- Feature Completeness: 84 (+6)
- Revenue & Monetization: 55 (+13) — 7-day trial is the single biggest lift
- UX/Polish: 76 (+5)
- SEO: 52 (+6) — 13 static pages live
- Growth/Retention: 72 (+2)

### 15 Features (App.jsx: 5,128 → 5,447 lines; auth.js: 145 → 196 lines)

1. **7-Day Free Trial** — `startTrial()` / `isTrialActive()` / `trialDaysLeft()` in auth.js. `getSubscription()` checks trial first. `isPro()` treats 'trial' as pro. Dashboard trial countdown banner. PricingPage "Start Free Trial" CTA.
2. **DashboardHero** — all-time P/L + this-month stats as hero card at top of Dashboard
3. **Smart Promo Recommender** — top 3 promos for user's active books; pulls from bookStatus
4. **Profit Milestone Celebrations** — toast at $100/$250/$500/$1K/$2.5K/$5K (one-time per milestone via `pg_milestones_reached`)
5. **Promo Countdown Timers** — live 60s-tick countdown on PromoCalendar items with `expires` field
6. **Calculator Result History** — last 20 results per calc in BonusBet/ProfitBoost/FirstBet (`pg_hist_*`)
7. **Quick Add Bet from Dashboard** — inline collapsible bet form, no navigation required
8. **Book Promo Badges in Tracker** — "PROMO TODAY" badge for books with active promos
9. **System Dark Mode Auto** — first load follows `prefers-color-scheme` when no saved pref
10. **Opportunity Log CSV Export** — `downloadFile()` export from LiveScanner oppLog
11. **Multi-Sport Scanner** — toggle pills, fetches and merges results for multiple sports
12. **Profit Goal Notifications** — toast+push at 25/50/75/100% of goal (`pg_goal_notified_{goal}`)
13. **Ledger Date Range Filter** — confirmed filterFrom/filterTo already in place
14. **Share Card V2** — formatted text card in Copy My Setup (books, bankroll, streak, P/L, top tool)
15. **Feature 8 (Keyboard shortcuts modal)** — not implemented (deprioritized)

### Push Notification System — completed skeleton
- `public/sw.js` — `push` + `notificationclick` event handlers added
- `supabase/functions/send-daily-brief/index.ts` — real VAPID signing via `npm:web-push`; handles payload encryption, expired subscription cleanup (410/404), batch sends
- `src/sw-register.js` — `subscribeToPush(vapidPublicKey)` utility added

### 8 More Static SEO Landing Pages (13 total)
New: parlay-calculator, hedge-calculator, ev-calculator, matched-betting, promo-converter, sportsbook-promo, sports-betting-tools, arbitrage-betting
sitemap.xml: 60+ URLs

### Build
- Clean: `✓ built in 44.70s`
- App chunk: 348.54 kB / **95.31 kB gzip**
- App.jsx: 5,447 lines | auth.js: 196 lines

### New localStorage keys (session 11)
- `pg_milestones_reached` — array of $ milestones already celebrated
- `pg_goal_notified_{goal}` — array of % thresholds notified for a given goal amount
- `pg_hist_bonus-bet`, `pg_hist_profit-boost`, `pg_hist_first-bet` — last 20 calc results

---

## Current app state

- **Version**: 11.0
- **App.jsx**: 5,447 lines
- **Build**: clean — 95.3KB gzip
- **Calculators**: 27
- **Tabs**: Home(1), Convert(5), Calculate(23), Track(7), Live(2), Learn(10) = 48 tools
- **Static SEO pages**: 13

---

## To activate push notifications (when ready)

```bash
npx web-push generate-vapid-keys
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...
supabase functions deploy send-daily-brief
# Run scripts/migration-push-subscriptions.sql in Supabase SQL Editor
# Add VITE_VAPID_PUBLIC_KEY=... to .env
```

Then wire `subscribeToPush(import.meta.env.VITE_VAPID_PUBLIC_KEY)` from `src/sw-register.js`
into App.jsx (after user grants Notification permission) and POST the result to `push_subscriptions`.

---

## Pending external setup (unchanged)

1. Affiliate links in `src/books.js` (all 8 books = placeholder URLs) — revenue blocker
2. Odds API key → deploy `odds` edge function; change 120s → 300s refresh
3. Stripe: two products (Monthly $24.99 + Annual $199) → set secrets → deploy `create-checkout` + `stripe-webhook`
4. Resend key → deploy `weekly-digest` edge function
5. Plausible: uncomment line in `index.html`
6. Google + Discord OAuth in Supabase dashboard
7. Google Search Console: submit updated sitemap (60+ URLs now)
8. VAPID keys → deploy `send-daily-brief` (see above)

---

## Architecture snapshot

- `AppDataCtx` → `{ appData, syncAppData }` — single loadData, all Track components use syncAppData(d)
- `CurrencyCtx` → display-only FX. Never affects stored values or input parsing.
- `syncAppData(d)` — ONLY correct way to save from Track components
- `useCalcMemory(key, defaults)` — localStorage + URL param init for calculators
- `DEFAULT_SLUG = "dashboard"` — Home tab is default landing
- `isPro()` in auth.js now accepts `pro`, `vault_sparked`, AND `trial` status
- `startTrial()` in auth.js — sets trial_started_at in Supabase user metadata (idempotent)
- `subscribeToPush(vapidPublicKey)` in sw-register.js — returns PushSubscription for storage
- Static SEO pages: `public/{slug}/index.html` pattern — real HTML + instant JS redirect
- vite-plugin-ssg NOT viable — app is auth-gated, SSR renders loading screen

---

## Critical constraints (unchanged)

- Never commit `.env` or `.env.admin`
- `SUPABASE_SERVICE_ROLE_KEY` — admin CLI only, never browser
- Calculator math: never change without verifying formulas
- All sportsbook links: `src/books.js` only
- Stripe live: blocked until LLC + EIN
- `isPro()` must accept `pro`, `vault_sparked`, AND `trial`
- `syncAppData(d)` is the ONLY correct way to save from Track components
- Default landing = `dashboard`
- `CurrencyCtx` affects display only
