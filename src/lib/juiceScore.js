// Juice Score: 0-100 composite quality rating for a promo play

export function juiceFromConversion(rate) {
  // rate = conversion % (0-100). BonusBet, FirstBet
  const r = parseFloat(rate) || 0;
  if (r >= 75) return Math.min(100, Math.round(85 + (r - 75)));
  if (r >= 65) return Math.round(70 + (r - 65) * 1.5);
  if (r >= 50) return Math.round(50 + (r - 50));
  return Math.max(5, Math.round(r * 0.8));
}

export function juiceFromROI(roi) {
  // roi = % return. Arb, DepositMatch
  const r = parseFloat(roi) || 0;
  if (r >= 5) return Math.min(100, Math.round(80 + (r - 5) * 4));
  if (r >= 2) return Math.round(60 + (r - 2) * 6.7);
  if (r >= 0.5) return Math.round(40 + (r - 0.5) * 13.3);
  return Math.max(5, Math.round(r * 20));
}

export function juiceFromEdge(edge) {
  // edge = % over no-vig line. PlusEV
  const e = parseFloat(edge) || 0;
  if (e >= 6) return Math.min(100, Math.round(82 + (e - 6) * 3));
  if (e >= 3) return Math.round(65 + (e - 3) * 5.7);
  if (e >= 1) return Math.round(45 + (e - 1) * 10);
  return Math.max(5, Math.round(e * 30));
}

export function juiceFromEVPct(evPct) {
  // evPct = EV as %. TeaserCalc, SGPEstimator
  const e = parseFloat(evPct) || 0;
  if (e >= 5) return Math.min(100, Math.round(80 + (e - 5) * 4));
  if (e >= 2) return Math.round(62 + (e - 2) * 6);
  if (e >= 0) return Math.round(45 + e * 8.5);
  return Math.max(5, Math.round(45 + e * 4));
}

export function juiceLabel(score) {
  if (score >= 80) return "EXCELLENT";
  if (score >= 60) return "GOOD";
  if (score >= 40) return "FAIR";
  return "POOR";
}

export function juiceColor(score) {
  if (score >= 80) return "#4ade80";
  if (score >= 60) return "#fbbf24";
  if (score >= 40) return "#f97316";
  return "#f87171";
}
