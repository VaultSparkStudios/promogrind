import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, json } from "../_shared/http.ts";

function toD(v: string | number): number {
  const s = String(v).trim();
  if (!s) return 0;
  if (s.includes("/")) { const [n, d] = s.split("/").map(Number); return d ? n / d + 1 : 0; }
  const o = parseFloat(s);
  if (isNaN(o) || o === 0) return 0;
  if (s.startsWith("+") || o < 0) return o > 0 ? o / 100 + 1 : 100 / Math.abs(o) + 1;
  if (o >= 100) return o / 100 + 1;
  if (o >= 1.01) return o;
  return 0;
}
function toA(d: number): string { return d >= 2 ? "+" + Math.round((d - 1) * 100) : "" + Math.round(-100 / (d - 1)); }
function f(n: number, dp = 2): number { return parseFloat(n.toFixed(dp)); }

const CALCS: Record<string, (b: Record<string, unknown>) => unknown> = {
  "bonus-bet": (b) => {
    const sz = Number(b.bonusBetSize), bd = toD(String(b.bonusOdds ?? "")), hd = toD(String(b.hedgeOdds ?? ""));
    if (bd <= 1 || hd <= 1 || !sz) return null;
    const wp = sz * (bd - 1), hs = wp / hd, pBW = wp - hs, pHW = hs * (hd - 1), g = Math.min(pBW, pHW);
    return { hedgeStake: f(hs), profitIfBonusWins: f(pBW), profitIfHedgeWins: f(pHW), guaranteedProfit: f(g), conversionRate: f(g / sz * 100, 1) };
  },
  "arb": (b) => {
    const d1 = toD(String(b.odds1 ?? "")), d2 = toD(String(b.odds2 ?? "")), t = Number(b.totalStake);
    if (d1 <= 1 || d2 <= 1 || !t) return null;
    const m = 1 / d1 + 1 / d2, s1 = t * (1 / d1) / m, s2 = t * (1 / d2) / m, p = s1 * d1;
    return { isArb: m < 1, marginPct: f((1 - m) * 100), stake1: f(s1), stake2: f(s2), payout: f(p), profit: f(p - t), roi: f((p - t) / t * 100) };
  },
  "arb-2way": (b) => CALCS["arb"](b),
  "ev": (b) => {
    const yd = toD(String(b.yourOdds ?? "")), fd = toD(String(b.fairOdds ?? "")), s = Number(b.stake);
    if (yd <= 1 || fd <= 1 || !s) return null;
    const fp = 1 / fd, ev = (fp * (yd - 1) * s) - ((1 - fp) * s);
    return { ev: f(ev), roi: f(ev / s * 100, 1), fairProb: f(fp * 100, 1), edge: f((yd - fd) / fd * 100, 1), isPositiveEV: ev > 0 };
  },
  "profit-boost": (b) => {
    const s = Number(b.stake), d = toD(String(b.odds ?? "")), hd = toD(String(b.hedgeOdds ?? "")), bp = Number(b.boostPct) / 100, mx = Number(b.maxExtra) || Infinity;
    if (d <= 1 || hd <= 1 || !s || !bp) return null;
    const np = s * (d - 1), ba = Math.min(np * bp, mx), tp = s + np + ba, hs = tp / hd;
    const pBW = tp - s - hs, pHW = hs * hd - hs - s, g = Math.min(pBW, pHW);
    return { boostValue: f(ba), hedgeStake: f(hs), profitIfBoostedWins: f(pBW), profitIfHedgeWins: f(pHW), guaranteedProfit: f(g) };
  },
  "no-vig": (b) => {
    const d1 = toD(String(b.odds1 ?? "")), d2 = toD(String(b.odds2 ?? ""));
    if (d1 <= 1 || d2 <= 1) return null;
    const p1 = 1 / d1, p2 = 1 / d2, t = p1 + p2, f1 = p1 / t, f2 = p2 / t;
    return { vigPct: f((t - 1) * 100, 1), impliedProb1: f(p1 * 100, 1), impliedProb2: f(p2 * 100, 1), fairOdds1: toA(1 / f1), fairOdds2: toA(1 / f2) };
  },
  "kelly": (b) => {
    const p = Number(b.winProb) / 100, d = toD(String(b.odds ?? "")), br = Number(b.bankroll), fr = Number(b.fraction ?? 1);
    if (!p || p <= 0 || p >= 1 || d <= 1 || !br) return null;
    const q = 1 - p, bv = d - 1, k = (p * bv - q) / bv, ak = k * fr, bet = br * Math.max(0, ak);
    return { fullKellyPct: f(k * 100, 2), fractionalKellyPct: f(ak * 100, 2), recommendedBet: f(bet), ev: f((p * bv - q) * 100, 2), isPositive: k > 0 };
  },
};

const DOCS = {
  name: "PromoGrind Calculator API",
  version: "1.0",
  baseUrl: "https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/calc-api",
  attribution: "promogrind.bet — free sports betting calculator tools",
  endpoints: [
    { path: "/bonus-bet", params: { bonusBetSize: "number", bonusOdds: "string", hedgeOdds: "string" } },
    { path: "/arb-2way", params: { odds1: "string", odds2: "string", totalStake: "number" } },
    { path: "/arb", params: { odds1: "string", odds2: "string", totalStake: "number" }, aliasFor: "/arb-2way" },
    { path: "/ev", params: { yourOdds: "string", fairOdds: "string", stake: "number" } },
    { path: "/profit-boost", params: { stake: "number", odds: "string", boostPct: "number", maxExtra: "number", hedgeOdds: "string" } },
    { path: "/no-vig", params: { odds1: "string", odds2: "string" } },
    { path: "/kelly", params: { winProb: "number (0-100)", odds: "string", bankroll: "number", fraction: "number (optional, default 1)" } },
  ],
  oddsFormats: "American (+150, -110), Decimal (2.50, 1.91), Fractional (3/2)",
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const endpoint = segments[segments.length - 1];

  if (req.method === "GET" || endpoint === "calc-api" || !endpoint) {
    return json(req, DOCS);
  }

  if (req.method !== "POST") {
    return json(req, { error: "POST required" }, 405);
  }

  const calc = CALCS[endpoint];
  if (!calc) {
    return json(req, { error: `Unknown endpoint /${endpoint}. GET /calc-api for docs.` }, 404);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }

  const result = calc(body);
  if (!result) {
    return json(req, { error: "Invalid inputs — check parameter types and values" }, 400);
  }

  return json(req, { ok: true, result, attribution: "PromoGrind Calculator API — promogrind.bet" });
});
