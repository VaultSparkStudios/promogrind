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
