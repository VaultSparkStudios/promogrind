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

  it("counts a single reviewed settlement today as cadence=1", () => {
    const appData = {
      resultFeedback: [
        { id: "rf-1", status: "settled", actualProfit: "25", updatedAt: "2026-04-17T10:00:00Z" },
      ],
    };
    const result = computeStreak(appData, NOW);
    expect(result.current).toBe(1);
    expect(result.activeToday).toBe(true);
  });

  it("counts 3 consecutive reviewed days as cadence=3", () => {
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

  it("counts a reviewed zero outcome without judging its sign", () => {
    const appData = {
      resultFeedback: [
        { id: "rf-1", status: "settled", actualProfit: "0", updatedAt: "2026-04-17T10:00:00Z" },
        { id: "rf-2", status: "settled", actualProfit: "30", updatedAt: "2026-04-16T10:00:00Z" },
      ],
    };
    const result = computeStreak(appData, NOW);
    expect(result.current).toBe(2);
    expect(result.activeToday).toBe(true);
  });

  it("counts a reviewed loss as discipline evidence", () => {
    const appData = {
      resultFeedback: [
        { id: "rf-1", status: "settled", actualProfit: "-10", updatedAt: "2026-04-17T10:00:00Z" },
      ],
    };
    const result = computeStreak(appData, NOW);
    expect(result.current).toBe(1);
    expect(result.evidence.settledReviews).toBe(1);
  });

  it("counts a reasoned skip but refuses an unexplained skip", () => {
    const appData = { resultFeedback: [
      { id: "rf-1", status: "skipped", skipReason: "terms_unclear", updatedAt: "2026-04-17T10:00:00Z" },
      { id: "rf-2", status: "skipped", skipReason: "", updatedAt: "2026-04-16T10:00:00Z" },
    ] };
    const result = computeStreak(appData, NOW);
    expect(result.current).toBe(1);
    expect(result.evidence.reasonedSkips).toBe(1);
  });

  it("refuses expected-only settlements as realized evidence", () => {
    const result = computeStreak({ resultFeedback: [
      { status: "settled", expectedProfit: "25", updatedAt: "2026-04-17T10:00:00Z" },
    ] }, NOW);
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

describe("cadence symbol", () => {
  it("returns null for streak < 3", () => {
    expect(streakEmoji(0)).toBeNull();
    expect(streakEmoji(2)).toBeNull();
  });
  it("uses one neutral evidence marker at every mature cadence", () => {
    expect(streakEmoji(3)).toBe("◆");
    expect(streakEmoji(14)).toBe("◆");
    expect(streakEmoji(30)).toBe("◆");
  });
});

describe("streakLabel", () => {
  it("returns null for 0", () => {
    expect(streakLabel(0)).toBeNull();
  });
  it("returns a review-cadence label for 1", () => {
    expect(streakLabel(1)).toBe("1-day review cadence");
  });
  it("returns a review-cadence label for N > 1", () => {
    expect(streakLabel(7)).toBe("7-day review cadence");
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
