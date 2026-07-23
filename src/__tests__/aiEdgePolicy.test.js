import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveAiQuotaPolicy } from "../../supabase/functions/_shared/ai-policy.ts";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("server-owned AI quota policy", () => {
  it("makes trial allowances non-renewing and fail-closed when omitted", () => {
    const explicit = resolveAiQuotaPolicy({
      tier: "closer",
      isTrial: true,
      dailyLimits: { closer: Infinity },
      trialLifetimeLimit: 12,
      now: new Date("2026-07-22T12:00:00Z"),
    });
    const omitted = resolveAiQuotaPolicy({
      tier: "closer",
      isTrial: true,
      dailyLimits: { closer: Infinity },
      now: new Date("2026-07-22T12:00:00Z"),
    });

    expect(explicit).toEqual({ limit: 12, window: "lifetime", windowKey: "lifetime" });
    expect(omitted).toEqual({ limit: 0, window: "lifetime", windowKey: "lifetime" });
  });

  it("supports a lifetime free ceiling without weakening paid plans", () => {
    const free = resolveAiQuotaPolicy({
      tier: "free",
      isTrial: false,
      dailyLimits: { free: 3 },
      lifetimeLimits: { free: 3 },
    });
    const paid = resolveAiQuotaPolicy({
      tier: "runner",
      isTrial: false,
      dailyLimits: { runner: Infinity },
      lifetimeLimits: { free: 3 },
    });

    expect(free.window).toBe("lifetime");
    expect(free.limit).toBe(3);
    expect(paid).toEqual({ limit: null, window: "unlimited", windowKey: "unlimited" });
  });

  it("keeps finite paid allowances daily", () => {
    expect(resolveAiQuotaPolicy({
      tier: "scout",
      isTrial: false,
      dailyLimits: { scout: 20 },
      now: new Date("2026-07-22T12:00:00Z"),
    })).toEqual({ limit: 20, window: "daily", windowKey: "2026-07-22" });
  });
});

describe("AI edge perimeter", () => {
  it("reserves finite quota atomically before provider calls", () => {
    const access = read("supabase/functions/_shared/ai-access.ts");
    const migration = read("supabase/migrations/20260723021000_ai_quota_claim.sql");
    expect(access).toContain('supabase.rpc("claim_ai_quota"');
    expect(access.indexOf('supabase.rpc("claim_ai_quota"')).toBeGreaterThan(-1);
    expect(migration).toContain("where q.used < least(q.quota_limit, excluded.quota_limit)");
    expect(migration).toContain("service_role required");
  });

  it("requires authenticated, quota-checked direct uploads for vision", () => {
    const vision = read("supabase/functions/parse-bet-slip/index.ts");
    expect(vision).toContain("requireAiAccess(req");
    expect(vision).toContain("trialLifetimeLimit: 3");
    expect(vision).toContain("Remote image URLs are not accepted");
    expect(vision).toContain("imageBase64.length > 8_000_000");
    expect(vision).toContain("recordAiUsage(access.supabase");
  });

  it("declares a lifetime trial ceiling at every model call site", () => {
    for (const relativePath of [
      "supabase/functions/promo-advisor/index.ts",
      "supabase/functions/promo-chat/index.ts",
      "supabase/functions/ai-action-plan/index.ts",
      "supabase/functions/stack-builder/index.ts",
      "supabase/functions/parse-bet-slip/index.ts",
    ]) {
      expect(read(relativePath), relativePath).toMatch(/trialLifetimeLimit:\s*\d+/);
    }
  });
});
