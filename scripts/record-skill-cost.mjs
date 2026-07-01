#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";

function arg(name, fallback = null) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

const root = process.cwd();
const skill = arg("--skill", "unknown");
const phase = arg("--phase", "event");
const step = arg("--step", null);
const session = arg("--session", null);
let meter = null;
try {
  const res = spawnSync(process.execPath, [path.join(root, "scripts", "context-meter.mjs"), "--json"], {
    cwd: root,
    encoding: "utf8",
    timeout: 10000,
    windowsHide: true,
  });
  if (res.status === 0 && res.stdout) meter = JSON.parse(res.stdout);
} catch {}

const dir = path.join(root, ".cache");
fs.mkdirSync(dir, { recursive: true });
const entry = {
  at: new Date().toISOString(),
  skill,
  phase,
  step,
  session,
  usedTokens: meter?.usedTokens ?? null,
  pctUsed: meter?.pctUsed ?? null,
  recommendation: meter?.recommendation ?? null,
};
fs.appendFileSync(path.join(dir, "skill-cost-ledger.ndjson"), `${JSON.stringify(entry)}\n`);
console.log(`skill-cost: ${skill} ${phase}${step ? ` ${step}` : ""}`);