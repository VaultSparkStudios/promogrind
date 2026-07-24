const DAY_MS = 86_400_000;

export function promoObservationKey(promo = {}) {
  return String(promo.id || `${promo.book || "book"}-${promo.promo || "promo"}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizePromoObservations(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const normalized = {};
  for (const [key, item] of Object.entries(value)) {
    if (!item || typeof item !== "object") continue;
    if (!["confirmed", "rejected"].includes(item.status)) continue;
    const observedAt = new Date(item.observedAt);
    if (Number.isNaN(observedAt.getTime())) continue;
    normalized[key] = {
      status: item.status,
      observedAt: observedAt.toISOString(),
      market: item.market === "UK" ? "UK" : "US",
      source: "operator-local",
    };
  }
  return normalized;
}

export function recordPromoObservation(observations, promo, status, now = new Date()) {
  if (!["confirmed", "rejected"].includes(status)) throw new TypeError("status must be confirmed or rejected");
  const observedAt = new Date(now);
  if (Number.isNaN(observedAt.getTime())) throw new TypeError("now must be a valid date");
  return {
    ...normalizePromoObservations(observations),
    [promoObservationKey(promo)]: {
      status,
      observedAt: observedAt.toISOString(),
      market: promo.market === "UK" ? "UK" : "US",
      source: "operator-local",
    },
  };
}

export function getPromoFreshness(promo, observations, now = new Date()) {
  const item = normalizePromoObservations(observations)[promoObservationKey(promo)];
  if (!item) return { state: "unverified", label: "Historical pattern · verify", ageDays: null, needsVerification: true, observedAt: null };
  const ageDays = Math.max(0, Math.floor((new Date(now).getTime() - new Date(item.observedAt).getTime()) / DAY_MS));
  if (item.status === "rejected") return { state: "not-seen", label: `Not seen · ${ageDays}d ago`, ageDays, needsVerification: true, observedAt: item.observedAt };
  if (ageDays <= 7) return { state: "current", label: ageDays === 0 ? "Seen today" : `Seen ${ageDays}d ago`, ageDays, needsVerification: false, observedAt: item.observedAt };
  if (ageDays <= 30) return { state: "aging", label: `Seen ${ageDays}d ago · recheck`, ageDays, needsVerification: true, observedAt: item.observedAt };
  return { state: "stale", label: `Stale · ${ageDays}d ago`, ageDays, needsVerification: true, observedAt: item.observedAt };
}

export function derivePromoValueConfidence(history = [], freshness = { state: "unverified" }) {
  const count = Array.isArray(history) ? history.filter((item) => Number.isFinite(Number(item?.value))).length : 0;
  if (freshness.state === "current" && count >= 3) return { level: "high", label: "High · recent + 3 reports" };
  if (["current", "aging"].includes(freshness.state) && count >= 1) return { level: "medium", label: `Medium · ${count} report${count === 1 ? "" : "s"}` };
  return { level: "low", label: count ? `Low · ${count} older report${count === 1 ? "" : "s"}` : "Low · no realized values" };
}

export function rankPromoPatterns(rows, observations, now = new Date()) {
  const stateRank = { unverified: 0, stale: 1, aging: 2, current: 3, "not-seen": 4 };
  const gradeRank = { A: 0, B: 1, C: 2 };
  return [...rows].sort((a, b) => {
    const aFresh = getPromoFreshness(a, observations, now);
    const bFresh = getPromoFreshness(b, observations, now);
    return (stateRank[aFresh.state] ?? 9) - (stateRank[bFresh.state] ?? 9)
      || (gradeRank[a.grade] ?? 9) - (gradeRank[b.grade] ?? 9)
      || String(a.book).localeCompare(String(b.book));
  });
}
