export function getWorkflowActionSlug(workflow) {
  if (!workflow) return "/track";
  return workflow.status === "waiting" || workflow.status === "placed"
    ? "/track"
    : `/${workflow.calculatorSlug || "track"}`;
}

export function normalizeAppRoute(route = "") {
  const normalized = String(route || "").trim();
  if (!normalized) return "/dashboard";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function getQuickCalcFallbackSlug(type = "") {
  const fallbackMap = {
    bonus_bet: "bonus-bet",
    bonus: "bonus-bet",
    profit_boost: "profit-boost",
    boost: "profit-boost",
    safety_net: "first-bet",
    firstbet: "first-bet",
    deposit_match: "deposit-match",
    insurance: "insurance",
    parlay: "parlay",
    arb: "arb-2way",
  };
  return fallbackMap[String(type || "").toLowerCase()] || "bonus-bet";
}

export function getWorkflowTransitionActions(workflow) {
  switch (workflow?.status) {
    case "queued":
      return [{ label: "Mark ready", patch: { status: "ready" } }];
    case "ready":
      return [{ label: "Mark placed", patch: { status: "placed" } }];
    case "placed":
      return [{ label: "Mark waiting", patch: { status: "waiting" } }];
    case "waiting":
      return [{ label: "Open Track", navigateTo: "/track" }];
    default:
      return [];
  }
}
