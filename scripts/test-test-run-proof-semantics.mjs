#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  classifyAfterRetry,
  formatProgressLine,
  lastFailureCause,
  parseShardSpec,
  proofShapeMatches,
  reusableShardProof,
  stableProofHash,
} from './lib/test-run-proof-semantics.mjs';

assert.deepEqual(parseShardSpec('2/4'), { index: 2, total: 4 });
assert.throws(() => parseShardSpec('5/4'), /expected 1 <= i <= n/);
assert.equal(stableProofHash(['a', 'b']), stableProofHash(['a', 'b']));
assert.notEqual(stableProofHash(['a', 'b']), stableProofHash(['b', 'a']));

const shape = {
  totalFiles: 2,
  filesHash: 'files',
  shardCount: 2,
  argsHash: 'args',
  proofSources: { schemaVersion: '1', rootHash: 'root' },
};
assert.equal(proofShapeMatches(shape, structuredClone(shape)), true);
assert.equal(proofShapeMatches(shape, { ...shape, argsHash: 'changed' }), false);
assert.equal(reusableShardProof({
  mode: 'shard-proof',
  shardCount: 2,
  shardIndex: 1,
  proofShape: shape,
  exitCode: 0,
  signal: null,
  parsed: { failures: 0, envBlocked: [], deferred: [], budgetExhausted: false },
}, { shardCount: 2, shardIndex: 1, proofShape: shape }), true);

assert.equal(classifyAfterRetry({ status: 'pass', pass: 3, total: 3 }), 'flaky');
assert.equal(classifyAfterRetry({ status: 'fail', pass: 3, total: 3 }), 'inconclusive');
assert.equal(classifyAfterRetry({ status: 'fail', pass: 2, total: 3 }), 'fail');
assert.equal(lastFailureCause('noise\nExpected 2 but received 3\ntrailer'), 'Expected 2 but received 3');
assert.match(formatProgressLine(1, 2, { status: 'pass', tier: 1, file: 'x.mjs', pass: 4, total: 4 }), /^\[1\/2\] ✓/);

console.log('test-run proof semantics: PASS');
