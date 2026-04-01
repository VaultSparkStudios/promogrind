import { describe, expect, it } from "vitest";
import { BOOKS, getBookUrl, getConfiguredAffiliateCount, hasConfiguredAffiliateLinks } from "../books.js";

describe("book affiliate helpers", () => {
  it("falls back to signup or homepage links when affiliates are not configured", () => {
    const book = BOOKS[0];
    expect(getBookUrl(book)).toBe(book.signupLink || book.link);
  });

  it("reports affiliate readiness coherently", () => {
    expect(getConfiguredAffiliateCount()).toBeGreaterThanOrEqual(0);
    expect(getConfiguredAffiliateCount()).toBeLessThanOrEqual(BOOKS.length);
    expect(hasConfiguredAffiliateLinks()).toBe(getConfiguredAffiliateCount() > 0);
  });
});
