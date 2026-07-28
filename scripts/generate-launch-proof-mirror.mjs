#!/usr/bin/env node

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderGeneratedExport, validateLaunchProofPayload } from "./lib/generated-truth.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "context", "LAUNCH_PROOFS.json");
const OUT = join(ROOT, "src", "data", "launchProofs.generated.js");
const check = process.argv.includes("--check");

const payload = validateLaunchProofPayload(JSON.parse(readFileSync(SOURCE, "utf8")));
const output = renderGeneratedExport({
  banner: "scripts/generate-launch-proof-mirror.mjs",
  exportName: "LAUNCH_PROOFS",
  payload,
});

if (check) {
  let current = "";
  try { current = readFileSync(OUT, "utf8"); } catch { /* missing remains stale */ }
  if (current !== output) {
    console.error("launch-proof-mirror: stale; run node scripts/generate-launch-proof-mirror.mjs");
    process.exit(1);
  }
  console.log("launch-proof-mirror: fresh");
} else {
  const temp = `${OUT}.tmp-${process.pid}`;
  writeFileSync(temp, output);
  renameSync(temp, OUT);
  console.log("launch-proof-mirror: wrote src/data/launchProofs.generated.js");
}
