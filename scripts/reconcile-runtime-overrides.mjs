#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from './lib/safe-spawn.mjs';
import {
  DOCUMENTED_LOCAL_OVERRIDES,
  classifyRuntimeOverlay,
  summarizeRuntimeOverlayPlan,
} from './lib/runtime-overlay-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OPS = path.resolve(ROOT, '..', 'vaultspark-studio-ops');
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const json = args.has('--json');

function read(file) {
  try { return fs.readFileSync(file); } catch { return null; }
}

function readCommitted(relativePath) {
  try {
    return execFileSync('git', ['-C', ROOT, 'show', `HEAD:${relativePath}`], {
      encoding: null,
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

const entries = DOCUMENTED_LOCAL_OVERRIDES.map((file) => classifyRuntimeOverlay({
  file,
  current: read(path.join(ROOT, file)),
  upstream: read(path.join(OPS, file)),
  committed: readCommitted(file),
}));

if (apply) {
  for (const entry of entries) {
    if (entry.action !== 'restore-committed') continue;
    const committed = readCommitted(entry.file);
    if (committed == null) continue;
    fs.writeFileSync(path.join(ROOT, entry.file), committed);
    entry.applied = true;
  }
}

const summary = summarizeRuntimeOverlayPlan(entries);
const receipt = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  project: path.basename(ROOT).toLowerCase(),
  mode: apply ? 'apply' : 'check',
  ...summary,
  entries,
};

try {
  fs.mkdirSync(path.join(ROOT, '.cache'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.cache', 'runtime-overlay-reconcile.json'), `${JSON.stringify(receipt, null, 2)}\n`);
} catch {}

if (json) console.log(JSON.stringify(receipt, null, 2));
else {
  console.log(`runtime overlays: ${summary.ok ? 'SAFE' : 'BLOCKED'} · preserve ${summary.counts.preserve} · restore ${summary.counts['restore-committed']} · refuse ${summary.counts['refuse-user-edit']} · blocked ${summary.counts.blocked}`);
  for (const entry of entries.filter((item) => !['preserve', 'preserve-upstream'].includes(item.action))) {
    console.log(`  ${entry.action.padEnd(18)} ${entry.file} — ${entry.reason}${entry.applied ? ' · APPLIED' : ''}`);
  }
}

if (!summary.ok) process.exit(2);
if (summary.needsApply && !apply) process.exit(1);
