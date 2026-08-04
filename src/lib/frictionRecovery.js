const DAY_MS = 86400000;

export const FRICTION_RECOVERY_ACTIONS = Object.freeze({
  odds_moved: { title: "Shorten the price-check loop", action: "Compare the current market before committing the next workflow.", route: "/odds-compare", cta: "Compare odds" },
  ev_too_low: { title: "Raise the evidence bar", action: "Re-run the decision with current inputs and leave it alone when modeled value stays thin.", route: "/gut-check", cta: "Run a gut check" },
  bankroll: { title: "Reset the sizing boundary", action: "Anchor the next decision to the bankroll and size it before opening another position.", route: "/bet-sizer", cta: "Review sizing" },
  stake_limited: { title: "Plan around the recorded limit", action: "Review book status and avoid assuming unavailable stake capacity.", route: "/sportsbooks", cta: "Review books" },
  terms_unclear: { title: "Resolve terms before execution", action: "Use the reference guide, then verify the live book terms before acting.", route: "/knowledge-base", cta: "Review terms" },
  not_available: { title: "Find an available path", action: "Review currently applicable offers without treating a historical pattern as live inventory.", route: "/promo-finder", cta: "Find promos" },
  book_issue: { title: "Repair the book workflow", action: "Review the affected sportsbook state before routing another action there.", route: "/sportsbooks", cta: "Review books" },
  timing: { title: "Move the check earlier", action: "Use the promo calendar to schedule the next verification before the execution window narrows.", route: "/promo-calendar", cta: "Open calendar" },
  manual_error: { title: "Add a preflight", action: "Validate both sides and amounts before the next related workflow is placed.", route: "/hedge-validator", cta: "Validate inputs" },
});

export const FRICTION_RECOVERY_ROUTES = Object.freeze(new Set([
  ...Object.values(FRICTION_RECOVERY_ACTIONS).map((entry) => entry.route),
  "/edge-dashboard",
]));

function timestamp(entry) {
  const value = new Date(entry?.updatedAt || entry?.createdAt || entry?.settledAt || 0).getTime();
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function normalizeReason(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function buildFrictionRecovery(entries = [], now = new Date(), options = {}) {
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const windowDays = Number.isFinite(options.windowDays) ? Math.max(7, options.windowDays) : 30;
  const minEvidence = Number.isFinite(options.minEvidence) ? Math.max(2, options.minEvidence) : 2;
  if (!Number.isFinite(nowMs)) return { ready: false, reason: "invalid-clock", evidenceCount: 0, threshold: minEvidence };

  const rows = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    for (const field of ["skipReason", "frictionReason"]) {
      const code = normalizeReason(entry?.[field]);
      if (!code) continue;
      const at = timestamp(entry);
      const ageDays = at ? Math.max(0, (nowMs - at) / DAY_MS) : Number.POSITIVE_INFINITY;
      if (ageDays <= windowDays) rows.push({ code, field, at, ageDays });
    }
  }

  const grouped = new Map();
  for (const row of rows) {
    const current = grouped.get(row.code) || { code: row.code, count: 0, latestAt: 0, weightedRecency: 0, sources: new Set() };
    current.count += 1;
    current.latestAt = Math.max(current.latestAt, row.at);
    current.weightedRecency += row.ageDays <= 7 ? 1 : row.ageDays <= 14 ? 0.75 : 0.5;
    current.sources.add(row.field);
    grouped.set(row.code, current);
  }
  const ranked = [...grouped.values()]
    .map((row) => ({ ...row, sources: [...row.sources].sort() }))
    .sort((a, b) => b.count - a.count || b.weightedRecency - a.weightedRecency || b.latestAt - a.latestAt || a.code.localeCompare(b.code));
  const leader = ranked[0] || null;
  if (!leader || leader.count < minEvidence) {
    return {
      ready: false,
      reason: leader ? "below-threshold" : "no-recent-evidence",
      evidenceCount: leader?.count || 0,
      threshold: minEvidence,
      windowDays,
      ranked,
    };
  }

  const known = FRICTION_RECOVERY_ACTIONS[leader.code];
  const action = known || {
    title: "Review the repeated friction",
    action: "Inspect the underlying workflow records before changing the process; PromoGrind has no specific recovery rule for this reason yet.",
    route: "/edge-dashboard",
    cta: "Review evidence",
  };
  const route = FRICTION_RECOVERY_ROUTES.has(action.route) ? action.route : "/edge-dashboard";
  const daysSinceLatest = leader.latestAt ? Math.floor((nowMs - leader.latestAt) / DAY_MS) : null;

  return {
    ready: true,
    reason: known ? "repeated-known-friction" : "repeated-unknown-friction",
    reasonCode: leader.code,
    evidenceCount: leader.count,
    threshold: minEvidence,
    windowDays,
    daysSinceLatest,
    sources: leader.sources,
    title: action.title,
    action: action.action,
    route,
    cta: action.cta,
    whyNow: leader.count + " matching records in the last " + windowDays + " days" + (daysSinceLatest === 0 ? ", including today." : "."),
    ranked,
    rankingBasis: "frequency, then recency; realized profit is not an input",
  };
}
