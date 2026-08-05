#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const captureDir = path.join(root, "docs", "visual-qa", "captures");
const output = path.join(root, "docs", "visual-qa", "S128_PIXEL_AUDIT.json");
const files = fs.readdirSync(captureDir).filter((file) => /^s128-after-.*\.png$/.test(file)).sort();
const surfaces = ["arb-3way", "referral", "scanner", "sgp", "teaser", "tool-mix"];
const cases = ["desktop-dark", "desktop-light", "mobile-dark", "mobile-light"];
if (files.length !== surfaces.length * cases.length) throw new Error(`Expected 24 S128 captures, found ${files.length}`);

const captures = [];
for (const file of files) {
  const resolved = path.join(captureDir, file);
  const bytes = fs.readFileSync(resolved);
  const image = sharp(bytes);
  const metadata = await image.metadata();
  const stats = await image.stats();
  const channels = stats.channels.slice(0, 3);
  const meanLuminance = channels.reduce((sum, channel) => sum + channel.mean, 0) / channels.length;
  const meanStdev = channels.reduce((sum, channel) => sum + channel.stdev, 0) / channels.length;
  const meanEntropy = Number(stats.entropy || 0);
  const tonalSpan = channels.reduce((lowest, channel) => Math.min(lowest, channel.max - channel.min), Infinity);
  const desktop = file.includes("desktop-");
  const checks = {
    dimensions: metadata.width === (desktop ? 1440 : 390) && metadata.height === (desktop ? 1000 : 844),
    // Sparse desktop states legitimately devote most pixels to a uniform canvas;
    // require both variation and entropy while letting the tonal-range gate catch
    // collapsed/blank renders independently.
    nonBlank: meanStdev >= 15 && meanEntropy >= 2.3,
    tonalRange: tonalSpan >= 80,
    opaque: metadata.hasAlpha !== true || stats.isOpaque === true,
  };
  captures.push({ file: `captures/${file}`, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), width: metadata.width, height: metadata.height, meanLuminance: Number(meanLuminance.toFixed(2)), meanStdev: Number(meanStdev.toFixed(2)), meanEntropy: Number(meanEntropy.toFixed(3)), tonalSpan, checks });
}

const pairs = [];
for (const surface of surfaces) {
  for (const viewport of ["desktop", "mobile"]) {
    const dark = captures.find((entry) => entry.file.includes(`-${surface}-${viewport}-dark.png`));
    const light = captures.find((entry) => entry.file.includes(`-${surface}-${viewport}-light.png`));
    if (!dark || !light) throw new Error(`Missing ${surface}/${viewport} theme pair`);
    const luminanceDelta = Number((light.meanLuminance - dark.meanLuminance).toFixed(2));
    pairs.push({ surface, viewport, dark: dark.file, light: light.file, luminanceDelta, pass: luminanceDelta >= 25 && dark.sha256 !== light.sha256 });
  }
}

const hashes = new Set(captures.map((entry) => entry.sha256));
const failedCaptures = captures.filter((entry) => Object.values(entry.checks).some((value) => !value));
const failedPairs = pairs.filter((entry) => !entry.pass);
const audit = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  method: "Sharp statistics over exact real-Chromium PNG bytes, paired with capture-time required-state and horizontal-overflow assertions.",
  limitation: "Semantic image inspection is attempted separately; this auditor reports objective pixels, not visual taste.",
  pass: failedCaptures.length === 0 && failedPairs.length === 0 && hashes.size === captures.length,
  uniqueHashes: hashes.size,
  captures,
  themePairs: pairs,
  failures: { captures: failedCaptures.map((entry) => entry.file), themePairs: failedPairs.map((entry) => `${entry.surface}/${entry.viewport}`) },
};
fs.writeFileSync(output, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ pass: audit.pass, captures: captures.length, uniqueHashes: hashes.size, failedCaptures: failedCaptures.length, failedPairs: failedPairs.length, output: path.relative(root, output) }, null, 2));
if (!audit.pass) process.exit(1);
