#!/usr/bin/env node
import assert from 'node:assert/strict';
import { parseTaskBoard, classifyStatus } from './lib/cross-repo-tasks.mjs';
import { extractCurrentSessionIntent } from './lib/task-board.mjs';
import { describeBound, resolveTestSignal, testSignalMark } from './lib/test-signal.mjs';
import { buildStartupSourceReceipt, verifyStartupSourceReceipt } from './lib/startup-source-receipt.mjs';
import {
  classifyRuntimeOverlay,
  composeRuntimeCompatibilitySurface,
  summarizeRuntimeOverlayPlan,
} from './lib/runtime-overlay-contract.mjs';

const cleanSurface = composeRuntimeCompatibilitySurface({
  base: ['scripts/base.mjs'],
  documentedOverrides: ['scripts/local-override.mjs'],
  changed: [],
});
const dirtySurface = composeRuntimeCompatibilitySurface({
  base: ['scripts/base.mjs'],
  documentedOverrides: ['scripts/local-override.mjs'],
  changed: ['scripts/local-override.mjs'],
});
assert.deepEqual(cleanSurface, dirtySurface, 'documented overrides must remain in the compatibility surface after commit');
assert.deepEqual(cleanSurface, ['scripts/base.mjs', 'scripts/local-override.mjs']);

const file = 'scripts/context-meter.mjs';
assert.equal(classifyRuntimeOverlay({ file, current: 'local', committed: 'local', upstream: 'upstream' }).action, 'preserve');
assert.equal(classifyRuntimeOverlay({ file, current: 'upstream', committed: 'local', upstream: 'upstream' }).action, 'restore-committed');
assert.equal(classifyRuntimeOverlay({ file, current: 'founder-wip', committed: 'local', upstream: 'upstream' }).action, 'refuse-user-edit');
assert.equal(classifyRuntimeOverlay({ file, current: 'same', committed: 'same', upstream: 'same' }).action, 'preserve');
assert.equal(classifyRuntimeOverlay({ file, current: null, committed: 'local', upstream: 'upstream' }).action, 'blocked');

const summary = summarizeRuntimeOverlayPlan([
  classifyRuntimeOverlay({ file: 'a', current: 'upstream', committed: 'local', upstream: 'upstream' }),
  classifyRuntimeOverlay({ file: 'b', current: 'local', committed: 'local', upstream: 'upstream' }),
]);
assert.equal(summary.ok, true);
assert.equal(summary.needsApply, true);
assert.equal(summary.counts['restore-committed'], 1);

// Canonical consumers must remain import-compatible with local safety overlays.
const taskBoard = [
  '## Unified Genius List',
  '| 1 | high | runtime | unblocked | S | **Already closed** |',
  '| 2 | high | runtime | unblocked | S | **Keep active** |',
  '## Done S12',
  '| 1 | high | runtime | done S12 | S | **Already closed** |',
].join('\n');
assert.deepEqual(parseTaskBoard(taskBoard).map((row) => row.key), ['2']);
assert.equal(classifyStatus('unblocked'), 'unblocked');
assert.equal(classifyStatus('completed'), 'done');
assert.equal(extractCurrentSessionIntent([
  '## Current Session Intent: Session 12',
  'Older section',
  '---',
  'Session Intent (S13, current): Newer inline intent',
].join('\n')), 'Newer inline intent');

const boundedStatus = {
  testsPassing: 4, testsTotal: 4, testsDeferred: [],
  testsLastRunMode: 'changed:budget-deferred',
  testsDeferredNote: '2 files remained budget-deferred and are not counted green',
};
assert.equal(describeBound(boundedStatus).writerDefect, true);
assert.equal(resolveTestSignal(boundedStatus).state, 'bounded');
assert.notEqual(testSignalMark(resolveTestSignal(boundedStatus)), '✓');
assert.equal(resolveTestSignal({ ...boundedStatus, testsLatestRunState: 'inconclusive' }).state, 'unknown');

const briefBody = 'SIL evidence from source session 12';
const receipt = buildStartupSourceReceipt({ body: briefBody, rendererVersion: '3.2', sourceSession: 12, targetSession: 13, sources: {} });
assert.equal(verifyStartupSourceReceipt({ body: briefBody, receipt, rendererVersion: '3.2' }).ok, true);
assert.equal(verifyStartupSourceReceipt({ body: `${briefBody} tampered`, receipt, rendererVersion: '3.2' }).ok, false);
console.log('runtime overlay reconciliation: preserved user edits, canonical consumer compatibility, task completion, bounded-test truth, and source-receipt tampering verified');
