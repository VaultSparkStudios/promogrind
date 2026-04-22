import { buildTargetedAlertPlan } from "../operator/briefing.js";
import { buildStudioSnapshot } from "../studio/export.js";
import { getWorkflowActionSlug } from "../workflows/actionGraph.js";
import { getDashboardSnapshot } from "./today.js";

export { getWorkflowActionSlug } from "../workflows/actionGraph.js";

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
