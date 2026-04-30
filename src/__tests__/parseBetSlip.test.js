import { describe, it, expect } from "vitest";
import { parseBetSlip } from "../app/parseBetSlip.js";

describe("parseBetSlip", () => {
  it("returns empty object for empty/non-string input", () => {
    expect(parseBetSlip("")).toEqual({});
    expect(parseBetSlip(null)).toEqual({});
    expect(parseBetSlip(undefined)).toEqual({});
  });

  it("extracts stake with dollar sign", () => {
    expect(parseBetSlip("Bet $250 on Lakers").stake).toBe("250");
  });

  it("extracts stake with comma thousands", () => {
    expect(parseBetSlip("$1,500 on parlay").stake).toBe("1500");
  });

  it("extracts american odds", () => {
    expect(parseBetSlip("$100 at +350").odds).toBe("+350");
    expect(parseBetSlip("$100 at -200").odds).toBe("-200");
  });

  it("extracts decimal odds when no american present", () => {
    expect(parseBetSlip("Bet 50 at 2.50").odds).toBe("2.50");
  });

  it("extracts fractional odds when no american/decimal", () => {
    expect(parseBetSlip("bet at 5/2 odds").odds).toBe("5/2");
  });

  it("identifies a known book by name", () => {
    expect(parseBetSlip("DraftKings $100 at +200").book).toBe("DraftKings");
    expect(parseBetSlip("on fanduel for +150").book).toBe("FanDuel");
    expect(parseBetSlip("bet365 promo").book).toBe("bet365");
  });

  it("flags parlay type", () => {
    expect(parseBetSlip("3-leg parlay $50").type).toBe("Parlay");
  });

  it("captures team-vs-team description", () => {
    expect(parseBetSlip("Lakers vs Celtics $20").notes).toMatch(/Lakers/);
    expect(parseBetSlip("Eagles @ Cowboys").notes).toMatch(/Eagles/);
  });

  it("returns combined fields on a realistic slip", () => {
    const r = parseBetSlip("DraftKings $100 parlay at +500 Lakers vs Celtics");
    expect(r.book).toBe("DraftKings");
    expect(r.stake).toBe("100");
    expect(r.odds).toBe("+500");
    expect(r.type).toBe("Parlay");
    expect(r.notes).toMatch(/Lakers/);
  });
});
