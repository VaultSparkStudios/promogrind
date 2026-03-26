# Release Plan

## Current State: v9.0 (Feature-Complete, Pre-Revenue)

The app is live at `https://vaultsparkstudios.com/promogrind/` and auto-deploys on push to main.
All core features are built. Revenue activation is blocked only on external setup steps.

---

## Phase 1 — Revenue Activation (Next)

**Status:** All code ready. External accounts pending.

**Checklist:**
- [ ] Insert affiliate/referral links into `src/books.js` (DK, FD, BetMGM, Caesars, bet365, ESPN BET, Fanatics, BetRivers)
- [ ] Apply to affiliate programs: DraftKings Partners, FanDuel Partners, BetMGM Partners (or use personal referral links as interim)
- [ ] Set Odds API key: `supabase secrets set ODDS_API_KEY=...` → `supabase functions deploy odds`
  - Change scanner refresh from 120s → 300s in LiveScanner
- [ ] Set up Stripe test products: Monthly ($24.99) + Annual ($199) → get price IDs
  - Update `create-checkout` Edge Function to route by `body.planId`
  - `supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... STRIPE_MONTHLY_PRICE_ID=... STRIPE_ANNUAL_PRICE_ID=...`
  - `supabase functions deploy create-checkout && supabase functions deploy stripe-webhook`
- [ ] Set up Resend: verify domain → `supabase secrets set RESEND_API_KEY=...` → `supabase functions deploy weekly-digest`
- [ ] Enable Google OAuth + Discord OAuth in Supabase dashboard
- [ ] Uncomment Plausible script in `index.html` (after creating plausible.io account)
- [ ] Submit sitemap to Google Search Console (47 URLs)

**Revenue unlock sequence:** Affiliate links → Odds API → Stripe (test) → live Stripe (after LLC + EIN)

---

## Phase 2 — SEO / Organic Growth (High Priority)

**Status:** Problem identified, solution not yet built.

The entire app renders client-side. Google sees a blank div. This caps organic growth.

**Options (pick one):**
1. **Vite SSG plugin** (`vite-plugin-ssg`) — least disruptive. Pre-renders each slug to static HTML at build time. Preserves existing architecture.
2. **Astro migration** — larger refactor but solves both SSG and the App.jsx file-size problem simultaneously. Calculator components become `.astro` pages.

**Why it matters:** SEO is the lowest-cost acquisition channel. Knowledge base articles + calculator pages are rankable for long-tail queries ("bonus bet converter", "profit boost calculator free", etc.). Without SSG, all organic traffic is abandoned.

**Recommendation:** Do Vite SSG first (1-2 sessions). Evaluate Astro migration when App.jsx exceeds 7,000 lines.

---

## Phase 3 — Growth & Retention Layer (After Revenue Active)

- Email drip sequence (5 onboarding emails via Resend)
- 7-day VaultSparked free trial (Stripe trial_period_days)
- Server-sent push notifications — `supabase/functions/send-daily-brief/` skeleton ready; needs VAPID keys + `scripts/migration-push-subscriptions.sql`
- Browser extension (Chrome/Firefox) — separate repo; detects sportsbook pages, overlays relevant calculator
- Discord community + bot integration

---

## Phase 4 — Scale (When 50+ VaultSparked Subscribers)

- Activate Team accounts backend (`team_members` table + shared data context)
- Shared odds cache in Supabase (one API call serves all concurrent scanner users)
- UK market module (GBP books + UK-specific promo types) — 5x TAM expansion
- Mobile app via Capacitor (`npm run cap:sync` — config already present)

---

## Blocked Until LLC + EIN

- Stripe live mode (all Stripe infrastructure ready; just needs business entity)
- Formal affiliate agreements (personal referral links work in interim)
