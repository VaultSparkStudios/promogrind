import { describe, expect, it } from "vitest";
import { normalizeFeatureTier, resolveFlagDecision, resolveFlagValue } from "../lib/featureFlagPolicy.js";

const enabledBuild = { liveScanner: true, paidCheckout: true };

describe("feature flag capability ceiling", () => {
  it("never lets a remote row broaden a disabled build capability", () => {
    const remote = { liveScanner: { enabled: true } };
    expect(resolveFlagDecision("liveScanner", remote, "house", "user-1", { liveScanner: false })).toMatchObject({
      enabled: false,
      reason: "build-capability-disabled",
      remotePresent: true,
    });
  });

  it("allows an enabled build when no remote narrowing row exists", () => {
    expect(resolveFlagValue("liveScanner", null, "free", null, enabledBuild)).toBe(true);
  });

  it("lets remote state disable, but not manufacture, capability", () => {
    expect(resolveFlagDecision("paidCheckout", { paidCheckout: { enabled: false } }, "house", "u", enabledBuild).reason).toBe("remote-rollout-disabled");
    expect(resolveFlagValue("paidCheckout", { paidCheckout: { enabled: false } }, "house", "u", enabledBuild)).toBe(false);
  });

  it("fails closed for malformed rows, cohorts, percentages, and minimum tiers", () => {
    expect(resolveFlagDecision("liveScanner", { liveScanner: true }, "house", "u", enabledBuild).reason).toBe("remote-row-malformed");
    expect(resolveFlagDecision("liveScanner", { liveScanner: { enabled: true, cohort: "everyone" } }, "house", "u", enabledBuild).reason).toBe("cohort-rule-malformed");
    expect(resolveFlagDecision("liveScanner", { liveScanner: { enabled: true, cohort: { type: "percentage", value: 101 } } }, "house", "u", enabledBuild).reason).toBe("cohort-percentage-invalid");
    expect(resolveFlagDecision("liveScanner", { liveScanner: { enabled: true, min_tier: "legend" } }, "house", "u", enabledBuild).reason).toBe("minimum-tier-invalid");
  });

  it("applies exact, percentage, and tier narrowing deterministically", () => {
    const exact = { liveScanner: { enabled: true, cohort: ["included"], min_tier: "runner" } };
    expect(resolveFlagValue("liveScanner", exact, "pro", "included", enabledBuild)).toBe(true);
    expect(resolveFlagDecision("liveScanner", exact, "pro", "other", enabledBuild).reason).toBe("cohort-user-excluded");
    expect(resolveFlagDecision("liveScanner", exact, "scout", "included", enabledBuild).reason).toBe("minimum-tier-not-met");

    const all = { liveScanner: { enabled: true, cohort: { type: "percentage", value: 100 } } };
    const none = { liveScanner: { enabled: true, cohort: { type: "percentage", value: 0 } } };
    expect(resolveFlagValue("liveScanner", all, "free", "stable-user", enabledBuild)).toBe(true);
    expect(resolveFlagValue("liveScanner", none, "free", "stable-user", enabledBuild)).toBe(false);
  });

  it("normalizes legacy plan names without elevating unknown values", () => {
    expect(normalizeFeatureTier("vault_sparked")).toBe("closer");
    expect(normalizeFeatureTier("pro")).toBe("runner");
    expect(normalizeFeatureTier("unknown")).toBe("free");
  });
});
