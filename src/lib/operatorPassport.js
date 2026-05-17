import { computeDisciplineScore } from "./discipline.js";
import { computeMastery } from "./mastery.js";

const PASSPORT_VERSION = 1;
const PASSPORT_KEY_ID = "pg-passport-v1";

function b64urlEncode(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function importKey(secret) {
  const enc = new TextEncoder();
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto unavailable");
  return subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signString(secret, data) {
  const key = await importKey(secret);
  const enc = new TextEncoder();
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

async function verifyString(secret, data, signature) {
  const key = await importKey(secret);
  const enc = new TextEncoder();
  const sig = b64urlDecode(signature);
  return globalThis.crypto.subtle.verify("HMAC", key, sig, enc.encode(data));
}

function pickSafeMastery(mastery) {
  if (!mastery) return null;
  const perType = Object.entries(mastery.perType || {})
    .filter(([, d]) => d.xp > 0)
    .reduce((acc, [k, d]) => {
      acc[k] = { level: d.level, xp: Math.round(d.xp) };
      return acc;
    }, {});
  return {
    globalRank: mastery.globalRank ?? null,
    perType,
  };
}

export function buildPassportPayload(appData = {}, opts = {}) {
  const discipline = computeDisciplineScore(appData);
  const mastery = computeMastery(appData);
  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const settled = feedback.filter((e) => String(e.status || "").toLowerCase() === "settled").length;
  const closed = feedback.filter((e) => {
    const s = String(e.status || "").toLowerCase();
    return s === "settled" || s === "skipped";
  }).length;
  const settledLoopRatio = feedback.length ? closed / feedback.length : 0;

  return {
    v: PASSPORT_VERSION,
    issuedAt: opts.now instanceof Date ? opts.now.toISOString() : new Date(Number.isFinite(opts.now) ? opts.now : Date.now()).toISOString(),
    handle: typeof opts.handle === "string" ? opts.handle.slice(0, 32) : null,
    discipline: {
      score: discipline.score,
      band: discipline.band,
      feedbackCoverage: discipline.feedbackCoverage,
    },
    mastery: pickSafeMastery(mastery),
    operator: {
      settledLoopRatio: Math.round(settledLoopRatio * 100),
      settledCount: settled,
      closedCount: closed,
    },
  };
}

export async function exportPassport(appData = {}, opts = {}) {
  const secret = opts.secret || PASSPORT_KEY_ID;
  const payload = buildPassportPayload(appData, opts);
  const json = JSON.stringify(payload);
  const payloadB64 = b64urlEncode(new TextEncoder().encode(json));
  const sig = await signString(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifyPassport(token, opts = {}) {
  if (typeof token !== "string" || !token.includes(".")) return { ok: false, reason: "format" };
  const [payloadB64, sig] = token.split(".");
  const secret = opts.secret || PASSPORT_KEY_ID;
  const valid = await verifyString(secret, payloadB64, sig);
  if (!valid) return { ok: false, reason: "signature" };
  try {
    const json = new TextDecoder().decode(b64urlDecode(payloadB64));
    return { ok: true, payload: JSON.parse(json) };
  } catch {
    return { ok: false, reason: "decode" };
  }
}
