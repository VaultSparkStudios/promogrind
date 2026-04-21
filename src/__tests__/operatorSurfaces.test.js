import { describe, expect, it, vi } from "vitest";
import { buildOperatorSurfaceState, getWorkflowActionSlug } from "../dashboard/operatorSurfaces.js";

vi.mock("../studio/export.js", () => ({
  buildStudioSnapshot: vi.fn(() => ({
    workflows: { top: [{ id: "wf-1", status: "ready", calculatorSlug: "bonus-bet", score: 92, title: "Top workflow" }] },
    intelligence: { driftAlerts: [] },
    feeds: { priorities: [], anomalies: [] },
    brief: { headline: "Top workflow", body: "Run it", followUps: [] },
  })),
}));

vi.mock("../operator/briefing.js", () => ({
  buildTargetedAlertPlan: vi.fn(({ dashboard }) => ({
    primary: {
      kind: "workflow",
      headline: dashboard?.topWorkflow?.title || "Fallback",
      body: "Top alert",
      ctaSlug: "/track",
      ctaLabel: "Open",
    },
    queue: [],
  })),
}));

describe("operatorSurfaces", () => {
  it("builds dashboard, studio, and alert snapshots from one shared call", () => {
    const state = buildOperatorSurfaceState({
      appData: {
        workflowInbox: [{ id: "wf-1", title: "Highest value workflow", status: "queued", calculatorSlug: "bonus-bet", opportunityScore: 90 }],
      },
      schedule: [{ book: "DraftKings", promo: "Daily Boost", day: "Daily", value: "+$9" }],
      now: new Date("2026-04-21T12:00:00Z"),
      bankroll: "500",
    });

    expect(state.bankroll).toBe("500");
    expect(state.dashboardSnapshot.topWorkflow?.title).toBe("Highest value workflow");
    expect(state.studioSnapshot.workflows.top[0].title).toBe("Top workflow");
    expect(state.alertPlan.primary.kind).toBe("workflow");
  });

  it("routes waiting workflows to Track and active workflows to their calculator", () => {
    expect(getWorkflowActionSlug({ status: "waiting", calculatorSlug: "bonus-bet" })).toBe("/track");
    expect(getWorkflowActionSlug({ status: "placed", calculatorSlug: "bonus-bet" })).toBe("/track");
    expect(getWorkflowActionSlug({ status: "ready", calculatorSlug: "bonus-bet" })).toBe("/bonus-bet");
    expect(getWorkflowActionSlug(null)).toBe("/track");
  });
});
