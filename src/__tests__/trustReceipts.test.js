import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearTrustReceipts, readTrustReceipts, recordTrustReceipt, summarizeTrustReceipt } from "../lib/trustReceipts.js";

function installStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: vi.fn((key) => store.has(key) ? store.get(key) : null),
    setItem: vi.fn((key, value) => { store.set(key, String(value)); }),
    removeItem: vi.fn((key) => { store.delete(key); }),
    clear: vi.fn(() => { store.clear(); }),
  };
}

describe("trust receipts", () => {
  beforeEach(() => {
    installStorage();
    clearTrustReceipts();
  });

  it("records concise receipts and keeps the newest first", () => {
    const first = recordTrustReceipt({
      type: "account",
      title: "Signed in",
      summary: "Session created.",
      stored: ["session token"],
      notStored: ["password"],
      undo: "Sign out.",
      dedupeKey: "signin",
    });
    const second = recordTrustReceipt({
      type: "billing",
      title: "Checkout started",
      summary: "Stripe opened.",
      dedupeKey: "checkout",
    });

    const receipts = readTrustReceipts();
    expect(receipts).toHaveLength(2);
    expect(receipts[0].id).toBe(second.id);
    expect(receipts[1].id).toBe(first.id);
    expect(summarizeTrustReceipt(receipts[1])).toContain("Not stored: password");
  });

  it("dedupes repeated receipt spam", () => {
    expect(recordTrustReceipt({ title: "Cloud sync updated", dedupeKey: "sync" })).toBeTruthy();
    expect(recordTrustReceipt({ title: "Cloud sync updated", dedupeKey: "sync" })).toBeNull();
    expect(readTrustReceipts()).toHaveLength(1);
  });
});
