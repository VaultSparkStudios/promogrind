#!/usr/bin/env node

import assert from 'node:assert/strict';
import { appendReceipts, evaluateProof, reconcileLaunchProofDocument, validateReceipt } from './lib/launch-proof-quorum.mjs';

const document = reconcileLaunchProofDocument({
  schemaVersion: '1.0',
  proofs: {
    launch: {
      blocking: true,
      target: 'https://promogrind.bet',
      evidenceRequired: ['Header delivered', 'Smoke passed'],
      evidence: [{ note: 'legacy prose must not satisfy criteria' }],
    },
  },
});

assert.equal(document.schemaVersion, '2.0');
assert.equal(evaluateProof(document.proofs.launch).coveredCount, 0);
assert.equal(evaluateProof(document.proofs.launch).status, 'pending');

const [first, second] = document.proofs.launch.criteria;
const receipt = (criterionId, overrides = {}) => ({
  criterionId,
  source: 'automated-smoke',
  target: 'https://promogrind.bet',
  observedAt: '2026-07-25T22:00:00.000Z',
  verifier: 'runner:test',
  detail: `Observed ${criterionId}`,
  ...overrides,
});

appendReceipts(document, 'launch', [receipt(first.id)]);
assert.equal(document.proofs.launch.status, 'pending');
assert.equal(evaluateProof(document.proofs.launch).coveredCount, 1);
appendReceipts(document, 'launch', [receipt(second.id)]);
assert.equal(document.proofs.launch.status, 'complete');
assert.equal(evaluateProof(document.proofs.launch).coveredCount, 2);

assert.equal(validateReceipt(receipt(first.id, { criterionId: 'invented' }), document.proofs.launch).ok, false);
assert.equal(validateReceipt(receipt(first.id, { target: 'https://wrong.example' }), document.proofs.launch, { expectedTarget: 'https://promogrind.bet' }).ok, false);
assert.equal(validateReceipt(receipt(first.id, { detail: 'password=do-not-store' }), document.proofs.launch).ok, false);
assert.equal(validateReceipt(receipt(first.id, { observedAt: 'yesterday' }), document.proofs.launch).ok, false);

const before = document.proofs.launch.receipts.length;
appendReceipts(document, 'launch', [receipt(second.id)]);
assert.equal(document.proofs.launch.receipts.length, before);

console.log('launch proof quorum: 12 assertions passing');
