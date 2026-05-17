const LANE_VELOCITY = {
  bonus_bet: 0.6,
  profit_boost: 1.1,
  safety_net: 0.4,
  deposit_match: 0.2,
  insurance: 0.5,
  parlay: 0.9,
  arb: 1.4,
  other: 0.7,
};

function parseExpiry(value, now) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  if (ms < now) return null;
  return ms;
}

export function getLaneVelocity(promoType) {
  return LANE_VELOCITY[promoType] ?? LANE_VELOCITY.other;
}

export function buildDecayCurve(promo = {}, opts = {}) {
  const now = opts.now instanceof Date ? opts.now.getTime() : Number.isFinite(opts.now) ? opts.now : Date.now();
  const ticks = Number.isFinite(opts.ticks) ? Math.max(2, Math.min(20, opts.ticks)) : 5;
  const expiresMs = parseExpiry(promo.expires, now);
  const horizonMs = expiresMs ? expiresMs - now : 24 * 3600 * 1000;
  const velocity = getLaneVelocity(promo.promoType);
  const start = 1.0;
  const end = expiresMs ? 0 : Math.max(0, start - velocity * 0.3);
  const samples = [];
  for (let i = 0; i < ticks; i++) {
    const t = i / (ticks - 1);
    const decay = expiresMs
      ? start * (1 - t) + end * t
      : Math.max(0, start - velocity * t);
    samples.push(Math.max(0, Math.min(1, decay)));
  }
  const horizonHours = Math.max(0, Math.round(horizonMs / 3600000));
  return {
    samples,
    velocity,
    horizonMs,
    horizonHours,
    expiresMs,
    decayPerHour: expiresMs ? start / Math.max(1, horizonHours) : velocity / 24,
  };
}

export function renderSparkline(samples) {
  const blocks = "▁▂▃▄▅▆▇█";
  return samples
    .map((v) => blocks[Math.min(blocks.length - 1, Math.round(v * (blocks.length - 1)))])
    .join("");
}
