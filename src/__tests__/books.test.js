import { describe, expect, it } from "vitest";
import { BOOKS, getBookUrl, getConfiguredAffiliateCount, hasConfiguredAffiliateLinks } from "../books.js";

describe("book affiliate helpers", () => {
  it("falls back through referralLink → signupLink → link when affiliateLink is null", () => {
    const book = BOOKS[0];
    // Priority: affiliateLink > referralLink > signupLink > link
    const expected = book.affiliateLink || book.referralLink || book.signupLink || book.link;
    expect(getBookUrl(book)).toBe(expected);
  });

  it("reports affiliate readiness coherently", () => {
    expect(getConfiguredAffiliateCount()).toBeGreaterThanOrEqual(0);
    expect(getConfiguredAffiliateCount()).toBeLessThanOrEqual(BOOKS.length);
    expect(hasConfiguredAffiliateLinks()).toBe(getConfiguredAffiliateCount() > 0);
  });
});
