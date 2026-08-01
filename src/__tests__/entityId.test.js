import { beforeEach, describe, expect, it } from "vitest";
import {
  createEntityId,
  createImportEntityId,
  isCanonicalEntityId,
  preserveOrCreateEntityId,
  resetEntityIdStateForTests,
} from "../lib/entityId.js";

describe("canonical entity IDs", () => {
  beforeEach(() => resetEntityIdStateForTests());

  it("uses a typed random UUID when the platform supplies one", () => {
    const id = createEntityId("result feedback", { crypto: { randomUUID: () => "123e4567-e89b-12d3-a456-426614174000" } });
    expect(id).toBe("pg-result-feedback-123e4567-e89b-12d3-a456-426614174000");
    expect(isCanonicalEntityId(id, "result feedback")).toBe(true);
  });

  it("keeps same-millisecond fallback IDs distinct and typed", () => {
    const crypto = { getRandomValues: (bytes) => bytes.fill(7) };
    const first = createEntityId("ledger", { crypto, now: 1000 });
    const second = createEntityId("ledger", { crypto, now: 1000 });
    expect(first).not.toBe(second);
    expect(first).toMatch(/^pg-ledger-rs-1-/);
    expect(second).toMatch(/^pg-ledger-rs-2-/);
  });

  it("makes repeat imports idempotent across object key order", () => {
    const a = createImportEntityId("bet", "csv-v1", { book: "A", stake: "10" }, 0);
    const b = createImportEntityId("bet", "csv-v1", { stake: "10", book: "A" }, 0);
    expect(a).toBe(b);
  });

  it("keeps intentional duplicate rows distinct by occurrence", () => {
    const record = { book: "A", stake: "10" };
    expect(createImportEntityId("bet", "csv-v1", record, 0)).not.toBe(createImportEntityId("bet", "csv-v1", record, 1));
  });

  it("preserves legacy IDs on read/write compatibility paths", () => {
    expect(preserveOrCreateEntityId(1700000000000, "ledger")).toBe("1700000000000");
  });
});
