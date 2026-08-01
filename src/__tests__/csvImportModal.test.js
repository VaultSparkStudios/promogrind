import { describe, expect, it } from "vitest";
import { parseBetCsvRows } from "../app/CSVImportModal.jsx";

describe("parseBetCsvRows", () => {
  it("maps common sportsbook CSV headers into bet tracker rows", () => {
    const rows = parseBetCsvRows(
      "date,book,odds,stake,status,event\n2026-03-01,DraftKings,+150,$50,win,Chiefs ML",
      "2026-06-30",
    );

    expect(rows).toEqual([
      {
        id: "pg-bet-csv-v1-6d54e3a3f0069cd5",
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

  });

  it("keeps a repeated import idempotent", () => {
    const csv = "date,book,odds,stake,status,event\n2026-03-01,DraftKings,+150,$50,win,Chiefs ML";
    expect(parseBetCsvRows(csv, "2026-06-30")[0].id).toBe(parseBetCsvRows(csv, "2026-08-01")[0].id);
  });

  it("rejects header-only input", () => {
    expect(() => parseBetCsvRows("date,book,odds")).toThrow("Need at least a header row");
  });
});
