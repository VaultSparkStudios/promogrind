#!/usr/bin/env node
import assert from 'node:assert/strict';
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
console.log('runtime overlay reconciliation: canonical overwrite detected, committed overlay recoverable, user edits fail closed');
