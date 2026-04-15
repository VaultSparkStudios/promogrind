import { describe, expect, it } from "vitest";
import { buildShadowBookProjection } from "../lib/shadow.js";

const FIXTURE_BOOKS = [
  { name: "DraftKings", bonus: 200, color: "#53d769" },
  { name: "FanDuel",    bonus: 300, color: "#1493ff" },
  { name: "BetMGM",     bonus: 1500, color: "#bd9644" },
  { name: "Caesars",    bonus: 1000, color: "#c8aa6e" },
];

describe("buildShadowBookProjection", () => {
  it("returns empty projection when all books are owned", () => {
    const projection = buildShadowBookProjection({
      books: FIXTURE_BOOKS,
      bookStatus: { DraftKings: "active", FanDuel: "active", BetMGM: "active", Caesars: "limited" },
    });
    expect(projection.missingBooks).toHaveLength(0);
    expect(projection.totalFirstMonth).toBe(0);
  });

  it("projects only books the user doesn't own", () => {
    const projection = buildShadowBookProjection({
      books: FIXTURE_BOOKS,
      bookStatus: { DraftKings: "active" },
    });
    expect(projection.missingBooks.map((row) => row.name)).toEqual(
      expect.arrayContaining(["FanDuel", "BetMGM", "Caesars"]),
    );
    expect(projection.missingBooks).toHaveLength(3);
  });

  it("computes welcome + recurring + first-month totals", () => {
    const projection = buildShadowBookProjection({
      books: [{ name: "DraftKings", bonus: 200 }],
      bookStatus: {}, // nothing owned
    });
    const row = projection.missingBooks[0];
    // 200 * 0.7 = 140 welcome · 60/wk DraftKings default · first month 140 + 60*4 = 380
    expect(row.welcomeOneTime).toBe(140);
    expect(row.weeklyRecurring).toBe(60);
    expect(row.firstMonthTotal).toBe(380);
    expect(projection.totalFirstMonth).toBe(380);
  });

  it("sorts missing books by first-month upside descending", () => {
    const projection = buildShadowBookProjection({
      books: FIXTURE_BOOKS,
      bookStatus: {},
    });
    const totals = projection.missingBooks.map((row) => row.firstMonthTotal);
    const sorted = [...totals].sort((a, b) => b - a);
    expect(totals).toEqual(sorted);
  });

  it("honors weekly overrides for user-specific calibration", () => {
    const projection = buildShadowBookProjection({
      books: [{ name: "DraftKings", bonus: 100 }],
      bookStatus: {},
      weeklyOverrides: { DraftKings: 25 },
      conversionRate: 1,
    });
    const row = projection.missingBooks[0];
    expect(row.welcomeOneTime).toBe(100);
    expect(row.weeklyRecurring).toBe(25);
    expect(row.firstMonthTotal).toBe(200);
  });
});
