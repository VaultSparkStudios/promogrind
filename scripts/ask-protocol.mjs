#!/usr/bin/env node
/**
 * ask-protocol.mjs  (v2 — prompt caching + model routing)
 *
 * Protocol Oracle — natural-language Q&A about Studio OS.
 * v2 upgrades:
 *   - Prompt caching: large context blocks sent with cache_control=ephemeral
 *     → ~90% token reduction on repeated calls within 5-min cache window
 *   - Model routing: complex/strategy questions → Opus 4.6;
 *     normal questions → Sonnet 4.6; fallback → Haiku 4.5
 *   - Cache hit metrics logged to stderr
 *
 * Usage:
 *   node scripts/ask-protocol.mjs "How does SIL scoring work?"
 *   node scripts/ask-protocol.mjs --search "entropy"
 *   node scripts/ask-protocol.mjs --list
 *   node scripts/ask-protocol.mjs --model opus "Design a better session plan"
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/ask-protocol.mjs "question"
 *   node scripts/ops.mjs ask "your question here"
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import {
  MODELS,
  selectModel,
  inferComplexity,
  withCache,
  callClaude,
  logMetrics,
  semanticCacheKey,
  loadSemanticCache,
  storeSemanticCache,
} from './lib/model-router.mjs';
import { inspectProtocolFaq } from './lib/protocol-faq-contract.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const projectIdx  = process.argv.indexOf('--project');
const targetPath  = projectIdx !== -1 ? path.resolve(process.argv[projectIdx + 1]) : ROOT;
const noCache     = process.argv.includes('--no-cache');
const listMode    = process.argv.includes('--list');
const searchIdx   = process.argv.indexOf('--search');
const modelIdx    = process.argv.indexOf('--model');
const forceModel  = modelIdx !== -1 ? process.argv[modelIdx + 1] : null;

function inferModel(question) {
  if (forceModel && MODELS[forceModel]) return MODELS[forceModel];
  return selectModel(inferComplexity(question));
}

// Question is the first non-flag positional argument
const question = process.argv
  .slice(2)
  .filter((a, i, arr) => {
    if (!a.startsWith('--')) {
      // Skip values that are arguments to flags
      const prev = arr[i - 1];
      if (prev && ['--project', '--search', '--model'].includes(prev)) return false;
      return true;
    }
    return false;
  })
  .join(' ')
  .trim();

// ── Helpers ───────────────────────────────────────────────────────────────────
function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function readJson(p, fb = {}) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }

const ctx  = (f) => path.join(targetPath, 'context', f);
const docs = (f) => path.join(targetPath, 'docs', f);

// Context files — ordered by priority (most stable last = best cache candidates)
const CONTEXT_FILES = [
  { key: 'STATE_VECTOR',           path: ctx('STATE_VECTOR.json'),          stable: false },
  { key: 'PROJECT_STATUS',         path: ctx('PROJECT_STATUS.json'),         stable: false },
  { key: 'TASK_BOARD',             path: ctx('TASK_BOARD.md'),               stable: false },
  { key: 'LATEST_HANDOFF',         path: ctx('LATEST_HANDOFF.md'),           stable: false },
  { key: 'CURRENT_STATE',          path: ctx('CURRENT_STATE.md'),            stable: false },
  { key: 'DECISIONS',              path: ctx('DECISIONS.md'),                stable: true  },
  { key: 'TRUTH_AUDIT',            path: ctx('TRUTH_AUDIT.md'),              stable: true  },
  { key: 'SELF_IMPROVEMENT_LOOP',  path: ctx('SELF_IMPROVEMENT_LOOP.md'),    stable: false },
  { key: 'PROJECT_BRIEF',          path: ctx('PROJECT_BRIEF.md'),            stable: true  },
  { key: 'BRAIN',                  path: ctx('BRAIN.md'),                    stable: true  },
  { key: 'SOUL',                   path: ctx('SOUL.md'),                     stable: true  },
  { key: 'AGENTS',                 path: path.join(targetPath, 'AGENTS.md'), stable: true  },
  { key: 'CLAUDE_MD',              path: path.join(targetPath, 'CLAUDE.md'), stable: true  },
  { key: 'FILE_MAP',               path: ctx('FILE_MAP.md'),                 stable: true  },
];

// ── List mode ─────────────────────────────────────────────────────────────────
if (listMode) {
  const faqPath = docs('PROTOCOL_FAQ.md');
  const faqText = readText(faqPath);
  if (!faqText.trim()) {
    console.log('No cached FAQ entries yet. Ask a question first.');
    process.exit(0);
  }
  const entries = faqText.match(/^## Q: .+/gm) ?? [];
  const contract = inspectProtocolFaq(targetPath, faqText);
  console.log(`\nProtocol FAQ — ${entries.length} reviewed entr${entries.length === 1 ? 'y' : 'ies'} · ${contract.fresh ? 'current' : 'STALE'}\n`);
  entries.forEach((e, i) => console.log(`  ${i + 1}. ${e.slice(5)}`));
  console.log('');
  if (!contract.fresh) console.error('Run: node scripts/render-protocol-faq.mjs');
  process.exit(contract.fresh ? 0 : 1);
}

// ── Search mode ───────────────────────────────────────────────────────────────
if (searchIdx !== -1) {
  const term = process.argv[searchIdx + 1]?.toLowerCase() ?? '';
  if (!term) { console.error('--search requires a term'); process.exit(1); }
  console.log(`\nSearching protocol files for: "${term}"\n`);
  let found = 0;
  for (const f of CONTEXT_FILES) {
    const text = readText(f.path);
    if (!text) continue;
    const lines = text.split('\n');
    const matches = lines.map((l, i) => ({ line: i + 1, text: l })).filter(l => l.text.toLowerCase().includes(term));
    if (matches.length > 0) {
      console.log(`  [${f.key}]`);
      matches.slice(0, 5).forEach(l => console.log(`    L${l.line}: ${l.text.trim().slice(0, 100)}`));
      if (matches.length > 5) console.log(`    ... (+${matches.length - 5} more)`);
      found += matches.length;
    }
  }
  console.log(`\n  Total matches: ${found}\n`);
  process.exit(0);
}

if (!question) {
  console.log(`
Protocol Oracle v2 — Natural Language Protocol Q&A
With: prompt caching (90% token savings) + model routing

Usage:
  node scripts/ask-protocol.mjs "How does SIL scoring work?"
  node scripts/ask-protocol.mjs --search "entropy"
  node scripts/ask-protocol.mjs --list
  node scripts/ask-protocol.mjs --model opus "Design a better session plan"
  ANTHROPIC_API_KEY=<key> node scripts/ask-protocol.mjs "question"

Model routing (auto):
  Complex strategy/design → Opus 4.6
  Normal Q&A             → Sonnet 4.6
  Simple lookups         → Haiku 4.5
`);
  process.exit(0);
}

// ── Cache check ───────────────────────────────────────────────────────────────
const faqPath = docs('PROTOCOL_FAQ.md');
const faqText = readText(faqPath);
const cacheRegex = new RegExp(`## Q: ${question.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=## Q:|$)`, 'i');
const cached = faqText.match(cacheRegex);
if (cached) {
  console.log('\n[Cached answer]\n');
  console.log(cached[0].trim());
  console.log('');
  process.exit(0);
}

// ── Keyword fallback ──────────────────────────────────────────────────────────
function keywordFallback(q) {
  console.log('\n[Keyword search — set ANTHROPIC_API_KEY for AI-powered answers]\n');
  const terms = q.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length >= 4);
  const results = [];
  for (const f of CONTEXT_FILES) {
    const text = readText(f.path);
    if (!text) continue;
    const lines = text.split('\n');
    for (const term of terms) {
      const matches = lines.filter(l => l.toLowerCase().includes(term));
      for (const l of matches.slice(0, 3)) results.push({ file: f.key, text: l.trim().slice(0, 120) });
    }
  }
  const seen = new Set();
  const unique = results.filter(r => { const k = r.file + r.text; if (seen.has(k)) return false; seen.add(k); return true; });
  if (unique.length === 0) { console.log(`No results for: "${q}"\n`); return; }
  console.log(`Found ${unique.length} relevant lines:\n`);
  for (const r of unique.slice(0, 15)) console.log(`  [${r.file}] ${r.text}`);
  console.log('');
}

// ── Claude API call with prompt caching ───────────────────────────────────────
async function askClaude(q) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { keywordFallback(q); return; }

  // Build context blocks — split into volatile (no cache) + stable (cached)
  const CHAR_LIMIT = 16000;
  let totalChars = 0;

  // Prioritize by question relevance
  const qLower = q.toLowerCase();
  const orderedFiles = [...CONTEXT_FILES].sort((a, b) => {
    const aScore = qLower.includes(a.key.toLowerCase().replace(/_/g, ' ')) ? 10 : 0;
    const bScore = qLower.includes(b.key.toLowerCase().replace(/_/g, ' ')) ? 10 : 0;
    return bScore - aScore;
  });

  const volatileParts = [];
  const stableParts   = [];

  for (const f of orderedFiles) {
    if (totalChars >= CHAR_LIMIT) break;
    const text = readText(f.path);
    if (!text) continue;
    const snippet = text.slice(0, Math.min(2000, CHAR_LIMIT - totalChars));
    totalChars += snippet.length;
    const part = `=== ${f.key} ===\n${snippet}`;
    if (f.stable) stableParts.push(part); else volatileParts.push(part);
  }

  // Build system blocks: volatile (no cache) + stable (with cache_control)
  const systemBlocks = [
    {
      type: 'text',
      text: 'You are the Protocol Oracle for VaultSpark Studio OS. Answer questions concisely and accurately based on the provided context files. If the answer is not in the context, say so. Always cite which file/section contains the information.',
    },
  ];

  if (volatileParts.length > 0) {
    systemBlocks.push({ type: 'text', text: `Live context:\n\n${volatileParts.join('\n\n---\n\n')}` });
  }
  if (stableParts.length > 0) {
    // Mark stable block for caching via model-router — this is the expensive context
    systemBlocks.push(withCache({
      type: 'text',
      text: `Stable context (protocol docs):\n\n${stableParts.join('\n\n---\n\n')}`,
    }));
  }

  const model = inferModel(q);
  const modelLabel = Object.entries(MODELS).find(([, v]) => v === model)?.[0] ?? 'sonnet';
  console.log(`\nQuerying Protocol Oracle [${modelLabel}]...\n`);

  const semanticKey = semanticCacheKey(systemBlocks, [{ role: 'user', content: q }], model);
  const semanticHit = !noCache ? loadSemanticCache(semanticKey, 3600) : null;
  if (semanticHit?.answer) {
    console.log('[Semantic cache hit]\n');
    console.log(`Q: ${q}\n`);
    console.log(`A: ${semanticHit.answer}\n`);
    return;
  }

  try {
    const parsed = await callClaude({
      apiKey,
      model,
      maxTokens: 1024,
      system:    systemBlocks,
      messages:  [{ role: 'user', content: q }],
    }, https);
    const answer = parsed.content?.[0]?.text ?? '(no response)';

    // Cache hit metrics
    const usage       = parsed.usage ?? {};
    const cacheRead   = usage.cache_read_input_tokens    ?? 0;
    const cacheCreate = usage.cache_creation_input_tokens ?? 0;
    const inputTokens = usage.input_tokens ?? 0;
    if (cacheRead > 0) {
      const saved = Math.round(cacheRead / (cacheRead + inputTokens + cacheCreate) * 100);
      process.stderr.write(`  ✓ Cache hit: ${cacheRead} tokens read from cache (≈${saved}% saved)\n`);
    } else if (cacheCreate > 0) {
      process.stderr.write(`  ✓ Cache created: ${cacheCreate} tokens cached for next 5 min\n`);
    }
    logMetrics({ script: 'ask-protocol', model, usage });
    if (!noCache) storeSemanticCache(semanticKey, { answer, model, cachedAt: new Date().toISOString() });

    console.log(`Q: ${q}\n`);
    console.log(`A: ${answer}\n`);

    if (!noCache) console.log('  ✓ Cached in the semantic query cache; reviewed FAQ remains deterministic');
  } catch (e) {
    console.error(`API error: ${e.message}`);
    keywordFallback(q);
  }
}

await askClaude(question);
