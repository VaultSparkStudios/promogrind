#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "../lib/safe-spawn.mjs";
import { buildProjectStatusMirror, renderGeneratedExport } from "../lib/generated-truth.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = JSON.parse(fs.readFileSync(path.join(root, "context", "PROJECT_STATUS.json"), "utf8"));
const expected = renderGeneratedExport({
  banner: "scripts/generate-project-status-mirror.mjs",
  exportName: "PROJECT_STATUS_MIRROR",
  payload: buildProjectStatusMirror(source),
});
const outputPath = path.join(root, "src", "data", "projectStatus.generated.js");
const before = fs.readFileSync(outputPath, "utf8");
assert.equal(before, expected, "generated project status mirror must exactly match canonical source");

const check = spawnSync(process.execPath, ["scripts/generate-project-status-mirror.mjs", "--check"], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
assert.equal(check.status, 0, check.stderr || check.stdout);
assert.match(check.stdout, /fresh/);
assert.equal(fs.readFileSync(outputPath, "utf8"), before, "--check must not mutate the generated mirror");

console.log("project-status mirror: PASS (canonical equality and read-only freshness check)");
