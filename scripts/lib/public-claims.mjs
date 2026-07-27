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
