#!/usr/bin/env node
/**
 * scripts/sync-github-secrets.mjs
 *
 * Sync repo-side admin/service secrets from local `.env.admin` to GitHub
 * Actions secrets via `gh secret set`. Idempotent: only sets keys that exist
 * in `.env.admin`.
 *
 * Preconditions:
 *   - `gh` CLI installed and authenticated (gh auth login)
 *   - `.env.admin` populated locally with the canonical admin secrets
 *
 * Usage:
 *   node scripts/sync-github-secrets.mjs                 # sync default keys
 *   node scripts/sync-github-secrets.mjs --dry-run       # show plan, no write
 *   node scripts/sync-github-secrets.mjs --keys A,B      # only these keys
 *   node scripts/sync-github-secrets.mjs --repo OWNER/REPO
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "./lib/safe-spawn.mjs";

const ROOT = process.cwd();
const ADMIN_ENV = path.join(ROOT, ".env.admin");

const DEFAULT_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ACCESS_TOKEN",
];

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const repoIdx = args.indexOf("--repo");
const REPO = repoIdx >= 0 ? args[repoIdx + 1] : "VaultSparkStudios/promogrind";
const keysIdx = args.indexOf("--keys");
const KEYS = keysIdx >= 0 ? args[keysIdx + 1].split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_KEYS;

if (!fs.existsSync(ADMIN_ENV)) {
  console.error(`✗ Missing ${ADMIN_ENV}. Populate it before running.`);
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(ADMIN_ENV, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

console.log(`→ Repo: ${REPO}`);
console.log(`→ Source: ${path.relative(ROOT, ADMIN_ENV)}`);
console.log(`→ Keys: ${KEYS.join(", ")}`);
console.log(DRY ? "→ Mode: DRY RUN" : "→ Mode: WRITE");
console.log("");

let setCount = 0;
let skipCount = 0;

for (const key of KEYS) {
  const value = env[key];
  if (!value) {
    console.log(`  ⚠  ${key}: not in .env.admin — skipped`);
    skipCount++;
    continue;
  }
  if (DRY) {
    console.log(`  ◌  ${key}: would set (${value.length} chars)`);
    continue;
  }
  try {
    execFileSync("gh", ["secret", "set", key, "--repo", REPO, "--body", value], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    console.log(`  ✓  ${key}: set`);
    setCount++;
  } catch (err) {
    console.error(`  ✗  ${key}: failed — ${err.message}`);
    process.exit(1);
  }
}

console.log("");
console.log(DRY
  ? "Dry run complete. Re-run without --dry-run to write."
  : `✓ ${setCount} set, ${skipCount} skipped. Trigger redeploy: gh workflow run deploy-pages.yml --repo ${REPO}`);
