import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { redactAdvisorInput, sanitizeAdvisorContext, sanitizeChatPayload } from "./advisor-privacy.ts";

Deno.test("advisor privacy redacts identifiers without changing ordinary odds", () => {
  const redacted = redactAdvisorInput("jane@example.com has account ID ABC123456 and +120 odds");
  assertEquals(redacted.total, 2);
  assert(!redacted.text.includes("jane@example.com"));
  assert(!redacted.text.includes("ABC123456"));
  assert(redacted.text.includes("+120 odds"));
});

Deno.test("advisor profile context requires explicit consent", () => {
  const raw = { bankroll: 500, books: ["DraftKings", "FanDuel"], ignored: "secret" };
  assertEquals(sanitizeAdvisorContext(raw, false), undefined);
  assertEquals(sanitizeAdvisorContext(raw, true), { bankroll: 500, books: ["DraftKings", "FanDuel"] });
});

Deno.test("advisor profile context rejects out-of-bounds values", () => {
  assertEquals(sanitizeAdvisorContext({ bankroll: -1, books: ["<script>"] }, true), undefined);
});

Deno.test("chat privacy requires the versioned contract and re-redacts message history", () => {
  assertEquals(sanitizeChatPayload({ message: "hello" }), { ok: false, error: "Unsupported privacy contract" });
  const result = sanitizeChatPayload({
    privacyContractVersion: 1,
    personalizationConsent: false,
    message: "Email jane@example.com about account ID ABC123456",
    history: [{ role: "user", content: "Call +1 (212) 555-0198" }, { role: "tool", content: "drop" }],
    userContext: { bankroll: 500, books: ["DraftKings"] },
  });
  assert(result.ok);
  assert(!result.message.includes("jane@example.com"));
  assertEquals(result.history.length, 1);
  assert(!result.history[0].content.includes("555-0198"));
  assertEquals(result.userContext, undefined);
  assertEquals(result.receipt.redactionCount, 3);
});

Deno.test("chat privacy includes bounded profile fields only after consent", () => {
  const result = sanitizeChatPayload({
    privacyContractVersion: 1,
    personalizationConsent: true,
    message: "Compare this offer",
    history: [],
    userContext: { bankroll: 500, books: ["DraftKings"], privateNote: "drop" },
  });
  assert(result.ok);
  assertEquals(result.userContext, { bankroll: 500, books: ["DraftKings"] });
  assertEquals(result.receipt.profileFields, ["bankroll", "books"]);
});
