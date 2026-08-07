import { PROMOGRIND_PROJECT_REF, assertTargetAdminUrl } from "./supabase-deploy-plan.mjs";

export async function resolveTargetBrowserKey({ clientEnv, managementEnv, fetchImpl = fetch, target = PROMOGRIND_PROJECT_REF }) {
  assertTargetAdminUrl(clientEnv?.SUPABASE_URL, target);
  const url = clientEnv.SUPABASE_URL;
  if (clientEnv.SUPABASE_ANON_KEY && (await probeTarget(fetchImpl, url, clientEnv.SUPABASE_ANON_KEY)).ok) {
    return { key: clientEnv.SUPABASE_ANON_KEY, source: "secrets-gateway", target };
  }
  if (!managementEnv?.SUPABASE_ACCESS_TOKEN) throw new Error("Supabase browser key is invalid and management authority is unavailable");
  const response = await fetchImpl(`https://api.supabase.com/v1/projects/${target}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${managementEnv.SUPABASE_ACCESS_TOKEN}` },
    signal: AbortSignal.timeout(20_000),
  });
  const keys = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(keys)) throw new Error(`Supabase API-key discovery returned HTTP ${response.status}`);
  const candidates = keys.filter((entry) =>
    typeof entry?.api_key === "string"
    && (entry.type === "publishable" || entry.name === "anon" || entry.prefix?.startsWith("sb_publishable_"))
  );
  const candidateProbes = [];
  for (const candidate of candidates) {
    const probe = await probeTarget(fetchImpl, url, candidate.api_key);
    candidateProbes.push({ name: candidate.name, type: candidate.type, status: probe.status });
    if (probe.ok) {
      return { key: candidate.api_key, source: `management-api:${candidate.type || candidate.name || "browser"}`, target };
    }
  }
  const publicMetadata = keys.map(({ name, type, prefix, api_key: apiKey }) => ({
    name,
    type,
    prefix,
    revealed: typeof apiKey === "string" && apiKey.length > 0,
  }));
  throw new Error(`No target-valid Supabase browser key was returned by the Management API (${JSON.stringify({ keys: publicMetadata, probes: candidateProbes })})`);
}

async function probeTarget(fetchImpl, url, key) {
  try {
    // Validate the exact browser-facing relation. The PostgREST root can require
    // JWT-style Authorization even when a modern publishable key is valid via
    // the `apikey` header, which would incorrectly reject the current key.
    const response = await fetchImpl(`${url}/rest/v1/newsletter_subscribers?select=id&limit=0`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) return { ok: true, status: response.status };
    // The capture table intentionally grants no SELECT privilege to anonymous
    // clients. Reaching Postgres and receiving 42501 proves the API key passed
    // the gateway; an invalid/stale key is rejected by the gateway instead.
    const body = await response.json().catch(() => null);
    const deniedByTablePolicy = response.status === 401
      && body?.code === "42501"
      && /permission denied for table newsletter_subscribers/i.test(body?.message || "");
    return { ok: deniedByTablePolicy, status: response.status };
  } catch {
    return { ok: false, status: "network-error" };
  }
}
