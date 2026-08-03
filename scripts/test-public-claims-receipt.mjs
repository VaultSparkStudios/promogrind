#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "check-public-claims.mjs"), "--json"], {
  cwd: ROOT,
  encoding: "utf8",
});
assert.equal(result.status, 0, result.stderr || result.stdout);
const receipt = JSON.parse(result.stdout);
assert.equal(receipt.schemaVersion, 1);
assert.equal(receipt.ok, true);
assert.equal(receipt.status, "passed");
assert.equal(receipt.findings.length, 0);
assert.ok(receipt.checkedFiles >= 300);
assert.ok(receipt.rules >= 22);
assert.match(receipt.sourceSha256, /^[a-f0-9]{64}$/);
assert.match(receipt.ruleSha256, /^[a-f0-9]{64}$/);
console.log(`public claims attestation contract passed · ${receipt.checkedFiles} files · ${receipt.rules} rules · ${receipt.sourceSha256.slice(0, 12)}`);
