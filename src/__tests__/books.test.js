import { describe, expect, it } from "vitest";
import {
  BOOKS,
  REQUIRED_LAUNCH_MONETIZATION_BOOKS,
  getBookUrl,
  getBookLinkAnalyticsProps,
  getConfiguredAffiliateCount,
  getConfiguredMonetizationCount,
  getBookLinkMeta,
  getRequiredLaunchMonetizationStatus,
  hasConfiguredAffiliateUrl,
  hasConfiguredMonetizationUrl,
  hasConfiguredReferralUrl,
  hasConfiguredAffiliateLinks,
  hasConfiguredMonetizationLinks,
} from "../books.js";

// ── Affiliate helpers ─────────────────────────────────────────────────────────

describe("book affiliate helpers", () => {
  it("falls back through referralLink → signupLink → link when affiliateLink is null", () => {
    const book = BOOKS[0];
    const expected = book.affiliateLink || book.referralLink || book.signupLink || book.link;
    expect(getBookUrl(book)).toBe(expected);
  });

  it("uses affiliateLink when it is set", () => {
    const book = { ...BOOKS[0], affiliateLink: "https://affiliate.example.com/dk" };
    expect(getBookUrl(book)).toBe("https://affiliate.example.com/dk");
  });

  it("skips affiliateLink and uses referralLink when affiliateLink is null", () => {
    const book = { ...BOOKS[0], affiliateLink: null, referralLink: "https://ref.example.com/dk" };
    expect(getBookUrl(book)).toBe("https://ref.example.com/dk");
  });

  it("falls all the way back to link when affiliateLink and referralLink are null", () => {
    const book = { ...BOOKS[0], affiliateLink: null, referralLink: null, signupLink: null };
    expect(getBookUrl(book)).toBe(book.link);
  });

  it("reports affiliate readiness coherently", () => {
    expect(getConfiguredAffiliateCount()).toBeGreaterThanOrEqual(0);
    expect(getConfiguredAffiliateCount()).toBeLessThanOrEqual(BOOKS.length);
    expect(hasConfiguredAffiliateLinks()).toBe(getConfiguredAffiliateCount() > 0);
  });

  it("treats referral and affiliate links as monetized inventory", () => {
    expect(getConfiguredMonetizationCount()).toBeGreaterThanOrEqual(getConfiguredAffiliateCount());
    expect(getConfiguredMonetizationCount()).toBeLessThanOrEqual(BOOKS.length);
    expect(hasConfiguredMonetizationLinks()).toBe(getConfiguredMonetizationCount() > 0);
  });

  it("does not count generic partner or signup URLs as tracked monetization links", () => {
    const book = BOOKS.find((entry) => entry.name === "BetMGM");
    expect(hasConfiguredAffiliateUrl({ ...book, affiliateLink: book.affiliateProgram })).toBe(false);
    expect(hasConfiguredReferralUrl({ ...book, referralLink: book.signupLink })).toBe(false);
    expect(hasConfiguredMonetizationUrl({ ...book, referralLink: book.link })).toBe(false);
  });

  it("tracks the exact books still required for launch monetization coverage", () => {
    const status = getRequiredLaunchMonetizationStatus();
    expect(status.requiredBooks).toEqual(REQUIRED_LAUNCH_MONETIZATION_BOOKS);
    expect(status.missingBooks).toEqual(expect.arrayContaining(REQUIRED_LAUNCH_MONETIZATION_BOOKS));
    expect(status.configuredBooks).toEqual([]);
  });

  it("returns normalized book link metadata for analytics surfaces", () => {
    const affiliateBook = {
      ...BOOKS[0],
      affiliateLink: "https://affiliate.example.com/dk",
      referralLink: "https://ref.example.com/dk",
    };
    const referralBook = { ...BOOKS[1], affiliateLink: null };
    const signupBook = { ...BOOKS[2], affiliateLink: null, referralLink: null };

    expect(getBookLinkMeta(affiliateBook)).toMatchObject({
      url: "https://affiliate.example.com/dk",
      linkType: "affiliate",
      configuredAffiliate: true,
      configuredMonetization: true,
    });
    expect(getBookLinkMeta(referralBook)).toMatchObject({
      url: referralBook.referralLink,
      linkType: "referral",
      configuredAffiliate: false,
      configuredMonetization: true,
    });
    expect(getBookLinkMeta(signupBook)).toMatchObject({
      book: signupBook.name,
      url: signupBook.signupLink,
      linkType: "signup",
      configuredAffiliate: false,
      configuredMonetization: false,
      launchRequired: false,
    });
  });

  it("returns canonical analytics props with caller overrides", () => {
    const book = BOOKS.find((entry) => entry.name === "BetMGM");
    expect(getBookLinkAnalyticsProps(book, { surface: "test", book: "Override" })).toMatchObject({
      book: "Override",
      surface: "test",
      linkType: "signup",
      configuredAffiliate: false,
      configuredMonetization: false,
      launchRequired: false,
    });
  });
});

// ── BOOKS array integrity ─────────────────────────────────────────────────────

describe("BOOKS array integrity", () => {
  it("contains exactly 8 sportsbooks", () => {
    expect(BOOKS).toHaveLength(8);
  });

  it("every book has a non-empty name string", () => {
    BOOKS.forEach((book) => {
      expect(typeof book.name).toBe("string");
      expect(book.name.trim().length).toBeGreaterThan(0);
    });
  });

  it("every book has a non-empty type string", () => {
    BOOKS.forEach((book) => {
      expect(typeof book.type).toBe("string");
      expect(book.type.trim().length).toBeGreaterThan(0);
    });
  });

  it("every book has a positive numeric bonus value", () => {
    BOOKS.forEach((book) => {
      expect(typeof book.bonus).toBe("number");
      expect(book.bonus).toBeGreaterThan(0);
    });
  });

  it("every book has a non-empty link (the final fallback must always work)", () => {
    BOOKS.forEach((book) => {
      expect(typeof book.link).toBe("string");
      expect(book.link.startsWith("https://")).toBe(true);
    });
  });

  it("every book has a non-empty signupLink that starts with https://", () => {
    BOOKS.forEach((book) => {
      expect(typeof book.signupLink).toBe("string");
      expect(book.signupLink.startsWith("https://")).toBe(true);
    });
  });

  it("every book's referralLink, when present, starts with https://", () => {
    BOOKS.forEach((book) => {
      if (book.referralLink != null) {
        expect(typeof book.referralLink).toBe("string");
        expect(book.referralLink.startsWith("https://")).toBe(true);
      }
    });
  });

  it("getBookUrl returns a non-empty https:// URL for every book (affiliate links all null)", () => {
    // All affiliateLinks are currently null — getBookUrl must still resolve to something valid
    BOOKS.forEach((book) => {
      const url = getBookUrl(book);
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
      expect(url.startsWith("https://")).toBe(true);
    });
  });

  it("has no duplicate book names", () => {
    const names = BOOKS.map((b) => b.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("includes the four major US sportsbooks (DraftKings, FanDuel, BetMGM, Caesars)", () => {
    const names = BOOKS.map((b) => b.name);
    ["DraftKings", "FanDuel", "BetMGM", "Caesars"].forEach((required) => {
      expect(names).toContain(required);
    });
  });

  it("total headline bonus value across all books is within a realistic range ($1,000–$10,000)", () => {
    const total = BOOKS.reduce((sum, b) => sum + b.bonus, 0);
    expect(total).toBeGreaterThanOrEqual(1_000);
    expect(total).toBeLessThanOrEqual(10_000);
  });

  it("every book has a non-empty recurring promotions description", () => {
    BOOKS.forEach((book) => {
      expect(typeof book.recurring).toBe("string");
      expect(book.recurring.trim().length).toBeGreaterThan(0);
    });
  });
});
