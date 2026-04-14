import { BOOKS, hasConfiguredAffiliateLinks } from "../books.js";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

export function getDashboardSnapshot(data = {}, schedule = [], now = new Date(), bankrollValue = "") {
  const { todayStr, in3DaysStr, monthKey } = getTodayContext(now);
  const bets = data.bets || [];
  const ledger = data.ledger || [];
  const done = data.done || {};
  const expiry = data.bookExpiry || {};
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

  return {
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
    hasLedger: ledger.length > 0,
    hasBetHistory: bets.length > 0,
    bankroll: Number.isFinite(bankroll) ? bankroll : null,
  };
}

export function getBankrollPosture(snapshot) {
  if (!snapshot.bankroll) {
    return {
      tone: "missing",
      title: "Set your bankroll",
      body: "Add a bankroll anchor so stake sizing, open exposure, and weekly action plans have context.",
    };
  }

  const riskPct = snapshot.bankroll > 0 ? (snapshot.openStake / snapshot.bankroll) * 100 : 0;
  if (riskPct > 30) {
    return {
      tone: "high",
      title: `High exposure: ${riskPct.toFixed(1)}% at risk`,
      body: `Open bets are tying up $${snapshot.openStake.toFixed(2)} of a $${snapshot.bankroll.toFixed(2)} bankroll.`,
    };
  }
  if (riskPct > 15) {
    return {
      tone: "watch",
      title: `Watch exposure: ${riskPct.toFixed(1)}% at risk`,
      body: `You have $${snapshot.openStake.toFixed(2)} committed across open bets. Keep total risk under control.`,
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
      detail: "Settle or log pending wagers before stacking more exposure.",
      slug: "bet-tracker",
    },
    snapshot.booksRemaining > 0 && {
      key: "books-left",
      title: `${snapshot.booksRemaining} sportsbook${snapshot.booksRemaining === 1 ? "" : "s"} still unclaimed`,
      detail: `Roughly $${snapshot.potentialLeft.toFixed(0)} of welcome-offer value is still on the table.`,
      slug: "sportsbooks",
    },
    !snapshot.hasLedger && {
      key: "ledger",
      title: "No settled profit history yet",
      detail: "Log outcomes in the ledger so the dashboard can track real extraction instead of one-off calculations.",
      slug: "ledger",
    },
  ].filter(Boolean);
}

export function getNextBestAction({ usageLog = {}, bankroll = "", totalProfit = 0, openBets = [], booksComplete = 0 }) {
  const hasBankroll = !!String(bankroll || "").trim();
  const hasCalc = Object.keys(usageLog).length > 0;
  const affiliateReady = hasConfiguredAffiliateLinks();
  const actions = [
    !hasBankroll && { key: "bankroll", title: "Set your bankroll", body: "Personalized stake sizing and weekly actions need a bankroll anchor.", cta: "Set profile", slug: "dashboard", tone: "info" },
    !hasCalc && { key: "calc", title: "Run your first conversion", body: "Start with the Bonus Bet Converter and get a hedge stake in under a minute.", cta: "Open converter", slug: "bonus-bet", tone: "positive" },
    booksComplete === 0 && { key: "books", title: "Pick your first sportsbook", body: "Mark books you already use and prioritize the highest-value welcome offers.", cta: "Open tracker", slug: "sportsbooks", tone: "watch" },
    openBets.length > 0 && { key: "open", title: "Close open bets", body: `You have ${openBets.length} open bet${openBets.length === 1 ? "" : "s"} waiting for settlement.`, cta: "Review bets", slug: "bet-tracker", tone: "watch" },
    !affiliateReady && { key: "affiliate", title: "Revenue setup pending", body: "Referral or affiliate links are still placeholders, so outbound clicks are not monetized yet.", cta: "Review links", slug: "sportsbooks", tone: "risk" },
  ].filter(Boolean);

  return actions[0] || {
    key: "scale",
    title: "Scale the loop",
    body: `You have extracted ${totalProfit >= 0 ? "$" + totalProfit.toFixed(2) : "-$" + Math.abs(totalProfit).toFixed(2)}. Add another book, log the next promo, and publish a win when ready.`,
    cta: "Find next promo",
    slug: "daily-brief",
    tone: "positive",
  };
}
