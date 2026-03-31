import { describe, expect, it } from "vitest";
import { ensureTrailingSlash, parseLaunchFlag, getFeatureState } from "../launchState.js";

describe("launchState helpers", () => {
  it("parses truthy launch flags", () => {
    expect(parseLaunchFlag("true")).toBe(true);
    expect(parseLaunchFlag("1")).toBe(true);
    expect(parseLaunchFlag("yes")).toBe(true);
    expect(parseLaunchFlag("on")).toBe(true);
  });

  it("parses falsy launch flags and respects fallback", () => {
    expect(parseLaunchFlag("false")).toBe(false);
    expect(parseLaunchFlag("0")).toBe(false);
    expect(parseLaunchFlag(undefined, true)).toBe(true);
    expect(parseLaunchFlag("", false)).toBe(false);
  });

  it("normalizes canonical urls with a trailing slash", () => {
    expect(ensureTrailingSlash("https://vaultsparkstudios.com/promogrind")).toBe("https://vaultsparkstudios.com/promogrind/");
    expect(ensureTrailingSlash("https://vaultsparkstudios.com/promogrind/")).toBe("https://vaultsparkstudios.com/promogrind/");
  });

  it("returns feature metadata", () => {
    const feature = getFeatureState("liveScanner");
    expect(feature.label).toBe("Live Scanner");
    expect(typeof feature.enabled).toBe("boolean");
    expect(feature.setup).toMatch(/ODDS_API_KEY/);
  });
});
