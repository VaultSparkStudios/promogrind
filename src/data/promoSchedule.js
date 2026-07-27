const RAW_PROMO_SCHED = [
  {book:"DraftKings",day:"Daily",promo:"Profit Boosts (2-5/day)",value:"$5-15",type:"Recurring",grade:"A",complexity:"Easy",timeMin:5},
  {book:"DraftKings",day:"Tuesday",promo:"Stepped Up Parlay",value:"$10-25",type:"Weekly",grade:"A",complexity:"Hard",timeMin:20},
  {book:"DraftKings",day:"Thursday",promo:"Parlay Insurance",value:"$10-20",type:"Weekly",grade:"B",complexity:"Medium",timeMin:10},
  {book:"DraftKings",day:"Monday",promo:"Reload Bonus",value:"$25-100",type:"Weekly",grade:"B",complexity:"Easy",timeMin:5},
  {book:"FanDuel",day:"Daily",promo:"Profit Boosts (2-4/day)",value:"$5-20",type:"Recurring",grade:"A",complexity:"Easy",timeMin:5},
  {book:"FanDuel",day:"Tuesday",promo:"Odds Boosts",value:"$10-30",type:"Weekly",grade:"B",complexity:"Easy",timeMin:5},
  {book:"FanDuel",day:"Weekend",promo:"SGP Insurance",value:"$10-25",type:"Weekend",grade:"A",complexity:"Medium",timeMin:15},
  {book:"BetMGM",day:"Daily",promo:"Daily Odds Boosts",value:"$5-15",type:"Recurring",grade:"B",complexity:"Easy",timeMin:5},
  {book:"BetMGM",day:"Monday",promo:"Monday Night Reload",value:"$25-50",type:"Weekly",grade:"B",complexity:"Easy",timeMin:5},
  {book:"Caesars",day:"Daily",promo:"Profit Boosts",value:"$5-15",type:"Recurring",grade:"A",complexity:"Easy",timeMin:5},
  {book:"Caesars",day:"Wednesday",promo:"Bonus Bet Wednesday",value:"$10-25",type:"Weekly",grade:"B",complexity:"Easy",timeMin:5},
  {book:"bet365",day:"Daily",promo:"Early Payout Offers",value:"Variable",type:"Recurring",grade:"C",complexity:"Medium",timeMin:10},
  {book:"ESPN BET",day:"Daily",promo:"ESPN+ Profit Boosts",value:"$5-15",type:"Recurring",grade:"B",complexity:"Easy",timeMin:5},
  {book:"ESPN BET",day:"Thursday",promo:"MNF/TNF Specials",value:"$10-25",type:"Weekly",grade:"B",complexity:"Medium",timeMin:15},
  {book:"Fanatics",day:"Daily",promo:"FanCash Promos",value:"$5-20",type:"Recurring",grade:"B",complexity:"Easy",timeMin:5},
  {book:"BetRivers",day:"Weekly",promo:"iRush Reload",value:"$25-100",type:"Weekly",grade:"B",complexity:"Easy",timeMin:5},
  {book:"bet365 UK",day:"Daily",promo:"Early Payout (Soccer)",value:"£5-25",type:"Recurring",grade:"A",complexity:"Easy",timeMin:5},
  {book:"Betway UK",day:"Daily",promo:"Acca Edge Insurance",value:"£5-20",type:"Recurring",grade:"A",complexity:"Medium",timeMin:10},
  {book:"William Hill",day:"Monday",promo:"Acca Club Reload",value:"£10-30",type:"Weekly",grade:"B",complexity:"Easy",timeMin:5},
  {book:"Paddy Power",day:"Weekend",promo:"Money Back Special",value:"£10-25",type:"Weekend",grade:"B",complexity:"Easy",timeMin:10},
  {book:"Sky Bet",day:"Daily",promo:"Price Boosts",value:"£5-15",type:"Recurring",grade:"B",complexity:"Easy",timeMin:5},
];

const UK_BOOKS = new Set(["bet365 UK", "Betway UK", "William Hill", "Paddy Power", "Sky Bet"]);
const scheduleId = (promo, index) => (String(promo.book) + "-" + String(promo.promo) + "-" + index).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const PROMO_SCHED = RAW_PROMO_SCHED.map((promo, index) => {
  const market = UK_BOOKS.has(promo.book) ? "UK" : "US";
  return {
    ...promo,
    id: scheduleId(promo, index),
    market,
    evidence: { state: "historical-pattern", verifiedAt: null, sourceUrl: null, jurisdiction: market },
  };
});

export const DAYS_ORDER = ["Daily","Monday","Tuesday","Wednesday","Thursday","Friday","Weekend"];
