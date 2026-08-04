#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const captureDir = path.join(root, "docs", "visual-qa", "captures");
const output = path.join(root, "docs", "visual-qa", "S127_PIXEL_AUDIT.json");
const files = fs.readdirSync(captureDir).filter((file) => /^s127-after-.*\.png$/.test(file)).sort();
const expectedSurfaces = ["advisor", "bet-tracker", "dashboard", "ledger", "track"];
const expectedCases = ["desktop-dark", "desktop-light", "mobile-dark", "mobile-light"];

if (files.length !== expectedSurfaces.length * expectedCases.length) {
  throw new Error(`Expected 20 S127 captures, found ${files.length}`);
}

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
  // Sharp exposes image entropy on the stats object. Older/newer builds may
  // additionally expose per-channel entropy, so prefer the canonical aggregate
  // and retain a guarded fallback instead of silently producing NaN.
  const channelEntropies = channels
    .map((channel) => Number(channel.entropy))
    .filter(Number.isFinite);
  const meanEntropy = Number.isFinite(Number(stats.entropy))
    ? Number(stats.entropy)
    : channelEntropies.length
      ? channelEntropies.reduce((sum, entropy) => sum + entropy, 0) / channelEntropies.length
      : 0;
  const tonalSpan = channels.reduce((lowest, channel) => Math.min(lowest, channel.max - channel.min), Number.POSITIVE_INFINITY);
  const expectedWidth = file.includes("desktop-") ? 1440 : 390;
  const expectedHeight = file.includes("desktop-") ? 1000 : 844;
  const checks = {
    dimensions: metadata.width === expectedWidth && metadata.height === expectedHeight,
    nonBlank: meanStdev >= 18 && meanEntropy >= 3,
    tonalRange: tonalSpan >= 80,
    opaque: metadata.hasAlpha !== true || stats.isOpaque === true,
  };
  captures.push({
    file: `captures/${file}`,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    width: metadata.width,
    height: metadata.height,
    meanLuminance: Math.round(meanLuminance * 100) / 100,
    meanStdev: Math.round(meanStdev * 100) / 100,
    meanEntropy: Math.round(meanEntropy * 1000) / 1000,
    tonalSpan,
    checks,
  });
}

const hashes = new Set(captures.map((capture) => capture.sha256));
const pairs = [];
for (const surface of expectedSurfaces) {
  for (const viewport of ["desktop", "mobile"]) {
    const dark = captures.find((capture) => capture.file.includes(`-${surface}-${viewport}-dark.png`));
    const light = captures.find((capture) => capture.file.includes(`-${surface}-${viewport}-light.png`));
    if (!dark || !light) throw new Error(`Missing ${surface}/${viewport} theme pair`);
    const luminanceDelta = Math.round((light.meanLuminance - dark.meanLuminance) * 100) / 100;
    pairs.push({ surface, viewport, dark: dark.file, light: light.file, luminanceDelta, pass: luminanceDelta >= 25 && dark.sha256 !== light.sha256 });
  }
}

const failedCaptures = captures.filter((capture) => Object.values(capture.checks).some((value) => !value));
const failedPairs = pairs.filter((pair) => !pair.pass);
const audit = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  method: "Sharp statistics over exact real-Chromium PNG bytes; paired with capture-time required-state and horizontal-overflow assertions.",
  limitation: "The Codex image viewer and in-app browser image return were unavailable because the Windows sandbox failed DPAPI initialization. This is an objective pixel audit, not a claim that the model visually viewed the images.",
  pass: failedCaptures.length === 0 && failedPairs.length === 0 && hashes.size === captures.length,
  uniqueHashes: hashes.size,
  captures,
  themePairs: pairs,
  failures: {
    captures: failedCaptures.map((capture) => capture.file),
    themePairs: failedPairs.map((pair) => `${pair.surface}/${pair.viewport}`),
  },
};

fs.writeFileSync(output, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ pass: audit.pass, captures: captures.length, uniqueHashes: hashes.size, failedCaptures: failedCaptures.length, failedPairs: failedPairs.length, output: path.relative(root, output) }, null, 2));
if (!audit.pass) process.exit(1);
