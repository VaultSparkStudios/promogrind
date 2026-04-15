const DEFAULT_ALLOWED_ORIGINS = [
  "https://promogrind.bet",
  "https://www.promogrind.bet",
  "https://vaultsparkstudios.com",
  "https://www.vaultsparkstudios.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function readAllowedOrigins() {
  const configured = (Deno.env.get("CORS_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

export function getCorsHeaders(req: Request, extraHeaders: HeadersInit = {}) {
  const allowedOrigins = readAllowedOrigins();
  const origin = req.headers.get("Origin");
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : DEFAULT_ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
    ...extraHeaders,
  };
}

export function json(req: Request, body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req, extraHeaders),
      "Content-Type": "application/json",
    },
  });
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Two layers:
//   1. inMemoryRateLimit — fast first-line defense; per-isolate sliding window.
//      Great for blocking rapid bursts from the same actor. Cheap. Not durable
//      across isolates, so not a substitute for (2) under adversarial load.
//   2. checkRateLimit     — durable second-line backed by vault_events counts.
//      Accurate across isolates, incurs one Supabase round trip. Use for
//      stricter per-user caps on expensive endpoints (AI calls).

type BucketEntry = { hits: number[]; evictAt: number };
const memBuckets = new Map<string, BucketEntry>();

export function inMemoryRateLimit(key: string, limit: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
} {
  const now = Date.now();
  let bucket = memBuckets.get(key);
  if (!bucket) {
    bucket = { hits: [], evictAt: now + windowMs };
    memBuckets.set(key, bucket);
  }
  // Prune hits older than the window.
  const cutoff = now - windowMs;
  bucket.hits = bucket.hits.filter((t) => t > cutoff);
  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now;
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, oldest + windowMs - now) };
  }
  bucket.hits.push(now);
  bucket.evictAt = now + windowMs;
  // Opportunistic cleanup to keep the map bounded.
  if (memBuckets.size > 1024) {
    for (const [k, v] of memBuckets.entries()) {
      if (v.evictAt < now) memBuckets.delete(k);
    }
  }
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterMs: 0 };
}

export function clientKey(req: Request, suffix: string): string {
  const ipHeader =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${suffix}:${ipHeader}`;
}

type CheckRateLimitArgs = {
  supabase: { from: (t: string) => unknown };
  userId: string;
  feature: string;
  limit: number;
  windowSeconds: number;
};

// Durable rate limit that counts vault_events rows matching feature/user in
// the trailing window. Returns `allowed` + remaining, or { error } on DB fault.
export async function checkRateLimit(args: CheckRateLimitArgs): Promise<{
  allowed: boolean;
  remaining: number;
  used: number;
  error?: string;
}> {
  const { supabase, userId, feature, limit, windowSeconds } = args;
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  // deno-lint-ignore no-explicit-any
  const query: any = supabase.from("vault_events");
  const { count, error } = await query
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", feature)
    .gte("created_at", since);
  if (error) {
    console.error(`[rate-limit:${feature}] count failed:`, error.message);
    return { allowed: true, remaining: limit, used: 0, error: error.message };
  }
  const used = count ?? 0;
  return { allowed: used < limit, remaining: Math.max(0, limit - used), used };
}

type EnforceRateLimitArgs = CheckRateLimitArgs & {
  req: Request;
  corsHeaders?: HeadersInit;
};

export async function enforceRateLimit(args: EnforceRateLimitArgs): Promise<Response | null> {
  const { req, corsHeaders = {}, windowSeconds } = args;
  const limit = await checkRateLimit(args);
  if (!limit.allowed) {
    return rateLimitResponse(req, windowSeconds, corsHeaders);
  }
  return null;
}

export function rateLimitResponse(
  req: Request,
  retryAfterSeconds: number,
  extraHeaders: HeadersInit = {},
) {
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded", retry_after_seconds: retryAfterSeconds }),
    {
      status: 429,
      headers: {
        ...getCorsHeaders(req, extraHeaders),
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))),
      },
    },
  );
}
