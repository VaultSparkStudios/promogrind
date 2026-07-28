import { describe, expect, it } from "vitest";
import {
  buildMarketingConsent,
  MARKETING_CONSENT_VERSION,
  readMarketingConsent,
} from "../lib/marketingConsent.js";

describe("marketing consent receipts", () => {
  it("fails closed when consent metadata is absent or ambiguous", () => {
    expect(readMarketingConsent(null).granted).toBe(false);
    expect(readMarketingConsent({ user_metadata: { marketing_consent: "true" } }).granted).toBe(false);
  });

  it("records affirmative consent with version, source, and timestamp", () => {
    const metadata = buildMarketingConsent(true, {
      source: "signup-checkbox",
      now: "2026-07-26T12:00:00.000Z",
    });
    expect(metadata).toEqual({
      marketing_consent: true,
      marketing_consent_version: MARKETING_CONSENT_VERSION,
      marketing_consent_source: "signup-checkbox",
      marketing_consent_granted_at: "2026-07-26T12:00:00.000Z",
      marketing_consent_revoked_at: null,
    });
  });

  it("records revocation without retaining a misleading grant timestamp", () => {
    expect(buildMarketingConsent(false, {
      source: "account-preferences",
      now: "2026-07-26T13:00:00.000Z",
    })).toMatchObject({
      marketing_consent: false,
      marketing_consent_granted_at: null,
      marketing_consent_revoked_at: "2026-07-26T13:00:00.000Z",
    });
  });
});
