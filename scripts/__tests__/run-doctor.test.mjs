#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "../lib/safe-spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const result = spawnSync(process.execPath, ["scripts/run-doctor.mjs", "--json"], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
assert.equal(result.status, 0, result.stderr || result.stdout);
const report = JSON.parse(result.stdout);

const expectedIds = [
  "manifest", "validate", "canon", "compliance-velocity", "sanitize", "launch",
  "feedback", "entropy", "revenue", "ignis", "genome", "prompt-ver",
];
assert.deepEqual(report.checks.map(check => check.id), expectedIds);
assert.equal(report.total, report.checks.length);
assert.equal(report.passing + report.warning + report.failing, report.total);
assert.equal(report.blockingFailing, report.checks.filter(check => !check.pass && check.blocking).length);
assert.equal(report.advisoryFailing, report.checks.filter(check => !check.pass && !check.blocking).length);
assert.equal(report.overallPass, report.blockingFailing === 0);
assert.ok(report.checks.every(check => typeof check.pass === "boolean" && typeof check.detail === "string"));
assert.ok(report.checks.every(check => ["local-broken", "portfolio-outdated", "expected-external", "derived-stale"].includes(check.driftClass)));
assert.ok(Number.isFinite(report.score) && report.score >= 0 && report.score <= 100);

console.log(`doctor entrypoint: PASS (${report.blockingFailing} blocking failures; ${report.total} source-derived checks; tally coherent)`);
