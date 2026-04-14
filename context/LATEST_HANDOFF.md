# Latest Handoff

This repo now keeps only a public-safe handoff summary. Detailed handoff history is maintained privately.

## Where We Left Off (Session 39 — continued)

### Shipped this session (3 commits)

**feat(s39): beta invite code system — redeem-beta-code edge fn + UserMenu UI**

#### Beta Invite Code System
- `beta_codes` Supabase table created (RLS enabled, service-role-only access); 10 PGBETA-XXXX single-use codes seeded (Runner tier, 30 days each)
- New `supabase/functions/redeem-beta-code/index.ts` — auth via JWT, validates code (exists + not exhausted), upserts subscription row (plan='runner', status='active', current_period_end=+30d), marks code used
- New `redeemBetaCode(code)` in `src/auth.js` — calls edge fn with auth header
- `UserMenu.jsx` — "Have a beta invite code?" collapsible section in Subscription panel, only visible to Free Agent tier users; input + Apply button; auto-reloads page on success so tier badge updates immediately
- `.beta-codes` file created (gitignored) — local reference for all 10 codes
- `.gitignore` updated to exclude `.beta-codes`

#### Secrets audit (S39 confirmed)
- `RESEND_API_KEY` — confirmed set (task board was stale from S38)
- Stripe Customer Portal config — `bpc_1TLsRNGMN60PfJYsM0S0ByAh` already active and pinned in edge function
- All Supabase secrets confirmed live: Stripe (sk_live + 7 prices + webhook), ANTHROPIC_API_KEY, VAPID keys, RESEND, DIGEST secrets

#### Existing promo codes (in Stripe, already set up)
- `VAULTFRIEND` — 100% off, 1 month (for paid checkout flow)
- `FOUNDER50` — 50% off, 3 months
- `BETAPASS` — 30% off, forever

**feat(s39): Home tab suite + global text size increase**

#### Home Tab Suite
- 5 new Home tabs: Daily Brief, Get Started, What's New, Pricing (duplicate), About
  - `DailyBriefPage` — today's promo schedule, quick actions 2×2 grid, 9am briefing toggle (localStorage), open bets counter
  - `GetStarted` — 6-step onboarding guide with useNavigate() links to key features
  - `WhatsNew` — static changelog v23.3.0–v23.7.0 with version badge + sprint labels
  - `AboutPage` — full app stats, feature grid, trust badges, contact info, legal links
  - `PricingPage` — duplicate of existing Pricing tab added to Home group
- TABS Home group expanded: Dashboard · Daily Brief · Get Started · What's New · Pricing · About

#### Global Text Size Increase
- `src/lib/shared.js`: S.label 10→11px, S.input 13→14px, S.note 12→13px, S.help 12→13px, S.helpH 14→15px
- `src/ui.jsx`: RR label 12→13px, RR value 13→14px, Tl title 16→18px
- `src/App.jsx` nav: group tabs 10/11→12/13px, sub-item tabs 11→13px, subcat filters 9→11px, pinned favorites 9→11px

Build: ✓ passing · Tests: 127/127

## Human Action Required
- [ ] **Stripe smoke test** — card 4242 4242 4242 4242, verify `subscriptions` table row + customer portal redirect works end-to-end
- [ ] **Affiliate/referral links** — paste personal referral URLs into `referralLink` fields in `src/books.js`
- [ ] **wins_wall Supabase table** — create the table (component handles 404 silently but table needed for community wins wall)

## State at Handoff
- Home tab suite: live — 6 tabs in Home group (Dashboard, Daily Brief, Get Started, What's New, Pricing, About)
- Global text sizes: increased across all shared primitives + nav
- Beta invite system: deployed and live — hand PGBETA-XXXX codes to friends directly
- RESEND drip/digest: active (key confirmed set)
- Stripe Customer Portal: edge function live, UserMenu "Manage billing →" wired
- Build: ✓ passing · Tests: 127/127
- Last remaining code blocker before Reddit launch: affiliate links in src/books.js
