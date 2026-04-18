#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  MODELS,
  selectModel,
  inferComplexity,
  withCache,
  withLongCache,
  semanticCacheKey,
  loadSemanticCache,
  storeSemanticCache,
  logMetrics,
  trackSessionBudget,
  shortModelName,
} from './lib/model-router.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SEMANTIC_DIR = path.join(ROOT, '.ops-cache', 'semantic');
const SESSION_BUDGET = path.join(ROOT, '.ops-cache', 'session-budget.json');
const TMP_LEDGER = path.join(ROOT, '.ops-cache', 'test-cache-ledger.ndjson');

test('selectModel maps complexity tiers to canonical models', () => {
  assert.equal(selectModel('complex'), MODELS.opus);
  assert.equal(selectModel('moderate'), MODELS.sonnet);
  assert.equal(selectModel('simple'), MODELS.haiku);
  assert.equal(selectModel('unknown'), MODELS.sonnet);
});

test('inferComplexity detects simple vs complex prompts', () => {
  assert.equal(inferComplexity('validate this status output'), 'simple');
  assert.equal(inferComplexity('design a cross-project strategy for rollout'), 'complex');
  assert.equal(inferComplexity('implement a feature end to end'), 'moderate');
});

test('cache helpers attach the expected TTL metadata', () => {
  assert.deepEqual(withCache({ type: 'text', text: 'stable' }).cache_control, { type: 'ephemeral' });
  assert.deepEqual(withLongCache({ type: 'text', text: 'stable' }).cache_control, { type: 'ephemeral', ttl: '1h' });
});

test('semantic cache stores and loads by stable key', () => {
  const key = semanticCacheKey('system-a', [{ role: 'user', content: 'hello' }], MODELS.sonnet);
  const payload = { ok: true, value: 'cached' };
  const cacheFile = path.join(SEMANTIC_DIR, `${key}.json`);

  try {
    storeSemanticCache(key, payload);
    assert.deepEqual(loadSemanticCache(key, 3600), payload);
  } finally {
    fs.rmSync(cacheFile, { force: true });
  }
});

test('logMetrics writes NDJSON telemetry with usage fields', () => {
  fs.rmSync(TMP_LEDGER, { force: true });
  logMetrics({
    script: 'test-model-router',
    model: MODELS.sonnet,
    usage: {
      input_tokens: 100,
      output_tokens: 25,
      cache_read_input_tokens: 50,
      cache_creation_input_tokens: 10,
    },
    mode: 'unit',
    logPath: TMP_LEDGER,
  });

  const line = fs.readFileSync(TMP_LEDGER, 'utf8').trim();
  const parsed = JSON.parse(line);

  assert.equal(parsed.script, 'test-model-router');
  assert.equal(parsed.model, MODELS.sonnet);
  assert.equal(parsed.input, 100);
  assert.equal(parsed.output, 25);
  assert.equal(parsed.cache_read, 50);
  assert.equal(parsed.cache_create, 10);

  fs.rmSync(TMP_LEDGER, { force: true });
});

test('trackSessionBudget accumulates spend and reports remaining budget', () => {
  const previous = fs.existsSync(SESSION_BUDGET) ? fs.readFileSync(SESSION_BUDGET, 'utf8') : null;

  try {
    fs.rmSync(SESSION_BUDGET, { force: true });

    const first = trackSessionBudget({
      model: MODELS.haiku,
      cap: 1,
      usage: { input_tokens: 1000, output_tokens: 500 },
    });
    const second = trackSessionBudget({
      model: MODELS.haiku,
      cap: 1,
      usage: { input_tokens: 1000, output_tokens: 500 },
    });

    assert.ok(first.spent > 0);
    assert.ok(second.spent > first.spent);
    assert.ok(second.remaining < first.remaining);
    assert.equal(second.overBudget, false);
  } finally {
    if (previous === null) fs.rmSync(SESSION_BUDGET, { force: true });
    else fs.writeFileSync(SESSION_BUDGET, previous);
  }
});

test('shortModelName normalizes known model ids', () => {
  assert.equal(shortModelName(MODELS.opus), 'opus');
  assert.equal(shortModelName(MODELS.sonnet), 'sonnet');
  assert.equal(shortModelName(MODELS.haiku), 'haiku');
  assert.equal(shortModelName('custom-model'), 'custom-model');
});
