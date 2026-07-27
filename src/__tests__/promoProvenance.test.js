// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  appendReceipt,
  verifyChain,
  readReceipts,
  clearReceipts,
  exportReceiptForVerification,
} from "../lib/promoProvenance.js";

beforeEach(() => { clearReceipts(); });

const sampleReceipt = {
  occurredAt: "2026-05-18T12:00:00Z",
  book: "DraftKings",
  promoType: "bonus_bet",
  termsHash: "abc123",
  decision: "executed",
  stake: 25,
  settledProfit: 10.5,
};

describe("promoProvenance local integrity contract", () => {
  it("appends a self-attested checksum receipt at the chain head", async () => {
    const entry = await appendReceipt(sampleReceipt);
    expect(entry.payload.previousReceiptHash).toBeNull();
    expect(entry.payload.attestation).toBe("self-attested");
    expect(entry.checksum).toBeTruthy();
    expect(entry.hash).toBeTruthy();
    expect(entry).not.toHaveProperty("signature");
  });

  it("chains subsequent receipts to the previous hash", async () => {
    const first = await appendReceipt(sampleReceipt);
    const second = await appendReceipt({ ...sampleReceipt, settledProfit: -5 });
    expect(second.payload.previousReceiptHash).toBe(first.hash);
  });

  it("verifies an unmodified local integrity chain without claiming authenticity", async () => {
    await appendReceipt(sampleReceipt);
    await appendReceipt({ ...sampleReceipt, settledProfit: -5 });
    const result = await verifyChain();
    expect(result).toMatchObject({ ok: true, length: 2, attestation: "self-attested", integrity: "checksum-chain" });
  });

  it("detects payload-byte tampering", async () => {
    await appendReceipt(sampleReceipt);
    const chain = readReceipts();
    chain[0].payloadB64 = chain[0].payloadB64.replace(/A/, "B");
    window.localStorage.setItem("pg_promo_integrity_ledger_v2", JSON.stringify(chain));
    const result = await verifyChain();
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(0);
  });

  it("strips PII from receipt inputs", async () => {
    const entry = await appendReceipt({ ...sampleReceipt, email: "user@example.com" });
    expect(JSON.stringify(entry.payload).toLowerCase()).not.toContain("email");
    expect(JSON.stringify(entry.payload).toLowerCase()).not.toContain("user@example.com");
  });

  it("exports an honestly labeled public-safe integrity payload", async () => {
    const entry = await appendReceipt(sampleReceipt);
    const exported = exportReceiptForVerification(entry);
    expect(exported).toMatchObject({ version: 2, attestation: "self-attested", integrity: "sha256-checksum-chain" });
    expect(exported.payloadB64).toBe(entry.payloadB64);
    expect(exported.checksum).toBe(entry.checksum);
    expect(exported).not.toHaveProperty("keyId");
    expect(exported).not.toHaveProperty("signature");
  });
});
