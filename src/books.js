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
    referralLink: "https://www.draftkings.com/r/REDACTED",
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
    referralLink: "https://www.fanduel.com/referral?invitedby&cnl=da&utm_campaign=User%20Referral&utm_medium=Web&utm_source=Referral%20Center&utm_content=Link&app_name=DFS",
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
    referralLink: null,
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
    referralLink: "https://caesars.com/sportsbook-and-casino/referral?AR=RAF-737-P9Q",
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
    referral: "No personal referral code available on this account",
    referralLink: null,
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
    referral: "Personal referral via TheScore BET / ESPN BET app",
    referralLink: "https://espnbet.app.link/referafriend?promo_code=REF-CARTER-F1B72D",
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
    referral: "Personal referral via Fanatics Sportsbook app",
    referralLink: "https://fanatics.onelink.me/5kut/qjl64oe9",
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
    referral: "No shareable referral URL available — in-app friend invite only",
    referralLink: null,
    affiliateProgram: "https://www.betrivers.com/affiliates",
    cpa: "$50–100 per depositing user",
    color: "#0066cc",
  },
];

// S89: BetMGM/bet365/BetRivers are advisory, not required for launch — partner programs
// rejected/waitlisted or do not offer individual referral codes. Launch posture decoupled
// from external partner approvals. These books still ship with clean untracked signup URLs.
export const REQUIRED_LAUNCH_MONETIZATION_BOOKS = [];
export const ADVISORY_LAUNCH_MONETIZATION_BOOKS = ["BetMGM", "bet365", "BetRivers"];
export const ACTIVE_REFERRAL_BOOKS = ["DraftKings", "FanDuel", "Caesars", "ESPN BET", "Fanatics"];

export const US_BOOK_STATES = {
  DraftKings: ["NJ", "PA", "CO", "MI", "VA", "OH", "IN", "AZ", "NY", "TN", "WV", "IA", "IL", "KS", "KY", "LA", "MD", "MA", "NC", "VT", "WY", "DC", "NV"],
  FanDuel: ["NJ", "PA", "CO", "MI", "VA", "OH", "IN", "AZ", "NY", "TN", "WV", "IA", "IL", "KS", "KY", "LA", "MD", "MA", "NC", "VT", "DC", "NV"],
  BetMGM: ["NJ", "PA", "CO", "MI", "VA", "OH", "IN", "AZ", "NY", "TN", "WV", "IA", "MS", "KY", "LA", "MD", "MA", "DC", "NV"],
  Caesars: ["NJ", "PA", "CO", "MI", "VA", "OH", "IN", "AZ", "NY", "TN", "WV", "IA", "IL", "KS", "KY", "LA", "MD", "MA", "DC", "NV"],
  bet365: ["NJ", "CO", "IA", "OH", "VA", "KY", "NC", "LA", "IL"],
  "ESPN BET": ["NJ", "PA", "CO", "MI", "VA", "OH", "IN", "AZ", "NY", "TN", "WV", "IA", "IL", "KS", "KY", "LA", "MD", "MA", "NC"],
  Fanatics: ["NJ", "PA", "CO", "MI", "VA", "OH", "IN", "AZ", "NY", "TN", "WV", "IA", "IL", "KY", "LA", "MD", "MA", "NC", "DC"],
  BetRivers: ["NJ", "PA", "CO", "MI", "VA", "OH", "IN", "AZ", "NY", "IL", "IA", "LA", "MD", "NC", "WV"],
};

function normalizeStateCode(value = "") {
  return String(value || "").trim().toUpperCase();
}

export function isBookAvailableInState(bookName, userState = "") {
  const stateCode = normalizeStateCode(userState);
  const allowedStates = US_BOOK_STATES[bookName];
  if (!stateCode || !Array.isArray(allowedStates) || allowedStates.length === 0) return true;
  return allowedStates.includes(stateCode);
}

export function getBookPersonalization(book, options = {}) {
  if (!book?.name) {
    return {
      available: true,
      completed: false,
      status: "untracked",
      actionable: false,
      score: 0,
      reason: "",
    };
  }

  const { userState = "", done = {}, bookStatus = {} } = options;
  const available = isBookAvailableInState(book.name, userState);
  const completed = !!done[book.name];
  const status = String(bookStatus[book.name] || (completed ? "completed" : "untracked")).toLowerCase();
  const blocked = !available || status === "closed" || status === "gubbed";
  const actionable = !blocked && !completed;
  let score = Number.parseFloat(book.bonus) || 0;

  if (available) score += 45;
  if (!available) score -= 90;
  if (!completed) score += 30;
  if (completed) score -= 80;
  if (status === "pending") score += 8;
  if (status === "active") score += 6;
  if (status === "limited") score -= 12;
  if (status === "closed") score -= 40;
  if (status === "gubbed") score -= 55;
  if (book.referralLink || book.affiliateLink) score += 4;

  let reason = "Available now";
  if (!available && userState) reason = `Not live in ${normalizeStateCode(userState)}`;
  else if (completed) reason = "Already completed";
  else if (status === "pending") reason = "Account started";
  else if (status === "limited") reason = "Limited account";
  else if (status === "closed") reason = "Closed account";
  else if (status === "gubbed") reason = "Promo access degraded";
  else if (status === "active") reason = "Account active";

  return {
    book,
    available,
    completed,
    status,
    actionable,
    score,
    reason,
    stateCode: normalizeStateCode(userState),
  };
}

export function getRecommendedBooksForUser(options = {}) {
  return BOOKS
    .map((book) => getBookPersonalization(book, options))
    .filter((item) => item.available && item.actionable)
    .sort((a, b) => b.score - a.score || (b.book.bonus || 0) - (a.book.bonus || 0));
}

/**
 * Returns the best click-through URL for a book in priority order:
 *  1. affiliateLink (tracked affiliate — earns CPA commission, requires approval)
 *  2. referralLink (personal referral — earns bonus bets, no approval needed)
 *  3. signupLink (direct registration page — better UX than homepage)
 *  4. link (homepage fallback)
 *
 * To monetize immediately without affiliate approval:
 *   Set referralLink to your personal referral URL from each sportsbook app.
 *   DK: "Refer a Friend" in the DraftKings app → copy your referral link
 *   FanDuel: "Refer a Friend" in the FanDuel app → copy your referral link
 *   Each referral earns $25–$100 in bonus bets per new depositing user.
 */
export const getBookUrl = (book) =>
  book.affiliateLink || book.referralLink || book.signupLink || book.link;

function isConfiguredTrackedUrl(url, disallowed = []) {
  if (typeof url !== "string") return false;
  const normalized = url.trim();
  if (!normalized.startsWith("https://")) return false;
  return !disallowed.some((candidate) => candidate && normalized === candidate);
}

export function hasConfiguredAffiliateUrl(book) {
  return isConfiguredTrackedUrl(book?.affiliateLink, [
    book?.affiliateProgram,
    book?.signupLink,
    book?.link,
  ]);
}

export function hasConfiguredReferralUrl(book) {
  return isConfiguredTrackedUrl(book?.referralLink, [
    book?.affiliateProgram,
    book?.signupLink,
    book?.link,
  ]);
}

export function hasConfiguredMonetizationUrl(book) {
  return hasConfiguredAffiliateUrl(book) || hasConfiguredReferralUrl(book);
}

export function getBookLinkMeta(book) {
  const url = getBookUrl(book);
  const hasAffiliate = hasConfiguredAffiliateUrl(book);
  const hasReferral = hasConfiguredReferralUrl(book);
  return {
    book: book?.name || "unknown",
    url,
    linkType: hasAffiliate ? "affiliate" : hasReferral ? "referral" : book?.signupLink ? "signup" : "homepage",
    configuredAffiliate: hasAffiliate,
    configuredMonetization: hasAffiliate || hasReferral,
    launchRequired: REQUIRED_LAUNCH_MONETIZATION_BOOKS.includes(book?.name),
  };
}

export function getBookLinkAnalyticsProps(book, extra = {}) {
  const meta = getBookLinkMeta(book);
  return {
    book: meta.book,
    linkType: meta.linkType,
    configuredAffiliate: meta.configuredAffiliate,
    configuredMonetization: meta.configuredMonetization,
    launchRequired: meta.launchRequired,
    ...extra,
  };
}

export function getRequiredLaunchMonetizationStatus(requiredBooks = REQUIRED_LAUNCH_MONETIZATION_BOOKS) {
  const details = requiredBooks.map((name) => {
    const book = BOOKS.find((entry) => entry.name === name) || null;
    const hasAffiliate = hasConfiguredAffiliateUrl(book);
    const hasReferral = hasConfiguredReferralUrl(book);
    return {
      name,
      found: !!book,
      hasAffiliate,
      hasReferral,
      monetized: !!book && (hasAffiliate || hasReferral),
    };
  });

  return {
    requiredBooks: [...requiredBooks],
    configuredBooks: details.filter((entry) => entry.monetized).map((entry) => entry.name),
    missingBooks: details.filter((entry) => !entry.monetized).map((entry) => entry.name),
    details,
  };
}

export const getConfiguredAffiliateCount = () =>
  BOOKS.filter((book) => hasConfiguredAffiliateUrl(book)).length;

export const hasConfiguredAffiliateLinks = () =>
  getConfiguredAffiliateCount() > 0;

export const getConfiguredMonetizationCount = () =>
  BOOKS.filter((book) => hasConfiguredMonetizationUrl(book)).length;

export const hasConfiguredMonetizationLinks = () =>
  getConfiguredMonetizationCount() > 0;
