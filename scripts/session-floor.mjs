#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function flag(name) { return process.argv.includes(name); }
function arg(name, fallback = null) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

const root = process.cwd();
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

const shipped = Number(arg("--shipped", "0"));
const amortization = {
  shipped,
  usedTokens: meter?.usedTokens ?? null,
  tokensPerShipped: shipped > 0 && meter?.usedTokens ? Math.round(meter.usedTokens / shipped) : null,
  recommendation: meter?.recommendation ?? "UNKNOWN",
};
const payload = { ok: true, amortization, meter };

if (flag("--json")) console.log(JSON.stringify(payload, null, 2));
else console.log(`session-floor: shipped=${shipped} recommendation=${amortization.recommendation}`);

if (flag("--closeout-gate") && shipped <= 0 && !flag("--founder")) process.exit(11);