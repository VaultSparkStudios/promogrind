export const MARKETING_CONSENT_VERSION = "2026-07-26";

export function buildMarketingConsent(granted, {
  source = "account-preferences",
  now = new Date().toISOString(),
} = {}) {
  const isGranted = granted === true;
  return {
    marketing_consent: isGranted,
    marketing_consent_version: MARKETING_CONSENT_VERSION,
    marketing_consent_source: source,
    marketing_consent_granted_at: isGranted ? now : null,
    marketing_consent_revoked_at: isGranted ? null : now,
  };
}

export function readMarketingConsent(user) {
  const metadata = user?.user_metadata ?? {};
  return {
    granted: metadata.marketing_consent === true,
    version: metadata.marketing_consent_version ?? null,
    source: metadata.marketing_consent_source ?? null,
    grantedAt: metadata.marketing_consent_granted_at ?? null,
    revokedAt: metadata.marketing_consent_revoked_at ?? null,
  };
}
