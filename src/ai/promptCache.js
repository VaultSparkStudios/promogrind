// Prompt-cache layer for AI advisor calls (S92 audit #3).
//
// Wraps an AI call so repeat prompts within `maxAgeMs` are served from
// localStorage instead of the network. Cache hits are tagged in the
// shared AI usage ledger so `npm run ai:usage` can report savings.

import { buildCacheKey, readTimedCache, writeTimedCache, readJsonCache, writeJsonCache } from "./gateway.js";

const PROMPT_CACHE_PREFIX = "pg_ai_prompt_cache";
const CACHE_STATS_KEY = "pg_ai_prompt_cache_stats";
const DEFAULT_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6h

function readStats() {
  const fallback = { hits: 0, misses: 0, tokensSaved: 0, lastReset: Date.now() };
  const stats = readJsonCache(CACHE_STATS_KEY, fallback);
  if (!stats || typeof stats !== "object") return fallback;
  return {
    hits: Number(stats.hits) || 0,
    misses: Number(stats.misses) || 0,
    tokensSaved: Number(stats.tokensSaved) || 0,
    lastReset: Number(stats.lastReset) || Date.now(),
  };
}

function writeStats(stats) {
  writeJsonCache(CACHE_STATS_KEY, stats);
}

function recordHit(tokensSaved = 0) {
  const stats = readStats();
  stats.hits += 1;
  stats.tokensSaved += Math.max(0, Number(tokensSaved) || 0);
  writeStats(stats);
}

function recordMiss() {
  const stats = readStats();
  stats.misses += 1;
  writeStats(stats);
}

/**
 * Build a deterministic cache key from canonical prompt context.
 *
 * payload should include enough context to make a hit safe:
 *   { prompt, modelId, temperature, feature, ... }
 */
export function promptCacheKey(payload = {}) {
  return buildCacheKey(PROMPT_CACHE_PREFIX, payload);
}

/**
 * Read a cached AI response. Returns null on miss or expiry.
 * Does NOT update stats — call `noteCacheHit`/`noteCacheMiss` from the
 * call site so accounting reflects real call decisions (some callers
 * may probe without committing to use).
 */
export function readCachedResponse(payload = {}, { maxAgeMs = DEFAULT_MAX_AGE_MS } = {}) {
  return readTimedCache(promptCacheKey(payload), maxAgeMs, null);
}

export function writeCachedResponse(payload = {}, value) {
  writeTimedCache(promptCacheKey(payload), value);
}

export function noteCacheHit(tokensSaved = 0) {
  recordHit(tokensSaved);
}

export function noteCacheMiss() {
  recordMiss();
}

export function getPromptCacheStats() {
  const stats = readStats();
  const total = stats.hits + stats.misses;
  return {
    ...stats,
    total,
    hitRate: total > 0 ? Math.round((stats.hits / total) * 1000) / 1000 : 0,
  };
}

export function resetPromptCacheStats(now = Date.now()) {
  writeStats({ hits: 0, misses: 0, tokensSaved: 0, lastReset: now });
}

/**
 * Higher-order helper: wraps an async AI call so repeat prompts hit the
 * cache transparently.
 *
 * Usage:
 *   const result = await withPromptCache(
 *     { prompt, modelId, temperature, feature: 'promo-advisor' },
 *     () => streamProjectFunction(...)
 *   );
 *
 * The returned value carries `cacheSource: 'prompt-cache' | 'network'`
 * so downstream `recordAiSpend` can stay honest (zero spend on hit).
 */
export async function withPromptCache(payload = {}, fetcher, { maxAgeMs = DEFAULT_MAX_AGE_MS } = {}) {
  const cached = readCachedResponse(payload, { maxAgeMs });
  if (cached !== null) {
    noteCacheHit(cached?.usage?.input_tokens || cached?.tokensIn || 0);
    return { ...cached, cacheSource: "prompt-cache", cacheHit: true };
  }
  noteCacheMiss();
  const result = await fetcher();
  if (result && typeof result === "object") {
    writeCachedResponse(payload, result);
  }
  return { ...(result || {}), cacheSource: "network", cacheHit: false };
}
