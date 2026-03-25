# Latest Handoff

Last updated: 2026-03-25 (session 6 closeout)

This is the authoritative active handoff file for the project.

---

## What was completed — session 6

### Refinement + UX improvements (App.jsx + sw.js + vite.config.js)

**Architecture:**
- `AppDataCtx` — shared React context for all Track components (BetTracker, Tracker, Ledger). Single `loadData()` call in App instead of 3 parallel calls. `syncAppData(d)` replaces `setData + saveData` everywhere.
- `syncStatus` indicator — SYNCING… / ✓ SAVED shown in header next to COMPACT button.
- Auth optimistic render — `authReady` initializes to `true` if Supabase token found in localStorage; app renders instantly instead of showing loading screen.

**Feedback loop:**
- Undo delete — BetTracker + Ledger `del()` shows red toast with 4s UNDO action button.
- Inline Ledger edit — ✎ button per row; row becomes inline inputs for all fields; ✓ Save / ✕ Cancel.
- Odds validation — `In` component auto-detects odds fields by label (`/odds/i`), shows "Invalid odds" inline.
- CLV alert toast — fires when closing line is beaten (`+X%`) or moves against user (`-X%`) on Ledger entry.

**PWA / build:**
- `public/sw.js` bumped to `promogrind-v2` — network-first for HTML/JS/CSS, cache-first for fonts/images.
- Vite vendor chunk split — React/ReactDOM/react-router-dom in separate `vendor` chunk (49KB gzip, cached between deploys). App chunk: 104KB gzip.
- `chunkSizeWarningLimit: 600` — suppresses build noise.

**Mobile:**
- Sub-tab scroll fade — right-edge gradient on sub-tab bar so mobile users see overflow affordance.

### 13 engagement + value features (session 6 feature batch)

1. **Portfolio EV Dashboard** (BetTracker) — book-implied EV across all open positions.
2. **Weekly Performance Card** (Ledger) — 📊 Share Week copies formatted card to clipboard.
3. **Push Notifications** (LiveScanner) — 🔔 ALERTS toggle + threshold input; fires browser Notification when arb > threshold.
4. **Promo Calendar** (Learn tab) — 16 recurring promos across 7 books, filterable by book + day.
5. **Conversion Rate History** (Ledger stats) — avg bonus bet conversion % (requires 3+ entries).
6. **Book Health Tracker** (Tracker) — Active/Limited/Gubbed/Pending/Closed status per book with color coding.
7. **Promo Ratings** (Tracker) — 1–5 star rating per sportsbook, stored in `data.bookRatings`.
8. **Referral Program UI** (Learn → Refer & Earn) — copy referral link, social post templates for Twitter/Discord/Reddit.
9. **Annual Plan Pricing Page** (Learn → Upgrade) — Monthly ($24.99/mo) vs Annual ($199/yr) cards with feature list.
10. **CSV Import** (BetTracker) — modal with parse/preview/confirm flow; auto-maps DraftKings/FanDuel CSV column names.
11. **Team Accounts** (Learn → Team Accounts) — waitlist UI with email capture; stores to localStorage.
12. **CLV Alert** (Ledger `add()`) — delayed toast on beating / missing closing line.
13. **Daily Digest Preference** (EmailCapture) — frequency selector: Daily / 3× per week / Weekly.

---

## What was completed — sessions 1–5

See archived entries in prior handoffs. Summary:
- Sessions 1-2: Foundation, auth, cloud sync, 17 calculators, live scanner
- Session 3: VaultSparked/Stripe, GitHub Pages live
- Session 4: 22 calculators, BetTracker, Leaderboard, PromoBoard, PWA, Capacitor, major UX
- Session 5: Full feature backlog — useCalcMemory, social share, KB expansion, onboarding, ledger goals, compact mode, keyboard shortcuts, mobile nav, Promo Finder, PromoBoard, Glossary

---

## Pending external setup (no code changes needed)

### Must run in Supabase SQL Editor first:
1. `scripts/migration-community-board.sql` — creates `promo_submissions` table
2. `scripts/migration-leaderboard.sql` — creates `vault_leaderboard` view

### External platforms:
- **Affiliate links** → wire into `src/books.js` (all 8 books still placeholder URLs)
- **Stripe** → create TWO products: Monthly ($24.99/mo) + Annual ($199/yr) → set `STRIPE_*` secrets → deploy checkout + webhook; wire annual price ID into `PricingPage → startCheckout()`
- **Odds API** → theoddsapi.com → `supabase secrets set ODDS_API_KEY=...` → deploy odds function; change scanner refresh `120_000` → `300_000`
- **Resend** → resend.com → verify domain → set secret → deploy weekly-digest
- **Plausible** → plausible.io → uncomment one line in `index.html`
- **OAuth** → Google + Discord in Supabase Auth Providers
- **Google Search Console** → submit sitemap
- **Referral tracking** → add `referrals` Supabase table + RPC; wire into `ReferralHub` (currently hardcoded 0)

### Blocked on LLC:
- Stripe live mode — requires LLC + EIN + bank account

---

## Architecture snapshot

```
src/
  App.jsx          — all UI (~2,950 lines), 22 calculators, all features
  auth.js          — Supabase auth gate, isPro(), startCheckout()
  sync.js          — cloud sync, vault events, AppDataCtx feeds from here
  books.js         — sportsbook data + affiliate links (edit here)
  main.jsx         — entry, SW registration
  sw-register.js   — service worker registration

public/
  sw.js            — service worker v2 (network-first JS/CSS, cache-first fonts/images)
  manifest.json    — PWA manifest

supabase/
  functions/
    weekly-digest/ — Resend newsletter Edge Function

scripts/
  migration-community-board.sql
  migration-leaderboard.sql
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
