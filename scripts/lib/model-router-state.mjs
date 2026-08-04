import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function semanticCacheKey(system, messages, model) {
  const normalized = JSON.stringify({
    m: model,
    s: typeof system === 'string' ? system : JSON.stringify(system),
    u: messages,
  });
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function loadSemanticCache(key, ttlSec = 3600, { cacheDir = defaultSemanticDir() } = {}) {
  const file = path.join(cacheDir, `${key}.json`);
  try {
    const stat = fs.statSync(file);
    if ((Date.now() - stat.mtimeMs) / 1000 > ttlSec) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function storeSemanticCache(key, response, { cacheDir = defaultSemanticDir() } = {}) {
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(path.join(cacheDir, `${key}.json`), JSON.stringify(response));
  } catch {
    // Cache persistence must never break the caller.
  }
}

export function trackBudgetState({ usage, price, cap = 5, file }) {
  const cost =
    (usage.input_tokens || 0) * price.input / 1_000_000
    + (usage.output_tokens || 0) * price.output / 1_000_000
    + (usage.cache_read_input_tokens || 0) * price.cacheRead / 1_000_000
    + (usage.cache_creation_input_tokens || 0) * price.cacheWrite / 1_000_000;
  let state;
  try { state = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { state = { session: null, spent: 0, cap }; }
  state.spent = (state.spent || 0) + cost;
  state.cap = cap;
  state.lastUpdated = new Date().toISOString();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
  } catch {
    // Budget telemetry must never break the caller.
  }
  return { spent: state.spent, remaining: cap - state.spent, overBudget: state.spent > cap };
}

function defaultSemanticDir() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.ops-cache', 'semantic');
}
