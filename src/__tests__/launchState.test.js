import { describe, expect, it } from "vitest";
import { getProjectAuthHref, getProjectAuthMode } from "../launchState.js";

describe("launch auth helpers", () => {
  it("parses supported auth modes from query strings", () => {
    expect(getProjectAuthMode("?auth=signup")).toBe("signup");
    expect(getProjectAuthMode("?auth=signin")).toBe("signin");
    expect(getProjectAuthMode("?auth=else")).toBeNull();
    expect(getProjectAuthMode("")).toBeNull();
  });

  it("adds the requested auth mode to the current URL", () => {
    const href = getProjectAuthHref("signup", "https://promogrind.bet/dashboard?tab=today");
    const url = new URL(href);

    expect(url.origin).toBe("https://promogrind.bet");
    expect(url.pathname).toBe("/dashboard");
    expect(url.searchParams.get("tab")).toBe("today");
    expect(url.searchParams.get("auth")).toBe("signup");
  });

  it("falls back to signup for invalid modes", () => {
    const href = getProjectAuthHref("invalid", "https://promogrind.bet/");
    expect(new URL(href).searchParams.get("auth")).toBe("signup");
  });
});
