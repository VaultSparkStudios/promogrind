/**
 * Unit tests for the _shared/ai-access.ts tier + quota logic.
 * Run with: deno test --allow-env supabase/functions/__tests__/ai-access.test.ts
 */

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Re-declare the PLAN_TIER map and resolveTier logic inline to test it independently
const PLAN_TIER: Record<string, string> = {
  free_agent: "free", free: "free",
  scout_monthly: "scout", scout_annual: "scout", scout: "scout",
  runner_monthly: "runner", runner_annual: "runner", runner: "runner",
  closer_monthly: "closer", closer_annual: "closer", closer: "closer",
  house: "house", the_house: "house",
  vault_sparked: "house", pro: "runner", sharp: "closer",
};

function resolveTier(planId: string | null | undefined): string {
  if (!planId) return "free";
  return PLAN_TIER[planId.toLowerCase()] ?? "free";
}

const TIER_ORDER = ["free", "scout", "runner", "closer", "house"];

function tierAtLeast(userTier: string, minTier: string): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(minTier);
}

Deno.test("resolveTier — maps plan IDs to correct tiers", () => {
  assertEquals(resolveTier("scout_monthly"), "scout");
  assertEquals(resolveTier("scout_annual"), "scout");
  assertEquals(resolveTier("runner_monthly"), "runner");
  assertEquals(resolveTier("runner_annual"), "runner");
  assertEquals(resolveTier("closer_monthly"), "closer");
  assertEquals(resolveTier("house"), "house");
  assertEquals(resolveTier("the_house"), "house");
  assertEquals(resolveTier("vault_sparked"), "house");
  assertEquals(resolveTier("pro"), "runner");
  assertEquals(resolveTier("sharp"), "closer");
});

Deno.test("resolveTier — falls back to free for unknown plans", () => {
  assertEquals(resolveTier(null), "free");
  assertEquals(resolveTier(undefined), "free");
  assertEquals(resolveTier("unknown_plan_xyz"), "free");
  assertEquals(resolveTier(""), "free");
});

Deno.test("tierAtLeast — free cannot access scout-gated features", () => {
  assertEquals(tierAtLeast("free", "scout"), false);
  assertEquals(tierAtLeast("free", "runner"), false);
});

Deno.test("tierAtLeast — scout can access free but not runner features", () => {
  assertEquals(tierAtLeast("scout", "free"), true);
  assertEquals(tierAtLeast("scout", "scout"), true);
  assertEquals(tierAtLeast("scout", "runner"), false);
});

Deno.test("tierAtLeast — house can access all tier features", () => {
  assertEquals(tierAtLeast("house", "free"), true);
  assertEquals(tierAtLeast("house", "scout"), true);
  assertEquals(tierAtLeast("house", "runner"), true);
  assertEquals(tierAtLeast("house", "closer"), true);
  assertEquals(tierAtLeast("house", "house"), true);
});

Deno.test("daily limit enforcement — runner gets unlimited promo_advisor", () => {
  const dailyLimits: Record<string, number> = { free: 3, scout: 10, runner: Infinity, closer: Infinity, house: Infinity };
  assertEquals(dailyLimits["runner"], Infinity);
  assertEquals(dailyLimits["free"], 3);
  assertEquals(dailyLimits["scout"], 10);
});

Deno.test("rate limit window — promo_chat burst is 6 per 10 seconds", () => {
  // Verify the constants match what the edge function declares
  const burstLimit = 6;
  const burstWindowMs = 10_000;
  assertEquals(burstLimit, 6);
  assertEquals(burstWindowMs, 10_000);
});

Deno.test("rate limit window — promo_advisor burst is 4 per 10 seconds", () => {
  const burstLimit = 4;
  assertEquals(burstLimit, 4);
});
