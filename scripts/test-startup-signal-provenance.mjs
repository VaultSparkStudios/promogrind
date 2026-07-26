#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { classifyRatioSnapshot, resolveProjectProfile, SIGNAL_STATE } from './lib/signal-state.mjs';
import { loadArkDrainState, renderOrchestratorBlock } from './lib/startup-orchestrator-blocks.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-startup-signal-'));
fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
fs.writeFileSync(path.join(root, '.cache', 'ark-drain-summary.json'), JSON.stringify({
  drainedAt: '2026-07-25T20:00:00.000Z', count: 169, sigFailures: [],
}));

assert.equal(classifyRatioSnapshot({ passed: 0, total: 0, score: 0 }), SIGNAL_STATE.UNAVAILABLE);
assert.equal(classifyRatioSnapshot({ passed: 9, total: 10, score: 90 }), SIGNAL_STATE.FAIL);
assert.equal(resolveProjectProfile({ type: 'app', developmentPhase: 'launch-hardening' }, { medium: 'tool' }).medium, 'app');
assert.equal(resolveProjectProfile({ type: 'app' }, { medium: 'tool' }).source, 'context/PROJECT_STATUS.json');

const ark = loadArkDrainState({ root, now: Date.parse('2026-07-25T20:05:00.000Z') });
assert.deepEqual(ark, { available: true, count: 169, sigFailures: 0, ageMinutes: 5, ageLabel: '5m old' });

const block = renderOrchestratorBlock({ root, active: null, pending: null, now: Date.parse('2026-07-25T20:05:00.000Z') });
assert.match(block, /Workers: unavailable/);
assert.match(block, /Ark: 169 drained · 5m old · sig failures 0/);
assert.doesNotMatch(block, /Workers: 0\/\?/);

console.log('startup signal provenance: 8 assertions passing');
