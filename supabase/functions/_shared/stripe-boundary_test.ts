import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  parseStripeEvent,
  sanitizeCheckoutRedirect,
  sanitizeStripeMetadata,
  verifyStripeWebhook,
} from "./stripe-boundary.ts";

async function signature(payload: string, timestamp: number, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.test("Stripe signatures require a secret, fresh timestamp, and any matching v1 signature", async () => {
  const payload = '{"id":"evt_test123","type":"invoice.paid","data":{"object":{}}}';
  const now = 2_000_000_000;
  const valid = await signature(payload, now, "whsec_test");
  assertEquals((await verifyStripeWebhook({ payload, header: `t=${now},v1=${"0".repeat(64)},v1=${valid}`, secret: "whsec_test", nowSeconds: now })).ok, true);
  assertEquals((await verifyStripeWebhook({ payload, header: `t=${now},v1=${valid}`, secret: "", nowSeconds: now })).reason, "secret-missing");
  assertEquals((await verifyStripeWebhook({ payload, header: `t=${now - 301},v1=${valid}`, secret: "whsec_test", nowSeconds: now })).reason, "timestamp-stale");
  assertEquals((await verifyStripeWebhook({ payload: `${payload} `, header: `t=${now},v1=${valid}`, secret: "whsec_test", nowSeconds: now })).reason, "signature-mismatch");
});

Deno.test("Stripe events and checkout redirects fail closed at their authority boundaries", () => {
  assert(parseStripeEvent('{"id":"evt_test123","type":"invoice.paid","data":{"object":{}}}').ok);
  assertEquals(parseStripeEvent('{"type":"invoice.paid","data":{"object":{}}}'), { ok: false, error: "Malformed Stripe event" });
  assertEquals(sanitizeCheckoutRedirect("https://promogrind.bet/account?checkout=success", "https://promogrind.bet/"), "https://promogrind.bet/account?checkout=success");
  assertEquals(sanitizeCheckoutRedirect("https://evil.example/steal", "https://promogrind.bet/"), null);
  assertEquals(sanitizeCheckoutRedirect("javascript:alert(1)", "https://promogrind.bet/"), null);
});

Deno.test("Stripe metadata is bounded and control-character free", () => {
  assertEquals(sanitizeStripeMetadata("  launch\n campaign  ", 20), "launch campaign");
  assertEquals(sanitizeStripeMetadata("x".repeat(150))?.length, 100);
  assertEquals(sanitizeStripeMetadata({ unsafe: true }), null);
});
