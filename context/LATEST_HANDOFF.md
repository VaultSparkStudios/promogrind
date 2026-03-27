# Latest Handoff

## Where We Left Off (Session 13)
- Shipped: 4 high-ceiling items — Chrome Extension, AI Bet Slip Parser, UK market module (8 pages), Content Blog (5 posts + index)
- Also shipped: domain migration prep (CNAME), sitemap updated to 131+ URLs
- Closeout: TASK_BOARD + CURRENT_STATE + LATEST_HANDOFF + PROJECT_STATUS.json + memory all updated
- Build: clean ✓ — 98.41 kB gzip (app chunk)
- Git: committed + pushed (commit `b724175`) — live at vaultsparkstudios.com/promogrind/

### Manual items flagged and parked (nothing blocks next code session)
| Item | What's needed | Where |
|---|---|---|
| AI Scan button | `ANTHROPIC_API_KEY` + `supabase functions deploy parse-bet-slip` | Supabase dashboard |
| Push notifications | VAPID keys + deploy + SQL migration + .env | See push_notifications block in PROJECT_STATUS.json |
| Live Scanner | Odds API key | theoddsapi.com |
| Paid upgrade flow | Stripe products + LLC + EIN | Stripe dashboard |
| Affiliate revenue | Apply to each book's partner program | See TASK_BOARD |
| Chrome Web Store | Screenshots + listing copy + $5 dev fee | chrome.google.com/webstore/devconsole |
| Domain promogrind.com | Purchase + CNAME DNS + update 45 SEO pages | GoDaddy/Namecheap/Cloudflare |
| Google Search Console | Submit sitemap (131+ URLs) | search.google.com/search-console |

---

## What was completed — session 13 (v13.0)

### Chrome Extension (`extension/`)
- `manifest.json` — Manifest V3, matches 12 sportsbooks (DK, FD, MGM, Caesars, bet365, ESPN, Fanatics, BetRivers + 4 UK books)
- `content.js` — injects floating ⚡ PG button at bottom-right of sportsbook pages; click opens slide-out panel with 6 calc links
- `popup.html` + `popup.js` — extension popup detects active tab's book, shows contextual suggested calculators
- `background.js` — service worker handles `OPEN_CALC`, `DETECT_BOOK`, `OPEN_APP` messages
- Load unpacked in Chrome at `chrome://extensions` → Load unpacked → select `extension/` folder
- Submit to Chrome Web Store when ready (needs screenshots + privacy policy)

### AI Bet Slip Parser
- `supabase/functions/parse-bet-slip/index.ts` — Claude claude-haiku (vision model)
- Accepts: `{ imageBase64, mimeType }` POST body
- Returns: `{ betType, stake, odds, hedgeOdds, boostPct, maxExtra, book, promoName, confidence, rawText }`
- UI: "📷 Scan" button in BonusBet next to "Parse" button; shows extracted fields after scan
- Deploy: `supabase functions deploy parse-bet-slip` + `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`

### UK Market Module (8 new pages)
- `public/matched-betting-uk/` — full guide: legal, step-by-step, 6 UK books, recurring offers
- `public/bonus-bets-uk/` — offer comparison table (Sky Bet, bet365, William Hill, Betway, Paddy Power)
- City pages: London, Manchester, Birmingham, Glasgow, Edinburgh, Liverpool
- PromoCalendar in App.jsx: added 🌎/🇺🇸/🇬🇧 market toggle → filters to US or UK books only

### Content Blog (6 new files)
- `public/blog/index.html` — blog index with 5 post cards + CTA
- `how-matched-betting-works/` — 8-min beginner guide, conversion table, worked example
- `best-sportsbook-promos-2026/` — ranked sign-up offers + recurring monthly estimates
- `draftkings-vs-fanduel-promos/` — side-by-side comparison with annual value estimates
- `sports-betting-taxes-guide/` — IRS W-2G, deductions, after-tax yield calc, record-keeping
- `arbitrage-betting-explained/` — arb formula, stake sizing, account sustainability tips

### Domain Prep
- `public/CNAME` created with `promogrind.com`
- `sitemap.xml` updated: 131+ URLs (added 8 UK pages + 6 blog posts)

---

## Current app state

- **Version**: 13.0
- **App.jsx**: ~5,870 lines
- **Build**: clean — 98.41 kB gzip
- **Calculators**: 27
- **Static SEO pages**: 45 (30 original + 8 UK + blog index + 5 blog posts + landing/privacy/terms)
- **Blog posts**: 5 live
- **Chrome Extension**: ready to load unpacked
- **Parse Bet Slip Edge Function**: needs `ANTHROPIC_API_KEY` secret + deploy

---

## Session 12 Handoff (preserved below)
## Where We Left Off (Session 12)
- Shipped: 10 features + 17 SEO pages + supporting files across 4 groups — features (10: EV%, splash, UK market, PushEnableBtn, testimonials, etc.), seo (17 new static pages → 30 total), monetization (affiliate referralLink field, Plausible activated), legal (privacy/terms/landing pages)
- Tests: N/A — no automated test suite
- Deploy: deployed — live at vaultsparkstudios.com/promogrind/ · App.jsx ~5,780 lines · 82/100 audit score

---

Last updated: 2026-03-26 (session 13 — Chrome extension + AI parser + UK market + blog + closeout)

This is the authoritative active handoff file for the project.

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

## To activate AI bet slip scanner (when ready)

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy parse-bet-slip
```

📷 Scan button in BonusBet is already live in the UI — it just calls the Edge Function.

---

## Pending external setup

1. **Affiliate tracking URLs** — `src/books.js` has `referralLink` field on all 8 books; replace placeholder URLs with real affiliate-approved tracking links once approved by each program
2. Odds API key → deploy `odds` edge function; change 120s → 300s refresh
3. Stripe: two products (Monthly $24.99 + Annual $199) → set secrets → deploy `create-checkout` + `stripe-webhook`
4. Resend key → deploy `weekly-digest` edge function
5. ✅ Plausible: activated in `index.html`
6. Google + Discord OAuth in Supabase dashboard
7. Google Search Console: submit updated sitemap (131+ URLs)
8. VAPID keys → deploy `send-daily-brief` (see above)
9. **ANTHROPIC_API_KEY** → deploy `parse-bet-slip` (see above)
10. **Chrome Web Store** — screenshots + listing copy needed before submission
11. **promogrind.com** — purchase domain → CNAME DNS → update 45 SEO page redirects + canonicals + sitemap

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
