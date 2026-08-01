import { computeDisciplineScore } from "./discipline.js";
import { computeMastery, PROMO_TYPE_KEYS } from "./mastery.js";

const PASSPORT_VERSION = 3;
const PASSPORT_DOMAIN = "promogrind-self-attested-passport-v3:";
const DISCIPLINE_BANDS = new Set(["Elite", "Controlled", "Building", "Loose"]);
const MASTERY_LEVELS = new Set(["Analyst", "Reviewer", "Calibrator", "Steward"]);
const REVIEW_DEPTH_BANDS = new Set(["Observer", "Reviewer", "Calibrator", "Steward", "Evidence Lead"]);

function b64urlEncode(bytes) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value || "")) throw new Error("invalid base64url");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function checksum(payloadB64) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto unavailable");
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(`${PASSPORT_DOMAIN}${payloadB64}`));
  return b64urlEncode(new Uint8Array(digest));
}

function boundedNumber(value, min, max, integer = false) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return integer ? Math.round(number) : number;
}

function normalizePassportPayload(raw) {
  if (!raw || raw.v !== PASSPORT_VERSION) return null;
  const issuedAt = new Date(raw.issuedAt);
  if (!Number.isFinite(issuedAt.getTime())) return null;
  const handle = raw.handle == null ? null : String(raw.handle).trim().slice(0, 32);
  const discipline = raw.discipline || {};
  const operator = raw.operator || {};
  const mastery = raw.mastery || {};
  const score = boundedNumber(discipline.score, 0, 100, true);
  const feedbackCoverage = boundedNumber(discipline.feedbackCoverage, 0, 100, true);
  const settledLoopRatio = boundedNumber(operator.settledLoopRatio, 0, 100, true);
  const settledCount = boundedNumber(operator.settledCount, 0, 1_000_000, true);
  const closedCount = boundedNumber(operator.closedCount, 0, 1_000_000, true);
  if ([score, feedbackCoverage, settledLoopRatio, settledCount, closedCount].some((value) => value === null)) return null;
  if (!DISCIPLINE_BANDS.has(discipline.band) || closedCount < settledCount) return null;
  if (!REVIEW_DEPTH_BANDS.has(mastery.reviewDepthBand)) return null;

  const perType = {};
  for (const [key, value] of Object.entries(mastery.perType || {})) {
    if (!PROMO_TYPE_KEYS.includes(key) || !value || !MASTERY_LEVELS.has(value.level)) return null;
    const reviews = boundedNumber(value.reviews, 0, 1_000_000, true);
    if (reviews === null) return null;
    perType[key] = { level: value.level, reviews };
  }

  return {
    v: PASSPORT_VERSION,
    attestation: "self-attested",
    integrity: "sha256-checksum",
    issuedAt: issuedAt.toISOString(),
    handle,
    discipline: { score, band: discipline.band, feedbackCoverage },
    mastery: { reviewDepthBand: mastery.reviewDepthBand, perType },
    operator: { settledLoopRatio, settledCount, closedCount },
  };
}

function pickSafeMastery(mastery) {
  const perType = Object.entries(mastery?.perType || {})
    .filter(([key, data]) => PROMO_TYPE_KEYS.includes(key) && data.reviews > 0)
    .reduce((result, [key, data]) => {
      result[key] = { level: data.level, reviews: Math.round(data.reviews) };
      return result;
    }, {});
  return { reviewDepthBand: mastery?.reviewDepthBand?.name || "Observer", perType };
}

export function buildPassportPayload(appData = {}, opts = {}) {
  const discipline = computeDisciplineScore(appData);
  const mastery = computeMastery(appData);
  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const settled = feedback.filter((entry) => String(entry.status || "").toLowerCase() === "settled").length;
  const closed = feedback.filter((entry) => ["settled", "skipped"].includes(String(entry.status || "").toLowerCase())).length;
  const settledLoopRatio = feedback.length ? closed / feedback.length : 0;
  return normalizePassportPayload({
    v: PASSPORT_VERSION,
    issuedAt: opts.now instanceof Date ? opts.now.toISOString() : new Date(Number.isFinite(opts.now) ? opts.now : Date.now()).toISOString(),
    handle: typeof opts.handle === "string" ? opts.handle : null,
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
  });
}

export async function exportPassport(appData = {}, opts = {}) {
  const payload = buildPassportPayload(appData, opts);
  if (!payload) throw new Error("Passport payload invalid");
  const payloadB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${payloadB64}.${await checksum(payloadB64)}`;
}

export async function verifyPassport(token) {
  if (typeof token !== "string" || token.length > 24_000) return { ok: false, reason: "format" };
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "format" };
  const [payloadB64, suppliedChecksum] = parts;
  let raw;
  try {
    raw = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
  } catch {
    return { ok: false, reason: "decode" };
  }
  if (raw?.v !== PASSPORT_VERSION) return { ok: false, reason: "legacy-unsupported" };
  const expectedChecksum = await checksum(payloadB64);
  if (expectedChecksum !== suppliedChecksum) return { ok: false, reason: "integrity" };
  const payload = normalizePassportPayload(raw);
  if (!payload) return { ok: false, reason: "payload" };
  return { ok: true, payload, attestation: "self-attested", integrity: "checksum-verified" };
}

export const PASSPORT_CONTRACT = Object.freeze({
  version: PASSPORT_VERSION,
  attestation: "self-attested",
  integrity: "sha256-checksum",
  authenticity: "not-independently-verified",
});
