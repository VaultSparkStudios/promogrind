#!/usr/bin/env node
/**
 * PromoGrind — bundle budget gate
 *
 * Fails when the main application chunk in `dist/assets/` exceeds a raw-size
 * budget. Intended to run in CI right after `vite build` so regressions land
 * loud instead of silently shipping a 500KB main bundle on mobile.
 *
 *   node scripts/check-bundle-budget.mjs                      # default 420KB
 *   BUNDLE_BUDGET_KB=500 node scripts/check-bundle-budget.mjs # override
 *
 * Only the PRIMARY app entry chunk is checked (typically `index-*.js`).
 * Vendor/Supabase/analytics chunks have their own caching story and aren't
 * counted toward this budget.
 */

import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "dist", "assets");
const BUDGET_KB = Number.parseInt(process.env.BUNDLE_BUDGET_KB ?? "425", 10);
const BUDGET_BYTES = BUDGET_KB * 1024;

async function main() {
  if (!existsSync(ASSETS)) {
    console.error("[bundle-budget] dist/assets not found — run `vite build` first.");
    process.exit(2);
  }

  const files = await readdir(ASSETS);
  const jsFiles = files.filter((name) => name.endsWith(".js"));

  // Vite emits `index-*.js` for the main entry. Fall back to largest .js
  // chunk whose name doesn't match a known secondary chunk.
  const SECONDARY = /(^vendor-|^supabase-|^analytics-|^chunk-)/;
  const candidates = jsFiles.filter((name) => !SECONDARY.test(name));

  const sized = await Promise.all(
    candidates.map(async (name) => {
      const stats = await stat(join(ASSETS, name));
      return { name, size: stats.size };
    }),
  );

  const entry =
    sized.find((entry) => /^index[-.]/.test(entry.name)) ??
    sized.sort((a, b) => b.size - a.size)[0];

  if (!entry) {
    console.error("[bundle-budget] no main chunk detected in dist/assets.");
    process.exit(2);
  }

  const sizeKb = (entry.size / 1024).toFixed(1);
  const budgetMsg = `budget ${BUDGET_KB}KB · main chunk ${entry.name} = ${sizeKb}KB`;

  if (entry.size > BUDGET_BYTES) {
    console.error(`[bundle-budget] FAIL · ${budgetMsg}`);
    console.error("   Investigate with `npm run build -- --mode production` + the Vite rollup report,");
    console.error("   or bump BUNDLE_BUDGET_KB in the env if the growth is deliberate.");
    process.exit(1);
  }

  console.log(`[bundle-budget] OK · ${budgetMsg}`);
}

main().catch((err) => {
  console.error("[bundle-budget] failed:", err);
  process.exit(2);
});
