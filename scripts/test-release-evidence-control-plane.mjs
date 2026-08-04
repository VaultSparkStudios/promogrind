#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from './lib/safe-spawn.mjs';
import { buildExternalLaunchProofLedger } from './render-external-launch-proof-ledger.mjs';
import { loadLaunchProofs } from './lib/launch-proofs.mjs';

const status = JSON.parse(fs.readFileSync('context/PROJECT_STATUS.json', 'utf8'));
const proofDoc = loadLaunchProofs(process.cwd());
const ledger = buildExternalLaunchProofLedger({ status, launchProofs: proofDoc });
assert.equal(ledger.blockerRows.length, status.blockers.length, 'every status blocker must enter the proof graph');
assert.equal(ledger.unmirroredBlockers, 0, 'every status blocker must map to a typed launch proof');
for (const key of ['stagingAndHeaders', 'obeliskDelegation', 'credentialRemediation', 'founderApproval']) {
  assert.ok(proofDoc.proofs[key], `missing typed proof ${key}`);
}

const gate = spawnSync(process.execPath, ['scripts/check-release-gate.mjs', '--project', 'promogrind', '--json'], { encoding: 'utf8' });
assert.equal(gate.status, 0, gate.stderr);
const payload = JSON.parse(gate.stdout);
assert.equal(payload.sourceMode, 'public-shim-self-profile');
assert.equal(payload.evaluatedProjectCount, 1);
assert.equal(payload.projects[0].decision, 'hold');
const writeGate = spawnSync(process.execPath, ['scripts/check-release-gate.mjs'], { encoding: 'utf8' });
assert.equal(writeGate.status, 0, writeGate.stderr);
const checkGate = spawnSync(process.execPath, ['scripts/check-release-gate.mjs', '--check'], { encoding: 'utf8' });
assert.equal(checkGate.status, 0, checkGate.stderr);
console.log('release evidence control plane: PASS (all blockers typed; public shim emits one honest HOLD)');
