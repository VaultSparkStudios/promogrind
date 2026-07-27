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

import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { evaluateBundleBudget } from "./lib/bundle-budget.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "dist", "assets");
const MANIFEST = join(ROOT, "dist", ".vite", "manifest.json");
const kb = (name, fallback) => Number.parseInt(process.env[name] ?? String(fallback), 10) * 1024;
const BUDGETS = { initialRawBytes: kb("BUNDLE_INITIAL_RAW_KB", 750), initialGzipBytes: kb("BUNDLE_INITIAL_GZIP_KB", 210), asyncRawBytes: kb("BUNDLE_ASYNC_RAW_KB", 525), asyncGzipBytes: kb("BUNDLE_ASYNC_GZIP_KB", 180) };
const formatKb = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;

async function main() {
  if (!existsSync(ASSETS)) {
    console.error("[bundle-budget] dist/assets not found — run `vite build` first.");
    process.exit(2);
  }

  if (!existsSync(MANIFEST)) {
    console.error("[bundle-budget] Vite manifest missing — build.manifest must stay enabled.");
    process.exit(2);
  }
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const files = (await readdir(ASSETS)).filter((name) => name.endsWith(".js"));
  const assets = await Promise.all(files.map(async (name) => {
    const file = join(ASSETS, name);
    const [stats, body] = await Promise.all([stat(file), readFile(file)]);
    return { file: `assets/${name}`, rawBytes: stats.size, gzipBytes: gzipSync(body).byteLength };
  }));
  const result = evaluateBundleBudget({ manifest, assets, budgets: BUDGETS });
  const { measurements } = result;
  const largest = measurements.largestAsync;
  const summary = [`initial ${measurements.initialFiles.length} files`, `${formatKb(measurements.initialRawBytes)} raw/${formatKb(measurements.initialGzipBytes)} gzip`, largest ? `largest async ${largest.file} ${formatKb(largest.rawBytes)} raw/${formatKb(largest.gzipBytes)} gzip` : "no async chunks"].join(" · ");
  if (!result.pass) {
    console.error(`[bundle-budget] FAIL (${result.failures.join(", ")}) · ${summary}`);
    process.exit(1);
  }
  console.log(`[bundle-budget] OK · ${summary}`);
}

main().catch((err) => {
  console.error("[bundle-budget] failed:", err);
  process.exit(2);
});
