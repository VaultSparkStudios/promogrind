# Latest Handoff

## Where We Left Off (Session 15)
- Full project audit (76/100) + implemented all "Highest Leverage Now" and "Highest Ceiling" items
- Build: clean ✓ — 105.87 kB gzip (app chunk, up from 101.55 kB)
- Git: not yet committed

### What was built — session 15 (v15.0)

**App.jsx (+349 lines, build ✓):**
- **Onboarding Checklist** — 5-step getting-started card on Dashboard; auto-detects completion from appData/localStorage; dismissible
- **Book Signup Progress Tracker** — "Unclaimed Promo Value" section in Sportsbooks tab; shows unsigned books + estimated value + Claim CTAs
- **Behavioral Upgrade Triggers** — contextual upsell banners: arb calc (5+ uses) → Live Scanner; ledger (3+ entries) → cloud sync; dismissible, reads `pg_usage_log`
- **Plausible Funnel Events** — 5 events wired: `trial_start`, `upgrade_click`, `referral_shared`, `first_ledger_entry`, `first_calc_run`
- **Calculator Share Cards** — `ShareCard` component on BonusBet + ProfitBoost profitable results; copy text + native share / Twitter fallback
- **Taxes Estimator** — new Calculate tool; reads from Ledger auto; 2025 federal brackets, state rate, W-2G warning, quarterly schedule, print PDF

**New static files:**
- `public/promogrind-vs-profitduel/index.html` — 13-row competitor comparison, UTM-tracked
- `public/promogrind-vs-oddsjam/index.html` — 12-row competitor comparison, UTM-tracked
- `public/promogrind-vs-betterbet/index.html` — 10-row competitor comparison, UTM-tracked
- `discord-bot/bot.js` + `discord-bot/package.json` — Discord.js v14 bot; `/promos` + `/calc` slash commands + daily 9am digest from `community_promos` table
- `sitemap.xml` — competitor pages added (138+ URLs now)

**UTM attribution:**
- 35 SEO page redirects updated with `?utm_source=seo&utm_medium=organic&utm_content={slug}` — Plausible now attributes SPA visits to source pages

### Parked (manual only — no code blocks next session)
| Item | What's needed |
|---|---|
| Onboarding drip | RESEND_API_KEY → `supabase functions deploy onboarding-drip` → schedule daily cron |
| Weekly digest | RESEND_API_KEY → `supabase functions deploy weekly-digest` → schedule weekly cron |
| Discord bot | Discord dev account → bot token → set env vars → `npm install` in `discord-bot/` → run |
| parse-bet-slip | ANTHROPIC_API_KEY → deploy |
| Push notifications | VAPID keys → deploy → run migration-push-subscriptions.sql |
| Affiliate links | Apply to partner programs → replace `referralLink` in `src/books.js` |
| Stripe | LLC + EIN → products → secrets → deploy |
| Google Search Console | Submit sitemap (138+ URLs) |
| promogrind.com domain | Purchase → CNAME DNS |

---

## Where We Left Off (Session 14)
- Full project audit (74/100 honest score — revenue identified as #1 blocker)
- Shipped: 5 App.jsx features + 2 static pages + 3 SQL migrations + task board + memory all updated
- Build: clean ✓ — 101.55 kB gzip (app chunk)
- Git: not yet committed

### What was built — session 14 (v14.0)

**App.jsx (all 5 features — build ✓):**
- **White-Label Embed Mode** — `?embed=1` hides nav/header, shows only calculator + "Powered by PromoGrind" watermark
- **Bet Slip → Auto-Track** — after AI scan in BonusBet, "➕ Add to Tracker" creates bet entry via `syncAppData`
- **Influencer Affiliate Dashboard** — "⚡ Creator Mode" section in ReferralHub (VaultSparked-gated); custom vanity code + click/signup stats + estimated commission
- **Crowdsourced Promo Database** — new "Community Promos" Learn tab; browse/upvote; VaultSparked can submit; backed by `community_promos` Supabase table
- **Team Accounts UI** — full create/invite/manage replaces waitlist; backed by `team_accounts` + `team_members` tables

**New files:**
- `public/income-estimator/index.html` — interactive "How Much Can I Make?" estimator (state/bankroll/time inputs → personalized annual income breakdown)
- `public/embed/index.html` — embed docs page with copy-paste iframe codes for 5 calculators
- `scripts/migration-team-accounts.sql` — team_accounts + team_members tables with RLS
- `scripts/migration-community-promos.sql` — community_promos table + `upvote_community_promo` RPC
- `scripts/migration-influencer-codes.sql` — influencer_codes table + 3 RPCs (get_influencer_code, track_influencer_click, track_influencer_signup)
- `sitemap.xml` — added income-estimator + embed (135+ URLs)

### Manual items flagged and parked
| Item | What's needed | Where |
|---|---|---|
| Run 3 new SQL migrations | SQL Editor | Supabase dashboard |
| Deploy onboarding-drip | `supabase functions deploy onboarding-drip` + Resend key + cron schedule | Supabase |
| parse-bet-slip deploy | `ANTHROPIC_API_KEY` + deploy | Supabase |
| Push notifications | VAPID keys + deploy + SQL migration | See TASK_BOARD |
| Live Scanner | Odds API key | theoddsapi.com |
| Paid upgrade flow | Stripe products + LLC + EIN | Stripe dashboard |
| Affiliate revenue | Apply to each book's partner program | See TASK_BOARD |
| Chrome Web Store | Screenshots + listing copy + $5 dev fee | chrome.google.com |
| Domain promogrind.com | Purchase + CNAME DNS | GoDaddy/Namecheap |
| Google Search Console | Submit sitemap | search.google.com/search-console |

---

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
