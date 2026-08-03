export const ADVISOR_PRIVACY_CONTRACT_VERSION = 1;
export const MAX_ADVISOR_CHARS = 2000;

export type AdvisorUserContext = {
  bankroll?: number;
  books?: string[];
  hitRate?: number;
  topPromoType?: string;
};

function replaceCount(
  value: string,
  pattern: RegExp,
  replacement: string | ((match: string, ...groups: string[]) => string),
  counts: Record<string, number>,
  key: string,
  predicate: (match: string, groups: string[]) => boolean = () => true,
): string {
  return value.replace(pattern, (match: string, ...args: unknown[]) => {
    const groups = args.slice(0, -2).map(String);
    if (!predicate(match, groups)) return match;
    counts[key] += 1;
    return typeof replacement === "function" ? replacement(match, ...groups) : replacement;
  });
}

export function redactAdvisorInput(input: unknown) {
  const counts: Record<string, number> = { html: 0, email: 0, phone: 0, identifier: 0, longNumber: 0, urlSecret: 0 };
  const original = String(input || "");
  let text = replaceCount(original, /<[^>]*>/g, "", counts, "html");
  text = replaceCount(text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]", counts, "email");
  text = replaceCount(text, /\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]", counts, "phone", (match) => (match.match(/\d/g) || []).length >= 10);
  text = replaceCount(text, /\b(account|user|member|customer|ticket|confirmation|reference)\s*(?:#|id|number|no\.?)?\s*[:=-]?\s*([A-Z0-9_-]{6,})\b/gi, (_match, label) => `${label} [redacted-identifier]`, counts, "identifier");
  text = replaceCount(text, /\b\d{13,19}\b/g, "[redacted-number]", counts, "longNumber");
  text = replaceCount(text, /([?&](?:token|key|code|session|auth|signature)=)[^&#\s]+/gi, (_match, prefix) => `${prefix}[redacted]`, counts, "urlSecret");
  text = text.trim().slice(0, MAX_ADVISOR_CHARS);
  return { text, redactions: counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) };
}

export function sanitizeAdvisorContext(value: unknown, consent: unknown): AdvisorUserContext | undefined {
  if (consent !== true || !value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const context: AdvisorUserContext = {};
  const bankroll = Number(raw.bankroll);
  if (Number.isFinite(bankroll) && bankroll >= 0 && bankroll <= 1_000_000_000) context.bankroll = bankroll;
  if (Array.isArray(raw.books)) {
    const books = raw.books.map((book) => String(book).trim()).filter((book) => /^[\p{L}\p{N} .&'_-]{1,40}$/u.test(book)).slice(0, 5);
    if (books.length) context.books = books;
  }
  const hitRate = Number(raw.hitRate);
  if (Number.isFinite(hitRate) && hitRate >= 0 && hitRate <= 1) context.hitRate = hitRate;
  if (typeof raw.topPromoType === "string" && /^[a-z0-9_-]{1,40}$/i.test(raw.topPromoType)) context.topPromoType = raw.topPromoType;
  return Object.keys(context).length ? context : undefined;
}

export function sanitizeChatPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false as const, error: "JSON object required" };
  }
  const raw = value as Record<string, unknown>;
  if (raw.privacyContractVersion !== ADVISOR_PRIVACY_CONTRACT_VERSION) {
    return { ok: false as const, error: "Unsupported privacy contract" };
  }
  const message = redactAdvisorInput(raw.message);
  if (!message.text) return { ok: false as const, error: "Message is required" };
  const history = Array.isArray(raw.history)
    ? raw.history.slice(-10).flatMap((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
        const item = entry as Record<string, unknown>;
        if (item.role !== "user" && item.role !== "assistant") return [];
        const content = redactAdvisorInput(item.content);
        return content.text
          ? [{ role: item.role as "user" | "assistant", content: content.text, redactions: content.total }]
          : [];
      })
    : [];
  const userContext = sanitizeAdvisorContext(raw.userContext, raw.personalizationConsent);
  const historyRedactions = history.reduce((sum, entry) => sum + entry.redactions, 0);
  return {
    ok: true as const,
    message: message.text.slice(0, 1000),
    history: history.map(({ role, content }) => ({ role, content })),
    userContext,
    receipt: {
      contractVersion: ADVISOR_PRIVACY_CONTRACT_VERSION,
      redactionCount: message.total + historyRedactions,
      messageRedactions: message.total,
      historyRedactions,
      historyMessages: history.length,
      profileIncluded: Boolean(userContext),
      profileFields: userContext ? ["bankroll", "books"].filter((field) => field in userContext) : [],
    },
  };
}
