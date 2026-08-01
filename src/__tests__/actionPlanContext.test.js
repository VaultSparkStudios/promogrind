import { describe, expect, it } from "vitest";
import { PROMO_SCHED } from "../data/promoSchedule.js";
import { buildActionPlanContext, buildVerificationFirstPlan, canInvokeActionPlanModel, validateGroundedActionPlan } from "../ai/actionPlanContext.js";
import { recordPromoObservation } from "../lib/promoObservations.js";

const now = new Date("2026-08-01T12:00:00.000Z");

describe("AI action-plan evidence boundary", () => {
  it("does not authorize a provider call without a current confirmed observation", () => {
    const context = buildActionPlanContext({ observations: {}, appData: { ledger: [{ profit: 99 }] }, now });
    expect(context).toMatchObject({ contextVersion: 1, profileConsent: false, profile: null, observations: [] });
    expect(canInvokeActionPlanModel(context)).toBe(false);
    const plan = buildVerificationFirstPlan(context);
    expect(plan).toMatchObject({ analysisSource: "rule_engine", evidenceStatus: "verification-required", evidenceCount: 0, profileIncluded: false });
    expect(plan.actions.every((action) => action.requiresVerification && action.bookTarget === null)).toBe(true);
  });

  it("admits only operator-confirmed observations that are seven days old or newer", () => {
    const recent = recordPromoObservation({}, PROMO_SCHED[0], "confirmed", new Date("2026-07-26T12:00:00Z"));
    const withStale = recordPromoObservation(recent, PROMO_SCHED[1], "confirmed", new Date("2026-07-20T12:00:00Z"));
    const withRejected = recordPromoObservation(withStale, PROMO_SCHED[2], "rejected", now);
    const context = buildActionPlanContext({ observations: withRejected, now });
    expect(context.observations).toHaveLength(1);
    expect(context.observations[0]).toMatchObject({ book: PROMO_SCHED[0].book, freshness: "operator-confirmed-current" });
    expect(context.observations[0].evidenceRef).toMatch(/^local-observation:/);
    expect(canInvokeActionPlanModel(context)).toBe(true);
  });

  it("keeps financial and book profile absent until explicit one-request consent", () => {
    const appData = { bankroll: 900, ledger: [{ profit: "12.50" }, { profit: "-2.50" }], resultFeedback: [{ status: "settled" }], done: { Alpha: true, Beta: false } };
    expect(buildActionPlanContext({ appData, includeProfile: false, now }).profile).toBeNull();
    expect(buildActionPlanContext({ appData, includeProfile: true, now }).profile).toEqual({
      bankroll: 900,
      recentRealizedProfit: 10,
      ledgerCount: 2,
      settledWorkflowCount: 1,
      activeBooks: ["Alpha"],
    });
    expect(buildActionPlanContext({ appData: {}, includeProfile: true, now }).profile.bankroll).toBeNull();
  });

  it("fails closed on uncited actions, unsupported value claims, and book mismatches", () => {
    const observations = recordPromoObservation({}, PROMO_SCHED[0], "confirmed", now);
    const context = buildActionPlanContext({ observations, now });
    const ref = context.observations[0].evidenceRef;
    const base = {
      contextVersion: 1,
      analysisSource: "model",
      actions: [{ evidenceRefs: [ref], requiresVerification: true, value: null, bookTarget: context.observations[0].book }],
    };
    expect(validateGroundedActionPlan(base, context)).toBe(base);
    expect(() => validateGroundedActionPlan({ ...base, actions: [{ ...base.actions[0], evidenceRefs: ["unknown"] }] }, context)).toThrow(/unknown evidence/i);
    expect(() => validateGroundedActionPlan({ ...base, actions: [{ ...base.actions[0], value: "$50" }] }, context)).toThrow(/value claim/i);
    expect(() => validateGroundedActionPlan({ ...base, actions: [{ ...base.actions[0], bookTarget: "Another Book" }] }, context)).toThrow(/not supported/i);
  });
});
