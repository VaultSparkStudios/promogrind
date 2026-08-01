// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import {
  appendDecisionEvidence,
  clearReceipts,
  exportReceiptForVerification,
  readReceipts,
  verifyChain,
} from "../lib/promoProvenance.js";

const sample = {
  workflowId: "workflow:sample-1",
  eventType: "placed",
  occurredAt: "2026-08-01T12:00:00.000Z",
  calculatorKey: "bonus-bet",
  promoType: "bonus_bet",
  book: "Example Book",
  expectedProfit: 18.25,
  sourceEvidence: { calculatorKey: "bonus-bet", expectedProfit: 18.25 },
};

beforeEach(() => { clearReceipts(); });

describe("local decision-evidence contract", () => {
  it("links a source calculation to a self-attested workflow event", async () => {
    const entry = await appendDecisionEvidence(sample);
    expect(entry.payload).toMatchObject({
      version: 3,
      workflowId: sample.workflowId,
      eventType: "placed",
      previousReceiptHash: null,
      workflowPreviousHash: null,
      attestation: "self-attested",
      scope: "local-decision-continuity",
    });
    expect(entry.payload.sourceEvidenceRef).toMatch(/^sha256:/);
    expect(entry.hash).toBeTruthy();
    expect(entry).not.toHaveProperty("signature");
  });

  it("maintains both global and per-workflow continuity", async () => {
    const first = await appendDecisionEvidence(sample);
    const other = await appendDecisionEvidence({ ...sample, workflowId: "workflow:other", occurredAt: "2026-08-01T12:01:00.000Z" });
    const settled = await appendDecisionEvidence({
      ...sample,
      eventType: "settled",
      occurredAt: "2026-08-01T12:02:00.000Z",
      realizedProfit: 10.5,
    });
    expect(other.payload.previousReceiptHash).toBe(first.hash);
    expect(other.payload.workflowPreviousHash).toBeNull();
    expect(settled.payload.previousReceiptHash).toBe(other.hash);
    expect(settled.payload.workflowPreviousHash).toBe(first.hash);
    await expect(verifyChain()).resolves.toMatchObject({ ok: true, length: 3, workflows: 2, attestation: "self-attested" });
  });

  it("deduplicates retries by event idempotency key", async () => {
    const input = { ...sample, idempotencyKey: "workflow:sample-1:placed:source-event-1" };
    const first = await appendDecisionEvidence(input);
    const retry = await appendDecisionEvidence(input);
    expect(retry.hash).toBe(first.hash);
    expect(readReceipts()).toHaveLength(1);
  });

  it("detects stored payload and byte tampering", async () => {
    await appendDecisionEvidence(sample);
    const chain = readReceipts();
    chain[0].payload.book = "Tampered Book";
    window.localStorage.setItem("pg_promo_integrity_ledger_v3", JSON.stringify(chain));
    await expect(verifyChain()).resolves.toMatchObject({ ok: false, brokenAt: 0, reason: "payload-mismatch" });
  });

  it("hashes private notes rather than storing note text or PII fields", async () => {
    const entry = await appendDecisionEvidence({ ...sample, privateNote: "Call me at 555-0100; user@example.com" });
    const json = JSON.stringify(entry.payload).toLowerCase();
    expect(entry.payload.operatorContextRef).toMatch(/^sha256:/);
    expect(json).not.toContain("555-0100");
    expect(json).not.toContain("user@example.com");
    expect(json).not.toContain('"note"');
  });

  it("exports an honestly scoped verification payload", async () => {
    const entry = await appendDecisionEvidence(sample);
    expect(exportReceiptForVerification(entry)).toMatchObject({
      version: 3,
      attestation: "self-attested",
      scope: "local-decision-continuity",
      integrity: "sha256-global-and-workflow-checksum-chain",
    });
  });
});
