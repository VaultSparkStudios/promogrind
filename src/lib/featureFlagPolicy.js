const TIER_ORDER = Object.freeze(["free", "scout", "runner", "closer", "house"]);

export function normalizeFeatureTier(tier) {
  const normalized = String(tier || "free").toLowerCase();
  if (["house"].includes(normalized)) return "house";
  if (["closer", "vault_sparked"].includes(normalized)) return "closer";
  if (["runner", "pro", "sharp"].includes(normalized)) return "runner";
  if (["scout", "grinder", "concierge"].includes(normalized)) return "scout";
  return "free";
}

function stableHash(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 100;
}

function decision(enabled, reason, detail = {}) {
  return Object.freeze({ enabled, reason, ...detail });
}

export function resolveFlagDecision(key, remoteFlags, userTier, userId, buildFlags = {}) {
  const buildEnabled = buildFlags?.[key] === true;
  const remotePresent = Boolean(remoteFlags && Object.prototype.hasOwnProperty.call(remoteFlags, key));
  const base = { key, buildEnabled, remotePresent };

  // Remote rollout state is deliberately subtractive. A database row cannot create a
  // provider, billing, or push capability that the reviewed deployment did not build.
  if (!buildEnabled) return decision(false, "build-capability-disabled", base);
  if (!remotePresent) return decision(true, "build-capability-enabled", base);

  const flag = remoteFlags[key];
  if (!flag || typeof flag !== "object" || typeof flag.enabled !== "boolean") {
    return decision(false, "remote-row-malformed", base);
  }
  if (!flag.enabled) return decision(false, "remote-rollout-disabled", base);

  if (flag.cohort != null) {
    if (Array.isArray(flag.cohort)) {
      if (flag.cohort.length > 0 && (!userId || !flag.cohort.includes(userId))) {
        return decision(false, userId ? "cohort-user-excluded" : "cohort-user-missing", base);
      }
    } else if (typeof flag.cohort === "object" && flag.cohort.type === "percentage") {
      const percentage = Number(flag.cohort.value);
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        return decision(false, "cohort-percentage-invalid", base);
      }
      if (!userId) return decision(false, "cohort-user-missing", base);
      if (stableHash(`${key}:${userId}`) >= percentage) {
        return decision(false, "cohort-percentage-excluded", { ...base, percentage });
      }
    } else {
      return decision(false, "cohort-rule-malformed", base);
    }
  }

  if (flag.min_tier != null) {
    const requiredTier = String(flag.min_tier).toLowerCase();
    const minimumIndex = TIER_ORDER.indexOf(requiredTier);
    if (minimumIndex < 0) return decision(false, "minimum-tier-invalid", base);
    const actualTier = normalizeFeatureTier(userTier);
    if (TIER_ORDER.indexOf(actualTier) < minimumIndex) {
      return decision(false, "minimum-tier-not-met", { ...base, requiredTier, actualTier });
    }
  }

  return decision(true, "remote-rollout-eligible", base);
}

export function resolveFlagValue(key, remoteFlags, userTier, userId, buildFlags = {}) {
  return resolveFlagDecision(key, remoteFlags, userTier, userId, buildFlags).enabled;
}
