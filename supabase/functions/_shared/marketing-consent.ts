export interface MarketingConsentMetadata {
  marketing_consent?: unknown;
  marketing_consent_version?: unknown;
  marketing_consent_source?: unknown;
  marketing_consent_granted_at?: unknown;
  marketing_consent_revoked_at?: unknown;
}

export function hasAffirmativeMarketingConsent(metadata: MarketingConsentMetadata | null | undefined): boolean {
  if (metadata?.marketing_consent !== true) return false;
  if (typeof metadata.marketing_consent_version !== "string" || !metadata.marketing_consent_version.trim()) return false;
  if (typeof metadata.marketing_consent_source !== "string" || !metadata.marketing_consent_source.trim()) return false;
  if (typeof metadata.marketing_consent_granted_at !== "string") return false;
  if (!Number.isFinite(Date.parse(metadata.marketing_consent_granted_at))) return false;
  return metadata.marketing_consent_revoked_at == null;
}
