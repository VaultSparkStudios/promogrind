import { describe, expect, it } from "vitest";
import { buildPassportPayload, exportPassport, verifyPassport } from "../lib/operatorPassport.js";

const appData = {
  bankroll: "1000",
  workflowInbox: [{ id: "w1" }],
  resultFeedback: [
    { status: "settled", profit: 12, promoType: "bonus_bet" },
    { status: "skipped", skipReason: "timing" },
  ],
  bets: [],
};

describe("operator passport", () => {
  it("never leaks raw bet amounts or sportsbook account info", () => {
    const payload = buildPassportPayload({
      ...appData,
      bets: [{ stake: 999, book: "BetMGM", account: "secret-acct" }],
      pg_supabase_session: "tok",
    });
    const json = JSON.stringify(payload);
    expect(json).not.toMatch(/999/);
    expect(json).not.toMatch(/secret-acct/);
    expect(json).not.toMatch(/tok/);
  });

  it("roundtrips export + verify", async () => {
    const token = await exportPassport(appData);
    const result = await verifyPassport(token);
    expect(result.ok).toBe(true);
    expect(result.payload.discipline.score).toBeGreaterThanOrEqual(0);
  });

  it("detects tamper", async () => {
    const token = await exportPassport(appData);
    const [payload, sig] = token.split(".");
    const tampered = `${payload}A.${sig}`;
    const result = await verifyPassport(tampered);
    expect(result.ok).toBe(false);
  });
});
