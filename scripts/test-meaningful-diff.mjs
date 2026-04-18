#!/usr/bin/env node

import assert from 'assert/strict';
import {
  hashFileContent,
  normalizeByProfile,
} from './lib/meaningful-diff.mjs';

const JSON_MODE = process.argv.includes('--json');
const checks = [];

function run(name, fn) {
  fn();
  checks.push(name);
}

run('json timestamps are ignored', () => {
  const a = '{"_generatedAt":"2026-04-16T00:00:00Z","updatedAt":"2026-04-16","value":1}';
  const b = '{"_generatedAt":"2026-04-17T00:00:00Z","updatedAt":"2026-04-17","value":1}';
  assert.equal(hashFileContent('sample.json', a, 'conductor'), hashFileContent('sample.json', b, 'conductor'));
});

run('json payload changes are preserved', () => {
  const a = '{"value":1}';
  const b = '{"value":2}';
  assert.notEqual(hashFileContent('sample.json', a, 'conductor'), hashFileContent('sample.json', b, 'conductor'));
});

run('founder surface markdown strips generated date lines', () => {
  const a = '# Studio Brain\n\n## CURRENT — 2026-04-16\n\n> Generated: 2026-04-16\n\nhello\n';
  const b = '# Studio Brain\n\n## CURRENT — 2026-04-17\n\n> Generated: 2026-04-17\n\nhello\n';
  assert.equal(normalizeByProfile('portfolio/STUDIO_BRAIN.md', a, 'founder-surfaces'), normalizeByProfile('portfolio/STUDIO_BRAIN.md', b, 'founder-surfaces'));
});

run('debt report date banner is ignored', () => {
  const a = '# Technical Debt Report\n\n## 2026-04-16 — Debt Assessment\n\nsame\n\n*Generated: 2026-04-16 | Source: x*\n';
  const b = '# Technical Debt Report\n\n## 2026-04-17 — Debt Assessment\n\nsame\n\n*Generated: 2026-04-17 | Source: x*\n';
  assert.equal(normalizeByProfile('portfolio/DEBT_REPORT.md', a, 'debt-report'), normalizeByProfile('portfolio/DEBT_REPORT.md', b, 'debt-report'));
});

if (JSON_MODE) {
  process.stdout.write(JSON.stringify({ ok: true, checks: checks.length, cases: checks }, null, 2) + '\n');
} else {
  console.log(`test-meaningful-diff · ${checks.length}/${checks.length} passing`);
}
