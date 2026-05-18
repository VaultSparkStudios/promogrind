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

/**
 * Compute the personal execution deadline for a promo given a user's edge floor.
 *
 * Models edge as decaying linearly from `start=1.0` at velocity `v` per 24h.
 * Returns the wall-clock time at which projected edge crosses `userFloor`,
 * clamped between now and promo expiry. Returns null if edge is already
 * below floor at `now`, or { stable: true } if velocity is zero / floor never
 * crossed within horizon.
 *
 * userFloor is expressed as a fraction 0..1 (e.g. 0.12 = stop executing when
 * edge drops to 12% of original).
 */
export function computeExecutionDeadline(promo = {}, userFloor = 0.5, opts = {}) {
  const now = opts.now instanceof Date ? opts.now.getTime() : Number.isFinite(opts.now) ? opts.now : Date.now();
  const floor = Math.max(0, Math.min(1, Number.isFinite(userFloor) ? userFloor : 0.5));
  const curve = buildDecayCurve(promo, { now, ticks: 5 });
  const { velocity, horizonHours, expiresMs } = curve;

  if (velocity <= 0) return { deadlineMs: null, hoursRemaining: Infinity, stable: true, floor };

  if (expiresMs) {
    // Linear from 1.0 at now to 0 at expiry over horizonHours.
    if (floor <= 0) return { deadlineMs: expiresMs, hoursRemaining: horizonHours, floor };
    const fractionToFloor = 1 - floor;
    const hoursToFloor = horizonHours * fractionToFloor;
    const deadlineMs = now + hoursToFloor * 3600000;
    return {
      deadlineMs: Math.min(deadlineMs, expiresMs),
      hoursRemaining: Math.max(0, Math.round(hoursToFloor * 10) / 10),
      floor,
    };
  }

  // No fixed expiry — use velocity-per-day model: edge = 1 - velocity*(t/24)
  // Reaches floor when t = 24 * (1 - floor) / velocity
  const hoursToFloor = (24 * (1 - floor)) / velocity;
  if (!Number.isFinite(hoursToFloor) || hoursToFloor <= 0) {
    return { deadlineMs: null, hoursRemaining: 0, expired: true, floor };
  }
  return {
    deadlineMs: now + hoursToFloor * 3600000,
    hoursRemaining: Math.round(hoursToFloor * 10) / 10,
    floor,
  };
}

export function renderSparkline(samples) {
  const blocks = "▁▂▃▄▅▆▇█";
  return samples
    .map((v) => blocks[Math.min(blocks.length - 1, Math.round(v * (blocks.length - 1)))])
    .join("");
}
