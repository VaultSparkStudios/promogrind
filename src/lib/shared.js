/**
 * PromoGrind — Shared Constants & Math Engine
 *
 * Single source of truth for:
 *  - Color palette (K)
 *  - Style primitives (S)
 *  - Typography (font, fontD)
 *  - Odds converters (toD, toA, toP, toF)
 *  - Calculator math (calcBonus, calcArb2, …)
 *  - Utility functions (f, downloadFile, calcROI)
 *
 * Import in App.jsx and extracted components to avoid duplication.
 */

// ─── Odds Converters ──────────────────────────────────────────────────────────

/** Any odds format → decimal */
export const toD = (v) => {
  const s = String(v).trim();
  if (!s) return 0;
  if (s.includes("/")) {
    const [n, d] = s.split("/").map(Number);
    return d ? n / d + 1 : 0;
  }
  const o = parseFloat(s);
  if (isNaN(o) || o === 0) return 0;
  if (s.startsWith("+") || o < 0) return o > 0 ? o / 100 + 1 : 100 / Math.abs(o) + 1;
  if (o >= 100) return o / 100 + 1;
  if (o >= 1.01) return o;
  return 0;
};

/** Decimal → American */
export const toA = (d) => {
  if (d >= 2) return "+" + Math.round((d - 1) * 100);
  if (d > 1) return "" + Math.round(-100 / (d - 1));
  return "0";
};

/** Decimal → implied probability % */
export const toP = (d) => (d > 0 ? (1 / d) * 100 : 0);

/** Decimal → fractional string */
export const toF = (d) => {
  if (d <= 1) return "0/1";
  const n = Math.round((d - 1) * 100),
    dn = 100,
    g = gcd(n, dn);
  return `${n / g}/${dn / g}`;
};

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

// ─── Formatters & Utilities ───────────────────────────────────────────────────

/** Format number to fixed decimal places */
export const f = (n, dp = 2) =>
  (typeof n === "number" ? n : parseFloat(n || 0)).toFixed(dp);

/** ROI percentage (profit / wagered) */
export const calcROI = (profit, wagered) =>
  wagered > 0 ? (profit / wagered) * 100 : null;

/** Trigger a file download */
export const downloadFile = (content, filename, mimeType) => {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([content], { type: mimeType })),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
};

/** Best odds string from an array */
export const bestOdds = (entries) =>
  entries.reduce((b, e) => (toD(e) > toD(b) ? e : b), entries[0] || "0");

// ─── Calculator Math ──────────────────────────────────────────────────────────

/** Bonus bet (bonus-bet / free-bet) hedge */
export const calcBonus = (sz, bO, hO) => {
  const bd = toD(bO), hd = toD(hO);
  if (bd <= 1 || hd <= 1 || !sz) return null;
  const wp = sz * (bd - 1), hs = wp / hd, pBW = wp - hs, pHW = hs * (hd - 1), g = Math.min(pBW, pHW);
  return { hs: f(hs), pBW: f(pBW), pHW: f(pHW), g: f(g), r: f((g / sz) * 100, 1) };
};

/** First-bet insurance hedge */
export const calcFirst = (s, o, hO) => {
  const d = toD(o), hd = toD(hO);
  if (d <= 1 || hd <= 1 || !s) return null;
  const p = s * d, hs = p / hd, pOW = p - s - hs, pHW = hs * hd - hs - s;
  return { hs: f(hs), pOW: f(pOW), pHW: f(pHW), g: f(Math.min(pOW, pHW)) };
};

/** Profit boost / odds boost */
export const calcBoost = (s, o, bp, mx, hO) => {
  const d = toD(o), hd = toD(hO), b = parseFloat(bp) / 100;
  if (d <= 1 || hd <= 1 || !s || !b) return null;
  const np = s * (d - 1), ba = Math.min(np * b, parseFloat(mx) || Infinity),
    tp = s + np + ba, ed = tp / s, hs = tp / hd,
    pBW = tp - s - hs, pHW = hs * hd - hs - s, g = Math.min(pBW, pHW);
  return { eo: toA(ed), ed2: f(ed, 4), bv: f(ba), hs: f(hs), pBW: f(pBW), pHW: f(pHW), g: f(g), tp: f(tp) };
};

/** 2-way arbitrage */
export const calcArb2 = (o1, o2, t) => {
  const d1 = toD(o1), d2 = toD(o2);
  if (d1 <= 1 || d2 <= 1 || !t) return null;
  const m = 1 / d1 + 1 / d2, s1 = (t * (1 / d1)) / m, s2 = (t * (1 / d2)) / m, p = s1 * d1;
  return { ok: m < 1, mg: f((1 - m) * 100), s1: f(s1), s2: f(s2), p: f(p), pr: f(p - t), roi: f(((p - t) / t) * 100) };
};

/** 3-way arbitrage */
export const calcArb3 = (o1, o2, o3, t) => {
  const d1 = toD(o1), d2 = toD(o2), d3 = toD(o3);
  if (d1 <= 1 || d2 <= 1 || d3 <= 1 || !t) return null;
  const m = 1 / d1 + 1 / d2 + 1 / d3,
    s1 = (t * (1 / d1)) / m, s2 = (t * (1 / d2)) / m, s3 = (t * (1 / d3)) / m, p = s1 * d1;
  return { ok: m < 1, mg: f((1 - m) * 100), s1: f(s1), s2: f(s2), s3: f(s3), pr: f(p - t), roi: f(((p - t) / t) * 100) };
};

/** No-vig fair odds (2-way) */
export const calcNV = (o1, o2) => {
  const d1 = toD(o1), d2 = toD(o2);
  if (d1 <= 1 || d2 <= 1) return null;
  const p1 = 1 / d1, p2 = 1 / d2, t = p1 + p2, v = (t - 1) * 100,
    f1 = p1 / t, f2 = p2 / t;
  return { v: f(v, 1), ip1: f(p1 * 100, 1), ip2: f(p2 * 100, 1), fp1: f(f1 * 100, 1), fp2: f(f2 * 100, 1), fo1: toA(1 / f1), fo2: toA(1 / f2) };
};

/** No-vig fair odds (3-way) */
export const calcNV3 = (o1, o2, o3) => {
  const d1 = toD(o1), d2 = toD(o2), d3 = toD(o3);
  if (d1 <= 1 || d2 <= 1 || d3 <= 1) return null;
  const p1 = 1 / d1, p2 = 1 / d2, p3 = 1 / d3, t = p1 + p2 + p3, v = (t - 1) * 100,
    f1 = p1 / t, f2 = p2 / t, f3 = p3 / t;
  return { v: f(v, 1), ip1: f(p1 * 100, 1), ip2: f(p2 * 100, 1), ip3: f(p3 * 100, 1), fp1: f(f1 * 100, 1), fp2: f(f2 * 100, 1), fp3: f(f3 * 100, 1), fo1: toA(1 / f1), fo2: toA(1 / f2), fo3: toA(1 / f3) };
};

/** Expected value */
export const calcEV = (yo, fo, s) => {
  const yd = toD(yo), fd = toD(fo);
  if (yd <= 1 || fd <= 1 || !s) return null;
  const fp = 1 / fd, ev = fp * (yd - 1) * s - (1 - fp) * s;
  return { ev: f(ev), roi: f((ev / s) * 100, 1), fp: f(fp * 100, 1), edge: f(((yd - fd) / fd) * 100, 1), ok: ev > 0 };
};

/** Parlay hedge */
export const calcPH = (pp, hO, os) => {
  const hd = toD(hO);
  if (hd <= 1 || !pp || !os) return null;
  const hs = pp / hd, pPW = pp - os - hs, pHW = hs * hd - hs - os;
  return { hs: f(hs), pPW: f(pPW), pHW: f(pHW), g: f(Math.min(pPW, pHW)) };
};

/** Middle calculator */
export const calcMid = (o1, o2, l1, l2, s) => {
  const d1 = toD(o1), d2 = toD(o2);
  if (d1 <= 1 || d2 <= 1 || !s) return null;
  const s2 = (s * d1) / d2, ts = s + s2,
    wc = Math.max(s * d1, s2 * d2) - ts, mw = s * d1 + s2 * d2 - ts,
    w = Math.abs(parseFloat(l1) - parseFloat(l2));
  return { s2: f(s2), ts: f(ts), wc: f(wc), mw: f(mw), w: f(w, 1) };
};

/** Rollover cost calculator */
export const calcRO = (b, m, v) => {
  const bn = parseFloat(b), mn = parseFloat(m), vn = parseFloat(v) / 100;
  if (!bn || !mn) return null;
  const tw = bn * mn, ec = tw * (vn || 0.045), nv = bn - ec;
  return { tw: f(tw), ec: f(ec), nv: f(nv), nb: Math.ceil(tw / 50), ok: nv > 0 };
};

/** Deposit match optimizer */
export const calcDeposit = (dep, pct, mx, ro, vg) => {
  const d = parseFloat(dep), p = parseFloat(pct) / 100, m = parseFloat(mx),
    r = parseFloat(ro), v = parseFloat(vg) / 100;
  if (!d || !p || !m || !r) return null;
  const bonus = Math.min(d * p, m), tw = bonus * r, cost = tw * v,
    net = bonus - cost, minDep = m / p;
  return { bonus: f(bonus), tw: f(tw), cost: f(cost), net: f(net), ok: net > 0, minDep: f(minDep, 0), roi: f((net / d) * 100, 1), fill: d >= minDep };
};

/** Kelly criterion bet sizing */
export const calcKelly = (wp, odds, br, frac) => {
  const p = parseFloat(wp) / 100, d = toD(odds), b = d - 1, fr = parseFloat(frac) || 1;
  if (!p || p <= 0 || p >= 1 || d <= 1 || !br) return null;
  const q = 1 - p, k = (p * b - q) / b, ak = k * fr, bet = parseFloat(br) * Math.max(0, ak);
  return { k: f(k * 100, 2), ak: f(ak * 100, 2), bet: f(bet), ev: f((p * b - q) * 100, 2), ok: k > 0 };
};

/** Insurance cost/benefit */
export const calcInsurance = (stake, insPct, insMax, conv) => {
  const s = parseFloat(stake), ip = parseFloat(insPct) / 100,
    im = parseFloat(insMax) || Infinity, cv = (parseFloat(conv) || 70) / 100;
  if (!s || !ip) return null;
  const insAmt = Math.min(s * ip, im), insVal = insAmt * cv, netCost = s - insVal;
  return { insAmt: f(insAmt), insVal: f(insVal), netCost: f(netCost), effPct: f((insVal / s) * 100, 1), ok: insVal > 0 };
};

/** Teaser calculator */
export const calcTeaser = (legs, tOdds, winPct) => {
  const n = parseInt(legs), d = toD(tOdds), p = parseFloat(winPct) / 100;
  if (!n || d <= 1 || !p || p <= 0 || p >= 1) return null;
  const payout = d - 1, combProb = Math.pow(p, n),
    ev = combProb * payout - (1 - combProb), beProb = Math.pow(1 / d, 1 / n);
  return { ev: f(ev * 100, 2), combProb: f(combProb * 100, 1), beProb: f(beProb * 100, 1), ok: ev > 0, payout: f(payout, 3) };
};

/** Round robin */
export const calcRR = (pickOdds, size, stakeEach) => {
  const odds = pickOdds.map(toD).filter((d) => d > 1);
  const n = odds.length, sz = parseInt(size), s = parseFloat(stakeEach);
  if (n < 2 || sz < 2 || sz > n || !s) return null;
  const combos = [];
  const go = (start, cur) => {
    if (cur.length === sz) { combos.push([...cur]); return; }
    for (let i = start; i <= n - (sz - cur.length); i++) go(i + 1, [...cur, odds[i]]);
  };
  go(0, []);
  const nCombos = combos.length, totalStake = nCombos * s;
  const payouts = combos.map((c) => c.reduce((p, d) => p * d, s));
  const avgPayout = payouts.reduce((a, b) => a + b, 0) / nCombos;
  return { nCombos, totalStake: f(totalStake), avgPayout: f(avgPayout), minPayout: f(Math.min(...payouts)), maxPayout: f(Math.max(...payouts)), ev: f(((avgPayout - s) / s) * 100, 1) };
};

/** Parlay combined odds + EV */
export const calcParlay = (oddsArr, stake) => {
  const odds = oddsArr.map(toD).filter((d) => d > 1);
  if (odds.length < 2 || !stake) return null;
  const combined = odds.reduce((p, d) => p * d, 1), s = parseFloat(stake),
    payout = s * combined, prob = odds.reduce((p, d) => p * (1 / d), 1),
    ev = prob * (combined - 1) * s - (1 - prob) * s;
  return { combined: f(combined, 3), combA: toA(combined), payout: f(payout), profit: f(payout - s), prob: f(prob * 100, 2), ev: f(ev, 2), ok: ev > 0, impSum: f(odds.reduce((s2, d) => s2 + 1 / d, 0) * 100, 1) };
};

/** SGP (same-game parlay) discount analysis */
export const calcSGP = (oddsArr, sgpOdds, stake) => {
  const odds = oddsArr.map(toD).filter((d) => d > 1);
  if (odds.length < 2) return null;
  const s = parseFloat(stake) || 100, indCombined = odds.reduce((p, d) => p * d, 1),
    sgpD = toD(sgpOdds);
  if (sgpD <= 1) return null;
  const prob = odds.reduce((p, d) => p * (1 / d), 1),
    discount = (1 - sgpD / indCombined) * 100,
    ev = prob * (sgpD - 1) * s - (1 - prob) * s;
  return { indOdds: toA(indCombined), indD: f(indCombined, 3), sgpD: f(sgpD, 3), discount: f(discount, 1), ev: f(ev, 2), prob: f(prob * 100, 2), ok: ev > 0, fair: f((indCombined - 1) * s + s) };
};

/** Hold calculator (sportsbook margin) */
export const calcHold = (o1, o2) => {
  const d1 = toD(o1), d2 = toD(o2);
  if (d1 <= 1 || d2 <= 1) return null;
  const ip1 = 1 / d1, ip2 = 1 / d2, hold = (ip1 + ip2 - 1) * 100;
  return { hold: f(hold, 2), ip1: f(ip1 * 100, 1), ip2: f(ip2 * 100, 1), ok: hold < 5 };
};

// ─── Confidence / Sensitivity helpers ────────────────────────────────────────
// Each returns a band showing how much the guaranteed profit moves when the
// hedge line shifts ±10% in decimal odds terms. Output is for the Confidence
// layer chips next to result rows; consumers render `${bandLow} → ${bandHigh}`
// and optionally show `deltaPer10pct` for a single directional read.

const perturb = (decimalOdds, pct) => {
  const d = toD(decimalOdds);
  if (d <= 1) return null;
  return Math.max(1.01, d * (1 + pct));
};

function sensitivityBand(baseline, low, high) {
  if (baseline == null || low == null || high == null) return null;
  const base = parseFloat(baseline);
  if (!Number.isFinite(base)) return null;
  const lo = parseFloat(low), hi = parseFloat(high);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  const bandLow = Math.min(lo, hi);
  const bandHigh = Math.max(lo, hi);
  return {
    base: f(base),
    bandLow: f(bandLow),
    bandHigh: f(bandHigh),
    deltaPer10pct: f(Math.max(Math.abs(base - bandLow), Math.abs(bandHigh - base))),
    stable: Math.abs(bandHigh - bandLow) < 0.5,
  };
}

/** Sensitivity for the Bonus Bet hedge (varies hedge odds ±10%). */
export const sensitivityBonus = (sz, bO, hO) => {
  const base = calcBonus(sz, bO, hO);
  if (!base) return null;
  const lo = calcBonus(sz, bO, perturb(hO, -0.1));
  const hi = calcBonus(sz, bO, perturb(hO,  0.1));
  return sensitivityBand(base.g, lo?.g, hi?.g);
};

/** Sensitivity for the Profit Boost hedge (varies hedge odds ±10%). */
export const sensitivityBoost = (s, o, bp, mx, hO) => {
  const base = calcBoost(s, o, bp, mx, hO);
  if (!base) return null;
  const lo = calcBoost(s, o, bp, mx, perturb(hO, -0.1));
  const hi = calcBoost(s, o, bp, mx, perturb(hO,  0.1));
  return sensitivityBand(base.g, lo?.g, hi?.g);
};

/** Sensitivity for the First-Bet Safety-Net hedge (varies hedge odds ±10%). */
export const sensitivityFirst = (s, o, hO) => {
  const base = calcFirst(s, o, hO);
  if (!base) return null;
  const lo = calcFirst(s, o, perturb(hO, -0.1));
  const hi = calcFirst(s, o, perturb(hO,  0.1));
  return sensitivityBand(base.g, lo?.g, hi?.g);
};

// ─── Color Palette ────────────────────────────────────────────────────────────

export const KD = {
  bg: "#0a0e17", s1: "#0f1520", s2: "#161d2a", s3: "#1c2536",
  bd: "#1e293b", bd2: "#334155",
  ac: "#60a5fa", gn: "#4ade80", rd: "#f87171", yl: "#fbbf24",
  pp: "#c084fc", tx: "#e2e8f0", dm: "#94a3b8", mt: "#7a8fa8", wh: "#ffffff",
};
export const KL = {
  bg: "#f8fafc", s1: "#ffffff", s2: "#f1f5f9", s3: "#e2e8f0",
  bd: "#cbd5e1", bd2: "#94a3b8",
  ac: "#3b82f6", gn: "#22c55e", rd: "#ef4444", yl: "#d97706",
  pp: "#a855f7", tx: "#1e293b", dm: "#475569", mt: "#64748b", wh: "#000000",
};
export const K = { ...KD };

// ─── Typography ───────────────────────────────────────────────────────────────

export const font = "'JetBrains Mono','SF Mono','Fira Code',monospace";
export const fontD = "'Space Grotesk','SF Pro Display',sans-serif";

// ─── Style Primitives ─────────────────────────────────────────────────────────

export const S = {
  get card() { return { background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 10, padding: 20, marginBottom: 16 }; },
  get label() { return { display: "block", fontSize: 11, color: K.mt, marginBottom: 5, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }; },
  get input() { return { width: "100%", padding: "9px 11px", background: K.s2, border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.tx, fontFamily: font, fontSize: 14, outline: "none", boxSizing: "border-box" }; },
  row: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 },
  col: { flex: 1, minWidth: 120 },
  res: (ok) => ({ background: ok ? `${K.gn}08` : `${K.rd}08`, border: `1px solid ${ok ? K.gn : K.rd}25`, borderRadius: 8, padding: 16, marginTop: 12 }),
  big: (c) => ({ fontSize: 28, fontWeight: 700, color: c || K.gn, fontFamily: fontD, lineHeight: 1 }),
  tag: (c) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 50, fontSize: 10, fontWeight: 600, background: `${c}15`, color: c }),
  get rr() { return { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${K.bd}` }; },
  note: (c) => ({ marginTop: 10, padding: 10, background: `${c || K.yl}0d`, borderRadius: 6, fontSize: 13, color: c || K.yl, lineHeight: 1.6 }),
  get help() { return { fontSize: 13, lineHeight: 1.75, color: K.dm, marginTop: 12 }; },
  get helpH() { return { fontSize: 15, fontWeight: 600, color: K.tx, margin: "16px 0 6px", fontFamily: fontD }; },
  get helpTerm() { return { color: K.ac, fontWeight: 600 }; },
  // S.meter renders JSX — use the meterEl() helper below (or keep in App.jsx)
};
