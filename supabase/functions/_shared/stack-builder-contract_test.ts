import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { parseStackBuilderRequest } from "./stack-builder-contract.ts";

const books = new Set(["DraftKings", "FanDuel"]);

Deno.test("Stack Builder bounds financial workflow egress and drops unknown books", () => {
  const result = parseStackBuilderRequest({
    bankroll: 625,
    booksAvailable: ["DraftKings", "Unknown", "DraftKings"],
    goal: "Email jane@example.com with the result",
  }, books);
  assertEquals(result.booksAvailable, ["DraftKings"]);
  assertEquals(result.goal.includes("jane@example.com"), false);
  assertEquals(result.privacy.redactionCount, 1);
  assertEquals(result.privacy.persistedByPromoGrind, false);
});

Deno.test("Stack Builder rejects unbounded bankroll values", () => {
  assertThrows(() => parseStackBuilderRequest({ bankroll: 99 }, books), Error, "between");
  assertThrows(() => parseStackBuilderRequest({ bankroll: 1_000_001 }, books), Error, "between");
});
