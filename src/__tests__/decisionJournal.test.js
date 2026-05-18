import { describe, it, expect } from "vitest";
import { buildDecisionJournal } from "../lib/decisionJournal.js";

const DAY = 86400000;

describe("decisionJournal", () => {
  const now = new Date("2026-05-17T12:00:00Z").getTime();
  const yesterday = now - DAY;

  it("reports no activity for empty history", () => {
    const j = buildDecisionJournal({}, { now });
    expect(j.hasActivity).toBe(false);
    expect(j.lines[0]).toMatch(/No tracked activity/);
    expect(j.stats.executed).toBe(0);
  });

  it("summarizes yesterday's executed vs skipped + net profit", () => {
    const appData = {
      resultFeedback: [
        { status: "settled", profit: 25, createdAt: new Date(yesterday).toISOString() },
        { status: "settled", profit: -10, createdAt: new Date(yesterday).toISOString() },
        { status: "skipped", createdAt: new Date(yesterday).toISOString() },
        // older — ignored for line1
        { status: "settled", profit: 999, createdAt: new Date(yesterday - 5 * DAY).toISOString() },
      ],
    };
    const j = buildDecisionJournal(appData, { now });
    expect(j.hasActivity).toBe(true);
    expect(j.stats.executed).toBe(2);
    expect(j.stats.wins).toBe(1);
    expect(j.stats.losses).toBe(1);
    expect(j.stats.skipped).toBe(1);
    expect(j.stats.netProfit).toBeCloseTo(15);
    expect(j.lines[0]).toMatch(/Executed 2 promos.*1W\/1L.*\+\$15\.00.*skipped 1/);
  });

  it("computes edge profile delta vs prior 7d", () => {
    const last7 = [
      // include one yesterday so hasActivity is true
      { status: "settled", profit: 20, createdAt: new Date(yesterday).toISOString() },
      { status: "settled", profit: 30, createdAt: new Date(now - 3 * DAY).toISOString() },
    ];
    const prior7 = [
      { status: "settled", profit: 10, createdAt: new Date(now - 9 * DAY).toISOString() },
      { status: "settled", profit: 10, createdAt: new Date(now - 10 * DAY).toISOString() },
    ];
    const j = buildDecisionJournal({ resultFeedback: [...last7, ...prior7] }, { now });
    // avg last7 = 25, avg prior7 = 10, delta = +15
    expect(j.stats.edgeDelta).toBeCloseTo(15);
    expect(j.lines[1]).toMatch(/edge profile up \$15\.00/);
  });
});
