#!/usr/bin/env node
/**
 * render-session-intent-plan.mjs
 *
 * Converts the declared session intent into a scope-capped execution recipe:
 * - likely target repos
 * - likely blockers
 * - expected yield
 * - best next 3 actions
 *
 * Outputs:
 * - context/SESSION_INTENT_PLAN.md
 *
 * Usage:
 *   node scripts/render-session-intent-plan.mjs
 *   node scripts/render-session-intent-plan.mjs --intent "..."
 *   node scripts/render-session-intent-plan.mjs --json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifyBlocker } from './lib/blocker-rules.mjs';
import { extractCurrentSessionIntent, parseHumanItems, parseUnifiedItems } from './lib/task-board.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HANDOFF = path.join(ROOT, 'context', 'LATEST_HANDOFF.md');
const TASK_BOARD = path.join(ROOT, 'context', 'TASK_BOARD.md');
const SIL = path.join(ROOT, 'context', 'SELF_IMPROVEMENT_LOOP.md');
const STATUS = path.join(ROOT, 'context', 'PROJECT_STATUS.json');
const OUT = path.join(ROOT, 'context', 'SESSION_INTENT_PLAN.md');
const jsonMode = process.argv.includes('--json');

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function repoHintsFor(text) {
  const source = String(text || '').toLowerCase();
  const repos = ['studio-ops'];
  if (/studio hub|hub\b/.test(source)) repos.push('studio-hub');
  if (/website|vaultsparkstudios\.com/.test(source)) repos.push('vaultsparkstudios-website');
  if (/social dashboard/.test(source)) repos.push('vaultspark-studios-social-dashboard');
  if (/sparkfunnel|spark-funnel/.test(source)) repos.push('spark-funnel');
  if (/mindframe/.test(source)) repos.push('mindframe');
  return [...new Set(repos)];
}

function extractScopeCap(silHeader) {
  const velocity = parseInt(silHeader.match(/Velocity:\s*(\d+)/)?.[1] ?? '0', 10);
  return velocity > 0 ? Math.max(1, Math.floor(velocity * 1.5)) : 1;
}

function estimateYield(bestNext, blockers) {
  if (bestNext.length >= 3 && blockers.length === 0) return 'High-confidence local execution session.';
  if (bestNext.length >= 2) return 'Likely 2 meaningful control-plane moves if cross-repo work stays out of path.';
  if (blockers.length > 0) return 'Mixed session: local planning/protocol wins available, but external blockers can cap throughput.';
  return 'Low-confidence execution window; refine scope before coding.';
}

const handoff = readText(HANDOFF);
const board = readText(TASK_BOARD);
const sil = readText(SIL);
const status = readJson(STATUS, {});
const silHeaderMatch = sil.match(/<!-- rolling-status-start -->([\s\S]*?)<!-- rolling-status-end -->/);
const silHeader = silHeaderMatch ? silHeaderMatch[1] : '';
const intentArgIndex = process.argv.indexOf('--intent');
const intent = intentArgIndex !== -1
  ? (process.argv[intentArgIndex + 1] || '').trim()
  : extractCurrentSessionIntent(handoff);

const scopeCap = extractScopeCap(silHeader);
const unified = parseUnifiedItems(board);
const humanItems = parseHumanItems(board);
const intentTokens = new Set(tokenize(intent));

const scored = unified
  .filter((item) => item.status === 'unblocked')
  .map((item) => {
    const itemTokens = tokenize(`${item.title} ${item.item} ${item.category}`);
    const overlap = itemTokens.filter((token) => intentTokens.has(token)).length;
    const rankWeight = Math.max(0, 12 - item.rankNumber);
    return {
      ...item,
      overlap,
      score: overlap * 8 + rankWeight,
    };
  })
  .sort((a, b) => b.score - a.score || a.rankNumber - b.rankNumber);

const bestNext = scored.slice(0, 3).map((item) => ({
  rank: item.rank,
  category: item.category,
  effort: item.effort,
  title: item.title,
}));

const likelyBlockers = humanItems
  .map((item) => {
    const blocker = classifyBlocker(`${item.title} ${item.description}`);
    const titleTokens = tokenize(`${item.title} ${item.description}`);
    const overlap = titleTokens.filter((token) => intentTokens.has(token)).length;
    return {
      title: item.title,
      ageSessions: item.ageSessions,
      overlap,
      attemptable: blocker.attemptable,
      category: blocker.category,
      nextAction: blocker.probeCommands[0] || 'node scripts/ops.mjs blocker-preflight',
    };
  })
  .filter((item) => item.overlap > 0)
  .sort((a, b) => (b.overlap - a.overlap) || ((b.ageSessions || 0) - (a.ageSessions || 0)))
  .slice(0, 3);

const repos = repoHintsFor(intent);
const payload = {
  generatedAt: new Date().toISOString().slice(0, 10),
  session: (status.currentSession || 0) + 1,
  intent,
  scopeCap,
  repos,
  bestNext,
  likelyBlockers,
  expectedYield: estimateYield(bestNext, likelyBlockers),
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const lines = [
  '<!-- generated-by: scripts/render-session-intent-plan.mjs -->',
  `<!-- generated-at: ${payload.generatedAt} -->`,
  '',
  '# Session Intent Plan',
  '',
  '> Scope-capped execution recipe derived from the current handoff intent.',
  '',
  `- **Intent:** ${payload.intent || 'No current intent found in LATEST_HANDOFF.md'}`,
  `- **Scope cap:** ${payload.scopeCap} item(s)`,
  `- **Repo touch set:** ${payload.repos.join(' · ')}`,
  `- **Expected yield:** ${payload.expectedYield}`,
  '',
  '## Best Next 3',
  '',
];

if (bestNext.length === 0) {
  lines.push('- No unblocked items match the current session intent.');
} else {
  for (const item of bestNext) {
    lines.push(`- **${item.rank} · ${item.category} · ${item.effort}** — ${item.title}`);
  }
}

lines.push('', '## Likely Blockers', '');

if (likelyBlockers.length === 0) {
  lines.push('- No direct human-action blockers strongly overlap the current intent.');
} else {
  for (const blocker of likelyBlockers) {
    lines.push(`- **${blocker.title}** — ${blocker.attemptable ? 'try first' : 'likely owner-only'}${blocker.ageSessions ? ` · ${blocker.ageSessions} sessions old` : ''}`);
    lines.push(`  Next action: \`${blocker.nextAction}\``);
  }
}

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`✓ Session intent plan → context/SESSION_INTENT_PLAN.md  (${bestNext.length} next action(s))`);
