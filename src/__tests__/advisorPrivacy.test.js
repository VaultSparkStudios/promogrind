import { describe, expect, it } from "vitest";
import { buildAdvisorPrivacyEnvelope, buildChatPrivacyEnvelope, redactAdvisorInput } from "../ai/advisorPrivacy.js";
import fs from "node:fs";
import path from "node:path";

describe("advisor privacy envelope", () => {
  it("redacts direct identifiers and URL secrets deterministically", () => {
    const input = "Offer for jane@example.com, account ID ABC123456, phone +1 (212) 555-0198 https://book.test/claim?token=secret123";
    const first = redactAdvisorInput(input);
    const second = redactAdvisorInput(input);
    expect(first).toEqual(second);
    expect(first.total).toBe(4);
    expect(first.text).not.toContain("jane@example.com");
    expect(first.text).not.toContain("ABC123456");
    expect(first.text).not.toContain("555-0198");
    expect(first.text).not.toContain("secret123");
  });

  it("preserves ordinary offer math", () => {
    const result = redactAdvisorInput("Bet $50 at +120 odds and receive a $10 bonus bet.");
    expect(result.total).toBe(0);
    expect(result.text).toContain("+120 odds");
  });

  it("keeps profile context local by default", () => {
    const envelope = buildAdvisorPrivacyEnvelope({
      promoText: "Get a $25 bonus after a qualifying wager.",
      appData: { bankroll: "500", done: { DraftKings: true, FanDuel: true } },
    });
    expect(envelope.body.userContext).toBeUndefined();
    expect(envelope.body.personalizationConsent).toBe(false);
    expect(envelope.receipt.profileIncluded).toBe(false);
    expect(envelope.receipt.estimatedTokensSaved).toBeGreaterThan(0);
  });

  it("includes only bounded named profile fields after consent", () => {
    const envelope = buildAdvisorPrivacyEnvelope({
      promoText: "Get a $25 bonus after a qualifying wager.",
      includeProfile: true,
      appData: { bankroll: "500", done: { DraftKings: true, FanDuel: true } },
    });
    expect(envelope.body.userContext).toEqual({ bankroll: 500, books: ["DraftKings", "FanDuel"] });
    expect(envelope.body.personalizationConsent).toBe(true);
    expect(envelope.receipt.profileFields).toEqual(["bankroll", "books"]);
  });

  it("renders personalization as an unchecked explicit opt-in", () => {
    const source = fs.readFileSync(path.resolve("src/components/PromoAdvisorPanel.jsx"), "utf8");
    expect(source).toContain("const [personalize, setPersonalize] = useState(false)");
    expect(source).toContain("only those named fields leave this browser");
  });

  it("sanitizes chat message and history while keeping profile local by default", () => {
    const envelope = buildChatPrivacyEnvelope({
      message: "Email jane@example.com about account ID ABC123456",
      history: [
        { role: "user", content: "My phone is +1 (212) 555-0198" },
        { role: "tool", content: "must be discarded" },
      ],
      appData: { bankroll: "500", done: { DraftKings: true } },
    });
    expect(envelope.body.message).not.toContain("jane@example.com");
    expect(envelope.body.history).toHaveLength(1);
    expect(envelope.body.history[0].content).not.toContain("555-0198");
    expect(envelope.body.userContext).toBeUndefined();
    expect(envelope.body.personalizationConsent).toBe(false);
    expect(envelope.receipt.redactionCount).toBe(3);
  });

  it("includes only consented named chat profile fields", () => {
    const envelope = buildChatPrivacyEnvelope({
      message: "Compare this offer",
      includeProfile: true,
      appData: { bankroll: "500", done: { DraftKings: true }, privateNote: "never send" },
    });
    expect(envelope.body.userContext).toEqual({ bankroll: 500, books: ["DraftKings"] });
    expect(envelope.body).not.toHaveProperty("privateNote");
    expect(envelope.receipt.profileFields).toEqual(["bankroll", "books"]);
  });

  it("renders Chat personalization as an unchecked explicit opt-in", () => {
    const source = fs.readFileSync(path.resolve("src/components/PromoChat.jsx"), "utf8");
    expect(source).toContain("const [personalize, setPersonalize] = useState(false)");
    expect(source).toContain("only those named fields leave this browser");
    expect(source).toContain('id="pg-chat-personalize"');
  });
});
