/**
 * Operator briefing share card.
 *
 * Builds a public-safe, zero-PII data payload for a 1200x630 share card.
 * Rendering to canvas is split out so the data model is testable headlessly.
 *
 * PII allow-list:
 *   - discipline score (integer 0-100)
 *   - top lane (string from a fixed enum)
 *   - 14-day delta direction (string: up | down | flat)
 *   - generated-at date (YYYY-MM-DD)
 *
 * Explicitly DENIED:
 *   - email, name, bankroll, dollar amounts, bet selections, books, geos
 */

const PII_DENY = new Set([
  "email",
  "name",
  "displayName",
  "bankroll",
  "bookId",
  "book",
  "userId",
  "id",
  "amount",
  "stake",
  "profit",
  "geo",
  "ip",
  "address",
  "phone",
]);

const LANE_LABELS = {
  bonus_bet: "Bonus Bet",
  profit_boost: "Profit Boost",
  safety_net: "Safety Net",
  deposit_match: "Deposit Match",
  insurance: "Insurance",
  parlay: "Parlay",
  arb: "Arbitrage",
  other: "Other",
};

function clampInt(v, min, max) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function deltaDirection(delta) {
  const n = Number(delta);
  if (!Number.isFinite(n) || n === 0) return "flat";
  return n > 0 ? "up" : "down";
}

/**
 * Build the share card data model (no rendering yet).
 * Returns a plain object you can pass to renderShareCardCanvas().
 */
export function buildShareCardData({ disciplineScore, topLane, edgeDelta14d, headline, now } = {}) {
  const ts = Number.isFinite(now) ? now : (now instanceof Date ? now.getTime() : Date.now());
  const dateStr = new Date(ts).toISOString().slice(0, 10);
  return {
    schemaVersion: 1,
    generatedAt: dateStr,
    disciplineScore: clampInt(disciplineScore ?? 0, 0, 100),
    topLane: LANE_LABELS[topLane] || LANE_LABELS.other,
    edgeDirection: deltaDirection(edgeDelta14d),
    headline: typeof headline === "string" ? headline.slice(0, 90) : "PromoGrind operator briefing",
    branding: { wordmark: "PromoGrind", url: "promogrind.bet" },
  };
}

/**
 * Audit a share card data model and throw if it contains PII-shaped fields.
 * Useful as a runtime safety net before posting to clipboard / share sheet.
 */
export function assertShareCardPiiSafe(data) {
  if (!data || typeof data !== "object") throw new Error("share card data missing");
  for (const key of Object.keys(data)) {
    if (PII_DENY.has(key)) throw new Error(`share card contains PII field: ${key}`);
  }
  // shallow scan of branding object — must not contain PII either
  if (data.branding) {
    for (const key of Object.keys(data.branding)) {
      if (PII_DENY.has(key)) throw new Error(`share card branding contains PII: ${key}`);
    }
  }
  return true;
}

/**
 * Render the share card to a canvas. Returns the canvas element so the caller
 * can call .toBlob(...) or .toDataURL(...). Pure DOM API — no React.
 * Safe to call in a browser; in tests we just verify the data model.
 */
export function renderShareCardCanvas(data, canvasFactory) {
  assertShareCardPiiSafe(data);
  const factory = canvasFactory || (typeof document !== "undefined" ? () => document.createElement("canvas") : null);
  if (!factory) throw new Error("renderShareCardCanvas requires a canvas factory in non-DOM environments");
  const canvas = factory();
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext && canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#0b0f17";
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 72px system-ui, -apple-system, Segoe UI";
  ctx.fillText(`Discipline ${data.disciplineScore}`, 60, 200);
  ctx.font = "36px system-ui";
  ctx.fillText(`Top lane: ${data.topLane}`, 60, 280);
  ctx.fillText(`Edge ${data.edgeDirection}`, 60, 340);
  ctx.font = "28px system-ui";
  ctx.fillText(data.headline, 60, 440);
  ctx.font = "24px system-ui";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`${data.branding.wordmark} · ${data.branding.url}`, 60, 580);
  return canvas;
}
