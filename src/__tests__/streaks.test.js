import { describe, expect, it } from "vitest";
import { computeStreak, streakEmoji, streakLabel, streakMilestone } from "../lib/streaks.js";

function makeDate(offsetDays = 0) {
  const d = new Date("2026-04-17T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

const NOW = makeDate(0);

describe("computeStreak — basic cases", () => {
  it("returns 0 when no data", () => {
    const result = computeStreak({}, NOW);
    expect(result.current).toBe(0);
    expect(result.best).toBe(0);
    expect(result.activeToday).toBe(false);
  });

  it("counts a single profitable settlement today as streak=1", () => {
    const appData = {
      resultFeedback: [
        { id: "rf-1", status: "settled", actualProfit: "25", updatedAt: "2026-04-17T10:00:00Z" },
      ],
    };
    const result = computeStreak(appData, NOW);
    expect(result.current).toBe(1);
    expect(result.activeToday).toBe(true);
  });

  it("counts 3 consecutive profitable days as streak=3", () => {
    const appData = {
      resultFeedback: [
        { id: "rf-1", status: "settled", actualProfit: "20", updatedAt: "2026-04-17T10:00:00Z" },
        { id: "rf-2", status: "settled", actualProfit: "15", updatedAt: "2026-04-16T10:00:00Z" },
        { id: "rf-3", status: "settled", actualProfit: "10", updatedAt: "2026-04-15T10:00:00Z" },
      ],
    };
    const result = computeStreak(appData, NOW);
    expect(result.current).toBe(3);
  });

  it("does not count zero-profit days as active today", () => {
    const appData = {
      resultFeedback: [
        // profit=0 does not add April 17 to profitDays → activeToday=false
        { id: "rf-1", status: "settled", actualProfit: "0", updatedAt: "2026-04-17T10:00:00Z" },
        // yesterday was profitable → streak is still alive at 1
        { id: "rf-2", status: "settled", actualProfit: "30", updatedAt: "2026-04-16T10:00:00Z" },
      ],
    };
    const result = computeStreak(appData, NOW);
    expect(result.current).toBe(1);
    expect(result.activeToday).toBe(false);
  });

  it("does not count days where profit is negative", () => {
    const appData = {
      resultFeedback: [
        { id: "rf-1", status: "settled", actualProfit: "-10", updatedAt: "2026-04-17T10:00:00Z" },
      ],
    };
    const result = computeStreak(appData, NOW);
    expect(result.current).toBe(0);
  });

  it("breaks streak when a day is skipped and best reflects longest consecutive run", () => {
    const appData = {
      resultFeedback: [
        { id: "rf-1", status: "settled", actualProfit: "20", updatedAt: "2026-04-17T10:00:00Z" },
        // April 16 is missing → current streak is only 1
        { id: "rf-2", status: "settled", actualProfit: "15", updatedAt: "2026-04-15T10:00:00Z" },
        { id: "rf-3", status: "settled", actualProfit: "12", updatedAt: "2026-04-14T10:00:00Z" },
        { id: "rf-4", status: "settled", actualProfit: "10", updatedAt: "2026-04-13T10:00:00Z" },
      ],
    };
    const result = computeStreak(appData, NOW);
    expect(result.current).toBe(1);
    expect(result.best).toBe(3); // April 13-14-15 is the longest consecutive run
  });

  it("counts ledger entries as streak days", () => {
    const appData = {
      ledger: [
        { date: "2026-04-17", profit: "18" },
        { date: "2026-04-16", profit: "22" },
      ],
    };
    const result = computeStreak(appData, NOW);
    expect(result.current).toBe(2);
    expect(result.activeToday).toBe(true);
  });

  it("merges feedback and ledger sources", () => {
    const appData = {
      resultFeedback: [
        { id: "rf-1", status: "settled", actualProfit: "20", updatedAt: "2026-04-17T10:00:00Z" },
      ],
      ledger: [
        { date: "2026-04-16", profit: "12" },
        { date: "2026-04-15", profit: "8" },
      ],
    };
    const result = computeStreak(appData, NOW);
    expect(result.current).toBe(3);
  });

  it("streak is alive when yesterday was profitable but today is not yet", () => {
    const appData = {
      resultFeedback: [
        { id: "rf-1", status: "settled", actualProfit: "20", updatedAt: "2026-04-16T10:00:00Z" },
        { id: "rf-2", status: "settled", actualProfit: "15", updatedAt: "2026-04-15T10:00:00Z" },
      ],
    };
    const result = computeStreak(appData, NOW);
    expect(result.current).toBe(2);
    expect(result.activeToday).toBe(false);
  });

  it("computes best streak across non-contiguous periods", () => {
    const appData = {
      ledger: [
        { date: "2026-04-17", profit: "10" },
        { date: "2026-04-16", profit: "10" },
        // gap
        { date: "2026-04-10", profit: "10" },
        { date: "2026-04-09", profit: "10" },
        { date: "2026-04-08", profit: "10" },
        { date: "2026-04-07", profit: "10" },
      ],
    };
    const result = computeStreak(appData, NOW);
    expect(result.current).toBe(2);
    expect(result.best).toBe(4);
  });
});

describe("streakEmoji", () => {
  it("returns null for streak < 3", () => {
    expect(streakEmoji(0)).toBeNull();
    expect(streakEmoji(2)).toBeNull();
  });
  it("returns single fire for 3–13 days", () => {
    expect(streakEmoji(3)).toBe("🔥");
    expect(streakEmoji(13)).toBe("🔥");
  });
  it("returns double fire for 14–29 days", () => {
    expect(streakEmoji(14)).toBe("🔥🔥");
  });
  it("returns triple fire for 30+ days", () => {
    expect(streakEmoji(30)).toBe("🔥🔥🔥");
  });
});

describe("streakLabel", () => {
  it("returns null for 0", () => {
    expect(streakLabel(0)).toBeNull();
  });
  it("returns '1-day streak' for 1", () => {
    expect(streakLabel(1)).toBe("1-day streak");
  });
  it("returns 'N-day streak' for N > 1", () => {
    expect(streakLabel(7)).toBe("7-day streak");
  });
});

describe("streakMilestone", () => {
  it("returns the milestone value when streak hits one exactly", () => {
    expect(streakMilestone(3)).toBe(3);
    expect(streakMilestone(7)).toBe(7);
    expect(streakMilestone(30)).toBe(30);
  });
  it("returns null for non-milestone values", () => {
    expect(streakMilestone(5)).toBeNull();
    expect(streakMilestone(31)).toBeNull();
  });
});
