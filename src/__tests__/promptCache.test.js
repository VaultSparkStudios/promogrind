// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  promptCacheKey,
  readCachedResponse,
  writeCachedResponse,
  withPromptCache,
  getPromptCacheStats,
  resetPromptCacheStats,
} from "../ai/promptCache.js";

beforeEach(() => {
  window.localStorage.clear();
  resetPromptCacheStats();
});

describe("promptCache", () => {
  const payload = { prompt: "What's the EV?", modelId: "haiku", temperature: 0, feature: "promo-advisor" };

  it("produces a stable cache key independent of object property order", () => {
    const a = promptCacheKey({ modelId: "haiku", prompt: "x", temperature: 0 });
    const b = promptCacheKey({ temperature: 0, prompt: "x", modelId: "haiku" });
    expect(a).toBe(b);
  });

  it("returns null on miss, value on hit", () => {
    expect(readCachedResponse(payload)).toBeNull();
    writeCachedResponse(payload, { answer: "0.3 EV", usage: { input_tokens: 50 } });
    const cached = readCachedResponse(payload);
    expect(cached.answer).toBe("0.3 EV");
  });

  it("treats different prompts as different keys", () => {
    writeCachedResponse(payload, { answer: "A" });
    expect(readCachedResponse({ ...payload, prompt: "different" })).toBeNull();
  });

  it("withPromptCache calls fetcher on miss, then serves from cache on second call", async () => {
    let fetchCalls = 0;
    const fetcher = async () => {
      fetchCalls += 1;
      return { answer: "fresh", usage: { input_tokens: 100 } };
    };
    const r1 = await withPromptCache(payload, fetcher);
    expect(r1.cacheSource).toBe("network");
    expect(r1.cacheHit).toBe(false);
    expect(fetchCalls).toBe(1);

    const r2 = await withPromptCache(payload, fetcher);
    expect(r2.cacheSource).toBe("prompt-cache");
    expect(r2.cacheHit).toBe(true);
    expect(fetchCalls).toBe(1); // not re-called

    const stats = getPromptCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
    expect(stats.tokensSaved).toBeGreaterThan(0);
  });
});
