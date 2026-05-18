/**
 * Promo conflict detector.
 *
 * Flags scenarios where two active promos on the same book + same market
 * have mutually-exclusive requirements that would prevent both from completing.
 *
 * Conflict classes:
 *   - "rollover_market_collision"  same market, both require the qualifier bet
 *     to count toward THEIR rollover (only one can claim it)
 *   - "stake_qualifier_collision"  both promos require first-bet on this book
 *     since last reset; only one promo wins the qualifier
 *   - "max_payout_overlap"         both promos cap payout on same selection
 *     so combined upside is artificially throttled
 *
 * Pure function; no I/O.
 */

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

function key(book, market) {
  return `${norm(book)}::${norm(market)}`;
}

function ofClass(p) {
  const reqs = Array.isArray(p.requirements) ? p.requirements.map(norm) : [];
  return {
    needsRollover: reqs.some((r) => r.includes("rollover") || r.includes("playthrough") || r.includes("wager")),
    needsFirstBet: reqs.some((r) => r.includes("first bet") || r.includes("first wager") || r.includes("qualifier")),
    hasMaxPayout: Number.isFinite(p.maxPayout) && p.maxPayout > 0,
  };
}

export function detectPromoConflicts(activePromos = []) {
  const list = Array.isArray(activePromos) ? activePromos : [];
  const buckets = new Map();
  for (const p of list) {
    if (!p || (!p.book && !p.market)) continue;
    const k = key(p.book, p.market);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(p);
  }

  const conflicts = [];
  for (const [k, group] of buckets) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const ca = ofClass(a);
        const cb = ofClass(b);

        if (ca.needsRollover && cb.needsRollover) {
          conflicts.push({
            class: "rollover_market_collision",
            severity: "high",
            promoIds: [a.id, b.id],
            book: a.book,
            market: a.market,
            message: `Both promos require this ${a.market} bet to count toward their rollover. Only one can.`,
          });
        }
        if (ca.needsFirstBet && cb.needsFirstBet) {
          conflicts.push({
            class: "stake_qualifier_collision",
            severity: "high",
            promoIds: [a.id, b.id],
            book: a.book,
            market: a.market,
            message: `Both promos need to be your first qualifying bet on ${a.book}. The second will be voided.`,
          });
        }
        if (ca.hasMaxPayout && cb.hasMaxPayout) {
          const cap = Math.min(a.maxPayout, b.maxPayout);
          conflicts.push({
            class: "max_payout_overlap",
            severity: "medium",
            promoIds: [a.id, b.id],
            book: a.book,
            market: a.market,
            message: `Stacked max-payout caps on same selection; combined upside capped at $${cap.toFixed(2)}.`,
          });
        }
      }
    }
    void k;
  }
  return conflicts;
}

export function hasBlockingConflict(promoId, conflicts = []) {
  return conflicts.some((c) => c.severity === "high" && Array.isArray(c.promoIds) && c.promoIds.includes(promoId));
}
