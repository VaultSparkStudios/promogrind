#!/usr/bin/env node
/**
 * test-validate-brief-format.mjs
 *
 * Regression harness for the canonical startup brief validator.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateStartupBrief } from './validate-brief-format.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const JSON_MODE = process.argv.includes('--json');
const canonical = path.join(ROOT, 'docs', 'STARTUP_BRIEF.md');

const driftStub = `# Startup Brief

## Contradiction Sentinel
mindframe drifted

## Executive Focus
fix the thing

## Evidence Gaps
signals missing

## Today
1. do work
`;

const canonicalJson = validateStartupBrief(fs.readFileSync(canonical, 'utf8'));
const driftJson = validateStartupBrief(driftStub);

const assertions = [
  {
    name: 'canonical brief passes',
    ok: canonicalJson?.ok === true,
  },
  {
    name: 'drift stub fails',
    ok: driftJson?.ok === false,
  },
  {
    name: 'drift stub flags Contradiction Sentinel',
    ok: Array.isArray(driftJson?.forbiddenHits)
      && driftJson.forbiddenHits.some((hit) => String(hit.label).includes('Contradiction Sentinel')),
  },
  {
    name: 'drift stub flags Today bucket',
    ok: Array.isArray(driftJson?.forbiddenHits)
      && driftJson.forbiddenHits.some((hit) => String(hit.label).includes('Today')),
  },
];

const passed = assertions.filter((a) => a.ok).length;
const ok = passed === assertions.length;

if (JSON_MODE) {
  process.stdout.write(JSON.stringify({ ok, passed, total: assertions.length, assertions }, null, 2) + '\n');
} else {
  console.log(`test-validate-brief-format · ${passed}/${assertions.length} assertions passing`);
  for (const assertion of assertions) {
    console.log(`  ${assertion.ok ? '✓' : '✗'} ${assertion.name}`);
  }
}

process.exit(ok ? 0 : 1);
