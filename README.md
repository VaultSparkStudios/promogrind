# Promo Engine v3

Free sportsbook promo conversion tool suite with knowledge base, profit tracking, and affiliate monetization built in.

## What This Is

A complete web app that helps people convert sportsbook promotions into guaranteed cash using math (matched betting / promo conversion). Includes 11 calculators, a sportsbook tracker, P/L ledger, and comprehensive knowledge base for beginners.

## Deploy in 2 Minutes

### Option A: Vercel (Recommended — Free)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "New Project" → Import your repo
4. Framework: **Vite** (auto-detected)
5. Click Deploy
6. Your app is live at `your-project.vercel.app`
7. (Optional) Add a custom domain in Vercel settings

### Option B: Netlify (Free)

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com) → "Add new site" → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Click Deploy
6. Live at `your-project.netlify.app`

### Option C: Manual

```bash
npm install
npm run build
# Upload the 'dist' folder to any static host
```

## Monetization Setup (Path A)

### Step 1: Affiliate Links (Biggest Money)

Edit `src/books.js` and replace each sportsbook's `link` value with your affiliate tracking URL.

**How to get affiliate links:**

| Sportsbook | Program URL | Commission |
|-----------|------------|------------|
| DraftKings | draftkings.com/partners | $75+ CPA per user |
| FanDuel | fanduel.com/partners | $25-$35 CPA or 35% RevShare |
| BetMGM | betmgmpartners.com | $50+ CPA per user |
| Caesars | (Apply via partner page) | RevShare |
| bet365 | bet365partners.com | 30% RevShare |

**Simpler alternative:** Use your personal "Refer a Friend" links from each app. No licensing needed. You both get $25-$100 per book.

### Step 2: SEO Traffic

The Knowledge Base content is designed to rank for long-tail keywords:
- "what is vig in sports betting"
- "how to convert bonus bets to cash"
- "profit boost calculator free"
- "sportsbook promo conversion"
- "matched betting legal US"

The index.html has meta tags pre-configured for these terms. To improve SEO further:
- Write blog posts on a connected blog
- Share the knowledge base articles on social media
- Answer questions on Reddit/Quora linking to the tool

### Step 3: Referral Bonuses

When friends use your tool and sign up at sportsbooks through the links, you earn:
- DraftKings: Up to $100 per friend
- BetMGM: $100 per friend (up to 20/month = $2,000/month cap)
- FanDuel: Up to $75 per friend
- BetRivers: $100 per friend

If 10 friends each sign up at 5 books: $2,500-$5,000 in referral bonuses.

## Revenue Projections

| Source | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| Your own promo extraction | $1,000-$2,500 | +$300-$1,000/mo | +$300-$1,000/mo |
| Friend referrals (10 friends) | $2,000-$4,000 | — | — |
| Affiliate commissions (SEO) | $0-$200 | $200-$800 | $500-$2,000 |
| **Total** | **$3,000-$6,700** | **$500-$1,800/mo** | **$800-$3,000/mo** |

## Legal

- This is a math calculator / educational tool
- Matched betting is legal in all US states with legal sports betting (30+)
- Similar tools operate commercially (ProfitDuel $99/mo, OddsJam $199/mo)
- This tool is free and contains no paywalls
- Affiliate disclosure: Include a note that links may be affiliate links
- Add your state's required responsible gambling notice
- Must be 21+ in most states
- All gambling winnings are taxable

### Affiliate Licensing Note

Some states require a license to operate as a sportsbook affiliate. Check:
- Your state's gaming commission website
- Or join an affiliate network (Income Access, Gambling.com Group) that handles compliance

Personal "Refer a Friend" links do NOT require licensing — they're a standard sportsbook feature available to all users.

## File Structure

```
promo-engine/
├── index.html          ← SEO-optimized HTML with meta tags
├── package.json        ← Dependencies
├── vite.config.js      ← Build config
├── vercel.json         ← Vercel routing
├── netlify.toml        ← Netlify routing
├── public/
│   ├── favicon.svg     ← App icon
│   ├── robots.txt      ← SEO
│   └── sitemap.xml     ← SEO
└── src/
    ├── main.jsx        ← Entry point
    ├── App.jsx         ← Complete app (all tools, KB, tracking)
    ├── math.js         ← Calculator functions
    ├── storage.js      ← LocalStorage persistence
    ├── books.js        ← Sportsbook data + affiliate links
    └── theme.js        ← Color/font constants
```

## Future Upgrade Path (Path B)

When ready to add a live odds scanner (premium tier):

1. Sign up for The Odds API (free: 500 credits/month) at the-odds-api.com
2. Build a scanner component that fetches live odds
3. Auto-detect arb opportunities and +EV bets
4. This becomes the paid tier ($29-$79/month)
5. Free calculators remain free (traffic driver)
6. Paid scanner is the subscription product

## Tech Stack

- React 18
- Vite 6
- Vanilla CSS (no framework — fast loading)
- LocalStorage for persistence
- Zero backend required
- Static hosting (free on Vercel/Netlify)
