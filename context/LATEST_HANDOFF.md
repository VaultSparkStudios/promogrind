# Latest Handoff

This repo now keeps only a public-safe handoff summary. Detailed handoff history is maintained privately.

## Where We Left Off (Session 37 — full closeout)

### Shipped this session (2 commits)

**Commit 1 — feat(s37): UserMenu — sports avatar, auth header, responsive overhaul**
- New `src/components/UserMenu.jsx` — replaces ProfilePanel entirely
  - Logged-out: Sign In (ghost) + Create Free Account (green glow) → both link to VaultSpark auth
  - Logged-in: sports/betting avatar (12 emoji: 🎯🎲🃏🏈🏀⚽🎰💰🦅🏆🐂🎳), editable display name, tier badge, animated dropdown
  - Dropdown: avatar picker, inline name edit, theme/compact/currency prefs, subscription + upgrade CTA, session summary, sign out
  - Position: getBoundingClientRect + position:fixed — works at all scroll depths, full-width on mobile
- Header overhaul: sticky + backdrop-blur, responsive — Logo / DailyStreak / Advisor / theme icon / UserMenu
  - Mobile strip: streak + advisor row below logo, single-line compliance
- Tab bar: sticky below header, 44px+ touch targets, hidden scrollbar, tap-delay suppression
- index.html: iOS zoom prevention, safe-area insets, thin scrollbars, touch-action:manipulation, smooth scroll
- sitemap.xml: /about/ and /compliance/ added (145 URLs total)
- DNS confirmed: promogrind.bet NS live on Cloudflare (verified this session)

**Commit 2 — fix(s37): console errors, Promo Advisor auth gate, branding softening**
- manifest.json: fixed wrong path `/promogrind/manifest.json` → `/manifest.json`
- index.html: added `mobile-web-app-capable` (apple version deprecated)
- PromoAdvisorPanel: added `user` prop + explicit auth headers; guest sign-in gate shows Create Account / Sign In instead of hitting edge function unauthenticated (was causing 401)
- Branding: all "Free Vault Membership" → "Free PromoGrind Account" / "free account" across App.jsx, ui.jsx; header stat "Vault Membership" → "Forever"
- Build: ✓ passing · Tests: 127/127

## Human Action Required
- [x] **Google Search Console** — verified promogrind.bet via Cloudflare DNS TXT, sitemap submitted
- [ ] **Affiliate/referral links** — paste personal referral URLs into `referralLink` fields in `src/books.js`
- [ ] **Stripe smoke test** — card 4242 4242 4242 4242, verify `subscriptions` table row created
- [ ] **wins_wall Supabase table** — create the table (component handles 404 silently but table needs to exist for community wins wall feature)

## State at Handoff
- Domain: promogrind.bet LIVE on Cloudflare (NS confirmed)
- Auth: UserMenu fully wired — logged-out shows Sign In + Create Account; logged-in shows avatar dropdown
- Promo Advisor: guest gate working, auth headers explicit
- Branding: PromoGrind-native (no "Vault Membership" in user-facing copy)
- Analytics: Cloudflare + PostHog + Sentry all active
- Build: ✓ passing · Tests: 127/127
