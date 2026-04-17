import { describe, it, expect } from "vitest";
import { PLAYBOOKS, matchPlaybooks, playbookToWorkflows } from "../playbooks/index.js";

describe("playbooks", () => {
  it("ships a non-empty seed library with unique ids", () => {
    expect(PLAYBOOKS.length).toBeGreaterThanOrEqual(3);
    const ids = PLAYBOOKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks low-bankroll playbooks as not applicable", () => {
    const { top, matches } = matchPlaybooks({ bankroll: 100, done: { DraftKings: true } });
    const depositMatch = matches.find((m) => m.playbook.id === "deposit-match-build");
    expect(depositMatch.applicable).toBe(false);
    expect(top.every((m) => m.playbook.id !== "deposit-match-build")).toBe(true);
  });

  it("boosts fitScore when an open workflow's promo type matches", () => {
    const base = matchPlaybooks({ bankroll: 1000, done: { DraftKings: true, FanDuel: true }, workflowInbox: [] });
    const withOverlap = matchPlaybooks({
      bankroll: 1000,
      done: { DraftKings: true, FanDuel: true },
      workflowInbox: [{ id: "w1", promoType: "bonus_bet", status: "queued" }],
    });
    const baseScore = base.matches.find((m) => m.playbook.id === "bonus-bet-convert").fitScore;
    const boostedScore = withOverlap.matches.find((m) => m.playbook.id === "bonus-bet-convert").fitScore;
    expect(boostedScore).toBeGreaterThan(baseScore);
  });

  it("expands a playbook into normalized workflow entries", () => {
    const playbook = PLAYBOOKS.find((p) => p.id === "bonus-bet-convert");
    const workflows = playbookToWorkflows(playbook, { book: "FanDuel" });
    expect(workflows.length).toBe(playbook.steps.length);
    expect(workflows[0].status).toBe("ready");
    expect(workflows[1].status).toBe("queued");
    expect(workflows[0].book).toBe("FanDuel");
    expect(workflows[0].opsTags).toContain("playbook");
    expect(workflows[0].source).toBe(`playbook:${playbook.id}`);
  });
});
