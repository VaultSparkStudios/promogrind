import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getPromoPassportOnboardingPlan } from "../onboarding.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const subSrc = readFileSync(join(__dirname, "../app/AppSubcomponents.jsx"), "utf8");
const dashSrc = readFileSync(join(__dirname, "../components/dashboard/DailyDashboard.jsx"), "utf8");

let store;
beforeEach(() => {
  store = new Map();
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

describe("PromoPassportJourneyCard source contract", () => {
  it("is exported from AppSubcomponents", () => {
    expect(subSrc).toContain("export function PromoPassportJourneyCard");
  });

  it("imports getPromoPassportOnboardingPlan from onboarding", () => {
    expect(subSrc).toContain("getPromoPassportOnboardingPlan");
    expect(subSrc).toContain("../onboarding.js");
  });

  it("imports computeDisciplineScore for visible progress contract", () => {
    expect(subSrc).toContain("computeDisciplineScore");
    expect(subSrc).toContain("../lib/discipline.js");
  });

  it("records a trust receipt on journey completion", () => {
    expect(subSrc).toContain("recordTrustReceipt");
    expect(subSrc).toContain("passport-journey-complete");
  });

  it("shows discipline band as the progress contract label", () => {
    expect(subSrc).toContain("scoreResult.band");
    expect(subSrc).toContain("BAND_COLORS");
  });

  it("renders a CTA button pointing to the next uncompleted step", () => {
    expect(subSrc).toContain("plan.next.slug");
    expect(subSrc).toContain("Next →");
  });

  it("is wired into DailyDashboard", () => {
    expect(dashSrc).toContain("PromoPassportJourneyCard");
    expect(dashSrc).toContain("import { StarterPackModal, OnboardingChecklist, MemberWelcomeCard, PromoPassportJourneyCard }");
  });
});

describe("PromoPassportJourneyCard plan logic", () => {
  it("returns pct=0 for a brand-new user with no usage so card stays hidden", () => {
    const plan = getPromoPassportOnboardingPlan({ appData: {}, user: null });
    expect(plan.pct).toBe(0);
    expect(plan.complete).toBe(false);
  });

  it("surfaces settled step as next after calc, book, bet are done", () => {
    localStorage.setItem("pg_usage_log", JSON.stringify({ "bonus-bet": 1 }));
    const plan = getPromoPassportOnboardingPlan({
      user: true,
      appData: { done: { DraftKings: true }, bets: [{ id: 1, status: "open" }] },
      disciplineScore: 50,
    });
    expect(plan.next?.id).toBe("settled");
    expect(plan.complete).toBe(false);
  });

  it("marks complete once settled + discipline threshold reached", () => {
    localStorage.setItem("pg_usage_log", JSON.stringify({ "bonus-bet": 1 }));
    const plan = getPromoPassportOnboardingPlan({
      user: true,
      appData: { done: { DraftKings: true }, bets: [{ id: 1, status: "won" }] },
      trustReceipts: [{ title: "Operator passport exported" }],
      disciplineScore: 75,
    });
    expect(plan.complete).toBe(true);
    expect(plan.next).toBeNull();
  });
});
