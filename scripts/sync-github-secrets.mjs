#!/usr/bin/env node
/** Sync bounded PromoGrind Actions secrets through the Studio Ops gateway.
 * Default: dry run. Writes require --apply; --keys accepts comma-separated names.
 * Values travel to gh through stdin and never appear in arguments or logs.
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "./lib/safe-spawn.mjs";
import { browserKeyIsPrivileged, resolvePinnedBrowserAuthority } from "./lib/supabase-client-authority.mjs";

export const TARGET_REPOSITORY = "VaultSparkStudios/promogrind";
export const DEFAULT_KEYS = Object.freeze(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ACCESS_TOKEN"]);
const KEY_SOURCES = Object.freeze({
  SUPABASE_SERVICE_ROLE_KEY: { names: ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"], capability: "supabase.admin" },
  SUPABASE_ACCESS_TOKEN: { names: ["SUPABASE_ACCESS_TOKEN"], capability: "supabase.management" },
  // Pages requires the studio token; the narrower Workers token cannot deploy Pages.
  CLOUDFLARE_API_TOKEN: { names: ["CLOUDFLARE_STUDIO_TOKEN"], capability: "cloudflare.deploy" },
  CLOUDFLARE_ACCOUNT_ID: { names: ["CLOUDFLARE_ACCOUNT_ID"], capability: "cloudflare.deploy" },
  CLOUDFLARE_DNS_TOKEN: { names: ["CLOUDFLARE_DNS_TOKEN"], capability: "cloudflare.dns" },
  VITE_SUPABASE_URL: { names: ["SUPABASE_URL", "VITE_SUPABASE_URL"], capability: "supabase.client" },
  VITE_SUPABASE_ANON_KEY: { names: ["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"], capability: "supabase.client" },
  VITE_VAPID_PUBLIC_KEY: { names: ["VAPID_PUBLIC_KEY", "VITE_VAPID_PUBLIC_KEY"], capability: "cloudflare.vapid" },
});
export const ALLOWED_KEYS = Object.freeze(Object.keys(KEY_SOURCES));
class SecretSyncError extends Error {}

export function parseSyncOptions(args = []) {
  let apply = false, dryRun = false, repo = TARGET_REPOSITORY, selectedKeys = null;
  const seen = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (seen.has(flag)) throw new SecretSyncError("Repeated options are not allowed.");
    seen.add(flag);
    if (flag === "--apply") apply = true;
    else if (flag === "--dry-run") dryRun = true;
    else if (flag === "--keys" || flag === "--repo") {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new SecretSyncError("Option requires a value.");
      if (flag === "--repo") repo = value;
      else selectedKeys = value.split(",").map((key) => key.trim());
    } else throw new SecretSyncError("Unknown secret-sync option.");
  }
  if (apply && dryRun) throw new SecretSyncError("Choose --apply or --dry-run, not both.");
  if (repo !== TARGET_REPOSITORY) throw new SecretSyncError("Secret sync is restricted to VaultSparkStudios/promogrind.");
  const keys = selectedKeys || [...DEFAULT_KEYS];
  if (!keys.length || keys.some((key) => !Object.hasOwn(KEY_SOURCES, key))) throw new SecretSyncError("Secret selection contains an unsupported or empty key.");
  if (new Set(keys).size !== keys.length) throw new SecretSyncError("Duplicate secret keys are not allowed.");
  return { apply, repo, keys };
}

/** Resolve every selected key before allowing the first write. Values stay internal. */
export async function resolveSyncPlan(options, { getSecret, resolveBrowserKey = resolvePinnedBrowserAuthority }) {
  const cache = new Map();
  async function read(names, capability) {
    for (const name of names) {
      if (!cache.has(name)) cache.set(name, await getSecret(name, capability));
      const value = cache.get(name);
      if (typeof value === "string" && value.trim()) return value;
    }
    return null;
  }
  const entries = [], missing = [];
  const browserConfigSelected = options.keys.some((key) => key === "VITE_SUPABASE_URL" || key === "VITE_SUPABASE_ANON_KEY");
  let clientUrl = null, browserCandidate = null, managementToken = null, projectRef = null, viteProjectRef = null;
  try {
    for (const key of options.keys) {
      const source = KEY_SOURCES[key];
      const value = await read(source.names, source.capability);
      entries.push({ key, value });
      if (!value && !["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"].includes(key)) missing.push(key);
    }
    if (browserConfigSelected) {
      const source = KEY_SOURCES.VITE_SUPABASE_URL;
      clientUrl = await read(source.names, source.capability);
      browserCandidate = await read(KEY_SOURCES.VITE_SUPABASE_ANON_KEY.names, "supabase.client");
      managementToken = await read(["SUPABASE_ACCESS_TOKEN"], "supabase.management");
      projectRef = await read(["SUPABASE_PROJECT_REF"], "supabase.client");
      viteProjectRef = await read(["VITE_SUPABASE_PROJECT_REF"], "supabase.client");
      if (!browserCandidate && !managementToken) missing.push("VITE_SUPABASE_ANON_KEY");
    }
  } catch { throw new SecretSyncError("Secrets gateway resolution failed; no secrets were written."); }
  if (missing.length) throw new SecretSyncError(`Missing gateway credentials: ${missing.join(", ")}. No secrets were written.`);
  if (browserConfigSelected) {
    let authority;
    try {
      authority = await resolveBrowserKey({
        clientEnv: { SUPABASE_URL: clientUrl, SUPABASE_ANON_KEY: browserCandidate, SUPABASE_PROJECT_REF: projectRef, VITE_SUPABASE_PROJECT_REF: viteProjectRef },
        managementEnv: { SUPABASE_ACCESS_TOKEN: managementToken },
      });
    } catch { throw new SecretSyncError("Target Supabase browser-key verification failed; no secrets were written."); }
    if (typeof authority?.key !== "string" || !authority.key.trim() || browserKeyIsPrivileged(authority.key)) throw new SecretSyncError("Refusing an invalid or privileged browser key; no secrets were written.");
    const browserEntry = entries.find(({ key }) => key === "VITE_SUPABASE_ANON_KEY");
    const urlEntry = entries.find(({ key }) => key === "VITE_SUPABASE_URL");
    if (browserEntry) browserEntry.value = authority.key;
    if (urlEntry) urlEntry.value = authority.url;
  }
  return entries;
}

async function loadGateway() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const gateway = path.resolve(root, "..", "vaultspark-studio-ops", "scripts", "lib", "secrets.mjs");
  return import(pathToFileURL(gateway).href);
}

export async function runSecretSync({ argv = [], getSecret, resolveBrowserKey, run = execFileSync, log = console.log } = {}) {
  const written = [];
  try {
    const options = parseSyncOptions(argv);
    if (!getSecret) {
      try { ({ getSecret } = await loadGateway()); }
      catch { throw new SecretSyncError("Studio Ops secrets gateway is unavailable; no secrets were written."); }
    }
    const entries = await resolveSyncPlan(options, { getSecret, resolveBrowserKey });
    log(`Repository: ${TARGET_REPOSITORY}`);
    log(`Mode: ${options.apply ? "APPLY" : "DRY RUN"}`);
    for (const { key, value } of entries) {
      if (!options.apply) { log(`${key}: ready`); continue; }
      try {
        run("gh", ["secret", "set", key, "--repo", TARGET_REPOSITORY], {
          input: value, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], windowsHide: true, timeout: 30_000,
        });
      } catch { throw new SecretSyncError(`GitHub secret write failed for ${key}; ${written.length} earlier write(s) completed. Provider output suppressed.`); }
      written.push(key);
      log(`${key}: set`);
    }
    log(options.apply ? `Applied ${written.length} secret(s).` : "Dry run complete. Use --apply to write this selection.");
    return { ok: true, mode: options.apply ? "apply" : "dry-run", keys: options.keys, written };
  } catch (error) {
    const message = error instanceof SecretSyncError ? error.message : "Secret sync failed; provider output suppressed.";
    log(message);
    return { ok: false, written, error: message };
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runSecretSync({ argv: process.argv.slice(2) });
  process.exitCode = result.ok ? 0 : 1;
}
