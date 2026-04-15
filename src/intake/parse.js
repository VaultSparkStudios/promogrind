/**
 * PromoGrind — Promo Intake Parser
 *
 * Takes freeform promo text (pasted, OCR'd, or captured by the extension)
 * and returns a normalized PromoCard describing what the promo is worth and
 * which calculator can monetize it.
 *
 * This is intentionally deterministic: pure regex + keyword matching, no LLM.
 * It runs in <1ms, is fully testable, and works offline. Confidence scores
 * reflect how many signals matched so callers can surface uncertainty.
 *
 * Pipeline:
 *   1. Tokenize & normalize
 *   2. Detect book from known names/aliases
 *   3. Classify promo type from keyword signatures
 *   4. Extract numerics (bonus amount, stake, percentage, min odds, expiry)
 *   5. Recommend calculator slug
 *
 * Shape returned:
 *   {
 *     promoType:   "bonus_bet" | "profit_boost" | "safety_net" | "deposit_match" | "odds_boost" | "sgp_insurance" | "other",
 *     book:        string | null,
 *     bonusAmount: number | null,  // headline value in USD
 *     stake:       number | null,  // required stake if any
 *     boostPct:    number | null,  // for profit/odds boost
 *     maxBoost:    number | null,
 *     minOdds:     string | null,  // as written ("-200", "+100", "2.5")
 *     expiry:      string | null,  // ISO YYYY-MM-DD if detected
 *     calculator:  string | null,  // calculator slug to open
 *     confidence:  "low" | "medium" | "high",
 *     matches:     string[],       // which signals fired (debug/UX)
 *     rawText:     string,         // the normalized text
 *   }
 */

const BOOK_ALIASES = [
  ["draftkings", /\b(draft\s*kings|dk|draftkings)\b/i],
  ["fanduel", /\b(fan\s*duel|fd|fanduel)\b/i],
  ["betmgm", /\b(bet\s*mgm|mgm\s*bet|betmgm)\b/i],
  ["caesars", /\b(caesars|czr)\b/i],
  ["bet365", /\bbet\s*365\b/i],
  ["espn bet", /\b(espn\s*bet|espnbet)\b/i],
  ["fanatics", /\bfanatics\b/i],
  ["betrivers", /\b(bet\s*rivers|betrivers)\b/i],
  ["hardrock", /\b(hard\s*rock\s*bet|hardrockbet)\b/i],
];

const PROMO_SIGNATURES = [
  {
    key: "bonus_bet",
    calculator: "bonus-bet",
    patterns: [
      /\bbet\s*\$?\d+.{0,25}\bget\b/i,
      /\bbonus\s*bets?\b/i,
      /\bfree\s*bets?\b/i,
      /\bno\s*sweat\s*(bet|first\s*bet)\b/i,
    ],
    weight: 3,
  },
  {
    key: "safety_net",
    calculator: "first-bet",
    patterns: [
      /\b(first\s*bet\s*(safety\s*net|insurance|reset)|bet\s*reset|second\s*chance\s*bet)\b/i,
      /\bget\s*it\s*back\b/i,
    ],
    weight: 3,
  },
  {
    key: "profit_boost",
    calculator: "profit-boost",
    patterns: [
      /\bprofit\s*boost\b/i,
      /\bboost(ed)?\s*(your\s*)?profit\b/i,
      /\bboost\s*token\b/i,
    ],
    weight: 3,
  },
  {
    key: "odds_boost",
    calculator: "profit-boost",
    patterns: [
      /\bodds\s*boost(ed)?\b/i,
      /\bsuper\s*boost\b/i,
      /\bboosted\s*odds\b/i,
    ],
    weight: 2,
  },
  {
    key: "deposit_match",
    calculator: "deposit-match-calculator",
    patterns: [
      /\bdeposit\s*match\b/i,
      /\bmatch\s*(up\s*to|your\s*deposit)\b/i,
      /\b\d{2,3}%\s*(deposit|match)\b/i,
    ],
    weight: 3,
  },
  {
    key: "sgp_insurance",
    calculator: "same-game-parlay",
    patterns: [
      /\b(same\s*game\s*parlay|sgp)\s*(insurance|boost|profit\s*boost)\b/i,
      /\bparlay\s*insurance\b/i,
    ],
    weight: 2,
  },
];

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

function normalizeText(input) {
  return String(input || "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[\u00a0]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectBook(text) {
  for (const [name, re] of BOOK_ALIASES) {
    if (re.test(text)) return name;
  }
  return null;
}

function classifyPromo(text) {
  const hits = [];
  for (const sig of PROMO_SIGNATURES) {
    let score = 0;
    for (const pat of sig.patterns) {
      if (pat.test(text)) score += sig.weight;
    }
    if (score) hits.push({ key: sig.key, calculator: sig.calculator, score });
  }
  if (!hits.length) return { key: "other", calculator: null, score: 0 };
  hits.sort((a, b) => b.score - a.score);
  return hits[0];
}

function extractDollar(text, hints = []) {
  // Scan for $<number> and prefer the amount nearest to a hint word.
  const matches = [...text.matchAll(/\$\s*([0-9][0-9,]*(?:\.\d+)?)/g)];
  if (!matches.length) return null;
  const parsed = matches.map((m) => ({ value: Number.parseFloat(m[1].replace(/,/g, "")), index: m.index ?? 0 }));
  if (hints.length) {
    for (const hint of hints) {
      const hintIdx = text.search(hint);
      if (hintIdx === -1) continue;
      const nearest = parsed.reduce((best, candidate) => {
        const distance = Math.abs(candidate.index - hintIdx);
        return !best || distance < best.distance ? { ...candidate, distance } : best;
      }, null);
      if (nearest && Number.isFinite(nearest.value)) return nearest.value;
    }
  }
  // Fallback: the largest dollar figure — typically the headline bonus.
  return parsed.reduce((max, cur) => (cur.value > max ? cur.value : max), 0) || null;
}

function extractAnchoredDollar(text, pattern) {
  const match = text.match(pattern);
  if (!match) return null;
  const raw = match[1] || match[2] || null;
  if (!raw) return null;
  const parsed = Number.parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractPercent(text) {
  const m = text.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
  return m ? Number.parseFloat(m[1]) : null;
}

function extractMinOdds(text) {
  const m = text.match(/(?:min(?:imum)?\s*odds?|at\s*odds?\s*of|@\s*)\s*([+-]?\d{2,4}|\d\.\d{1,3})/i);
  return m ? m[1] : null;
}

function extractExpiry(text) {
  // Prefer explicit "expires/ends/valid through/through" anchors; fall back to any date.
  const anchored = text.match(
    /(?:expires?|ends?|valid\s*through|through|until)\s*(?:on\s*)?([A-Za-z]+\s*\d{1,2}(?:,?\s*\d{2,4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
  );
  const raw = anchored?.[1] || text.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/)?.[1] || null;
  if (!raw) return null;
  return toIsoDate(raw);
}

function toIsoDate(raw) {
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    const month = Number.parseInt(slash[1], 10);
    const day = Number.parseInt(slash[2], 10);
    let year = slash[3] ? Number.parseInt(slash[3], 10) : new Date().getUTCFullYear();
    if (year < 100) year += 2000;
    return formatYmd(year, month, day);
  }
  const text = raw.match(/^([A-Za-z]+)\s*(\d{1,2})(?:,?\s*(\d{2,4}))?$/);
  if (text) {
    const monthName = text[1].toLowerCase().slice(0, 4);
    const monthKey = MONTHS[monthName] ? monthName : Object.keys(MONTHS).find((k) => k.startsWith(monthName.slice(0, 3)));
    const month = monthKey ? MONTHS[monthKey] : null;
    if (!month) return null;
    const day = Number.parseInt(text[2], 10);
    let year = text[3] ? Number.parseInt(text[3], 10) : new Date().getUTCFullYear();
    if (year < 100) year += 2000;
    return formatYmd(year, month, day);
  }
  return null;
}

function formatYmd(year, month, day) {
  if (!year || !month || !day) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

function rateConfidence({ book, promoHit, bonusAmount, matches }) {
  let score = 0;
  if (book) score += 1;
  if (promoHit.score >= 3) score += 2;
  else if (promoHit.score >= 2) score += 1;
  if (bonusAmount) score += 1;
  if (matches.length >= 3) score += 1;
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

export function parsePromoText(input) {
  const rawText = normalizeText(input);
  if (!rawText || rawText.length < 6) return null;

  const book = detectBook(rawText);
  const promoHit = classifyPromo(rawText);

  const bonusHints = [
    /\bget\b/i, /\breceive\b/i, /\bup\s*to\b/i, /\bbonus\s*bets?\b/i, /\bcredits?\b/i, /\bfree\s*bets?\b/i,
  ];
  const stakeHints = [/\bbet\b/i, /\bwager\b/i, /\bfirst\s*bet\b/i];

  const anchoredBonus =
    extractAnchoredDollar(rawText, /\b(?:get|receive|earn)\s+\$?\s*([0-9][0-9,]*(?:\.\d+)?)/i) ??
    extractAnchoredDollar(rawText, /\bup\s+to\s+\$?\s*([0-9][0-9,]*(?:\.\d+)?)/i);
  const anchoredStake =
    extractAnchoredDollar(rawText, /\b(?:bet|wager)\s+\$?\s*([0-9][0-9,]*(?:\.\d+)?)/i) ??
    extractAnchoredDollar(rawText, /\bfirst\s+bet\s+\$?\s*([0-9][0-9,]*(?:\.\d+)?)/i);

  const bonusAmount = anchoredBonus ?? extractDollar(rawText, bonusHints);
  const stake = anchoredStake ?? extractDollar(rawText.replace(/(?:get|receive|earn)\s*\$[\d,]+/gi, ""), stakeHints);
  const boostPct = promoHit.key === "profit_boost" || promoHit.key === "odds_boost"
    ? extractPercent(rawText)
    : null;
  const maxBoost = promoHit.key === "profit_boost" || promoHit.key === "odds_boost"
    ? extractDollar(rawText, [/\bup\s*to\b/i]) ?? null
    : null;
  const minOdds = extractMinOdds(rawText);
  const expiry = extractExpiry(rawText);

  const matches = [];
  if (book) matches.push(`book:${book}`);
  if (promoHit.key !== "other") matches.push(`promo:${promoHit.key}`);
  if (bonusAmount) matches.push(`bonus:$${bonusAmount}`);
  if (stake && stake !== bonusAmount) matches.push(`stake:$${stake}`);
  if (boostPct) matches.push(`boost:${boostPct}%`);
  if (minOdds) matches.push(`minOdds:${minOdds}`);
  if (expiry) matches.push(`expiry:${expiry}`);

  const confidence = rateConfidence({ book, promoHit, bonusAmount, matches });

  return {
    promoType: promoHit.key,
    book,
    bonusAmount: bonusAmount ?? null,
    stake: stake ?? null,
    boostPct: boostPct ?? null,
    maxBoost: maxBoost ?? null,
    minOdds: minOdds ?? null,
    expiry: expiry ?? null,
    calculator: promoHit.calculator,
    confidence,
    matches,
    rawText,
  };
}

export function calculatorForPromo(promoType) {
  const match = PROMO_SIGNATURES.find((sig) => sig.key === promoType);
  return match?.calculator ?? null;
}
