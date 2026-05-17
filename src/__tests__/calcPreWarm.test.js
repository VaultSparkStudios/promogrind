import { describe, expect, it } from "vitest";
import { predictNextCalculators } from "../app/calcPreWarm.js";

describe("predictNextCalculators", () => {
  it("returns top-N by frequency, deterministically", () => {
    const history = [
      { slug: "bonus-bet" },
      { slug: "bonus-bet" },
      { slug: "first-bet" },
      "kelly",
      "kelly",
      "kelly",
    ];
    const top = predictNextCalculators(history, { max: 2 });
    expect(top).toEqual(["kelly", "bonus-bet"]);
  });

  it("returns empty on no history", () => {
    expect(predictNextCalculators([])).toEqual([]);
  });
});
