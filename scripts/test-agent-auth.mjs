#!/usr/bin/env node
/**
 * scripts/test-agent-auth.mjs — MCP auth + trust-tier gating regression tests
 *
 * Covers: token mint round-trip, signature tampering, expiry, tier-based tool
 * allowlist, per-agent explicit tool filter. Zero-dep; runs in <50ms.
 */

import assert from 'node:assert/strict';
import { mintToken, verifyToken, isToolAllowed } from '../studio-ops-mcp/auth.mjs';

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); pass++; }
  catch (e) { console.log(`  ✗ ${name}\n      ${e.message}`); fail++; }
}

const KEY = 'test-signing-key-32-bytes-of-fake-entropy-hex';
const KEY2 = 'different-signing-key-alternate-hex-bytes';

const basePayload = {
  call_sign: 'sentinel',
  trust_tier: 'proposer',
  tools: ['studio_founder_queue', 'studio_portfolio_summary'],
  budget_ceiling_usd_per_day: 1.0,
  issued_iso: '2026-04-16T00:00:00Z',
  expires_iso: '2030-04-16T00:00:00Z',
};

console.log('test-agent-auth');

test('mint+verify round-trip', () => {
  const t = mintToken(basePayload, KEY);
  const r = verifyToken(t, KEY);
  assert.equal(r.ok, true);
  assert.equal(r.payload.call_sign, 'sentinel');
});

test('wrong key fails signature', () => {
  const t = mintToken(basePayload, KEY);
  const r = verifyToken(t, KEY2);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'bad-signature');
});

test('tampered payload fails', () => {
  const t = mintToken(basePayload, KEY);
  const [p, s] = t.split('.');
  // Decode, flip trust_tier, re-encode without re-signing
  const decoded = Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/') + '==', 'base64').toString('utf8');
  const mutated = decoded.replace('"proposer"', '"autopilot"');
  const reencoded = Buffer.from(mutated).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const r = verifyToken(`${reencoded}.${s}`, KEY);
  assert.equal(r.ok, false);
});

test('expired token rejected', () => {
  const t = mintToken({ ...basePayload, expires_iso: '2020-01-01T00:00:00Z' }, KEY);
  const r = verifyToken(t, KEY);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'expired');
});

test('malformed token rejected', () => {
  assert.equal(verifyToken('', KEY).ok, false);
  assert.equal(verifyToken('notatoken', KEY).ok, false);
  assert.equal(verifyToken('a.b.c', KEY).ok, false);
});

test('observer cannot call founder_queue write', () => {
  const p = { ...basePayload, trust_tier: 'observer', tools: [] };
  // observer allows reads, not explicit founder_queue without tools[]
  // Per-agent tools[] is empty → denied regardless of tier regex
  assert.equal(isToolAllowed('studio_founder_queue', p), false);
});

test('proposer with tool in allowlist passes', () => {
  const p = { ...basePayload, trust_tier: 'proposer', tools: ['studio_founder_queue'] };
  assert.equal(isToolAllowed('studio_founder_queue', p), true);
});

test('proposer without tool in per-agent allowlist denied', () => {
  const p = { ...basePayload, trust_tier: 'proposer', tools: ['studio_portfolio_summary'] };
  // studio_rescore_ignis not in per-agent list → denied
  assert.equal(isToolAllowed('studio_rescore_ignis', p), false);
});

test('autopilot unrestricted', () => {
  const p = { ...basePayload, trust_tier: 'autopilot', tools: ['studio_rescore_ignis'] };
  assert.equal(isToolAllowed('studio_rescore_ignis', p), true);
});

test('unknown tier denied', () => {
  const p = { ...basePayload, trust_tier: 'godmode', tools: ['x'] };
  assert.equal(isToolAllowed('x', p), false);
});

console.log(`\n${fail === 0 ? '✓' : '✗'} test-agent-auth · ${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
