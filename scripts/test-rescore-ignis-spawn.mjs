#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(import.meta.dirname, "rescore-ignis.mjs"), "utf8");
assert.match(source, /spawnSync\(process\.execPath,\s*\[tsxCliPath,/);
assert.doesNotMatch(source, /spawnSync\(['"]npx['"]/);
assert.doesNotMatch(source, /shell\s*:\s*true/);
assert.match(source, /node_modules['"],\s*['"]tsx['"],\s*['"]dist['"],\s*['"]cli\.mjs/);
console.log("IGNIS rescore spawn contract passed · local TSX · process.execPath · shell-free");
