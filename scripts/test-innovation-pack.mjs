#!/usr/bin/env node

import assert from 'assert/strict';
import path from 'path';
import { COMMANDS } from './ops/index.mjs';
import { scanDirectChildProcessImports, scanWindowsHide } from './check-windows-hide.mjs';
import { spawnSync } from './lib/safe-spawn.mjs';

const JSON_MODE = process.argv.includes('--json');
const checks = [];

function run(name, fn) {
  fn();
  checks.push(name);
}

run('ops registry exposes innovation-pack', () => {
  assert.equal(COMMANDS['innovation-pack']?.script, 'render-innovation-pack.mjs');
});

run('windows-hide scan functions return arrays', () => {
  assert.ok(Array.isArray(scanWindowsHide()));
  assert.ok(Array.isArray(scanDirectChildProcessImports()));
});

run('innovation-pack exhaustion signal is a boolean derived from repo truth', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'render-innovation-pack.mjs'), '--dry-run', '--json'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const pack = JSON.parse(result.stdout);
  assert.equal(typeof pack.sourceSignals.geniusListEmpty, 'boolean');
});

if (JSON_MODE) {
  console.log(JSON.stringify({ ok: true, checks: checks.length, cases: checks }, null, 2));
} else {
  console.log(`test-innovation-pack · ${checks.length}/${checks.length} passing`);
}
