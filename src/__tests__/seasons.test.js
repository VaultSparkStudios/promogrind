import { describe, expect, it } from "vitest";
import { buildOperatorSeason, getActiveSeasonWindow } from "../lib/seasons.js";

describe("operator seasons", () => {
  it("builds a stable 14-day season window", () => {
    const season = getActiveSeasonWindow(new Date("2026-05-17T12:00:00Z"));

    expect(season.lengthDays).toBe(14);
    expect(season.day).toBeGreaterThanOrEqual(1);
    expect(season.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(season.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("rewards closed-loop discipline", () => {
    const season = buildOperatorSeason({
      bankroll: "1000",
      resultFeedback: [
        { status: "settled", wouldRepeat: "yes", updatedAt: "2026-05-21T12:00:00Z" },
        { status: "settled", wouldRepeat: "yes", updatedAt: "2026-05-22T12:00:00Z" },
        { status: "settled", wouldRepeat: "no", updatedAt: "2026-05-23T12:00:00Z" },
        { status: "skipped", wouldRepeat: "no", updatedAt: "2026-05-24T12:00:00Z" },
        { status: "skipped", wouldRepeat: "yes", updatedAt: "2026-05-21T12:00:00Z" },
        { status: "settled", wouldRepeat: "yes", updatedAt: "2026-05-22T12:00:00Z" },
      ],
      bets: [],
    }, new Date("2026-05-22T12:00:00Z"));

    expect(season.band).toBe("Elite");
    expect(season.closedLoops).toBe(6);
    expect(season.targets.every((target) => target.complete)).toBe(true);
  });

  it("does not treat open bet volume as elite progress", () => {
    const season = buildOperatorSeason({
      bankroll: "1000",
      resultFeedback: [],
      bets: Array.from({ length: 12 }, (_, index) => ({
        id: `b${index}`,
        status: "open",
        stake: "10",
        date: "2026-05-17",
      })),
    }, new Date("2026-05-17T12:00:00Z"));

    expect(season.score).toBeLessThan(50);
    expect(season.band).not.toBe("Elite");
    expect(season.next).toContain("Closed loops");
  });
});
