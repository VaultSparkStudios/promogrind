import { describe, it, expect, beforeEach } from "vitest";
import { recordTermsSnapshot, listDriftedPromos, _internal_hashText } from "../lib/termsDrift.js";

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

describe("termsDrift", () => {
  let storage;
  beforeEach(() => {
    storage = makeStorage();
  });

  it("returns status=new on first snapshot, status=unchanged on identical re-snapshot", () => {
    const a = recordTermsSnapshot({
      promoId: "dk-bonus-1",
      termsText: "Wager 1x at -200 or longer within 7 days.",
      storage,
      now: 1000,
    });
    expect(a.status).toBe("new");
    expect(a.version).toBe(1);

    const b = recordTermsSnapshot({
      promoId: "dk-bonus-1",
      termsText: "Wager 1x at -200 or longer within 7 days.",
      storage,
      now: 2000,
    });
    expect(b.status).toBe("unchanged");
    expect(b.version).toBe(1);
    expect(b.lastSeen).toBe(2000);
  });

  it("detects drift when terms text changes, bumps version, preserves history", () => {
    recordTermsSnapshot({ promoId: "fd-pb-2", termsText: "Rollover 5x at -150.", storage, now: 1000 });
    const drift = recordTermsSnapshot({
      promoId: "fd-pb-2",
      termsText: "Rollover 10x at -110.",
      storage,
      now: 5000,
    });
    expect(drift.status).toBe("drift");
    expect(drift.version).toBe(2);
    expect(drift.prevHash).not.toBe(drift.currentHash);

    const listed = listDriftedPromos(storage);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ promoId: "fd-pb-2", version: 2, changes: 1 });
  });

  it("hashes deterministically and distinctly for different text", () => {
    const h1 = _internal_hashText("hello world");
    const h2 = _internal_hashText("hello world");
    const h3 = _internal_hashText("hello world!");
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toHaveLength(16);
  });
});
