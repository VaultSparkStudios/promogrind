export const PUBLIC_CLAIM_RULES = [
  { id: "absolute-legality-en", locale: "en", pattern: /\b(?:100%|completely|entirely) legal\b/gi, guidance: "Describe eligibility as jurisdiction- and terms-dependent." },
  { id: "categorical-legality-en", locale: "en", pattern: /\b(?:matched betting|promo conversion|sports betting|online sports betting)\b[^.!?]{0,90}\b(?:is|are)\s+legal\b/gi, guidance: "Describe product behavior, then direct readers to current jurisdiction-specific authority; do not publish a blanket legal conclusion." },
  { id: "categorical-tax-en", locale: "en", pattern: /\ball\s+(?:gambling\s+)?(?:winnings|profits?)\s+are\s+taxable\b/gi, guidance: "Tax treatment depends on current rules and facts. Require source records and qualified advice instead of a universal conclusion." },
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
  { id: "simulated-live-market-copy", locale: "en", pattern: /\b(?:live right now for|members are scanning these right now)\b/gi, guidance: "Show live-market activity only from a current provider receipt; never derive it from time or decorative state." },
  { id: "unproved-gift-delivery", locale: "en", pattern: /\b(?:gift sent to|they(?:'|’)ll get an email with)\b/gi, guidance: "Distinguish token issuance, provider acceptance, and inbox delivery; do not collapse them into sent." },
  { id: "usage-as-performance", locale: "en", pattern: /\b(?:you excel at|maximum bankroll growth|pure modeled profit)\b/gi, guidance: "Calculator usage may describe tool mix, not skill, profit, or future performance." },
  { id: "authoritative-play-grade", locale: "en", pattern: /\b(?:excellent|good|fair|poor) play\b|\bpromo quality score\b/gi, guidance: "Label heuristic output as an assumption-bound model signal, not an authoritative play grade." },
  { id: "unbounded-referral-reward", locale: "en", pattern: /\b(?:both get \d+ days free|no limit on referrals)\b/gi, guidance: "Referral rewards must derive from the canonical live program contract and disclose limits." },
];

export const PUBLIC_CLAIM_DOCUMENT_RULES = [
  {
    id: 'synthetic-testimonial-proof', locale: 'multi',
    applies: (text) => /\btestimonial|what\s+[^\n<]{0,40}\s+say\b/i.test(text)
      && /<q\b|\bquote\s*:|testimonial-name/i.test(text)
      && !/evidenceRef|consentAt|sourceReceipt/i.test(text),
    pattern: /\btestimonial|what\s+[^\n<]{0,40}\s+say\b/i,
    guidance: 'Publish testimonials only with consent and evidence provenance; otherwise use inspectable first-party product facts.',
  },
  {
    id: 'simulated-live-activity', locale: 'multi',
    applies: (text) => /\blive activity\b/i.test(text)
      && /Date\.now\s*\(|setInterval\s*\(|\b\d+\s*m(?:in)?\s+ago\b/i.test(text)
      && !/simulated|demonstration data/i.test(text),
    pattern: /\blive activity\b/i,
    guidance: 'Do not render generated events as live user activity. Bind the feed to a verified source or label a static demonstration explicitly.',
  },
  {
    id: 'simulated-live-market-count', locale: 'multi',
    applies: (text) => /\barb opportunities\b|\+EV picks/i.test(text)
      && /new Date\(\)\.get(?:Hours|Minutes|Date)\(\)/.test(text),
    pattern: /\barb opportunities\b|\+EV picks/i,
    guidance: 'Market counts must be counted from a current authenticated provider response, never generated from the clock.',
  },
  {
    id: 'categorical-legal-answer', locale: 'en',
    applies: (text) => {
      const question = /(?:is\s+(?:this|promogrind|matched betting|promo conversion)\s+legal(?:\s+in\s+(?:my|this|your)\s+(?:state|jurisdiction))?|do\s+we\s+need\s+a\s+gambling\s+licen[cs]e)/ig;
      for (const match of text.matchAll(question)) {
        const local = text.slice(match.index, match.index + 360);
        const categorical = /(?:[?"'’\s>:,-]|^)(?:yes|no)\b|\b(?:is|are)\s+legal\b/i.test(local);
        const bounded = /(?:cannot determine|jurisdiction|local law|var(?:y|ies)|not legal advice|official (?:guidance|source|regulator))/i.test(local);
        if (categorical && !bounded) return true;
      }
      return false;
    },
    pattern: /(?:is\s+(?:this|promogrind|matched betting|promo conversion)\s+legal|do\s+we\s+need\s+a\s+gambling\s+licen[cs]e)/i,
    guidance: 'State product behavior and direct readers to jurisdiction-specific authority; do not give a categorical legal conclusion.',
  },
  {
    id: 'unsourced-external-price', locale: 'en',
    applies: (text) => /(?:\b(?:OddsJam|RebelBetting|ProfitDuel|Arb Academy|DarkHorse Odds)\b[\s\S]{0,180}?[$£€]\s?\d[\d,.]*(?:\s*[–-]\s*[$£€]?\s?\d[\d,.]*)?\s*(?:\/\s*mo|per month|\/\s*month)|\bcompetitors?\s+charge\b[\s\S]{0,100}?[$£€]\s?\d)/i.test(text),
    pattern: /\b(?:OddsJam|RebelBetting|ProfitDuel|Arb Academy|DarkHorse Odds|competitors?\s+charge)\b/i,
    guidance: 'External pricing changes. Remove exact competitor prices or attach a current dated primary-source receipt.',
  },
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

function isConditionedLegality(line, match) {
  const prefix = line.slice(Math.max(0, match.index - 40), match.index);
  return /\b(?:where|whether|if)\s*$/i.test(prefix)
    || /\bconfirm(?:ing)?\s+that\s*$/i.test(prefix);
}

export function scanPublicClaimText(text, file = "<memory>") {
  const findings = [];
  String(text).split(/\r?\n/).forEach((line, index) => {
    for (const rule of PUBLIC_CLAIM_RULES) {
      rule.pattern.lastIndex = 0;
      for (const match of line.matchAll(rule.pattern)) {
        if (rule.id.startsWith("outcome-certainty") && isSafeNegation(line, match)) continue;
        if (rule.id === "categorical-legality-en" && isConditionedLegality(line, match)) continue;
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

export function scanPublicClaimDocument(text, file = '<memory>') {
  const source = String(text);
  const findings = [];
  for (const rule of PUBLIC_CLAIM_DOCUMENT_RULES) {
    if (!rule.applies(source)) continue;
    const match = source.match(rule.pattern);
    const index = match?.index ?? 0;
    const line = source.slice(0, index).split(/\r?\n/).length;
    const excerpt = source.slice(index, index + 180).replace(/\s+/g, ' ').trim();
    findings.push({ id: rule.id, locale: rule.locale, guidance: rule.guidance, file, line, excerpt, matched: match?.[0] || rule.id });
  }
  return findings;
}
