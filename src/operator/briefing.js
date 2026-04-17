export function buildTargetedAlertPlan(input = {}) {
  const {
    snapshot = {},
    dashboard = {},
  } = input;

  const alerts = [];
  const driftAlerts = Array.isArray(snapshot?.intelligence?.driftAlerts) ? snapshot.intelligence.driftAlerts : [];
  const topWorkflow = snapshot?.workflows?.top?.[0] || dashboard?.topWorkflow || null;
  const priorities = Array.isArray(snapshot?.feeds?.priorities) ? snapshot.feeds.priorities : [];
  const anomalies = Array.isArray(snapshot?.feeds?.anomalies) ? snapshot.feeds.anomalies : [];
  const expiringBooks = Array.isArray(dashboard?.expiringBooks) ? dashboard.expiringBooks : [];
  const openBets = Array.isArray(dashboard?.openBets) ? dashboard.openBets : [];
  const topPlaybook = dashboard?.topPlaybook || null;

  if (driftAlerts[0]?.direction === "negative") {
    alerts.push({
      kind: "drift",
      priority: 100,
      headline: `Drift watch: ${driftAlerts[0].label}`,
      body: driftAlerts[0].summary,
      ctaLabel: "Open Track",
      ctaSlug: "/track",
      tags: ["drift", "track"],
    });
  }

  if (expiringBooks.length) {
    alerts.push({
      kind: "expiry",
      priority: 94,
      headline: `${expiringBooks.length} promo${expiringBooks.length === 1 ? "" : "s"} expiring soon`,
      body: expiringBooks.map((book) => `${book.name} (${book.bonus})`).join(", "),
      ctaLabel: "Review books",
      ctaSlug: "/sportsbooks",
      tags: ["promo", "expiry"],
    });
  }

  if (topPlaybook?.applicable && topPlaybook.playbook) {
    const pb = topPlaybook.playbook;
    const fitLine = topPlaybook.reasons?.map((r) => r.text).join(" · ") || `fit score ${topPlaybook.fitScore}`;
    alerts.push({
      kind: "playbook",
      priority: 91,
      headline: `Try: ${pb.name}`,
      body: `${pb.summary} — ${fitLine}`,
      ctaLabel: `Start: ${pb.steps[0]?.title || "Step 1"}`,
      ctaSlug: `/${pb.steps[0]?.calculatorSlug || "bonus-bet"}`,
      tags: ["playbook", pb.id],
    });
  }

  if (topWorkflow) {
    alerts.push({
      kind: "workflow",
      priority: Math.max(88, Number(topWorkflow.score || 0)),
      headline: topWorkflow.title || "Advance top workflow",
      body: topWorkflow.scoreSummary || topWorkflow.summary || "Highest-value workflow is ready for action.",
      ctaLabel: topWorkflow.status === "waiting" || topWorkflow.status === "placed" ? "Open Track" : "Open workflow",
      ctaSlug: topWorkflow.status === "waiting" || topWorkflow.status === "placed" ? "/track" : `/${topWorkflow.calculatorSlug || "track"}`,
      tags: ["workflow", topWorkflow.status || "queued"],
    });
  }

  if (openBets.length) {
    alerts.push({
      kind: "settlement",
      priority: 82 + Math.min(openBets.length, 5),
      headline: `${openBets.length} open bet${openBets.length === 1 ? "" : "s"} still need settlement`,
      body: "Log outcomes before stacking more exposure so Track and the Daily Brief stay truthful.",
      ctaLabel: "Open tracker",
      ctaSlug: "/bet-tracker",
      tags: ["settlement", "ledger"],
    });
  }

  if (priorities[0]) {
    alerts.push({
      kind: "priority",
      priority: 78,
      headline: priorities[0].title,
      body: priorities[0].detail,
      ctaLabel: "Open cockpit",
      ctaSlug: "/dashboard",
      tags: ["operator"],
    });
  }

  if (anomalies[0] && anomalies[0].type !== "drift") {
    alerts.push({
      kind: "anomaly",
      priority: 74,
      headline: anomalies[0].label,
      body: anomalies[0].detail,
      ctaLabel: "Review launch state",
      ctaSlug: "/dashboard",
      tags: ["anomaly"],
    });
  }

  const sorted = alerts.sort((a, b) => b.priority - a.priority);
  const primary = sorted[0] || {
    kind: "general",
    priority: 50,
    headline: "Daily brief ready",
    body: "Open PromoGrind to review workflows, drift, and bankroll posture before adding more volume.",
    ctaLabel: "Open Daily Brief",
    ctaSlug: "/daily-brief",
    tags: ["daily-brief"],
  };

  return {
    primary,
    queue: sorted.slice(0, 5),
  };
}
