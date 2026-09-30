#!/usr/bin/env node
/** Build the deployable Pages artifact from browser-safe gateway values only. */
import { spawnSync } from "./lib/safe-spawn.mjs";
import { resolveCommandSpec } from "./lib/command-spec.mjs";
import { envForSpawn } from "./lib/secrets.mjs";
import { prepareCloudflareArtifact } from "./lib/cloudflare-pages-release.mjs";
import { resolvePinnedBrowserAuthority } from "./lib/supabase-client-authority.mjs";

const env = envForSpawn("supabase.client", ["VAPID_PUBLIC_KEY", "SUPABASE_PROJECT_REF", "VITE_SUPABASE_PROJECT_REF"]);
const managementEnv = envForSpawn("supabase.management");
let browserAuthority;
try {
  browserAuthority = await resolvePinnedBrowserAuthority({ clientEnv: env, managementEnv });
} catch {
  console.error("build-release-artifact: pinned PromoGrind browser authority could not be verified through the secrets gateway");
  process.exit(2);
}
const buildEnv = {
  ...env,
  VITE_SUPABASE_URL: browserAuthority.url,
  VITE_SUPABASE_ANON_KEY: browserAuthority.key,
  VITE_VAPID_PUBLIC_KEY: env.VAPID_PUBLIC_KEY || "",
};
const spec = resolveCommandSpec("npm", ["run", "build:pages"]);
const result = spawnSync(spec.executable, spec.args, {
  cwd: process.cwd(),
  env: buildEnv,
  stdio: "inherit",
});
if (result.error) console.error(`build-release-artifact: ${result.error.message}`);
if (result.status !== 0 || result.error) process.exit(result.status ?? 1);
const prepared = prepareCloudflareArtifact("dist");
console.log(`build-release-artifact: Cloudflare SPA artifact ready · browser authority=${browserAuthority.source} · GitHub 404 fallback removed=${prepared.removedGithubFallback}`);
