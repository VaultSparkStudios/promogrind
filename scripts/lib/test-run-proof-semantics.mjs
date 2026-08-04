export function parseShardSpec(spec) {
  if (!spec) return null;
  const match = String(spec).match(/^(\d+)\/(\d+)$/);
  if (!match) throw new Error(`invalid shard spec "${spec}" (expected i/n)`);
  const index = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || index < 1 || index > total) {
    throw new Error(`invalid shard spec "${spec}" (expected 1 <= i <= n)`);
  }
  return { index, total };
}

export function stableProofHash(value) {
  const text = JSON.stringify(value ?? null);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function proofShapeMatches(actual, expected) {
  if (!actual || !expected) return false;
  return actual.totalFiles === expected.totalFiles
    && actual.filesHash === expected.filesHash
    && actual.shardCount === expected.shardCount
    && actual.argsHash === expected.argsHash
    && actual.proofSources?.schemaVersion === expected.proofSources?.schemaVersion
    && actual.proofSources?.rootHash === expected.proofSources?.rootHash;
}

export function reusableShardProof(proof, { shardCount, shardIndex, proofShape = null } = {}) {
  if (!proof || proof.mode !== 'shard-proof') return false;
  if (shardCount && proof.shardCount !== shardCount) return false;
  if (shardIndex && proof.shardIndex !== shardIndex) return false;
  if (proofShape && !proofShapeMatches(proof.proofShape, proofShape)) return false;
  const parsed = proof.parsed || {};
  return proof.exitCode === 0
    && !proof.signal
    && parsed.failures === 0
    && !(parsed.envBlocked || []).length
    && !(parsed.deferred || []).length
    && !parsed.budgetExhausted;
}

export function classifyAfterRetry(retry) {
  if (retry.status === 'pass') return 'flaky';
  if (retry.total > 0 && retry.pass === retry.total) return 'inconclusive';
  return 'fail';
}

export function lastFailureCause(output) {
  const lines = (output || '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return '';
  for (let index = lines.length - 1; index >= 0; index--) {
    if (/⛔|FAIL|Error|✗|assert|Expected|Received|throw/i.test(lines[index])) return lines[index].slice(0, 200);
  }
  return lines.at(-1).slice(0, 200);
}

export function formatProgressLine(index, total, result) {
  const mark = result.status === 'pass' || result.status === 'covered-directly' ? '✓'
    : result.status === 'flaky' ? '⚠'
      : result.status === 'inconclusive' ? '◐'
        : result.status === 'env-blocked' ? '⊘' : '⛔';
  const progress = `${String(index).padStart(String(total).length)}/${total}`;
  return `[${progress}] ${mark} T${String(result.tier).padEnd(6)} ${String(result.file).padEnd(46)} ${result.pass}/${result.total}`;
}
