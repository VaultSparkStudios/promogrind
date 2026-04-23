import { useState, useEffect } from "react";
import { supabase } from "../auth.js";
import { FEATURE_FLAGS } from "../launchState.js";

const CACHE_KEY = "pg_feature_flags_cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { flags, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return flags;
  } catch {
    return null;
  }
}

function writeCache(flags) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ flags, ts: Date.now() }));
  } catch {}
}

/** Fetch all feature flags from Supabase, merging with build-time defaults. */
export async function fetchRemoteFlags() {
  try {
    const { data, error } = await supabase.from("feature_flags").select("key,enabled,min_tier,cohort");
    if (error || !Array.isArray(data)) return null;
    const remote = {};
    for (const row of data) remote[row.key] = row;
    return remote;
  } catch {
    return null;
  }
}

export function normalizeFeatureTier(tier) {
  const normalized = String(tier || "free").toLowerCase();
  if (["house"].includes(normalized)) return "house";
  if (["closer", "vault_sparked"].includes(normalized)) return "closer";
  if (["runner", "pro", "sharp"].includes(normalized)) return "runner";
  if (["scout", "grinder", "concierge"].includes(normalized)) return "scout";
  return "free";
}

/**
 * Deterministic hash of a string → integer in range [0, 100).
 * Same userId always maps to the same bucket, enabling stable percentage rollouts.
 */
function stableHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h % 100;
}

/** Resolve effective flag value for a user.
 *  Remote overrides build-time defaults. Tier + cohort gates applied client-side.
 *  Cohort supports:
 *    - Array<string> (exact userId match, existing behavior)
 *    - { type: "percentage", value: N } — stable N% rollout by userId hash
 */
export function resolveFlag(key, remoteFlags, userTier, userId) {
  const buildDefault = !!FEATURE_FLAGS[key];
  if (!remoteFlags || !(key in remoteFlags)) return buildDefault;

  const flag = remoteFlags[key];
  if (!flag.enabled) return false;

  // Cohort gate
  if (flag.cohort) {
    if (Array.isArray(flag.cohort) && flag.cohort.length > 0) {
      if (!userId || !flag.cohort.includes(userId)) return false;
    } else if (flag.cohort && typeof flag.cohort === "object" && flag.cohort.type === "percentage") {
      const pct = Number(flag.cohort.value) || 0;
      if (!userId) return false;
      if (stableHash(key + ":" + userId) >= pct) return false;
    }
  }

  // Tier gate
  const tierOrder = ["free", "scout", "runner", "closer", "house"];
  if (flag.min_tier) {
    const minIdx = tierOrder.indexOf(flag.min_tier);
    const userIdx = tierOrder.indexOf(normalizeFeatureTier(userTier));
    if (userIdx < minIdx) return false;
  }

  return true;
}

/**
 * React hook — returns the resolved boolean value for a single feature flag.
 * Uses localStorage cache with 5-minute TTL to avoid per-render fetches.
 */
export function useFeatureFlag(key, { tier = "free", userId = null } = {}) {
  const [remoteFlags, setRemoteFlags] = useState(() => readCache());
  const [loading, setLoading] = useState(!readCache());

  useEffect(() => {
    if (readCache()) return; // still fresh
    fetchRemoteFlags().then((flags) => {
      if (flags) {
        writeCache(flags);
        setRemoteFlags(flags);
      }
      setLoading(false);
    });
  }, []);

  return {
    enabled: resolveFlag(key, remoteFlags, tier, userId),
    loading,
  };
}

/** Invalidate the client-side flag cache (call after admin saves a flag). */
export function invalidateFlagCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}
