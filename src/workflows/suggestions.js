import { recommendationToWorkflow } from "../promograph/recommendations.js";
import { getQuickCalcFallbackSlug } from "./actionGraph.js";

function clampScore(value, fallback = 60) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function safeIsoDate(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function humanizePromoType(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function scannerOpportunityToWorkflow(opportunity = {}, kind = "arb", context = {}) {
  const normalizedKind = String(kind || "arb").trim().toLowerCase();
  const roi = Number.parseFloat(opportunity?.roi);
  const ev = Number.parseFloat(opportunity?.ev);
  const score = normalizedKind === "arb"
    ? clampScore((Number.isFinite(roi) ? roi : 0) * 18, 72)
    : clampScore((Number.isFinite(ev) ? ev : 0) * 12, 68);
  const summary = normalizedKind === "arb"
    ? `${opportunity.game || "Live market"} shows ${opportunity.market || "an arbitrage spot"} at +${opportunity.roi || "0"}% ROI between ${opportunity.b1 || "book A"} and ${opportunity.b2 || "book B"}.`
    : `${opportunity.game || "Live market"} shows ${opportunity.outcome || "a positive EV spot"} at +${opportunity.ev || "0"}% EV on ${opportunity.book || "the current book"}.`;
  const note = normalizedKind === "arb"
    ? `Stake ${opportunity.s1 || "?"} on ${opportunity.n1 || "side A"} at ${opportunity.b1 || "book A"} and ${opportunity.s2 || "?"} on ${opportunity.n2 || "side B"} at ${opportunity.b2 || "book B"}.`
    : `Fair ${opportunity.fairPct || "?"}% vs book ${opportunity.bookPct || "?"}%${opportunity.price != null ? ` at ${opportunity.price > 0 ? "+" : ""}${opportunity.price}` : ""}.`;

  return recommendationToWorkflow({
    title: normalizedKind === "arb"
      ? `Scan ${opportunity.game || "arb"}`
      : `Review ${opportunity.game || "EV spot"}`,
    summary,
    promoType: normalizedKind === "arb" ? "arb" : "other",
    calculatorSlug: normalizedKind === "arb" ? "arb-2way" : "ev",
    book: normalizedKind === "arb"
      ? [opportunity.b1, opportunity.b2].filter(Boolean).join(" / ")
      : (opportunity.book || ""),
    bookTarget: normalizedKind === "arb"
      ? [opportunity.b1, opportunity.b2].filter(Boolean).join(" / ")
      : (opportunity.book || ""),
    opportunityScore: score,
    confidence: score >= 85 ? "high" : score >= 70 ? "medium" : "low",
    opsTags: ["live_scanner", normalizedKind, opportunity.sport].filter(Boolean),
  }, {
    id: context.id,
    title: normalizedKind === "arb"
      ? `Live arb: ${opportunity.game || "Opportunity"}`
      : `Live +EV: ${opportunity.game || "Opportunity"}`,
    summary,
    calculatorKey: normalizedKind === "arb" ? "arb-2way" : "ev",
    calculatorLabel: normalizedKind === "arb" ? "Live Arb Scanner" : "Live EV Scanner",
    source: "live_scanner",
    nextStep: normalizedKind === "arb" ? "Verify both books and place both sides before the line moves." : "Confirm fair odds and stake size before placing.",
    note,
    expectedProfit: normalizedKind === "arb" && Number.isFinite(roi)
      ? Number(((Number.parseFloat(context.bankroll) || 100) * (roi / 100)).toFixed(2))
      : null,
    expiresAt: safeIsoDate(opportunity.start),
    actionability: score,
    now: context.now,
  });
}

export function communityPromoToWorkflow(promo = {}, context = {}) {
  const promoType = humanizePromoType(promo.promo_type || promo.promoType || "other");
  const calculatorSlug = getQuickCalcFallbackSlug(promoType);
  const score = clampScore((promo.upvotes || 0) * 8 + (promo.value ? 18 : 0) + (promo.book ? 10 : 0), 62);
  const description = String(promo.description || "").replace(/^\[[A-Z]{2,3}\]\s*/, "").trim();

  return recommendationToWorkflow({
    title: `${promo.book || "Community"} ${promo.promo_type || "promo"}`.trim(),
    summary: description || "Community-submitted promo surfaced for review.",
    promoType,
    calculatorSlug,
    book: promo.book || "",
    bookTarget: promo.book || "",
    opportunityScore: score,
    confidence: (promo.upvotes || 0) >= 3 ? "high" : (promo.upvotes || 0) >= 1 ? "medium" : "low",
    opsTags: ["community_promo", promo.book, promo.promo_type].filter(Boolean),
  }, {
    id: context.id,
    title: `Community promo: ${promo.book || "Promo"}${promo.value ? ` ${promo.value}` : ""}`.trim(),
    summary: description || "Community-submitted promo surfaced for review.",
    calculatorKey: calculatorSlug || "community-promos",
    calculatorLabel: "Community Promo Board",
    source: "community_promo",
    nextStep: "Verify the promo terms in-app and run the matching calculator before it expires.",
    note: promo.value ? `Reported value: ${promo.value}` : "",
    expiresAt: safeIsoDate(promo.expires_at || promo.expiresAt),
    actionability: score,
    now: context.now,
  });
}

export function launchBlockerToWorkflow(blocker = {}, context = {}) {
  const score = clampScore(90 - (context.index || 0) * 8, 78);
  return recommendationToWorkflow({
    title: blocker.label || blocker.title || "Launch blocker",
    summary: blocker.detail || "Manual launch blocker still unresolved.",
    promoType: "other",
    calculatorSlug: "dashboard",
    book: "",
    opportunityScore: score,
    confidence: "high",
    opsTags: ["launch", "manual_blocker", blocker.key].filter(Boolean),
  }, {
    id: context.id,
    title: `Launch: ${blocker.label || blocker.title || "Blocker"}`,
    summary: blocker.detail || "Manual launch blocker still unresolved.",
    calculatorKey: "launch-command-center",
    calculatorLabel: "Launch Command Center",
    source: "launch_command_center",
    nextStep: context.nextStep || "Resolve this blocker and re-run launch proof.",
    actionability: score,
    now: context.now,
  });
}
