import { hasAffirmativeMarketingConsent } from "./marketing-consent.ts";

Deno.test("marketing delivery requires explicit versioned affirmative consent", () => {
  const valid = {
    marketing_consent: true,
    marketing_consent_version: "2026-07-26",
    marketing_consent_source: "signup-checkbox",
    marketing_consent_granted_at: "2026-07-26T12:00:00.000Z",
    marketing_consent_revoked_at: null,
  };
  if (!hasAffirmativeMarketingConsent(valid)) throw new Error("valid consent rejected");
});

Deno.test("legacy newsletter metadata never authorizes marketing delivery", () => {
  if (hasAffirmativeMarketingConsent({ newsletter: true } as Record<string, unknown>)) {
    throw new Error("legacy newsletter metadata authorized delivery");
  }
});

Deno.test("revoked, malformed, or partial consent fails closed", () => {
  const invalid = [
    null,
    { marketing_consent: "true" },
    { marketing_consent: true },
    {
      marketing_consent: true,
      marketing_consent_version: "2026-07-26",
      marketing_consent_source: "account-preferences",
      marketing_consent_granted_at: "not-a-date",
    },
    {
      marketing_consent: true,
      marketing_consent_version: "2026-07-26",
      marketing_consent_source: "account-preferences",
      marketing_consent_granted_at: "2026-07-26T12:00:00.000Z",
      marketing_consent_revoked_at: "2026-07-26T13:00:00.000Z",
    },
  ];
  if (invalid.some((metadata) => hasAffirmativeMarketingConsent(metadata))) {
    throw new Error("invalid consent authorized delivery");
  }
});
