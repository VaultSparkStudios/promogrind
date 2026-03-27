/*
  ═══════════════════════════════════════════════════════════
  AFFILIATE LINK SETUP INSTRUCTIONS
  ═══════════════════════════════════════════════════════════

  To monetize this tool, replace the `link` values below with
  your affiliate tracking URLs. Here's how to get them:

  1. DraftKings Partners: https://www.draftkings.com/partners
     - Apply for their affiliate program
     - CPA: $75+ per depositing user
     - They'll give you a unique tracking URL

  2. FanDuel Partners: https://www.fanduel.com/partners
     - Apply at partners.fanduel.com
     - CPA: $25-$35 or 35% RevShare for 730 days
     - Get your tracking link from the dashboard

  3. BetMGM Partners: https://www.betmgmpartners.com
     - Apply for their program
     - CPA: $50+ per depositing user
     - Dashboard provides tracking URLs

  4. Caesars Affiliates: Apply through their partner page
     - Revenue share model available

  5. bet365 Partners: https://www.bet365partners.com
     - 30% of net profit RevShare

  ALTERNATIVE: Join an affiliate network like:
  - Income Access (manages multiple book programs)
  - Gambling.com Group
  - Better Collective
  These handle compliance/licensing and give you links for multiple books.

  SIMPLER OPTION: Use your personal referral codes instead.
  Each sportsbook has a "Refer a Friend" feature in the app.
  This doesn't require affiliate licensing — you just share
  your personal referral link and both you and your friend
  get bonus bets ($25-$100 per referral per book).
  ═══════════════════════════════════════════════════════════
*/

export const BOOKS = [
  {
    name: "DraftKings",
    type: "Bet & Get",
    detail: "Bet $5 → $200 in Bonus Bets + 20% Deposit Match up to $1,000",
    value: "$200-$1,200",
    bonus: 200,
    recurring: "Daily odds boosts, SGP profit boosts, stepped up parlays",
    // Homepage (used for general nav / display)
    link: "https://www.draftkings.com",
    // Direct new-user registration page — better for click-through
    signupLink: "https://www.draftkings.com/gateway?s=0",
    // ↓ Replace with your affiliate URL after approval at draftkings.com/partners
    affiliateLink: null,
    referral: "Up to $100 bonus bet per friend referred",
    referralLink: "https://www.draftkings.com/refer-a-friend",
    affiliateProgram: "https://www.draftkings.com/partners",
    cpa: "$75+ per depositing user",
    color: "#53d769",
  },
  {
    name: "FanDuel",
    type: "Bet Reset",
    detail: "Up to $300/day Bet Reset for 10 days if first bet loses",
    value: "$150-$3,000",
    bonus: 300,
    recurring: "Daily boosts, profit boost tokens, same game parlay+",
    link: "https://www.fanduel.com",
    signupLink: "https://www.fanduel.com/join",
    // ↓ Replace with your affiliate URL after approval at partners.fanduel.com
    affiliateLink: null,
    referral: "Up to $75 bonus bet per friend",
    referralLink: "https://www.fanduel.com/referral",
    affiliateProgram: "https://partners.fanduel.com",
    cpa: "$25–35 CPA or 35% RevShare for 730 days",
    color: "#1493ff",
  },
  {
    name: "BetMGM",
    type: "Safety Net",
    detail: "Up to $1,500 back in Bonus Bets if first bet loses",
    value: "$500-$1,500",
    bonus: 1500,
    recurring: "Weekly deposit bonuses (25% up to $100), daily boosts",
    link: "https://www.betmgm.com",
    signupLink: "https://sports.betmgm.com/en/sports",
    // ↓ Replace with your affiliate URL after approval at betmgmpartners.com
    affiliateLink: null,
    referral: "$100 per friend, up to 20/month",
    referralLink: "https://sports.betmgm.com/en/sports/refer-a-friend",
    affiliateProgram: "https://www.betmgmpartners.com",
    cpa: "$50+ per depositing user",
    color: "#c4a44a",
  },
  {
    name: "Caesars",
    type: "Profit Boosts",
    detail: "Bet $1 → 10x 100% Profit Boost Tokens ($25 max each)",
    value: "$50-$250",
    bonus: 250,
    recurring: "Rotating profit boosts, odds boosts, parlay insurance",
    link: "https://www.caesars.com/sportsbook-and-casino",
    signupLink: "https://www.caesars.com/sportsbook-and-casino/register",
    // ↓ Replace with your affiliate URL after approval at caesarsaffiliates.com
    affiliateLink: null,
    referral: "5,000 Reward Credits (~$50) per friend",
    referralLink: "https://www.caesars.com/sportsbook-and-casino/refer-a-friend",
    affiliateProgram: "https://www.caesarsaffiliates.com",
    cpa: "Revenue share model",
    color: "#1a472a",
  },
  {
    name: "bet365",
    type: "Choice",
    detail: "Bet $10 → $365 Bonus Bets OR $1K Safety Net",
    value: "$200-$365",
    bonus: 365,
    recurring: "Early payout offers, multi-sport parlay boosts",
    link: "https://www.bet365.com",
    signupLink: "https://www.bet365.com/#/AC/B1/C1/D1002/E3/F163/",
    // ↓ Replace with your affiliate URL after approval at bet365partners.com
    affiliateLink: null,
    referral: "Varies by state",
    referralLink: "https://www.bet365.com/referral",
    affiliateProgram: "https://www.bet365partners.com",
    cpa: "30% of net profit RevShare",
    color: "#027b5b",
  },
  {
    name: "ESPN BET",
    type: "Bet & Get",
    detail: "Bet $5 → $200 + Deposit Match",
    value: "$200-$500",
    bonus: 200,
    recurring: "Weekly profit boosts, featured parlay boosts",
    link: "https://www.espnbet.com",
    signupLink: "https://www.espnbet.com/registration",
    // ↓ Replace with your affiliate URL after approval via Penn Interactive
    affiliateLink: null,
    referral: "Varies",
    referralLink: "https://www.espnbet.com/refer-a-friend",
    affiliateProgram: "https://www.penninteractive.com/affiliates",
    cpa: "CPA varies by state",
    color: "#d00",
  },
  {
    name: "Fanatics",
    type: "Bet & Get",
    detail: "Bet $5 → $200 FanCash + Profit Boost Tokens",
    value: "$200-$300",
    bonus: 200,
    recurring: "Daily FanCash bonuses, loyalty rewards",
    link: "https://www.fanatics.com/sportsbook",
    signupLink: "https://www.fanaticssportsbook.com/registration",
    // ↓ Replace with your affiliate URL after approval via Fanatics Partners
    affiliateLink: null,
    referral: "Varies by state",
    referralLink: "https://www.fanaticssportsbook.com/refer-a-friend",
    affiliateProgram: "https://www.fanaticssportsbook.com/partners",
    cpa: "CPA model — apply for rates",
    color: "#e44d26",
  },
  {
    name: "BetRivers",
    type: "Safety Net",
    detail: "Up to $500 Second Chance Bet",
    value: "$100-$500",
    bonus: 500,
    recurring: "iRush rewards, profit boosts, 2nd chance parlays",
    link: "https://www.betrivers.com",
    signupLink: "https://www.betrivers.com/registration",
    // ↓ Replace with your affiliate URL after approval via Rush Street Interactive Partners
    affiliateLink: null,
    referral: "$100 per friend ($50 deposit req.)",
    referralLink: "https://www.betrivers.com/refer-a-friend",
    affiliateProgram: "https://www.betrivers.com/affiliates",
    cpa: "$50–100 per depositing user",
    color: "#0066cc",
  },
];

/**
 * Returns the best click-through URL for a book in priority order:
 *  1. affiliateLink (tracked, earns commission) — use when approved
 *  2. signupLink (direct registration, better UX than homepage)
 *  3. link (homepage fallback)
 */
export const getBookUrl = (book) =>
  book.affiliateLink || book.signupLink || book.link;
