import { describe, it, expect } from "vitest";
import { buildTargetedAlertPlan } from "../operator/briefing.js";

const makePlaybook = (overrides = {}) => ({
  id: "bonus-bet-convert",
  name: "Bonus Bet Conversion",
  summary: "Convert free/bonus bets into guaranteed cash.",
  steps: [{ calculatorSlug: "bonus-bet", title: "Run Bonus Bet Converter" }],
  ...overrides,
});

describe("buildTargetedAlertPlan", () => {
  it("returns a general fallback when no signals are present", () => {
    const result = buildTargetedAlertPlan({});
    expect(result.primary.kind).toBe("general");
    expect(result.queue).toHaveLength(0);
  });

  it("surfaces a playbook alert at priority 91 when topPlaybook is applicable", () => {
    const topPlaybook = {
      applicable: true,
      fitScore: 75,
      reasons: [{ tone: "positive", text: "bankroll ≥ $200" }, { tone: "positive", text: "2 active books" }],
      playbook: makePlaybook(),
    };
    const result = buildTargetedAlertPlan({ dashboard: { topPlaybook } });
    const playbookAlert = result.queue.find((a) => a.kind === "playbook");
    expect(playbookAlert).toBeDefined();
    expect(playbookAlert.priority).toBe(91);
    expect(playbookAlert.headline).toBe("Try: Bonus Bet Conversion");
    expect(playbookAlert.ctaSlug).toBe("/bonus-bet");
    expect(playbookAlert.tags).toContain("playbook");
  });

  it("does NOT surface a playbook alert when topPlaybook is not applicable", () => {
    const topPlaybook = {
      applicable: false,
      fitScore: 30,
      reasons: [{ tone: "risk", text: "needs $200 bankroll" }],
      playbook: makePlaybook(),
    };
    const result = buildTargetedAlertPlan({ dashboard: { topPlaybook } });
    expect(result.queue.find((a) => a.kind === "playbook")).toBeUndefined();
  });

  it("does NOT surface a playbook alert when topPlaybook is null", () => {
    const result = buildTargetedAlertPlan({ dashboard: { topPlaybook: null } });
    expect(result.queue.find((a) => a.kind === "playbook")).toBeUndefined();
  });

  it("playbook alert ranks below expiry (94) and above workflow (88)", () => {
    const topPlaybook = {
      applicable: true,
      fitScore: 75,
      reasons: [{ tone: "positive", text: "bankroll ≥ $200" }],
      playbook: makePlaybook(),
    };
    const dashboard = {
      topPlaybook,
      expiringBooks: [{ name: "FanDuel", bonus: "$1000 free bet" }],
      openBets: [],
      topWorkflow: { id: "wf1", title: "Bonus bet", score: 70, status: "ready", calculatorSlug: "bonus-bet", source: "manual", scoreSummary: "" },
    };
    const result = buildTargetedAlertPlan({ dashboard });
    const kinds = result.queue.map((a) => a.kind);
    const expiryIdx = kinds.indexOf("expiry");
    const playbookIdx = kinds.indexOf("playbook");
    const workflowIdx = kinds.indexOf("workflow");
    expect(expiryIdx).toBeLessThan(playbookIdx);
    expect(playbookIdx).toBeLessThan(workflowIdx);
  });

  it("includes fit reasons in the playbook alert body", () => {
    const topPlaybook = {
      applicable: true,
      fitScore: 80,
      reasons: [
        { tone: "positive", text: "bankroll ≥ $200" },
        { tone: "positive", text: "3 active books" },
        { tone: "positive", text: "matches open bonus bet work" },
      ],
      playbook: makePlaybook(),
    };
    const result = buildTargetedAlertPlan({ dashboard: { topPlaybook } });
    const alert = result.queue.find((a) => a.kind === "playbook");
    expect(alert.body).toContain("bankroll ≥ $200");
    expect(alert.body).toContain("3 active books");
    expect(alert.body).toContain("matches open bonus bet work");
  });
});
