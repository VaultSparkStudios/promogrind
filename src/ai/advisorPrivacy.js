const MAX_ADVISOR_CHARS = 2000;
const PROFILE_FIELDS = ["bankroll", "books"];

function replaceCount(value, pattern, replacement, counts, key, predicate = () => true) {
  return value.replace(pattern, (match, ...groups) => {
    if (!predicate(match, groups)) return match;
    counts[key] += 1;
    return typeof replacement === "function" ? replacement(match, ...groups) : replacement;
  });
}

export function redactAdvisorInput(input) {
  const counts = { html: 0, email: 0, phone: 0, identifier: 0, longNumber: 0, urlSecret: 0 };
  const original = String(input || "");
  let text = replaceCount(original, /<[^>]*>/g, "", counts, "html");
  text = replaceCount(text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]", counts, "email");
  text = replaceCount(
    text,
    /\+?\d[\d\s().-]{7,}\d/g,
    "[redacted-phone]",
    counts,
    "phone",
    (match) => (match.match(/\d/g) || []).length >= 10,
  );
  text = replaceCount(
    text,
    /\b(account|user|member|customer|ticket|confirmation|reference)\s*(?:#|id|number|no\.?)?\s*[:=-]?\s*([A-Z0-9_-]{6,})\b/gi,
    (_match, label) => `${label} [redacted-identifier]`,
    counts,
    "identifier",
  );
  text = replaceCount(text, /\b\d{13,19}\b/g, "[redacted-number]", counts, "longNumber");
  text = replaceCount(
    text,
    /([?&](?:token|key|code|session|auth|signature)=)[^&#\s]+/gi,
    (_match, prefix) => `${prefix}[redacted]`,
    counts,
    "urlSecret",
  );
  text = text.trim().slice(0, MAX_ADVISOR_CHARS);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return {
    text,
    redactions: counts,
    total,
    inputChars: original.length,
    outputChars: text.length,
  };
}

export function buildAdvisorPrivacyEnvelope({ promoText, includeProfile = false, appData = {} } = {}) {
  const sanitized = redactAdvisorInput(promoText);
  const activeBooks = Object.entries(appData?.done || {}).filter(([, done]) => Boolean(done)).map(([book]) => String(book).slice(0, 40)).slice(0, 5);
  const bankroll = Number.parseFloat(appData?.bankroll);
  const availableContext = {
    ...(Number.isFinite(bankroll) && bankroll >= 0 ? { bankroll } : {}),
    ...(activeBooks.length ? { books: activeBooks } : {}),
  };
  const userContext = includeProfile && Object.keys(availableContext).length ? availableContext : undefined;
  const omittedContextChars = includeProfile ? 0 : JSON.stringify(availableContext).length;
  return {
    body: {
      promoText: sanitized.text,
      privacyContractVersion: 1,
      personalizationConsent: Boolean(userContext),
      ...(userContext ? { userContext } : {}),
    },
    receipt: {
      contractVersion: 1,
      redactions: sanitized.redactions,
      redactionCount: sanitized.total,
      profileIncluded: Boolean(userContext),
      profileFields: userContext ? PROFILE_FIELDS.filter((field) => field in userContext) : [],
      inputChars: sanitized.inputChars,
      outputChars: sanitized.outputChars,
      omittedContextChars,
      estimatedTokensSaved: Math.ceil(omittedContextChars / 4),
    },
  };
}

export { MAX_ADVISOR_CHARS };
