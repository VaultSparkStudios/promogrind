#!/usr/bin/env node
import assert from "node:assert/strict";
import { resolveTargetBrowserKey } from "./lib/supabase-client-authority.mjs";
import { PROMOGRIND_PROJECT_REF } from "./lib/supabase-deploy-plan.mjs";

const url = `https://${PROMOGRIND_PROJECT_REF}.supabase.co`;
const calls = [];
const fetchImpl = async (requestUrl, options = {}) => {
  calls.push({ requestUrl, authorization: options.headers?.Authorization });
  if (requestUrl.includes("/api-keys")) return new Response(JSON.stringify([
    { name: "service_role", type: "secret", api_key: "never-select" },
    { name: "publishable", type: "publishable", api_key: "current-public" },
  ]), { status: 200, headers: { "content-type": "application/json" } });
  const key = options.headers?.apikey;
  return new Response("{}", { status: key === "current-public" ? 200 : 401 });
};

const result = await resolveTargetBrowserKey({
  clientEnv: { SUPABASE_URL: url, SUPABASE_ANON_KEY: "stale-public" },
  managementEnv: { SUPABASE_ACCESS_TOKEN: "management-token" },
  fetchImpl,
});
assert.equal(result.key, "current-public");
assert.equal(result.source, "management-api:publishable");
assert.ok(calls.some((call) => call.requestUrl.includes(`/projects/${PROMOGRIND_PROJECT_REF}/api-keys?reveal=true`)));

const policyDeniedResult = await resolveTargetBrowserKey({
  clientEnv: { SUPABASE_URL: url, SUPABASE_ANON_KEY: "current-legacy" },
  managementEnv: {},
  fetchImpl: async () => new Response(JSON.stringify({
    code: "42501",
    message: "permission denied for table newsletter_subscribers",
  }), { status: 401, headers: { "content-type": "application/json" } }),
});
assert.equal(policyDeniedResult.key, "current-legacy");
assert.equal(policyDeniedResult.source, "secrets-gateway");
await assert.rejects(() => resolveTargetBrowserKey({ clientEnv: { SUPABASE_URL: "https://wrong.supabase.co" }, managementEnv: {}, fetchImpl }), /expected/);
console.log("Supabase client authority: PASS (stale key rejected, target key selected, insert-only RLS recognized, secret key ignored)");
