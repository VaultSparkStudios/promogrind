#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["state-vector", ["scripts/render-state-vector.mjs"]],
  ["doctor", ["scripts/ops.mjs", "doctor", "--update-json", "--json"]],
  ["entropy", ["scripts/compute-entropy.mjs"]],
  ["genome", ["scripts/append-genome-snapshot.mjs"]],
];
const results = [];
for (const [name, args] of checks) {
  const res = spawnSync(process.execPath, args.map((a) => path.normalize(a)), {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    windowsHide: true,
  });
  results.push({ name, status: res.status ?? 1, ok: res.status === 0 });
}
console.log(JSON.stringify({ ok: results.every((r) => r.ok), results }, null, 2));
if (results.some((r) => !r.ok)) process.exit(1);