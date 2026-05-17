import { describe, expect, it } from "vitest";
import { computeTiltState, shouldDemotePromo } from "../lib/tiltGuard.js";

const now = new Date("2026-05-17T12:00:00Z").getTime();

function recentLaunches(count) {
  return Array.from({ length: count }, (_, i) => ({ ts: now - i * 60_000 }));
}

describe("computeTiltState", () => {
  it("trips on rapid-fire + losing streak + high exposure", () => {
    const state = computeTiltState(
      {
        bankroll: 1000,
        bets: [
          { stake: 150, status: "open", updatedAt: new Date(now - 86400000).toISOString() },
          { stake: 80, status: "open", updatedAt: new Date(now - 86400000).toISOString() },
        ],
        resultFeedback: [
          { status: "settled", profit: -50, settledAt: new Date(now - 3600000).toISOString() },
          { status: "settled", profit: -30, settledAt: new Date(now - 7200000).toISOString() },
          { status: "settled", profit: -10, settledAt: new Date(now - 10800000).toISOString() },
        ],
        calcLaunchHistory: recentLaunches(5),
      },
      { now },
    );

    expect(state.tripped).toBe(true);
    expect(state.signals.length).toBeGreaterThanOrEqual(2);
    expect(shouldDemotePromo(state)).toBe(true);
    expect(state.cooldownMinutes).toBe(30);
  });

  it("stays silent on healthy cadence even with one calc launch", () => {
    const state = computeTiltState(
      {
        bankroll: 1000,
        bets: [],
        resultFeedback: [
          { status: "settled", profit: 25, settledAt: new Date(now - 3600000).toISOString() },
        ],
        calcLaunchHistory: [{ ts: now - 60_000 }],
      },
      { now },
    );

    expect(state.tripped).toBe(false);
    expect(state.signals.length).toBe(0);
    expect(shouldDemotePromo(state)).toBe(false);
  });

  it("does not trip on rapid-fire alone without losses or exposure", () => {
    const state = computeTiltState(
      {
        bankroll: 1000,
        bets: [],
        resultFeedback: [],
        calcLaunchHistory: recentLaunches(6),
      },
      { now },
    );

    expect(state.tripped).toBe(false);
  });
});
