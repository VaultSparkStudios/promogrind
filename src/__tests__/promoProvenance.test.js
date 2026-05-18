// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  appendReceipt,
  verifyChain,
  readReceipts,
  clearReceipts,
  exportReceiptForVerification,
} from "../lib/promoProvenance.js";

beforeEach(() => {
  clearReceipts();
});

const sampleReceipt = {
  occurredAt: "2026-05-18T12:00:00Z",
  book: "DraftKings",
  promoType: "bonus_bet",
  termsHash: "abc123",
  decision: "executed",
  stake: 25,
  settledProfit: 10.5,
};

describe("promoProvenance", () => {
  it("appends a receipt, signs it, and links it via previousReceiptHash=null at chain head", async () => {
    const entry = await appendReceipt(sampleReceipt);
    expect(entry.payload.previousReceiptHash).toBeNull();
    expect(entry.signature).toBeTruthy();
    expect(entry.hash).toBeTruthy();
  });

  it("chains subsequent receipts to the previous hash", async () => {
    const first = await appendReceipt(sampleReceipt);
    const second = await appendReceipt({ ...sampleReceipt, settledProfit: -5 });
    expect(second.payload.previousReceiptHash).toBe(first.hash);
  });

  it("verifyChain returns ok=true for an unmodified chain", async () => {
    await appendReceipt(sampleReceipt);
    await appendReceipt({ ...sampleReceipt, settledProfit: -5 });
    const result = await verifyChain();
    expect(result.ok).toBe(true);
    expect(result.length).toBe(2);
  });

  it("verifyChain detects tampering with the payload bytes", async () => {
    await appendReceipt(sampleReceipt);
    const chain = readReceipts();
    chain[0].payloadB64 = chain[0].payloadB64.replace(/A/g, "B"); // flip a byte
    window.localStorage.setItem("pg_promo_provenance_ledger", JSON.stringify(chain));
    const result = await verifyChain();
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(0);
  });

  it("strips PII from receipt inputs before signing — email never enters chain", async () => {
    const entry = await appendReceipt({ ...sampleReceipt, email: "user@example.com" });
    expect(JSON.stringify(entry.payload).toLowerCase()).not.toContain("email");
    expect(JSON.stringify(entry.payload).toLowerCase()).not.toContain("user@example.com");
  });

  it("exportReceiptForVerification produces a public-safe payload", async () => {
    const entry = await appendReceipt(sampleReceipt);
    const exported = exportReceiptForVerification(entry);
    expect(exported.keyId).toBeTruthy();
    expect(exported.payloadB64).toBe(entry.payloadB64);
    expect(exported.signature).toBe(entry.signature);
  });
});
