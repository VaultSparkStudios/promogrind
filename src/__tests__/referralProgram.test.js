import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { describeGiftReceipt, describeSenderBonus, REFERRAL_PROGRAM } from "../data/referralProgram.js";

describe("referral and gift truth", () => {
  it("declares attribution separately from bounded gift rewards", () => {
    expect(REFERRAL_PROGRAM.attribution.rewardLive).toBe(false);
    expect(REFERRAL_PROGRAM.gift).toMatchObject({ recipientDays: 14, senderBonusDays: 7, limitCount: 5, limitWindowDays: 30, senderAwardMoment: "token-issuance-attempt" });
  });

  it("claims sender credit only when persistence is confirmed", () => {
    expect(describeSenderBonus({ reward: { senderBonus: { status: "recorded" } } })).toMatch(/7 sender bonus days were recorded/i);
    expect(describeSenderBonus({ reward: { senderBonus: { status: "failed" } } })).toMatch(/no credit is claimed/i);
    expect(describeSenderBonus({})).toMatch(/no credit is claimed/i);
  });

  it("never turns provider acceptance into inbox-delivery certainty", () => {
    expect(describeGiftReceipt({ delivery: { status: "accepted" } })).toMatchObject({ tone: "delivered", detail: expect.stringMatching(/not guaranteed/i) });
    expect(describeGiftReceipt({ delivery: { status: "rejected" } })).toMatchObject({ tone: "link-only", title: expect.stringMatching(/not accepted/i) });
    expect(describeGiftReceipt({ delivery: { status: "not-configured" } }).detail).toMatch(/not configured/i);
  });

  it("keeps frontend and Edge constants aligned and rejects legacy promises", () => {
    const edge = fs.readFileSync("supabase/functions/gift-trial/index.ts", "utf8");
    const hub = fs.readFileSync("src/components/ReferralHub.jsx", "utf8");
    expect(edge).toContain("recipientDays: 14");
    expect(edge).toContain("senderBonusDays: 7");
    expect(edge).toContain("limitCount: 5");
    expect(edge).toMatch(/status: emailResponse\.ok \? "accepted" : "rejected"/);
    expect(edge).toMatch(/status: senderBonusError \? "failed" : "recorded"/);
    expect(hub).not.toMatch(/30 days free|No limit on referrals|\*\s*30/);
    expect(hub).not.toMatch(/live arb scanner/i);
  });
});
