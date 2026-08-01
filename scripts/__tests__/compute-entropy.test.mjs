#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "../lib/safe-spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const statusPath = path.join(root, "context", "PROJECT_STATUS.json");
const before = fs.readFileSync(statusPath, "utf8");
const result = spawnSync(process.execPath, ["scripts/compute-entropy.mjs", "--project", root, "--json"], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

assert.equal(result.status, 0, result.stderr);
const payload = JSON.parse(result.stdout);
assert.equal(payload.project.toLowerCase(), "promogrind");
assert.ok(payload.entropy >= 0 && payload.entropy <= 1);
assert.ok(["healthy", "drifting", "critical"].includes(payload.signal));
assert.deepEqual(
  payload.signals.map(signal => signal.name),
  ["CURRENT_STATE.md", "TASK_BOARD.md", "LATEST_HANDOFF.md", "SELF_IMPROVEMENT_LOOP", "Truth audit", "IGNIS score", "SIL skip pressure", "Oldest HAR item", "Now bucket"],
);
assert.ok(payload.signals.every(signal => signal.score >= 0 && signal.score <= 1));
assert.equal(fs.readFileSync(statusPath, "utf8"), before, "read-only mode must not mutate PROJECT_STATUS.json");

console.log(`compute-entropy entrypoint: PASS (${payload.entropy.toFixed(3)}, ${payload.signals.length} bounded source-derived signals, read-only)`);
