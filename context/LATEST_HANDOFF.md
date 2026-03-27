# Latest Handoff

Last updated: 2026-03-26 (session 12 — full audit + implementation sprint)

This is the authoritative active handoff file for the project.

---

## What was completed — session 12 (v12.0)

### Audit #6 (v11.0 score: 74 → session 12 projected: ~82/100)
- Feature Completeness: 87 (+3)
- Revenue & Monetization: 58 (+3) — affiliate link field added
- UX/Polish: 80 (+4) — loading splash, testimonials, urgency signals
- SEO: 70 (+18) — 30 static pages live (was 13), Plausible activated
- Growth/Retention: 78 (+6) — push enable button, UK market

### App.jsx Changes (5,447 → ~5,780 lines)

1. **Header stat fixed** — "26 Calculators" → "27 Calculators"
2. **CompetitorComparison fixed** — "Total 22 Calculators" → "Total 27 Calculators"
3. **Loading splash screen** — replaces spinner with 3 feature cards + "Checking Vault access…" footer
4. **Ledger EV% field** — input, stats bar AVG EV% display, CSV export column
5. **PROMO_SCHED enhanced** — timeMin on all 16 US entries + 5 new UK entries (bet365, Betway, William Hill, Paddy Power, Sky Bet)
6. **PromoCalendar "Time" column** — displays `~{p.timeMin}m` per promo
7. **SmartPromoRecommender → "Today's Action Plan"** — urgency badges (3-day expiry), limitedBooks detection, openBets warning, time per promo
8. **PushEnableBtn** — VaultSparked-gated push opt-in button in DailyDashboard; upserts to push_subscriptions
9. **Testimonials in PricingPage** — 3 quotes after features list
10. **Footer legal links** — Privacy Policy / Terms of Service / About

### Supporting Files

- `src/books.js` — `referralLink` field on all 8 books (placeholder URLs pending affiliate approval)
- `index.html` — Plausible analytics script activated
- `public/privacy/index.html` — full Privacy Policy page
- `public/terms/index.html` — full Terms of Service page
- `public/landing/index.html` — standalone marketing landing page

### Static SEO Pages (30 total, was 13)

**3 New keyword pages:**
- `public/free-bet-calculator/` → redirects to `#/bonus-bet`
- `public/deposit-match-calculator/` → redirects to `#/deposit-match`
- `public/rollover-calculator/` → redirects to `#/rollover`
- `public/same-game-parlay/` → redirects to `#/sgp-estimator`

**10 State pages (all redirect to `#/bonus-bet`):**
- bonus-bets-new-york, new-jersey, illinois, michigan, ohio, colorado, pennsylvania, virginia, arizona, tennessee

### Build
- Clean: `✓ built in 3.30s`
- App chunk: 355.72 kB / **97.02 kB gzip**
- App.jsx: ~5,780 lines | auth.js: 196 lines

---

## Current app state

- **Version**: 12.0
- **App.jsx**: ~5,780 lines
- **Build**: clean — 97.02KB gzip
- **Calculators**: 27
- **Tabs**: Home(1), Convert(5), Calculate(23), Track(7), Live(2), Learn(10) = 48 tools
- **Static SEO pages**: 30

---

## To activate push notifications (when ready)

```bash
npx web-push generate-vapid-keys
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...
supabase functions deploy send-daily-brief
# Run scripts/migration-push-subscriptions.sql in Supabase SQL Editor
# Add VITE_VAPID_PUBLIC_KEY=... to .env
```

PushEnableBtn in DailyDashboard will handle the browser permission request + subscription upsert automatically once VITE_VAPID_PUBLIC_KEY is set.

---

## Pending external setup

1. **Affiliate tracking URLs** — `src/books.js` has `referralLink` field on all 8 books; replace placeholder URLs with real affiliate-approved tracking links once approved by each program
2. Odds API key → deploy `odds` edge function; change 120s → 300s refresh
3. Stripe: two products (Monthly $24.99 + Annual $199) → set secrets → deploy `create-checkout` + `stripe-webhook`
4. Resend key → deploy `weekly-digest` edge function
5. ✅ Plausible: activated in `index.html`
6. Google + Discord OAuth in Supabase dashboard
7. Google Search Console: submit updated sitemap (99+ URLs)
8. VAPID keys → deploy `send-daily-brief` (see above)

---

## Architecture snapshot

- `AppDataCtx` → `{ appData, syncAppData }` — single loadData, all Track components use syncAppData(d)
- `CurrencyCtx` → display-only FX. Never affects stored values or input parsing.
- `syncAppData(d)` — ONLY correct way to save from Track components
- `useCalcMemory(key, defaults)` — localStorage + URL param init for calculators
- `DEFAULT_SLUG = "dashboard"` — Home tab is default landing
- `isPro()` in auth.js accepts `pro`, `vault_sparked`, AND `trial` status
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
