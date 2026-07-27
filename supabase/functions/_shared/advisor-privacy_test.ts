import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { redactAdvisorInput, sanitizeAdvisorContext } from "./advisor-privacy.ts";

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
