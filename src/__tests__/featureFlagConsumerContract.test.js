import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const consumers = [
  "AIActionPlan.jsx",
  "LiveScanner.jsx",
  "PromoAdvisorPanel.jsx",
  "PromoChat.jsx",
  "StackBuilder.jsx",
];

describe("protected feature consumers", () => {
  it.each(consumers)("routes %s through the subtractive policy without a raw build-flag bypass", (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), "src", "components", file), "utf8");
    expect(source).toMatch(/useFeatureFlag\(/);
    expect(source).not.toMatch(/FEATURE_FLAGS\./);
    expect(source).not.toMatch(/const\s+featureEnabled\s*=.*\|\|/);
  });
});
