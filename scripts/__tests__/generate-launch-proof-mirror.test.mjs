#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "../lib/safe-spawn.mjs";
import { renderGeneratedExport, validateLaunchProofPayload } from "../lib/generated-truth.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = JSON.parse(fs.readFileSync(path.join(root, "context", "LAUNCH_PROOFS.json"), "utf8"));
const expected = renderGeneratedExport({
  banner: "scripts/generate-launch-proof-mirror.mjs",
  exportName: "LAUNCH_PROOFS",
  payload: validateLaunchProofPayload(source),
});
const outputPath = path.join(root, "src", "data", "launchProofs.generated.js");
const before = fs.readFileSync(outputPath, "utf8");
assert.equal(before, expected, "generated launch proof mirror must exactly match canonical source");

const check = spawnSync(process.execPath, ["scripts/generate-launch-proof-mirror.mjs", "--check"], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
assert.equal(check.status, 0, check.stderr || check.stdout);
assert.match(check.stdout, /fresh/);
assert.equal(fs.readFileSync(outputPath, "utf8"), before, "--check must not mutate the generated mirror");

console.log("launch-proof mirror: PASS (canonical equality and read-only freshness check)");
