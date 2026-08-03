export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;
export const CHECKOUT_ORIGINS = Object.freeze(["https://promogrind.bet", "https://www.promogrind.bet"]);

type SignatureVerdict = {
  ok: boolean;
  reason: "verified" | "secret-missing" | "header-malformed" | "timestamp-stale" | "signature-mismatch";
  timestamp?: number;
};

function parseSignatureHeader(header: string): { timestamp: number; signatures: string[] } | null {
  const fields = header.split(",").map((part) => part.trim()).filter(Boolean);
  const timestampPart = fields.find((field) => field.startsWith("t="));
  const timestamp = Number(timestampPart?.slice(2));
  const signatures = fields
    .filter((field) => field.startsWith("v1="))
    .map((field) => field.slice(3).toLowerCase())
    .filter((signature) => /^[a-f0-9]{64}$/.test(signature));
  if (!Number.isInteger(timestamp) || timestamp <= 0 || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function hexBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export async function verifyStripeWebhook({
  payload,
  header,
  secret,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = STRIPE_SIGNATURE_TOLERANCE_SECONDS,
}: {
  payload: string;
  header: string;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): Promise<SignatureVerdict> {
  if (!secret) return { ok: false, reason: "secret-missing" };
  const parsed = parseSignatureHeader(header);
  if (!parsed) return { ok: false, reason: "header-malformed" };
  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) {
    return { ok: false, reason: "timestamp-stale", timestamp: parsed.timestamp };
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signedPayload = new TextEncoder().encode(`${parsed.timestamp}.${payload}`);
  for (const signature of parsed.signatures) {
    if (await crypto.subtle.verify("HMAC", key, hexBytes(signature).buffer as ArrayBuffer, signedPayload)) {
      return { ok: true, reason: "verified", timestamp: parsed.timestamp };
    }
  }
  return { ok: false, reason: "signature-mismatch", timestamp: parsed.timestamp };
}

export function parseStripeEvent(payload: string):
  | { ok: true; event: { id: string; type: string; data: { object: Record<string, unknown> } } }
  | { ok: false; error: string } {
  try {
    const event = JSON.parse(payload) as Record<string, unknown>;
    const data = event?.data as Record<string, unknown> | undefined;
    if (
      typeof event?.id !== "string" || !/^evt_[A-Za-z0-9_]{3,}$/.test(event.id) ||
      typeof event?.type !== "string" || !/^[a-z][a-z0-9_.]{2,80}$/.test(event.type) ||
      !data?.object || typeof data.object !== "object" || Array.isArray(data.object)
    ) return { ok: false, error: "Malformed Stripe event" };
    return { ok: true, event: event as { id: string; type: string; data: { object: Record<string, unknown> } } };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}

export function sanitizeCheckoutRedirect(
  value: unknown,
  fallback: string,
  allowedOrigins: readonly string[] = CHECKOUT_ORIGINS,
): string | null {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !allowedOrigins.includes(url.origin) || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeStripeMetadata(value: unknown, maxLength = 100): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function isStripeId(value: unknown, prefix: "sub" | "cus"): value is string {
  return typeof value === "string" && new RegExp(`^${prefix}_[A-Za-z0-9]{6,}$`).test(value);
}
