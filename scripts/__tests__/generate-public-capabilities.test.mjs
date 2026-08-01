#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
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
assert.deepEqual(contract.callable_tools, [], "unproved remote deployment must advertise no callable tools");
console.log("public capabilities generator: PASS (canonical equality, fail-closed tools, read-only check)");
