import { describe, expect, it } from "vitest";
import {
  classifyLedgerEntries,
  ledgerEvidenceEntries,
  ledgerMergeKey,
  quarantineLedgerData,
  summarizeLedgerEvidence,
  syntheticLedgerReason,
} from "../lib/ledgerEvidence.js";
import { buildTrackInsights } from "../track/insights.js";
import { computeMastery } from "../lib/mastery.js";
import { evaluateAchievements } from "../lib/achievements.js";
import { computeStreak } from "../lib/streaks.js";
import { getDashboardSnapshot } from "../dashboard/today.js";

describe("ledger evidence boundary", () => {
  const real = { id: "real-1", date: "2026-08-04", book: "FanDuel", type: "Bonus Conversion", profit: "12.50" };
  const legacyDemo = { id: "ledger-demo-123", date: "2026-08-04", book: "DraftKings", type: "Bonus Conversion", profit: "138.60", notes: "Demo entry — replace with your actual result" };

  it("detects explicit and historical synthetic rows without treating ordinary examples as synthetic", () => {
    expect(syntheticLedgerReason(legacyDemo)).toBe("legacy-demo-id");
    expect(syntheticLedgerReason({ id: "x", synthetic: true, profit: "1" })).toBe("explicit-synthetic");
    expect(syntheticLedgerReason({ id: "x", notes: "Compared this result to an example", profit: "1" })).toBeNull();
  });

  it("keeps malformed user rows visible for repair but excludes them from realized evidence", () => {
    const malformed = { id: "bad-1", profit: "$12oops" };
    const classified = classifyLedgerEntries([real, malformed, legacyDemo]);
    expect(classified.evidenceRows).toHaveLength(1);
    expect(classified.malformedRows).toHaveLength(1);
    expect(classified.syntheticRows).toHaveLength(1);
    expect(classified.visibleRows).toEqual([real, malformed]);
  });

  it("summarizes only resolved evidence and never credits synthetic profit", () => {
    const summary = summarizeLedgerEvidence([real, legacyDemo, { id: "zero", date: "2026-08-04", profit: "0" }], new Date("2026-08-04T12:00:00.000Z"));
    expect(summary.totalProfit).toBe(12.5);
    expect(summary.todayProfit).toBe(12.5);
    expect(summary.monthProfit).toBe(12.5);
    expect(summary.evidenceCount).toBe(2);
    expect(summary.syntheticCount).toBe(1);
  });

  it("moves synthetic rows into a deduplicated quarantine and emits matching deletion tombstones", () => {
    const now = Date.parse("2026-08-04T12:00:00.000Z");
    const first = quarantineLedgerData({ ledger: [legacyDemo, real] }, now);
    expect(first.data.ledger).toEqual([real]);
    expect(first.data._ledgerQuarantine).toHaveLength(1);
    expect(first.data._tombstones.ledger[ledgerMergeKey(legacyDemo, 0)]).toBe(now);

    const second = quarantineLedgerData({ ...first.data, ledger: [legacyDemo, real] }, now + 1000);
    expect(second.data._ledgerQuarantine).toHaveLength(1);
    expect(ledgerEvidenceEntries(second.data.ledger)).toEqual([real]);
  });

  it("uses the same fallback merge key shape as legacy sync rows without ids", () => {
    expect(ledgerMergeKey({ date: "2026-08-04", book: "Book", type: "Other", profit: "4" }, 2))
      .toBe("2026-08-04|Book|Other|4|2");
  });

  it("holds one evidence boundary across insights, mastery, achievements, cadence, and dashboard totals", () => {
    const now = new Date("2026-08-04T12:00:00.000Z");
    const data = { ledger: [legacyDemo, real], resultFeedback: [], bets: [], done: {}, workflowInbox: [] };

    expect(buildTrackInsights(data, now).totalProfit).toBe(12.5);
    expect(computeMastery(data).totalProfit).toBe(12.5);
    expect(evaluateAchievements(data, 0).profit_1).toBe(true);
    expect(computeStreak(data, now).evidence.ledgerReviews).toBe(1);
    expect(getDashboardSnapshot(data, [], now).totalProfit).toBe(12.5);

    const syntheticOnly = { ...data, ledger: [legacyDemo] };
    expect(buildTrackInsights(syntheticOnly, now).totalProfit).toBe(0);
    expect(computeMastery(syntheticOnly).totalProfit).toBe(0);
    expect(evaluateAchievements(syntheticOnly, 0).profit_1).toBe(false);
    expect(computeStreak(syntheticOnly, now).reviewedDays).toBe(0);
    expect(getDashboardSnapshot(syntheticOnly, [], now).totalProfit).toBe(0);
  });
});
