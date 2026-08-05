import { useState, useEffect } from "react";
import { supabase } from "../auth.js";
import { FEATURE_FLAGS } from "../launchState.js";
import { normalizeFeatureTier, resolveFlagDecision } from "./featureFlagPolicy.js";

export { normalizeFeatureTier, resolveFlagDecision } from "./featureFlagPolicy.js";

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

/** Resolve effective flag value for a user.
 *  The build declares the maximum capability. Remote state can only narrow that
 *  ceiling with tier/cohort rollout rules; it can never broaden a disabled build.
 *  Cohort supports:
 *    - Array<string> (exact userId match, existing behavior)
 *    - { type: "percentage", value: N } — stable N% rollout by userId hash
 */
export function resolveFlag(key, remoteFlags, userTier, userId) {
  return resolveFlagDecision(key, remoteFlags, userTier, userId, FEATURE_FLAGS).enabled;
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

  const decision = resolveFlagDecision(key, remoteFlags, tier, userId, FEATURE_FLAGS);
  return { ...decision, loading };
}

/** Invalidate the client-side flag cache (call after admin saves a flag). */
export function invalidateFlagCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}
