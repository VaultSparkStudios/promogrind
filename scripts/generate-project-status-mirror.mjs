#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/generate-project-status-mirror.mjs [--check]
 *
 * Generates the browser-safe project-status mirror from its canonical context
 * source. `--check` is read-only and fails when the generated file is stale.
 */

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProjectStatusMirror, renderGeneratedExport } from "./lib/generated-truth.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "context", "PROJECT_STATUS.json");
const OUT = join(ROOT, "src", "data", "projectStatus.generated.js");
const check = process.argv.includes("--check");

const status = JSON.parse(readFileSync(SOURCE, "utf8"));
const output = renderGeneratedExport({
  banner: "scripts/generate-project-status-mirror.mjs",
  exportName: "PROJECT_STATUS_MIRROR",
  payload: buildProjectStatusMirror(status),
});

if (check) {
  let current = "";
  try { current = readFileSync(OUT, "utf8"); } catch { /* missing remains stale */ }
  if (current !== output) {
    console.error("project-status-mirror: stale; run node scripts/generate-project-status-mirror.mjs");
    process.exit(1);
  }
  console.log("project-status-mirror: fresh");
} else {
  const temp = `${OUT}.tmp-${process.pid}`;
  writeFileSync(temp, output);
  renameSync(temp, OUT);
  console.log("project-status-mirror: wrote src/data/projectStatus.generated.js");
}
