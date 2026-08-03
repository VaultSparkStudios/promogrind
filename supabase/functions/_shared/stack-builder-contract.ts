import { redactAdvisorInput } from "./advisor-privacy.ts";

export const STACK_BUILDER_CONTRACT_VERSION = 1;

export function parseStackBuilderRequest(input: unknown, knownBooks: ReadonlySet<string>) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Stack Builder request must be an object");
  const body = input as Record<string, unknown>;
  const bankroll = Number(body.bankroll);
  if (!Number.isFinite(bankroll) || bankroll < 100 || bankroll > 1_000_000) {
    throw new Error("Bankroll must be between $100 and $1,000,000");
  }
  const booksAvailable = Array.isArray(body.booksAvailable)
    ? [...new Set(body.booksAvailable.map(String).map((book) => book.trim()).filter((book) => knownBooks.has(book)))].slice(0, 5)
    : [];
  const goal = redactAdvisorInput(body.goal || "maximize modeled return while controlling execution risk");
  return {
    bankroll,
    booksAvailable,
    goal: goal.text.slice(0, 160),
    privacy: {
      contractVersion: STACK_BUILDER_CONTRACT_VERSION,
      egress: ["bankroll", ...(booksAvailable.length ? ["selected-book-labels"] : []), ...(body.goal ? ["redacted-goal"] : [])],
      userInitiated: true,
      redactionCount: goal.total,
      persistedByPromoGrind: false,
    },
  };
}
