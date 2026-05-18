export const DEFAULT_SLUG = "dashboard";
export const SUBCATS = ["All", "Promo", "Arbitrage", "Value & EV", "Advanced"];

export function buildAppTabs(c) {
  return [
    { group: "Home", items: [
      { n: "Dashboard", slug: "dashboard", c: c.DailyDashboard },
      { n: "Promo Intake", slug: "promo-intake", c: c.PromoIntakeRoute },
      { n: "Daily Brief", slug: "daily-brief", c: c.DailyBriefPage },
      { n: "Get Started", slug: "get-started", c: c.GetStartedRoute },
      { n: "What's New", slug: "whats-new", c: c.WhatsNewRoute },
      { n: "Pricing", slug: "pricing", c: c.PricingPage },
      { n: "About", slug: "about", c: c.AboutRoute },
    ] },
    { group: "Convert", items: [
      { n: "Bonus Bet", slug: "bonus-bet", c: c.BonusBet },
      { n: "Profit Boost", slug: "profit-boost", c: c.ProfitBoost },
      { n: "First Bet", slug: "first-bet", c: c.FirstBet },
      { n: "Deposit Match", slug: "deposit-match", c: c.DepositMatch },
      { n: "Insurance", slug: "insurance", c: c.InsurancePromo },
    ] },
    { group: "Calculate", items: [
      { n: "No-Vig", slug: "no-vig", c: c.NoVig, subcat: "Value & EV" },
      { n: "3-Way No-Vig", slug: "no-vig-3way", c: c.NoVig3Way, subcat: "Value & EV" },
      { n: "+EV", slug: "ev", c: c.PlusEV, subcat: "Value & EV" },
      { n: "Kelly", slug: "kelly", c: c.KellyCriterion, subcat: "Value & EV" },
      { n: "2-Way Arb", slug: "arb-2way", c: c.Arb2Way, subcat: "Arbitrage" },
      { n: "3-Way Arb", slug: "arb-3way", c: c.Arb3Way, subcat: "Arbitrage" },
      { n: "Parlay Hedge", slug: "parlay-hedge", c: c.ParlayHedge, subcat: "Arbitrage" },
      { n: "Middle", slug: "middle", c: c.MiddleBet, subcat: "Arbitrage" },
      { n: "Odds Convert", slug: "odds-convert", c: c.OddsConvert, subcat: "Advanced" },
      { n: "Line Shop", slug: "line-shop", c: c.LineShop, subcat: "Value & EV" },
      { n: "Rollover", slug: "rollover", c: c.RolloverCalc, subcat: "Advanced" },
      { n: "Teaser", slug: "teaser", c: c.TeaserCalc, subcat: "Value & EV" },
      { n: "Round Robin", slug: "round-robin", c: c.RoundRobinCalc, subcat: "Arbitrage" },
      { n: "Parlay Builder", slug: "parlay-builder", c: c.ParlayBuilder, subcat: "Value & EV" },
      { n: "SGP Estimator", slug: "sgp-estimator", c: c.SGPEstimator, subcat: "Value & EV" },
      { n: "Hold Calc", slug: "hold-calc", c: c.HoldCalc, subcat: "Value & EV" },
      { n: "Bet Sizer", slug: "bet-sizer", c: c.BetSizingAdvisor, subcat: "Value & EV" },
      { n: "Income Est.", slug: "income-estimator", c: c.IncomeEstimator, subcat: "Advanced" },
      { n: "Deposit Optimizer", slug: "deposit-optimizer", c: c.DepositOptimizer, subcat: "Promo" },
      { n: "Hedge Validator", slug: "hedge-validator", c: c.HedgeValidator, subcat: "Promo" },
      { n: "Promo Guarantee", slug: "promo-guarantee", c: c.PromoGuarantee, subcat: "Promo" },
      { n: "Gut Check", slug: "gut-check", c: c.GutCheck, subcat: "Promo" },
      { n: "Promo Stacking", slug: "promo-stacking", c: c.PromoStacking, subcat: "Promo" },
      { n: "Taxes Estimator", slug: "taxes-estimator", c: c.TaxesEstimatorWrapper, subcat: "Advanced", icon: "tax" },
    ] },
    { group: "Track", items: [
      { n: "Edge", slug: "edge-dashboard", c: c.TrackInsights },
      { n: "Sportsbooks", slug: "sportsbooks", c: c.Tracker },
      { n: "Bet Tracker", slug: "bet-tracker", c: c.BetTracker },
      { n: "P/L Ledger", slug: "ledger", c: c.Ledger },
      { n: "Leaderboard", slug: "leaderboard", c: c.Leaderboard },
      { n: "Free Bet Arb", slug: "free-bet-arb", c: c.FreeBetArbTracker },
      { n: "Trade Journal", slug: "trade-journal", c: c.PromoJournal },
      { n: "Odds Compare", slug: "odds-compare", c: c.OddsComparisonTable },
      { n: "Profit Cert", slug: "profit-cert", c: c.ProfitCertificate },
    ] },
    { group: "Live", items: [
      { n: "Arb Scanner", slug: "arb-scanner", c: c.LiveScanner, pro: true },
      { n: "+EV Scanner", slug: "ev-scanner", c: c.LiveScanner, pro: true },
      { n: "Action Plan", slug: "action-plan", c: c.AIActionPlan, pro: true },
      { n: "Stack Builder", slug: "stack-builder", c: c.StackBuilder, pro: true },
    ] },
    { group: "Learn", items: [
      { n: "Knowledge Base", slug: "knowledge-base", c: c.KB },
      { n: "Promo Finder", slug: "promo-finder", c: c.PromoFinder },
      { n: "Promo Calendar", slug: "promo-calendar", c: c.PromoCalendar },
      { n: "Promo Board", slug: "promo-board", c: c.PromoBoard },
      { n: "Glossary", slug: "glossary", c: c.Glossary },
      { n: "Refer & Earn", slug: "refer-earn", c: c.ReferralHub },
      { n: "Community Promos", slug: "community-promos", c: c.PromoBoard },
      { n: "Upgrade", slug: "upgrade", c: c.PricingPage },
      { n: "Team Accounts", slug: "team-accounts", c: c.TeamAccounts },
      { n: "vs Competitors", slug: "vs-competitors", c: c.CompetitorComparison },
      { n: "Promo Arb Finder", slug: "promo-arb-finder", c: c.PromoArbFinder },
    ] },
  ];
}

export function buildSlugMap(tabs) {
  const slugMap = {};
  tabs.forEach((group, gi) => group.items.forEach((item, ti) => { slugMap[item.slug] = { gi, ti }; }));
  return slugMap;
}

export function getAllCalcs(tabs) {
  return tabs.flatMap((group) => group.items.map((item) => ({ ...item, group: group.group })));
}

export function getCalcGroupIndex(tabs) {
  return tabs.findIndex((tab) => tab.group === "Calculate");
}
