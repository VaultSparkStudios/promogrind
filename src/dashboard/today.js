import { BOOKS, getRecommendedBooksForUser, hasConfiguredMonetizationLinks } from "../books.js";
import { buildOperatingActionCandidates, selectOperatingDecision, summarizeWorkflows } from "../promograph/index.js";
import { buildWorkflowInbox } from "../workflows/inbox.js";
import { getWorkflowActionSlug } from "../workflows/actionGraph.js";
import { matchPlaybooks } from "../playbooks/index.js";
import { buildPortfolioAllocation } from "../lib/portfolio.js";
import { buildHotLanes, buildTrackInsights } from "../track/insights.js";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const GRADE_SCORE = { A: 3, B: 2, C: 1 };
const PROMO_KEYWORDS = {
  bonus_bet: ["bonus", "free bet", "bonus bet"],
  profit_boost: ["boost", "odds boost", "profit boost"],
  safety_net: ["safety", "first bet", "no sweat", "insurance"],
  deposit_match: ["deposit", "match"],
  insurance: ["insurance"],
  parlay: ["parlay", "sgp", "same game"],
  arb: ["arb", "arbitrage"],
};

function dateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

export function getTodayContext(now = new Date()) {
  const today = now instanceof Date ? now : new Date(now);
  const todayStr = dateOnly(today);
  const dayName = DAY_NAMES[today.getDay()];
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  const in3Days = new Date(today);
  in3Days.setDate(today.getDate() + 3);
  return {
    today,
    todayStr,
    dayName,
    isWeekend,
    in3DaysStr: dateOnly(in3Days),
    monthKey: todayStr ? todayStr.slice(0, 7) : null,
  };
}

export function getTodayPromos(schedule = [], now = new Date()) {
  const { dayName, isWeekend } = getTodayContext(now);
  return schedule.filter((promo) =>
    promo.day === "Daily" || promo.day === dayName || (promo.day === "Weekend" && isWeekend),
  );
}

export function inferPromoTypeFromSchedule(promo = {}) {
  const haystack = `${promo.promo || ""} ${promo.desc || ""} ${promo.book || ""}`.toLowerCase();
  for (const [key, needles] of Object.entries(PROMO_KEYWORDS)) {
    if (needles.some((needle) => haystack.includes(needle))) return key;
  }
  return "other";
}

export function buildAdaptivePromoPlan({
  data = {},
  snapshot = {},
  schedule = [],
  now = new Date(),
  insights = null,
  hotLanes = null,
} = {}) {
  const trackInsights = insights || buildTrackInsights(data, now);
  const heat = hotLanes || buildHotLanes(data, now);
  const todayPromos = snapshot.todayPromos || getTodayPromos(schedule, now);
  const limitedBooks = Object.entries(data.bookStatus || {})
    .filter(([, value]) => ["limited", "gubbed"].includes(String(value || "").trim().toLowerCase()))
    .map(([book]) => book);
  const hotPromoKeys = new Set((heat.hotPromoTypes || []).map((lane) => lane.key));
  const hotBookKeys = new Set((heat.hotBooks || []).map((lane) => lane.key));
  const coldPromoKeys = new Set(
    (trackInsights.topDriftAlerts || [])
      .filter((alert) => alert.direction === "negative" && alert.scope === "promo_type")
      .map((alert) => alert.key),
  );
  const coldBookKeys = new Set(
    (trackInsights.topDriftAlerts || [])
      .filter((alert) => alert.direction === "negative" && alert.scope === "book")
      .map((alert) => alert.key),
  );

  const topPromos = todayPromos
    .map((promo) => {
      const promoType = inferPromoTypeFromSchedule(promo);
      const reasons = [];
      let score = GRADE_SCORE[promo.grade] || 0;
      if (snapshot.expiringBooks?.some((book) => book.name === promo.book)) {
        score += 3;
        reasons.push("expiring");
      }
      if (hotPromoKeys.has(promoType)) {
        score += 2;
        reasons.push("hot lane");
      }
      if (hotBookKeys.has(promo.book)) {
        score += 2;
        reasons.push("book running hot");
      }
      if (coldPromoKeys.has(promoType)) {
        score -= 3;
        reasons.push("cold lane");
      }
      if (coldBookKeys.has(promo.book)) {
        score -= 2;
        reasons.push("book underperforming");
      }
      if (limitedBooks.includes(promo.book)) {
        score -= 4;
        reasons.push("limit risk");
      }
      return { ...promo, promoType, score, reasons };
    })
    .sort((a, b) => b.score - a.score || (GRADE_SCORE[b.grade] || 0) - (GRADE_SCORE[a.grade] || 0))
    .slice(0, 5);

  const topLane = trackInsights.promoTypeRows?.find((row) => row.settled >= 2 && row.actualProfit > 0) || null;
  const coldLane = (trackInsights.topDriftAlerts || []).find((alert) => alert.direction === "negative") || null;
  const workflowBacklog = (snapshot.openWorkflowCount || 0) + (snapshot.waitingWorkflowCount || 0);
  const feedbackCoverage = trackInsights.feedbackEntries?.length
    ? ((trackInsights.settledCount + trackInsights.skippedFeedback.length) / trackInsights.feedbackEntries.length) * 100
    : 0;

  let mode = "build";
  let headline = "Build a fresh edge stack";
  let detail = "You have room to add profitable volume and capture more offers.";
  if ((snapshot.expiringBooks || []).length > 0) {
    mode = "capture";
    headline = "Capture expiring value first";
    detail = "Welcome offers are leaving the board soon. Convert decaying value before adding new experiments.";
  } else if ((snapshot.openBets || []).length > 0 || workflowBacklog >= 3) {
    mode = "settle";
    headline = "Close loops before adding noise";
    detail = "Open bets and queued workflows are stacking up. Settlements and follow-through are the current bottleneck.";
  } else if ((snapshot.bankroll || 0) > 0 && snapshot.openStake > snapshot.bankroll * 0.2) {
    mode = "protect";
    headline = "Protect bankroll bandwidth";
    detail = "Exposure is high relative to bankroll. Tighten execution and avoid lower-confidence promos for now.";
  } else if (topLane || heat.hotPromoTypes?.length || heat.hotBooks?.length) {
    mode = "attack";
    headline = "Press the hottest lane";
    detail = topLane
      ? `${topLane.label} is your best converting lane right now. Lean into it while the edge is working.`
      : "Recent wins suggest a live hot lane. Press the advantage while keeping execution disciplined.";
  }

  return {
    mode,
    headline,
    detail,
    feedbackCoverage,
    topLane,
    coldLane,
    topPromos,
    hotPromoLane: heat.hotPromoTypes?.[0] || null,
    hotBookLane: heat.hotBooks?.[0] || null,
    workflowBacklog,
    calibration: trackInsights.selfCalibration,
  };
}

export function getDashboardSnapshot(data = {}, schedule = [], now = new Date(), bankrollValue = "", { includePlaybooks = false, includePortfolio = false } = {}) {
  const { todayStr, in3DaysStr, monthKey } = getTodayContext(now);
  const bets = data.bets || [];
  const ledger = data.ledger || [];
  const done = data.done || {};
  const expiry = data.bookExpiry || {};
  const workflowSummary = summarizeWorkflows([
    ...(Array.isArray(data.workflowInbox) ? data.workflowInbox : []),
    ...(Array.isArray(data.resultFeedback) ? data.resultFeedback : []),
  ]);
  const workflowInbox = buildWorkflowInbox(data, { bankroll: bankrollValue, now });
  const bankroll = Number.parseFloat(bankrollValue || "");

  const totalProfit = ledger.reduce((sum, entry) => sum + (Number.parseFloat(entry.profit) || 0), 0);
  const monthProfit = ledger
    .filter((entry) => entry.date?.startsWith(monthKey))
    .reduce((sum, entry) => sum + (Number.parseFloat(entry.profit) || 0), 0);

  const openBets = bets.filter((bet) => ["open", "pending", ""].includes(String(bet.status || "").toLowerCase()));
  const openStake = openBets.reduce((sum, bet) => sum + (Number.parseFloat(bet.stake) || 0), 0);
  const booksComplete = Object.values(done).filter(Boolean).length;
  const booksRemaining = Math.max(BOOKS.length - booksComplete, 0);
  const potentialLeft = BOOKS.filter((book) => !done[book.name]).reduce((sum, book) => sum + book.bonus * 0.7, 0);
  const recommendedBooks = getRecommendedBooksForUser({
    userState: data.userState,
    done,
    bookStatus: data.bookStatus || {},
  });
  const expiringBooks = BOOKS.filter(
    (book) => expiry[book.name] && !done[book.name] && expiry[book.name] <= in3DaysStr && expiry[book.name] >= todayStr,
  );
  const todayPromos = getTodayPromos(schedule, now);
  const recentSettledEntries = ledger
    .filter((entry) => {
      const entryDate = dateOnly(entry.date);
      if (!entryDate || !todayStr) return false;
      const diffDays = Math.floor((new Date(todayStr) - new Date(entryDate)) / 86400000);
      return diffDays >= 0 && diffDays <= 6;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const recentSettledProfit = recentSettledEntries.reduce((sum, entry) => sum + (Number.parseFloat(entry.profit) || 0), 0);
  const trackInsights = buildTrackInsights(data, now);
  const hotLanes = buildHotLanes(data, now);

  const snapshot = {
    todayStr,
    totalProfit,
    monthProfit,
    openBets,
    openStake,
    booksComplete,
    booksRemaining,
    potentialLeft,
    expiringBooks,
    todayPromos,
    recentSettledEntries,
    recentSettledProfit,
    recentSettledCount: recentSettledEntries.length,
    openWorkflowCount: workflowSummary.open.length,
    waitingWorkflowCount: workflowSummary.waiting.length,
    topWorkflow: workflowInbox.top[0] || null,
    recommendedBooks: recommendedBooks.slice(0, 3),
    availableBooksCount: recommendedBooks.length,
    hasLedger: ledger.length > 0,
    hasBetHistory: bets.length > 0,
    bankroll: Number.isFinite(bankroll) ? bankroll : null,
    topPlaybook: includePlaybooks ? (matchPlaybooks(data, { bankroll: bankrollValue }).top[0] || null) : null,
    portfolioAllocation: includePortfolio ? buildPortfolioAllocation(workflowInbox.open, bankroll) : null,
    trackInsights,
    hotLanes,
  };

  snapshot.adaptivePlan = buildAdaptivePromoPlan({
    data,
    snapshot,
    schedule,
    now,
    insights: trackInsights,
    hotLanes,
  });

  return snapshot;
}

export function getBankrollPosture(snapshot) {
  if (!snapshot.bankroll) {
    return {
      tone: "missing",
      title: "Set your bankroll",
      body: "Add a bankroll anchor so stake sizing and exposure have context.",
    };
  }

  const riskPct = snapshot.bankroll > 0 ? (snapshot.openStake / snapshot.bankroll) * 100 : 0;
  if (riskPct > 30) {
    return {
      tone: "high",
      title: `High exposure: ${riskPct.toFixed(1)}% at risk`,
      body: `$${snapshot.openStake.toFixed(2)} is tied up against a $${snapshot.bankroll.toFixed(2)} bankroll.`,
    };
  }
  if (riskPct > 15) {
    return {
      tone: "watch",
      title: `Watch exposure: ${riskPct.toFixed(1)}% at risk`,
      body: `$${snapshot.openStake.toFixed(2)} is committed across open bets.`,
    };
  }
  return {
    tone: "healthy",
    title: `${riskPct.toFixed(1)}% of bankroll at risk`,
    body: `Open exposure is $${snapshot.openStake.toFixed(2)} against a $${snapshot.bankroll.toFixed(2)} bankroll.`,
  };
}

export function getUnfinishedWork(snapshot) {
  return [
    snapshot.expiringBooks.length > 0 && {
      key: "expiring",
      title: `${snapshot.expiringBooks.length} promo${snapshot.expiringBooks.length === 1 ? "" : "s"} expiring soon`,
      detail: snapshot.expiringBooks.map((book) => `${book.name} (${book.bonus})`).join(", "),
      slug: "sportsbooks",
    },
    snapshot.openBets.length > 0 && {
      key: "open-bets",
      title: `${snapshot.openBets.length} open bet${snapshot.openBets.length === 1 ? "" : "s"} waiting`,
      detail: "Settle or log wagers before adding more exposure.",
      slug: "bet-tracker",
    },
    snapshot.booksRemaining > 0 && {
      key: "books-left",
      title: `${snapshot.booksRemaining} sportsbook${snapshot.booksRemaining === 1 ? "" : "s"} still unclaimed`,
      detail: `About $${snapshot.potentialLeft.toFixed(0)} of welcome value is still on the table.`,
      slug: "sportsbooks",
    },
    snapshot.recommendedBooks?.[0] && {
      key: "recommended-book",
      title: `${snapshot.recommendedBooks[0].book.name} is the best open book right now`,
      detail: `${snapshot.recommendedBooks[0].reason} · ${snapshot.recommendedBooks[0].book.value} headline value.`,
      slug: "sportsbooks",
    },
    !snapshot.hasLedger && {
      key: "ledger",
      title: "No settled profit history yet",
      detail: "Log outcomes in the ledger so the dashboard can track real extraction.",
      slug: "ledger",
    },
  ].filter(Boolean);
}

export function getNextBestAction({ usageLog = {}, bankroll = "", totalProfit = 0, openBets = [], booksComplete = 0, openWorkflowCount = 0, topWorkflow = null, userState = "", done = {}, bookStatus = {}, recommendedBooks = null, topPlaybook = null }) {
  const hasBankroll = !!String(bankroll || "").trim();
  const hasCalc = Object.keys(usageLog).length > 0;
  const affiliateReady = hasConfiguredMonetizationLinks();
  const bestBook = Array.isArray(recommendedBooks) ? recommendedBooks[0] : getRecommendedBooksForUser({ userState, done, bookStatus })[0];
  const candidates = buildOperatingActionCandidates({
    hasBankroll,
    hasCalc,
    affiliateReady,
    totalProfit,
    openBets,
    booksComplete,
    openWorkflowCount,
    topWorkflow,
    bestBook,
    topPlaybook,
  });

  const decision = selectOperatingDecision({
    actionCandidates: candidates,
    topWorkflow,
    openWorkflowCount,
  });
  return {
    key: decision.key,
    title: decision.title,
    body: decision.body,
    cta: decision.cta,
    slug: decision.slug || getWorkflowActionSlug(topWorkflow),
    tone: decision.tone,
    score: decision.score,
    focus: decision.focus || null,
  };
}
