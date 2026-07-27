import type { AiEntitlement } from "./ai-access.ts";

/**
 * Server-owned AI entitlements. Every provider-backed edge function consumes
 * this registry so tier, trial, and lifetime ceilings cannot drift by copy.
 */
export const AI_ENTITLEMENTS = {
  promoAdvisor: {
    feature: "promo_advisor",
    minTier: "free",
    dailyLimits: { scout: 10, runner: Infinity, closer: Infinity, house: Infinity },
    lifetimeLimits: { free: 3 },
    trialLifetimeLimit: 12,
  },
  promoChat: {
    feature: "promo_chat",
    minTier: "scout",
    dailyLimits: { scout: 20, runner: 50, closer: Infinity, house: Infinity },
    trialLifetimeLimit: 30,
  },
  aiActionPlan: {
    feature: "ai_action_plan",
    minTier: "runner",
    dailyLimits: { runner: 1, closer: 1, house: 3 },
    trialLifetimeLimit: 4,
  },
  stackBuilder: {
    feature: "stack_builder",
    minTier: "closer",
    dailyLimits: { closer: 5, house: 20 },
    trialLifetimeLimit: 3,
  },
  parseBetSlip: {
    feature: "parse_bet_slip",
    minTier: "closer",
    dailyLimits: { closer: 5, house: 20 },
    trialLifetimeLimit: 3,
  },
} satisfies Record<string, AiEntitlement>;
