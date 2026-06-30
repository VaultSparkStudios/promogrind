import { describe, expect, it, vi } from "vitest";
import { parseBetCsvRows } from "../app/CSVImportModal.jsx";

describe("parseBetCsvRows", () => {
  it("maps common sportsbook CSV headers into bet tracker rows", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);

    const rows = parseBetCsvRows(
      "date,book,odds,stake,status,event\n2026-03-01,DraftKings,+150,$50,win,Chiefs ML",
      "2026-06-30",
    );

    expect(rows).toEqual([
      {
        id: 1000,
        date: "2026-03-01",
        book: "DraftKings",
        type: "Moneyline",
        odds: "+150",
        stake: "50",
        toWin: "0",
        status: "won",
        notes: "Chiefs ML",
      },
    ]);

    vi.restoreAllMocks();
  });

  it("rejects header-only input", () => {
    expect(() => parseBetCsvRows("date,book,odds")).toThrow("Need at least a header row");
  });
});
