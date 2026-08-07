#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "../lib/safe-spawn.mjs";
import { buildPublicCapabilityContract } from "../lib/public-capability-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputPath = path.join(root, "public", "capabilities.json");
const before = fs.readFileSync(outputPath, "utf8");
assert.equal(before, `${JSON.stringify(buildPublicCapabilityContract(), null, 2)}\n`);

const check = spawnSync(process.execPath, ["scripts/generate-public-capabilities.mjs", "--check"], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
assert.equal(check.status, 0, check.stderr || check.stdout);
assert.match(check.stdout, /matches source truth/);
assert.equal(fs.readFileSync(outputPath, "utf8"), before, "--check must be read-only");

const contract = JSON.parse(before);
assert.ok(contract.callable_tools.length > 0, "criterion-complete live deployment must advertise the calculator tools");

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "promogrind-capability-contract-"));
try {
  for (const source of [
    "supabase/functions/calc-api/calculator-contract.json",
    "supabase/functions/calc-api/index.ts",
    "context/LAUNCH_PROOFS.json",
    "src/launchState.js",
  ]) {
    const destination = path.join(fixtureRoot, source);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, source), destination);
  }
  const proofPath = path.join(fixtureRoot, "context/LAUNCH_PROOFS.json");
  const launchProofs = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  launchProofs.proofs.supabaseDeployment.receipts = [];
  fs.writeFileSync(proofPath, `${JSON.stringify(launchProofs, null, 2)}\n`);
  process.chdir(fixtureRoot);
  assert.deepEqual(buildPublicCapabilityContract().callable_tools, [], "unproved remote deployment must advertise no callable tools");
} finally {
  process.chdir(root);
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log("public capabilities generator: PASS (canonical equality, proven tools, fail-closed fixture, read-only check)");
