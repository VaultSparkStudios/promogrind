export const PUBLIC_CLAIM_RULES = [
  { id: "absolute-legality-en", locale: "en", pattern: /\b(?:100%|completely|entirely) legal\b/gi, guidance: "Describe eligibility as jurisdiction- and terms-dependent." },
  { id: "absolute-legality-es", locale: "es", pattern: /\bcompletamente legal\b/gi, guidance: "Describe eligibility as dependent on jurisdiction and operator terms." },
  { id: "income-hype-en", locale: "en", pattern: /\b(?:passive profit|free money|money machine|side hustle|significant income|side income|ongoing income|monthly income|making extra income every month)\b/gi, guidance: "Use tracked promo-value language, not recurring-income promises." },
  { id: "income-hype-es", locale: "es", pattern: /\b(?:ingresos consistentes|ingresos mensuales|ingresos adicionales)\b/gi, guidance: "Use observed or modeled value, not income promises." },
  { id: "income-hype-pt", locale: "pt", pattern: /\b(?:renda mensal adicional|renda garantida)\b/gi, guidance: "Use observed or modeled value, not income promises." },
  { id: "outcome-certainty-en", locale: "en", pattern: /\b(?:guaranteed|guarantee(?:s|d|ing)?|risk[- ]free)\b/gi, guidance: "Name execution, void, limit, eligibility, and changing-odds risk." },
  { id: "outcome-certainty-es", locale: "es", pattern: /\b(?:sin riesgo|garantiz(?:a|an|ar|ado|ada|ados|adas))\b/gi, guidance: "Use conditional modeled-return language and name execution risk." },
  { id: "outcome-certainty-pt", locale: "pt", pattern: /\b(?:sem risco|zero risco|garant(?:e|em|ir|ido|ida|idos|idas))\b/gi, guidance: "Use conditional modeled-return language and name execution risk." },
  { id: "risk-erasure-es", locale: "es", pattern: /\belimina(?:s|r|ndo)?(?: completamente)? (?:el )?riesgo\b/gi, guidance: "Say the hedge reduces outcome exposure; it does not erase execution risk." },
  { id: "risk-erasure-pt", locale: "pt", pattern: /\belimina(?:r|ndo)?(?: completamente)? (?:o )?risco\b/gi, guidance: "Say the hedge reduces outcome exposure; it does not erase execution risk." },
  { id: "typical-earnings-en", locale: "en", pattern: /\b(?:most|average|typical|active|consistent)\b[^.!?]{0,90}\b(?:earn|make|yield|achievable)\b[^.!?]{0,70}(?:[$£€]\s?[\d,]+|[\d,]+\s?(?:USD|GBP))\b/gi, guidance: "Replace population earnings claims with an explicitly labeled user-input scenario or sourced historical observation." },
  { id: "monthly-earnings-en", locale: "en", pattern: /(?:[$£€]\s?[\d,]+(?:\s*[–-]\s*[$£€]?\s?[\d,]+)?)[^.!?]{0,40}\b(?:per month|\/month|\/mo)\b[^.!?]{0,55}\b(?:achievable|earn|income|profit|for active)\b/gi, guidance: "Do not present recurring monthly profit as typical or achievable; label user-input scenarios and uncertainty." },
  { id: "recurring-return-en", locale: "en", pattern: /\b(?:profit|income|earnings|tracked promo value|returns?|yield)\b[^.!?]{0,110}(?:[$£€]\s?[\d,]+(?:\s*[–-]\s*[$£€]?\s?[\d,]+)?)\s*(?:\/\s*(?:month|mo)|per month)\b/gi, guidance: "Replace recurring return benchmarks with user-supplied scenario inputs and realized-outcome evidence." },
  { id: "typical-earnings-es", locale: "es", pattern: /\b(?:la mayoría|promedio|típicamente)\b[^.!?]{0,90}\b(?:obtienen|ganan|generan)\b[^.!?]{0,70}(?:[$€]\s?[\d,.]+)\b/gi, guidance: "Replace typical earnings with an explicitly labeled scenario and execution uncertainty." },
  { id: "monthly-earnings-es", locale: "es", pattern: /(?:[$€]\s?[\d,.]+(?:\s*[–-]\s*[$€]?\s?[\d,.]+)?)\s*(?:\/|por )mes\b[^.!?]{0,55}\b(?:ganancia|ingreso|generan|obtienen)\w*/gi, guidance: "Do not present monthly profit as a typical outcome; use a user-input scenario with uncertainty." },
  { id: "monthly-earnings-pt", locale: "pt", pattern: /R\$\s?[\d,.]+(?:\s*(?:a|[–-])\s*R?\$?\s?[\d,.]+)?\s*(?:\/|por )m[eê]s\b[^.!?]{0,55}\b(?:lucro|renda|gerar)\w*/gi, guidance: "Do not present monthly profit as a typical outcome; use a user-input scenario with uncertainty." },
  { id: "pure-profit-multilingual", locale: "multi", pattern: /\b(?:pure profit|ganancia pura|lucro puro)\b/gi, guidance: "Describe a modeled return and preserve execution, eligibility, void, and changing-odds risk." },
  { id: "risk-erasure-en", locale: "en", pattern: /\b(?:you do not lose this money|regardless of which side wins,? you pocket|cannot lose|no downside)\b/gi, guidance: "Name capital, execution, counterparty, void, and changing-odds risk explicitly." },
];

const SAFE_NEGATIONS = [
  /\b(?:no|not|never|without|cannot|can\x27t|does not|do not)\b[^.!?]{0,32}\bguarantee(?:d|s|ing)?\b/i,
  /\bnot (?:a )?guarantee\b/i,
  /\bnot risk[- ]free\b/i,
  /\bno\b[^.!?]{0,24}\bgarantiz(?:a|an|ar|ado|ada|ados|adas)\b/i,
  /\bn(?:a|ã)o\b[^.!?]{0,24}\bgarant(?:e|em|ir|ido|ida|idos|idas)\b/i,
];

function isSafeNegation(line, match) {
  const start = Math.max(0, match.index - 48);
  const end = Math.min(line.length, match.index + match[0].length + 16);
  const context = line.slice(start, end);
  if (line[match.index - 1] === "-" || line[match.index + match[0].length] === "-") return true;
  return SAFE_NEGATIONS.some((pattern) => pattern.test(context));
}

export function scanPublicClaimText(text, file = "<memory>") {
  const findings = [];
  String(text).split(/\r?\n/).forEach((line, index) => {
    for (const rule of PUBLIC_CLAIM_RULES) {
      rule.pattern.lastIndex = 0;
      for (const match of line.matchAll(rule.pattern)) {
        if (rule.id.startsWith("outcome-certainty") && isSafeNegation(line, match)) continue;
        findings.push({
          id: rule.id,
          locale: rule.locale,
          guidance: rule.guidance,
          file,
          line: index + 1,
          excerpt: line.trim().slice(0, 180),
          matched: match[0],
        });
      }
    }
  });
  return findings;
}
