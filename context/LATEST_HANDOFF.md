# Latest Handoff

Last updated: 2026-03-26 (session 7 closeout)

This is the authoritative active handoff file for the project.

---

## What was completed — session 7

### Full Project Audit (score: 62/100) + Implementation of all actionable items

**Audit category scores:**
- Feature Completeness: 87/100
- Revenue & Monetization: 40/100 (zero activated — primary gap)
- Code Quality: 68/100
- Performance & Build: 78/100
- SEO & Discoverability: 32/100 (second major gap — SPA invisible to Google)
- UX & Design: 76/100
- Security & Data: 67/100
- Growth & Retention: 60/100
- Infrastructure: 70/100
- Business Strategy: 58/100

### Bug fixes (auth.js + App.jsx)

1. **Push notification body bug** — `best.t1`/`best.t2` → `best.game`, `best.b1`/`best.b2`; icon fixed to `favicon.svg`
2. **Price copy mismatch** — LiveScanner gate showed "$29/month" → fixed to "$24.99/mo"
3. **freq not persisted** — EmailCapture now saves `newsletter_freq` to Supabase user metadata on subscribe
4. **Team accounts email lost** — `join()` is now async; also saves to Supabase user metadata (`team_waitlist`, `team_waitlist_email`)
5. **startCheckout plan param** — auth.js `startCheckout(planId='monthly')` now accepts and passes `planId` in request body to `create-checkout` Edge Function; PricingPage passes `plan.id`

### Features added (App.jsx)

6. **Input-encoded shareable links** — `useCalcMemory` reads URL query params on init; `Tl` component now accepts `getParams` callback to encode inputs into the share URL. BonusBet, ProfitBoost, FirstBet pass their current values. Shared link auto-fills the calculator.

7. **Affiliate CTAs at results** — `BookCTA` component shows 4 book affiliate links at the bottom of profitable BonusBet, ProfitBoost, FirstBet results. Drives clicks at peak conversion intent.

8. **Promo grading** — All 16 `PROMO_SCHED` entries have `grade: "A"|"B"|"C"`. PromoCalendar shows grade badges + grade filter dropdown. A = daily/high-value, B = weekly/good, C = situational.

9. **State personalization** — `US_BOOK_STATES` map for all 8 books × 15-23 states. New OnboardingWizard step 3 asks for state, stores to `localStorage('pg_user_state')`. Tracker shows an availability note when some books don't operate in user's state.

10. **Personal referral tracker** — Tracker table has a "Ref Code" column per book (saves to `data.bookRefCodes` via syncAppData). Referral links panel shows all filled codes in a summary view.

11. **Competitor comparison page** — `CompetitorComparison` component in Learn tab ("vs Competitors" sub-tab). Feature-by-feature table: PromoGrind vs OddsJam vs ProfitDuel vs Spreadsheet.

12. **All-Time Report Card** — Added to Ledger stats section. Shows total profit, best month, entries, avg per entry, and a "📋 Copy Report Card" button that generates a shareable text card.

13. **Show Example buttons** — BonusBet, ProfitBoost, FirstBet each have a "★ Show Example" button that fills in realistic values with a label describing the scenario.

14. **Daily Dashboard** — New `DailyDashboard` component. New "Home" tab group added as the first tab group. Default landing is now `/dashboard`. Shows: greeting with time-of-day, this month's P/L, all-time P/L, open bets count, today's promo count, expiry alerts, today's graded promos list, open bets summary, quick action links.

---

## What was completed — sessions 1–6

See archived entries below.

### Session 6 — 13 engagement + value features
- AppDataCtx, sync status, undo delete, optimistic auth render, sub-tab scroll fade
- SW v2, Vite vendor chunk split, odds validation, inline Ledger edit
- Portfolio EV dashboard, weekly perf card, push notifications, Promo Calendar
- Conversion rate history, book health tracker, star ratings, referral program UI
- Annual pricing page, CSV import, team accounts waitlist, CLV alert, digest preference

### Sessions 1–5 — Foundation through major expansion
- Sessions 1-2: Foundation, auth, cloud sync, 17 calculators
- Session 3: VaultSparked/Stripe, GitHub Pages live
- Session 4: 22 calculators, BetTracker, Leaderboard, PromoBoard, PWA, Capacitor, major UX
- Session 5: Full feature backlog — useCalcMemory, social share, KB expansion, onboarding, ledger goals, compact mode, keyboard shortcuts, mobile nav, Promo Finder, Glossary

---

## Pending external setup (no code changes needed)

### Must run in Supabase SQL Editor first:
1. `scripts/migration-community-board.sql` — creates `promo_submissions` table
2. `scripts/migration-leaderboard.sql` — creates `vault_leaderboard` view

### External platforms:
- **Affiliate links** → wire into `src/books.js` (all 8 books still placeholder URLs)
- **Stripe** → create TWO products: Monthly ($24.99/mo) + Annual ($199/yr) → set `STRIPE_*` secrets → deploy checkout + webhook; **update `create-checkout` Edge Function to receive `body.planId` and select correct price ID** (frontend now sends planId)
- **Odds API** → theoddsapi.com → `supabase secrets set ODDS_API_KEY=...` → deploy odds function; change scanner refresh `120_000` → `300_000`
- **Resend** → resend.com → verify domain → set secret → deploy weekly-digest
- **Plausible** → plausible.io → uncomment one line in `index.html`
- **OAuth** → Google + Discord in Supabase Auth Providers
- **Google Search Console** → submit sitemap

### Blocked on LLC:
- Stripe live mode — requires LLC + EIN + bank account

---

## Future high-value projects (from audit)

1. **SSG/SEO** — Pre-render calculator pages + KB to static HTML. Largest organic growth lever. Evaluate `vite-plugin-ssg` or Astro migration.
2. **Browser Extension** — Chrome/Firefox extension that detects sportsbook pages, overlays relevant calculator.
3. **Email Drip Sequence** — 5-email onboarding after signup (Day 0/2/5/10/14). Requires Resend deployed first.
4. **7-Day Free Trial** — VaultSparked trial in Stripe checkout. Requires Stripe configured.
5. **UK Market Module** — UK books (Betfair, Ladbrokes, etc.) + GBP. 5x TAM.
6. **Shared Odds Cache** — Supabase odds cache table for 10+ concurrent VaultSparked users.
7. **Claude API Bet Slip Parser** — Paste slip text → auto-fills tracker/calculator.
8. **Scheduled Push Notifications** — Morning promo briefing via VAPID/web-push.

---

## Architecture snapshot

```
src/
  App.jsx          — all UI (~3,400+ lines after session 7), 22 calculators, all features
  auth.js          — Supabase auth gate, isPro(), startCheckout(planId)
  sync.js          — cloud sync, vault events, AppDataCtx feeds from here
  books.js         — sportsbook data + affiliate links (edit here)
  main.jsx         — entry, SW registration
  sw-register.js   — service worker registration

public/
  sw.js            — service worker v2 (network-first JS/CSS, cache-first fonts/images)
  manifest.json    — PWA manifest

supabase/
  functions/
    weekly-digest/ — Resend newsletter Edge Function (needs deploy)
    create-checkout/ — needs update: read body.planId to select Stripe price ID

scripts/
  migration-community-board.sql
  migration-leaderboard.sql
  migration-referrals.sql
  generate-invite-codes.js

vite.config.js     — vendor chunk split, chunkSizeWarningLimit 600
capacitor.config.ts
```

---

## Key constraints (never violate)

- Never commit `.env` or `.env.admin` — both gitignored
- `SUPABASE_SERVICE_ROLE_KEY` is for admin CLI only, never in browser code
- Calculator math in App.jsx must not be changed without verifying formulas
- All sportsbook links must live in `src/books.js` only
- Do not activate live Stripe until LLC + EIN obtained
- `isPro()` must continue to accept both `pro` and `vault_sparked` — legacy plan users must not be broken
- Odds API only called when `proStatus.status === "active"` — free users never trigger API requests
- `syncAppData(d)` replaces `setData(d) + saveData(d)` everywhere — never use saveData directly in components
- Default landing is now `/dashboard` (DailyDashboard) — was `/bonus-bet`
