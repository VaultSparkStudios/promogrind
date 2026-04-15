#!/usr/bin/env node
/**
 * PromoGrind — image optimization pipeline
 *
 * Scans `public/` for *.png and emits sibling AVIF + WebP versions whenever
 * the source is newer than the optimized output. Re-runs are fast: it skips
 * assets that are already up-to-date.
 *
 *   node scripts/optimize-images.mjs            # run once
 *   npm run optimize:images                     # convenience wrapper
 *
 * Sharp is already a devDependency. On hosts where it's unavailable the
 * script degrades to a warning and exits 0 so CI/builds don't break.
 */

import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "public");

async function walkPngs(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip generated paths + language landing folders (static HTML only)
      if (/^(landing|blog|js)$/.test(entry.name)) continue;
      out.push(...(await walkPngs(full)));
    } else if (entry.isFile() && /\.png$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

async function isStale(src, dest) {
  if (!existsSync(dest)) return true;
  const [s, d] = await Promise.all([stat(src), stat(dest)]);
  return s.mtimeMs > d.mtimeMs;
}

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch (err) {
    console.warn("[optimize-images] sharp not available — skipping:", err?.message || err);
    return;
  }

  const pngs = await walkPngs(PUBLIC_DIR);
  if (!pngs.length) {
    console.log("[optimize-images] no PNGs in public/, nothing to do.");
    return;
  }

  let wrote = 0;
  for (const src of pngs) {
    const dir = dirname(src);
    const base = basename(src, extname(src));
    const avif = join(dir, `${base}.avif`);
    const webp = join(dir, `${base}.webp`);

    if (await isStale(src, avif)) {
      await sharp(src).avif({ quality: 55, effort: 4 }).toFile(avif);
      wrote++;
    }
    if (await isStale(src, webp)) {
      await sharp(src).webp({ quality: 78 }).toFile(webp);
      wrote++;
    }
  }
  console.log(`[optimize-images] ${pngs.length} PNG sources · ${wrote} files written (AVIF+WebP).`);
}

main().catch((err) => {
  console.error("[optimize-images] failed:", err);
  process.exitCode = 1;
});
