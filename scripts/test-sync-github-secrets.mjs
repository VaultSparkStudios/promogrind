#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { ALLOWED_KEYS, DEFAULT_KEYS, TARGET_REPOSITORY, parseSyncOptions, runSecretSync } from "./sync-github-secrets.mjs";
import { resolvePinnedBrowserAuthority } from "./lib/supabase-client-authority.mjs";
import { PROMOGRIND_PROJECT_REF } from "./lib/supabase-deploy-plan.mjs";

const origin = `https://${PROMOGRIND_PROJECT_REF}.supabase.co`;
const fixtures = {
  SUPABASE_SERVICE_ROLE_KEY: "fixture-service", SUPABASE_ACCESS_TOKEN: "fixture-management",
  CLOUDFLARE_STUDIO_TOKEN: "fixture-pages", CLOUDFLARE_API_TOKEN: "fixture-workers",
  CLOUDFLARE_ACCOUNT_ID: "fixture-account", CLOUDFLARE_DNS_TOKEN: "fixture-dns",
  SUPABASE_URL: origin, SUPABASE_ANON_KEY: "fixture-old-browser", VAPID_PUBLIC_KEY: "fixture-vapid",
};
function harness(overrides = {}) {
  const writes = [], reads = [], logs = [];
  const values = { ...fixtures, ...overrides };
  return {
    writes, reads, logs,
    deps: {
      getSecret: async (key, capability) => { reads.push({ key, capability }); return values[key] ?? null; },
      run: (command, args, options) => { writes.push({ command, args, options }); },
      log: (message) => logs.push(message),
      resolveBrowserKey: (input) => resolvePinnedBrowserAuthority({ ...input, fetchImpl: async (url, options) => {
        if (url.includes("api.supabase.com")) return { ok: true, json: async () => [{ type: "publishable", api_key: "fixture-verified-browser" }] };
        return { ok: options.headers.apikey === "fixture-verified-browser", status: 401, json: async () => ({ message: "invalid key" }) };
      } }),
    },
  };
}
let passing = 0;
async function check(name, callback) { await callback(); passing += 1; console.log(`✓ ${name}`); }
const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error("Offline test attempted a real provider call"); };
try {
  await check("default mode is dry run with only existing admin defaults", async () => {
    assert.deepEqual(parseSyncOptions([]), { apply: false, repo: TARGET_REPOSITORY, keys: [...DEFAULT_KEYS] });
    const h = harness();
    const result = await runSecretSync(h.deps);
    assert.equal(result.ok, true);
    assert.equal(result.mode, "dry-run");
    assert.equal(h.writes.length, 0);
    assert.deepEqual(h.reads.map(({ key }) => key), DEFAULT_KEYS);
    assert.ok(!JSON.stringify([result, h.logs]).includes(fixtures.SUPABASE_SERVICE_ROLE_KEY));
  });
  await check("all allowed destinations map through the gateway, Pages uses Pages authority", async () => {
    const h = harness();
    const result = await runSecretSync({ ...h.deps, argv: ["--keys", ALLOWED_KEYS.join(","), "--apply"] });
    assert.equal(result.ok, true);
    assert.deepEqual(result.written, ALLOWED_KEYS);
    for (const call of h.writes) {
      assert.equal(call.command, "gh");
      assert.deepEqual(call.args.slice(0, 2), ["secret", "set"]);
      assert.deepEqual(call.args.slice(3), ["--repo", TARGET_REPOSITORY]);
      assert.equal(call.args.includes("--body"), false);
      assert.deepEqual(call.options.stdio, ["pipe", "pipe", "pipe"]);
      assert.equal(call.options.windowsHide, true);
      assert.ok(!JSON.stringify([call.args, h.logs, result]).includes(call.options.input));
    }
    assert.equal(h.writes.find((call) => call.args[2] === "CLOUDFLARE_API_TOKEN").options.input, fixtures.CLOUDFLARE_STUDIO_TOKEN);
    assert.equal(h.writes.find((call) => call.args[2] === "VITE_SUPABASE_ANON_KEY").options.input, "fixture-verified-browser");
    assert.ok(h.reads.every(({ capability }) => capability.includes(".")));
  });
  await check("unknown keys, wrong repository and ambiguous arguments fail before credentials", async () => {
    for (const argv of [
      ["--keys", "VITE_SUPABASE_SERVICE_ROLE_KEY"], ["--keys", "ORG_PAT"],
      ["--keys", "CLOUDFLARE_API_TOKEN,"], ["--keys"], ["--keys", "CLOUDFLARE_API_TOKEN,CLOUDFLARE_API_TOKEN"],
      ["--repo", "other/project"], ["--apply", "--dry-run"], ["--apply", "--apply"], ["--unknown"],
    ]) {
      const h = harness();
      assert.equal((await runSecretSync({ ...h.deps, argv })).ok, false);
      assert.equal(h.reads.length, 0);
      assert.equal(h.writes.length, 0);
    }
  });
  await check("one missing selected value prevents every write and browser provider call", async () => {
    const h = harness({ VAPID_PUBLIC_KEY: null });
    const result = await runSecretSync({
      ...h.deps, argv: ["--apply", "--keys", "CLOUDFLARE_API_TOKEN,VITE_SUPABASE_ANON_KEY,VITE_VAPID_PUBLIC_KEY"],
      resolveBrowserKey: () => { throw new Error("must not reach provider"); },
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /Missing gateway credentials: VITE_VAPID_PUBLIC_KEY/);
    assert.equal(h.writes.length, 0);
  });
  await check("missing target authority or conflicting explicit project ref fails before writes", async () => {
    for (const overrides of [
      { SUPABASE_ANON_KEY: null, SUPABASE_ACCESS_TOKEN: null },
      { SUPABASE_URL: "https://other.supabase.co", SUPABASE_ACCESS_TOKEN: null },
      { SUPABASE_URL: origin.replace("https:", "http:"), SUPABASE_ACCESS_TOKEN: null },
      { SUPABASE_URL: `${origin}/unexpected-path`, SUPABASE_ACCESS_TOKEN: null },
      { SUPABASE_PROJECT_REF: "other-project" },
      { VITE_SUPABASE_PROJECT_REF: "other-project" },
    ]) {
      const h = harness(overrides);
      assert.equal((await runSecretSync({ ...h.deps, argv: ["--apply", "--keys", "VITE_SUPABASE_ANON_KEY"] })).ok, false);
      assert.equal(h.writes.length, 0);
    }
  });
  await check("browser aliases and service fallback remain gateway-only", async () => {
    const h = harness({ SUPABASE_SERVICE_ROLE_KEY: null, SUPABASE_SERVICE_KEY: "fixture-service-alias", SUPABASE_URL: null, VITE_SUPABASE_URL: origin, VAPID_PUBLIC_KEY: null, VITE_VAPID_PUBLIC_KEY: "fixture-vapid-alias" });
    const result = await runSecretSync({ ...h.deps, argv: ["--apply", "--keys", "SUPABASE_SERVICE_ROLE_KEY,VITE_SUPABASE_URL,VITE_VAPID_PUBLIC_KEY"] });
    assert.equal(result.ok, true);
    assert.deepEqual(h.writes.map((entry) => entry.options.input), ["fixture-service-alias", origin, "fixture-vapid-alias"]);
  });
  await check("privileged browser credentials are refused both before and after authority resolution", async () => {
    const privileged = ["sb_secret_fixture", `e30.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.fixture`];
    for (const key of privileged) {
      for (const resolved of [false, true]) {
        const h = harness(resolved ? {} : { SUPABASE_ANON_KEY: key });
        const result = await runSecretSync({ ...h.deps, argv: ["--apply", "--keys", "VITE_SUPABASE_ANON_KEY"], resolveBrowserKey: async () => ({ key }) });
        assert.equal(result.ok, false);
        assert.equal(h.writes.length, 0);
        assert.ok(!JSON.stringify([result, h.logs]).includes(key));
      }
    }
  });
  await check("stale browser key resolves through existing target authority with offline responses", async () => {
    const h = harness();
    const requests = [];
    const fetchImpl = async (url, options) => {
      requests.push({ url, options });
      if (url.includes("api.supabase.com")) return { ok: true, json: async () => [{ type: "publishable", api_key: "sb_publishable_fixture" }] };
      return { ok: options.headers.apikey === "sb_publishable_fixture", status: 401, json: async () => ({ message: "invalid key" }) };
    };
    const result = await runSecretSync({ ...h.deps, argv: ["--apply", "--keys", "VITE_SUPABASE_ANON_KEY"], resolveBrowserKey: (input) => resolvePinnedBrowserAuthority({ ...input, fetchImpl }) });
    assert.equal(result.ok, true);
    assert.equal(requests.length, 3);
    assert.ok(requests[1].url.includes(`/projects/${PROMOGRIND_PROJECT_REF}/api-keys`));
    assert.equal(h.writes[0].options.input, "sb_publishable_fixture");
  });
  await check("generic credentials from another app are discarded before exact target discovery", async () => {
    const h = harness({ SUPABASE_URL: "https://other.supabase.co", SUPABASE_ANON_KEY: "fixture-other-app-key" });
    const requests = [];
    const fetchImpl = async (url, options) => {
      requests.push({ url, options });
      if (url === `https://api.supabase.com/v1/projects/${PROMOGRIND_PROJECT_REF}/api-keys?reveal=true`) return { ok: true, json: async () => [{ type: "publishable", api_key: "sb_publishable_pinned_fixture" }] };
      assert.ok(url.startsWith(`${origin}/rest/v1/`));
      return { ok: options.headers.apikey === "sb_publishable_pinned_fixture", status: 200 };
    };
    const result = await runSecretSync({ ...h.deps, argv: ["--apply", "--keys", "VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY"], resolveBrowserKey: (input) => resolvePinnedBrowserAuthority({ ...input, fetchImpl }) });
    assert.equal(result.ok, true);
    assert.equal(requests.length, 2);
    assert.ok(requests[0].url.includes(`/${PROMOGRIND_PROJECT_REF}/api-keys`));
    assert.ok(!JSON.stringify(requests).includes("fixture-other-app-key"));
    assert.ok(!JSON.stringify(requests).includes("other.supabase.co"));
    assert.deepEqual(h.writes.map(({ options }) => options.input), [origin, "sb_publishable_pinned_fixture"]);
  });
  await check("provider and gateway errors cannot reveal credentials, partial writes are explicit", async () => {
    const h = harness();
    let writes = 0;
    const result = await runSecretSync({ ...h.deps, argv: ["--apply"], run: () => { if (++writes === 2) throw new Error(fixtures.SUPABASE_ACCESS_TOKEN); } });
    assert.equal(result.ok, false);
    assert.deepEqual(result.written, ["SUPABASE_SERVICE_ROLE_KEY"]);
    assert.match(result.error, /1 earlier write/);
    assert.ok(!JSON.stringify([result, h.logs]).includes(fixtures.SUPABASE_ACCESS_TOKEN));
    const failedGateway = await runSecretSync({ ...h.deps, getSecret: () => { throw new Error(fixtures.SUPABASE_ACCESS_TOKEN); } });
    assert.equal(failedGateway.ok, false);
    assert.ok(!JSON.stringify([failedGateway, h.logs]).includes(fixtures.SUPABASE_ACCESS_TOKEN));
  });
  await check("sync implementation does not read credential files or ambient credential values", async () => {
    const source = fs.readFileSync(new URL("./sync-github-secrets.mjs", import.meta.url), "utf8");
    assert.doesNotMatch(source, /readFile|dotenv|\.env\.admin|process\.env|--body/);
    assert.match(source, /vaultspark-studio-ops/);
  });
} finally { globalThis.fetch = originalFetch; }
console.log(`GitHub secret sync: ${passing}/${passing} offline tests passing; no provider calls or secret writes`);
