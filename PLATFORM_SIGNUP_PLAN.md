# Platform Signup Plan

## Must-Have (core functionality)

| Platform | Purpose | URL | Status |
|---|---|---|---|
| **Stripe** | VaultSparked payments ($24.99/mo) | stripe.com | Pending |
| **The Odds API** | Live arb/EV scanner data | theoddsapi.com | Pending |

---

## Sportsbook Affiliate Programs (revenue)

Two options — pick one per book or use a network (see shortcut below).

**Option A — Personal Referral Links**
Get your "Refer a Friend" link from each sportsbook's app. No license required. Both parties get bonus bets ($25–100). Instant.

**Option B — Affiliate Program**
Apply to each book's partner program. Higher CPA ($25–75+ per depositing user). Takes 1–4 weeks for approval.

| Sportsbook | Affiliate Program URL | Approx. Payout | Link Field in books.js | Status |
|---|---|---|---|---|
| DraftKings | draftkings.com/partners | ~$75 CPA | `BOOKS[0].link` | Pending |
| FanDuel | partners.fanduel.com | $25–35 CPA or 35% RevShare (730 days) | `BOOKS[1].link` | Pending |
| BetMGM | betmgmpartners.com | $50+ CPA | `BOOKS[2].link` | Pending |
| Caesars | caesarsaffiliates.com | RevShare | `BOOKS[3].link` | Pending |
| bet365 | bet365partners.com | 30% RevShare | `BOOKS[4].link` | Pending |
| ESPN BET | PENN Entertainment affiliates | Varies | `BOOKS[5].link` | Pending |
| Fanatics | fanatics.com affiliates | Varies | `BOOKS[6].link` | Pending |
| BetRivers | rushstreetinteractive.com/affiliates | Varies | `BOOKS[7].link` | Pending |

**Shortcut — Affiliate Networks**
Join one network that manages multiple books in a single dashboard. Also handles compliance/licensing questions.

| Network | Notes |
|---|---|
| Income Access | Manages DraftKings, BetMGM, and others |
| Gambling.com Group | Large network, compliance support |
| Better Collective | European-origin, strong US presence |

---

## OAuth / Social Login

Configure in Supabase Dashboard → Authentication → Providers after creating credentials.

| Platform | Purpose | Where to Create Credentials | Status |
|---|---|---|---|
| Google Cloud Console | Enable Google OAuth in Supabase | console.cloud.google.com → Create OAuth 2.0 Client ID | Pending |
| Discord Developer Portal | Enable Discord OAuth in Supabase | discord.com/developers/applications → New Application → OAuth2 | Pending |

---

## SEO & Analytics

| Platform | Purpose | Notes | Status |
|---|---|---|---|
| Google Search Console | Submit sitemap, track search impressions | Add property for vaultsparkstudios.com/promogrind/ | Pending |
| Plausible or Fathom | Privacy-friendly analytics | No cookie banner required. Plausible ~$9/mo, Fathom ~$15/mo | Pending |

---

## Domain

| Platform | Purpose | Notes | Status |
|---|---|---|---|
| Cloudflare or Namecheap | Register promogrind.com | ~$10/year. Cloudflare charges at-cost with no markup. Check availability first. | Pending |

---

## Priority Order

1. **Stripe** — enables VaultSparked payments (test mode now, live after LLC)
2. **The Odds API** — unlocks live scanner for paying members
3. **Sportsbook affiliate links** — primary revenue mechanism, wire into `src/books.js`
4. **Google Search Console** — submit sitemap once domain is set
5. **OAuth providers** — reduces signup friction
6. **Analytics** — track traffic growth
7. **Domain** — promogrind.com for standalone brand

---

## Notes

- Do not activate Stripe live mode until LLC + EIN + bank account are in place.
- Sportsbook affiliate licensing requirements vary by state — check your state gaming commission or use an affiliate network that handles compliance.
- Personal referral links (Option A) are exempt from affiliate licensing — they are a standard user feature.
- All affiliate links go in `src/books.js` only — never hardcoded elsewhere in the app.
