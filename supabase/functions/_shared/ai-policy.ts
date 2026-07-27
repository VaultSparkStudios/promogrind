export type AiTier = "free" | "scout" | "runner" | "closer" | "house";
export type AiQuotaWindow = "daily" | "lifetime" | "unlimited";

export type AiQuotaPolicy = {
  limit: number | null;
  window: AiQuotaWindow;
  windowKey: string;
};

type QuotaPolicyInput = {
  tier: AiTier;
  isTrial: boolean;
  dailyLimits: Partial<Record<AiTier, number>>;
  lifetimeLimits?: Partial<Record<AiTier, number>>;
  trialLifetimeLimit?: number;
  now?: Date;
};

function finiteLimit(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

/**
 * Resolve the server-owned spend contract before any provider call.
 *
 * Trials are deliberately non-renewing: a missing trial ceiling resolves to
 * zero instead of inheriting the elevated tier's paid/unlimited allowance.
 * Free tiers may opt into the same lifetime contract. Paid tiers retain their
 * declared daily or unlimited policy.
 */
export function resolveAiQuotaPolicy(input: QuotaPolicyInput): AiQuotaPolicy {
  const now = input.now instanceof Date ? input.now : new Date();

  if (input.isTrial) {
    return {
      limit: finiteLimit(input.trialLifetimeLimit) ?? 0,
      window: "lifetime",
      windowKey: "lifetime",
    };
  }

  const lifetimeLimit = finiteLimit(input.lifetimeLimits?.[input.tier]);
  if (lifetimeLimit !== null) {
    return { limit: lifetimeLimit, window: "lifetime", windowKey: "lifetime" };
  }

  const configuredDaily = input.dailyLimits[input.tier] ?? input.dailyLimits.free ?? 0;
  if (!Number.isFinite(configuredDaily)) {
    return { limit: null, window: "unlimited", windowKey: "unlimited" };
  }

  return {
    limit: Math.max(0, Math.floor(Number(configuredDaily))),
    window: "daily",
    windowKey: now.toISOString().slice(0, 10),
  };
}
