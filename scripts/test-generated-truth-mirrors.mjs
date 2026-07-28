#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "./lib/safe-spawn.mjs";
import {
  buildProjectStatusMirror,
  normalizeValidationState,
  validateLaunchProofPayload,
} from "./lib/generated-truth.mjs";

assert.equal(normalizeValidationState("passing"), "passing");
assert.equal(normalizeValidationState("590/590 passing"), "passing");
assert.equal(normalizeValidationState("not passing"), "unknown");
assert.equal(normalizeValidationState("failing after deploy"), "failing");

const mirror = buildProjectStatusMirror({
  lastUpdated: "2026-07-26",
  testsPassing: 10,
  testsTotal: 10,
  testsLastRun: "2026-07-26",
  testingSurfaces: [
    { command: "npm run smoke:launch", status: "passing", verifiedAt: "2026-07-26", exitCode: 0, commitSha: "abc123" },
    { type: "launch-gate", command: "npm run verify:launch-local", status: "passing end to end" },
  ],
});
assert.equal(mirror.validation.tests.state, "passing");
assert.equal(mirror.validation.smokeCommand.state, "passing");
assert.equal(mirror.validation.smokeCommand.commitSha, "abc123");
assert.equal(mirror.validation.browserSmoke.state, "unknown");
assert.equal(mirror.validation.build.state, "unknown");

assert.throws(() => validateLaunchProofPayload({ schemaVersion: "1.0", proofs: [] }), /proofs must be an object/);
assert.throws(() => validateLaunchProofPayload({ schemaVersion: "1.0", proofs: { x: {} } }), /status/);
assert.doesNotThrow(() => validateLaunchProofPayload({ schemaVersion: "1.0", proofs: { x: { status: "pending" } } }));

for (const script of ["generate-project-status-mirror.mjs", "generate-launch-proof-mirror.mjs"]) {
  const result = spawnSync(process.execPath, [`scripts/${script}`, "--check"], { encoding: "utf8" });
  assert.equal(result.status, 0, `${script}: ${result.stderr || result.stdout}`);
}

console.log("generated truth mirror regression passed · strict states/schema/check mode");
