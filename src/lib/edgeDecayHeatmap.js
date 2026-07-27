// Live edge-decay heatmap (S92 audit #8).
//
// Aggregates per-promo decay state across all active books × promo types
// into a single grid the operator can scan at a glance. No "act now"
// copy — pure state surfacing.

import { buildDecayCurve, computeExecutionDeadline } from "./edgeDecay.js";
import { PROMO_SCHED } from "../data/promoSchedule.js";

function num(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cellTone(remainingPct, horizonHours, expired) {
  if (expired) return "expired";
  if (remainingPct <= 0.25 || horizonHours <= 8) return "critical";
  if (remainingPct <= 0.5 || horizonHours <= 24) return "warm";
  if (remainingPct <= 0.8) return "fresh";
  return "stable";
}

// Derive the operator's live promo rows from the same sources the
// recommender uses: the schedule scoped to active books, with the
// user-entered per-book expiry from the Sportsbooks tracker as the
// hard-expiry signal.
export function buildHeatmapPromoRows(data = {}) {
  const bookStatus = data.bookStatus || {};
  const activeBooks = Object.entries(bookStatus)
    .filter(([, v]) => v === "active" || v === "Active")
    .map(([k]) => k);
  const expiry = data.bookExpiry || {};
  return PROMO_SCHED
    .filter((p) => (activeBooks.length ? activeBooks.includes(p.book) : p.grade === "A"))
    .map((p) => ({
      book: p.book,
      promo: p.promo,
      promoType: p.type,
      expires: expiry[p.book] || null,
    }));
}

/**
 * Build heatmap cells from a promo schedule.
 *
 * promos: array of { book, promo, promoType, expires, ... }
 *
 * Returns {
 *   cells: [{ book, promoType, remainingPct, horizonHours, deadlineHours, tone, expired }],
 *   movers: cells sorted by smallest horizon (top movers),
 *   summary: { total, fresh, warm, critical, expired }
 * }
 */
export function buildEdgeDecayHeatmap(promos = [], opts = {}) {
  const now = opts.now instanceof Date ? opts.now.getTime() : Number.isFinite(opts.now) ? opts.now : Date.now();
  const userFloor = num(opts.userFloor, 0.35);

  const cells = (Array.isArray(promos) ? promos : []).map((promo) => {
    const expiresMs = promo.expires ? new Date(promo.expires).getTime() : null;
    const expiredFromIso = Number.isFinite(expiresMs) && expiresMs <= now;
    const curve = buildDecayCurve(promo, { now });
    const deadline = computeExecutionDeadline(promo, userFloor);
    const remaining = curve.samples?.length ? curve.samples[curve.samples.length - 1] : 1;
    const horizonHours = expiredFromIso ? 0 : num(curve.horizonHours, Infinity);
    const expired = expiredFromIso || (horizonHours === 0 && Boolean(curve.expiresMs));
    const tone = cellTone(remaining, horizonHours, expired);
    return {
      book: promo.book || "—",
      promoType: promo.promoType || promo.promo || "—",
      label: promo.promo || promo.promoType || "promo",
      remainingPct: Math.round(remaining * 100),
      horizonHours,
      deadlineHours: deadline ? num(deadline.hoursRemaining, null) : null,
      deadlineExpired: deadline?.expired ?? false,
      expired,
      tone,
    };
  });

  const movers = [...cells]
    .filter((c) => !c.expired)
    .sort((a, b) => a.horizonHours - b.horizonHours || a.remainingPct - b.remainingPct)
    .slice(0, 3);

  const summary = cells.reduce(
    (acc, c) => {
      acc.total += 1;
      acc[c.tone] = (acc[c.tone] || 0) + 1;
      return acc;
    },
    { total: 0 },
  );

  return { cells, movers, summary };
}
