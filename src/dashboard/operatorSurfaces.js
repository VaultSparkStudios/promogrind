import { buildTargetedAlertPlan } from "../operator/briefing.js";
import { buildStudioSnapshot } from "../studio/export.js";
import { getDashboardSnapshot } from "./today.js";

export function readStoredBankroll() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("pg_bankroll") || "";
  } catch {
    return "";
  }
}

export function buildOperatorSurfaceState({
  appData = {},
  schedule = [],
  now = new Date(),
  bankroll = readStoredBankroll(),
  includePlaybooks = true,
} = {}) {
  const dashboardSnapshot = getDashboardSnapshot(
    appData,
    schedule,
    now,
    bankroll,
    { includePlaybooks },
  );
  const studioSnapshot = buildStudioSnapshot(appData, { now, bankroll });
  const alertPlan = buildTargetedAlertPlan({
    snapshot: studioSnapshot,
    dashboard: dashboardSnapshot,
  });

  return {
    bankroll,
    dashboardSnapshot,
    studioSnapshot,
    alertPlan,
  };
}

export function getWorkflowActionSlug(workflow) {
  if (!workflow) return "/track";
  return workflow.status === "waiting" || workflow.status === "placed"
    ? "/track"
    : `/${workflow.calculatorSlug || "track"}`;
}
