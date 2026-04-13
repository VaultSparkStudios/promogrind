# Latest Handoff

This repo now keeps only a public-safe handoff summary. Detailed handoff history is maintained privately.

## Where We Left Off (Session 39 — full closeout)

### Shipped this session (2 commits)

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

Build: ✓ passing · Tests: 127/127

## Human Action Required
- [ ] **Stripe smoke test** — card 4242 4242 4242 4242, verify `subscriptions` table row + customer portal redirect works end-to-end
- [ ] **Affiliate/referral links** — paste personal referral URLs into `referralLink` fields in `src/books.js`
- [ ] **wins_wall Supabase table** — create the table (component handles 404 silently but table needed for community wins wall)

## State at Handoff
- Beta invite system: deployed and live — hand PGBETA-XXXX codes to friends directly
- RESEND drip/digest: active (key confirmed set)
- Stripe Customer Portal: edge function live, UserMenu "Manage billing →" wired
- Build: ✓ passing · Tests: 127/127
- Last remaining code blocker before Reddit launch: affiliate links in src/books.js
