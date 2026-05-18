import { beforeEach, describe, expect, it } from "vitest";
import { getOnboardingProgress, getPromoPassportOnboardingPlan, markOnboardingStepComplete, loadCompletedOnboardingSteps } from "../onboarding.js";

describe("onboarding helpers", () => {
  beforeEach(() => {
    const store = new Map();
    globalThis.window = globalThis.window || {};
    globalThis.window.localStorage = {
      getItem: (key) => store.has(key) ? store.get(key) : null,
      setItem: (key, value) => { store.set(key, String(value)); },
      removeItem: (key) => { store.delete(key); },
      clear: () => { store.clear(); },
    };
    globalThis.localStorage = globalThis.window.localStorage;
    localStorage.clear();
  });

  it("persists manual onboarding completion", () => {
    markOnboardingStepComplete("calc");
    expect(loadCompletedOnboardingSteps()).toContain("calc");
  });

  it("infers progress from app data and local usage", () => {
    localStorage.setItem("pg_usage_log", JSON.stringify({ "bonus-bet": 1 }));
    localStorage.setItem("pg_referral_shared", "1");

    const progress = getOnboardingProgress({
      appData: {
        done: { DraftKings: true },
        bets: [{ id: 1 }],
      },
      isProActive: true,
    });

    expect(progress.doneCount).toBe(5);
    expect(progress.pct).toBe(100);
    expect(progress.remaining).toHaveLength(0);
  });

  it("guides users from account to first settled result before passport export", () => {
    localStorage.setItem("pg_usage_log", JSON.stringify({ "bonus-bet": 1 }));

    const plan = getPromoPassportOnboardingPlan({
      user: { id: "user-1" },
      appData: {
        done: { DraftKings: true },
        bets: [{ id: 1, status: "open" }],
      },
      disciplineScore: 82,
    });

    expect(plan.doneCount).toBe(4);
    expect(plan.next.id).toBe("settled");
    expect(plan.complete).toBe(false);
  });

  it("marks passport complete after a settled result and passport trust receipt", () => {
    localStorage.setItem("pg_usage_log", JSON.stringify({ "bonus-bet": 1 }));

    const plan = getPromoPassportOnboardingPlan({
      user: { id: "user-1" },
      appData: {
        done: { DraftKings: true },
        bets: [{ id: 1, status: "won" }],
      },
      trustReceipts: [{ title: "Operator passport exported" }],
      disciplineScore: 88,
    });

    expect(plan.doneCount).toBe(6);
    expect(plan.next).toBeNull();
    expect(plan.complete).toBe(true);
  });
});
