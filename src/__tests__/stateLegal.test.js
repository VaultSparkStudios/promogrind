import { describe, expect, it } from "vitest";
import { COMING_SOON_STATES, RECENTLY_LEGALIZED, resolveStateLegalAlert } from "../lib/stateLegal.jsx";

describe("state legal alert truth", () => {
  it("treats Missouri as launched, not coming soon", () => {
    expect(COMING_SOON_STATES).not.toContain("MO");
    expect(RECENTLY_LEGALIZED).toEqual(expect.arrayContaining([
      expect.objectContaining({ abbr: "MO", date: "2025-12-01" }),
    ]));
    expect(resolveStateLegalAlert("MO")).toMatchObject({
      kind: "recent",
      state: { state: "Missouri" },
    });
  });

  it("keeps unresolved states in the coming-soon bucket", () => {
    expect(resolveStateLegalAlert("GA")).toEqual({ kind: "coming-soon", abbr: "GA" });
  });
});
