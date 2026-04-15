/**
 * PromoGrind — Shadow Book Mode
 *
 * Projects the weekly + first-month cash value of opening accounts at
 * sportsbooks the user doesn't yet have, using the BOOKS registry and a
 * conservative per-book recurring-EV heuristic. Output is used by
 * <ShadowBookPanel/> to quantify the affiliate conversion lever:
 *   "You're leaving ~$540 on the table this month."
 *
 * Pure function. No side effects, no network, no React. Tested in
 * src/__tests__/shadow.test.js.
 *
 * Input:
 *   {
 *     books:       BookRegistry,               // from src/books.js
 *     bookStatus:  { [bookName]: status },     // data.bookStatus from syncAppData
 *     conversionRate?: number,                 // optional override; 0.70 default (matches calcBonus defaults)
 *     weeklyOverrides?: { [bookName]: number } // optional calibration from the user's actual feedback
 *   }
 *
 * Output:
 *   {
 *     missingBooks:           ShadowBookRow[],
 *     totalWelcomeOneTime:    number,
 *     totalWeeklyRecurring:   number,
 *     totalFirstMonth:        number,
 *   }
 */

const DEFAULT_WEEKLY_EV = {
  draftkings: 60,
  fanduel:    60,
  betmgm:     50,
  caesars:    50,
  bet365:     45,
  "espn bet": 40,
  fanatics:   30,
  betrivers:  30,
  hardrock:   30,
};

const OWNED_STATUSES = new Set(["active", "limited"]);

function normalizeBookName(name) {
  return String(name || "").trim().toLowerCase();
}

function weeklyEvFor(book, overrides) {
  const keyed = normalizeBookName(book.name);
  if (overrides && Number.isFinite(overrides[book.name])) return overrides[book.name];
  if (overrides && Number.isFinite(overrides[keyed])) return overrides[keyed];
  return DEFAULT_WEEKLY_EV[keyed] ?? 25;
}

export function buildShadowBookProjection(input = {}) {
  const { books = [], bookStatus = {}, conversionRate = 0.7, weeklyOverrides = null } = input;
  if (!Array.isArray(books) || !books.length) {
    return { missingBooks: [], totalWelcomeOneTime: 0, totalWeeklyRecurring: 0, totalFirstMonth: 0 };
  }

  const missing = books.filter((book) => {
    const status = bookStatus[book.name];
    return !OWNED_STATUSES.has(status);
  });

  const rows = missing.map((book) => {
    const bonus = Number(book.bonus) || 0;
    const welcomeOneTime = Math.round(bonus * conversionRate);
    const weeklyRecurring = weeklyEvFor(book, weeklyOverrides);
    const firstMonthTotal = welcomeOneTime + weeklyRecurring * 4;
    return {
      name: book.name,
      welcomeOneTime,
      weeklyRecurring,
      firstMonthTotal,
      bonus,
      recurring: book.recurring || null,
      color: book.color || null,
      affiliateProgram: book.affiliateProgram || null,
    };
  });

  rows.sort((a, b) => b.firstMonthTotal - a.firstMonthTotal);

  const totalWelcomeOneTime = rows.reduce((sum, row) => sum + row.welcomeOneTime, 0);
  const totalWeeklyRecurring = rows.reduce((sum, row) => sum + row.weeklyRecurring, 0);
  const totalFirstMonth = rows.reduce((sum, row) => sum + row.firstMonthTotal, 0);

  return {
    missingBooks: rows,
    totalWelcomeOneTime,
    totalWeeklyRecurring,
    totalFirstMonth,
  };
}
