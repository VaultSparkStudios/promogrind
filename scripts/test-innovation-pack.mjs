#!/usr/bin/env node

import assert from 'assert/strict';
import { COMMANDS } from './ops/index.mjs';
import { scanDirectChildProcessImports, scanWindowsHide } from './check-windows-hide.mjs';

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

if (JSON_MODE) {
  console.log(JSON.stringify({ ok: true, checks: checks.length, cases: checks }, null, 2));
} else {
  console.log(`test-innovation-pack · ${checks.length}/${checks.length} passing`);
}