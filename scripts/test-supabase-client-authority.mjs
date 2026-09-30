#!/usr/bin/env node
import assert from "node:assert/strict";
import { resolveTargetBrowserKey, resolvePinnedBrowserAuthority } from "./lib/supabase-client-authority.mjs";
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
const pinnedCalls = [];
const pinnedFetch = async (requestUrl, options = {}) => {
  pinnedCalls.push({ requestUrl, headers: options.headers });
  if (requestUrl === `https://api.supabase.com/v1/projects/${PROMOGRIND_PROJECT_REF}/api-keys?reveal=true`) return new Response(JSON.stringify([
    { name: "anon", type: "secret", api_key: "sb_secret_do-not-publish" },
    { type: "publishable", api_key: "pinned-public" },
  ]), { status: 200 });
  assert.ok(requestUrl.startsWith(`${url}/rest/v1/`));
  return new Response("{}", { status: options.headers.apikey === "pinned-public" ? 200 : 401 });
};
const pinned = await resolvePinnedBrowserAuthority({
  clientEnv: { SUPABASE_URL: "https://another-project.supabase.co", SUPABASE_ANON_KEY: "another-project-key" },
  managementEnv: { SUPABASE_ACCESS_TOKEN: "management-fixture" },
  fetchImpl: pinnedFetch,
});
assert.equal(pinned.url, url);
assert.equal(pinned.key, "pinned-public");
assert.equal(pinned.configuredTargetMatch, false);
assert.equal(pinned.source, "management-api:publishable");
assert.equal(pinnedCalls.length, 2);
assert.ok(pinnedCalls[0].requestUrl.endsWith(`/${PROMOGRIND_PROJECT_REF}/api-keys?reveal=true`));
assert.ok(!JSON.stringify(pinnedCalls).includes("another-project"));
assert.ok(!JSON.stringify(pinnedCalls).includes("sb_secret_do-not-publish"));
const forbidFetch = () => { throw new Error("Provider must not be called"); };
await assert.rejects(() => resolvePinnedBrowserAuthority({ target: "another-project", fetchImpl: forbidFetch }), /pinned/);
await assert.rejects(() => resolvePinnedBrowserAuthority({ clientEnv: { SUPABASE_PROJECT_REF: "another-project" }, fetchImpl: forbidFetch }), /pinned/);
await assert.rejects(() => resolvePinnedBrowserAuthority({ clientEnv: { VITE_SUPABASE_PROJECT_REF: "another-project" }, fetchImpl: forbidFetch }), /pinned/);
await assert.rejects(() => resolvePinnedBrowserAuthority({ clientEnv: { SUPABASE_URL: "https://another-project.supabase.co", SUPABASE_ANON_KEY: "another-key" }, fetchImpl: forbidFetch }), /management authority is unavailable/);
console.log("Supabase client authority: PASS (stale/generic keys discarded, exact target discovery, explicit target mismatch refused, insert-only RLS recognized, secret key ignored)");
