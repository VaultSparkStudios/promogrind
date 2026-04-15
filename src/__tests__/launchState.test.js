import { describe, expect, it } from "vitest";
import { getLaunchCommandCenter, getValidationSignal, resolveLaunchValidation } from "../launchState.js";

describe("launch state helpers", () => {
  it("classifies validation strings into signals", () => {
    expect(getValidationSignal("passing")).toBe("passing");
    expect(getValidationSignal("153/153 passing")).toBe("passing");
    expect(getValidationSignal("blocked by deploy")).toBe("failing");
    expect(getValidationSignal("stale")).toBe("warning");
  });

  it("resolves validation rows with merged signals", () => {
    const validation = resolveLaunchValidation({
      tests: { lastKnown: "153/153 passing" },
      browserSmoke: { lastKnown: "blocked by environment" },
    });

    expect(validation.tests.signal).toBe("passing");
    expect(validation.browserSmoke.signal).toBe("failing");
  });

  it("derives a launch command-center score and next actions", () => {
    const center = getLaunchCommandCenter({
      configuredAffiliateCount: 3,
      configuredMonetizationCount: 6,
      totalBooks: 12,
      validation: resolveLaunchValidation({
        tests: { lastKnown: "153/153 passing" },
        build: { lastKnown: "passing" },
        smokeCommand: { lastKnown: "passing" },
        browserSmoke: { lastKnown: "passing" },
      }),
    });

    expect(center.validationPassingCount).toBe(4);
    expect(center.readinessScore).toBeGreaterThan(40);
    expect(center.nextActions.length).toBeGreaterThan(0);
  });
});
