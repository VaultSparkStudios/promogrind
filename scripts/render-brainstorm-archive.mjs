#!/usr/bin/env node
/**
 * render-brainstorm-archive.mjs
 *
 * Parses all SIL brainstorm entries from SELF_IMPROVEMENT_LOOP.md,
 * detects which ideas were committed to TASK_BOARD vs left orphaned,
 * counts recurrence, and surfaces high-probability unconverted ideas.
 *
 * Usage:
 *   node scripts/render-brainstorm-archive.mjs
 *   node scripts/render-brainstorm-archive.mjs --propose   → output pre-drafted TASK_BOARD lines for top orphans
 *   node scripts/ops.mjs brainstorm-archive
 *   node scripts/ops.mjs brainstorm-propose
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const ROOT         = path.resolve(__dirname, '..');
const OUT          = path.join(ROOT, 'docs', 'BRAINSTORM_ARCHIVE.md');
const proposeMode  = process.argv.includes('--propose');

function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function normalize(text = '') {
  return text
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/\*\*/g, ' ')
    .replace(/[`~]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function tokenSet(text = '') {
  return new Set(
    normalize(text)
      .split(' ')
      .filter(word => word.length >= 4)
      .filter(word => !['with', 'into', 'from', 'that', 'this', 'then', 'than'].includes(word))
  );
}
function tokensOverlap(a, b) {
  const aa = tokenSet(a);
  const bb = tokenSet(b);
  if (aa.size === 0 || bb.size === 0) return false;
  let shared = 0;
  for (const token of aa) {
    if (bb.has(token)) shared++;
  }
  return shared >= Math.min(3, Math.max(2, Math.floor(Math.min(aa.size, bb.size) * 0.6)));
}

const sil       = readText(path.join(ROOT, 'context', 'SELF_IMPROVEMENT_LOOP.md'));
const taskBoard = readText(path.join(ROOT, 'context', 'TASK_BOARD.md'));
const today     = new Date().toISOString().slice(0, 10);

// ── Parse entries ─────────────────────────────────────────────────────────────
// Each SIL entry looks like: ## YYYY-MM-DD — Session N | ...
const entries = sil.split(/^## (\d{4}-\d{2}-\d{2}) — Session (\d+)/m)
  .slice(1) // drop preamble
  .reduce((acc, part, i, arr) => {
    if (i % 3 === 0) { // date
      acc.push({ date: part, session: arr[i + 1], body: arr[i + 2] ?? '' });
    }
    return acc;
  }, []);

// ── Extract brainstorm items from each entry ──────────────────────────────────
const allIdeas = []; // { text, session, date, probability, committedLine }

for (const { date, session, body } of entries) {
  const bsBlock = body.match(/\*\*Brainstorm\*\*\n([\s\S]*?)(?=\n\*\*Committed|\n---|\n## |$)/)?.[1] ?? '';
  const lines = bsBlock.split(/\n/).filter(l => /^\d+\./.test(l.trim()));
  for (const line of lines) {
    const text = line.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim();
    if (!text) continue;
    const probMatch = text.match(/Probability:\s*(High|Medium|Low)/i);
    const probability = probMatch?.[1] ?? 'unknown';
    // Extract core idea (text before first em-dash or asterisk)
    const core = text.split(/\s*[—–*\|]\s*/)[0].trim().slice(0, 100);
    allIdeas.push({ core, text: text.slice(0, 200), session: parseInt(session), date, probability });
  }
}

// ── Detect committed items ────────────────────────────────────────────────────
// An idea is "committed" if there's a TASK_BOARD entry that references it
// or the SIL entry's "Committed to TASK_BOARD:" line mentions it
const committedLines = sil.match(/\*\*Committed to TASK_BOARD:\*\*[^\n]*/g) ?? [];
const committedText  = normalize(committedLines.join(' '));
const taskBoardItems = taskBoard
  .split(/\r?\n/)
  .filter(line => /^\|\s*[\d.]+\s*\|/.test(line) || /^- \[.\]/.test(line))
  .map((line) => {
    const bold = line.match(/\*\*(.+?)\*\*/)?.[1] ?? line;
    return normalize(bold);
  })
  .filter(Boolean);

function isCommitted(idea) {
  const key = normalize(idea.core);
  if (!key) return false;
  if (committedText.includes(key) || key.includes(committedText)) return true;
  return taskBoardItems.some((item) =>
    item.includes(key) ||
    key.includes(item) ||
    item.includes(key.slice(0, 28)) ||
    tokensOverlap(item, key)
  );
}

// ── Deduplicate + count recurrences ──────────────────────────────────────────
const ideaMap = new Map(); // normalizedKey → { ...idea, count, sessions, committed }
for (const idea of allIdeas) {
  const key = normalize(idea.core).slice(0, 50);
  if (!ideaMap.has(key)) {
    ideaMap.set(key, { ...idea, count: 0, sessions: [], committed: isCommitted(idea) });
  }
  const entry = ideaMap.get(key);
  entry.count++;
  entry.sessions.push(idea.session);
  if (idea.probability !== 'unknown') entry.probability = idea.probability;
  if (idea.session > entry.session) { entry.session = idea.session; entry.date = idea.date; }
}

const deduplicated = [...ideaMap.values()].sort((a, b) => {
  if (b.committed !== a.committed) return a.committed ? 1 : -1; // orphaned first
  return b.count - a.count;
});

const orphaned   = deduplicated.filter(i => !i.committed);
const committed  = deduplicated.filter(i => i.committed);
const highOrph   = orphaned.filter(i => /high/i.test(i.probability));

// ── Write output ──────────────────────────────────────────────────────────────
const lines = [
  `# Brainstorm Archive`,
  ``,
  `> Generated: ${today} · Total ideas parsed: ${allIdeas.length} · Deduplicated: ${deduplicated.length} · Committed: ${committed.length} · Orphaned: ${orphaned.length}`,
  ``,
  `---`,
  ``,
  `## Orphaned Ideas (never committed to TASK_BOARD)`,
  ``,
  `Sorted by recurrence. High-recurrence = strong signal of persistent need.`,
  ``,
  `| # | Count | Idea | Last Session | Prob |`,
  `|---|---|---|---|---|`,
  ...orphaned.slice(0, 20).map((idea, i) =>
    `| ${i + 1} | ${idea.count} | ${idea.core.slice(0, 70)} | S${idea.session} | ${idea.probability} |`
  ),
  ``,
  `## High-Priority Orphans (Probability: High)`,
  ``,
  ...(highOrph.length > 0
    ? highOrph.map(idea => `- **${idea.core}** *(mentioned ${idea.count}× · last S${idea.session})*`)
    : ['- *(none — all high-probability ideas committed)*']),
  ``,
  `---`,
  ``,
  `## Committed Ideas (${committed.length} total)`,
  ``,
  `| Idea | Last Session | Prob |`,
  `|---|---|---|`,
  ...committed.slice(0, 30).map(idea =>
    `| ${idea.core.slice(0, 70)} | S${idea.session} | ${idea.probability} |`
  ),
  ``,
  `---`,
  ``,
  `*Generated by \`scripts/render-brainstorm-archive.mjs\` · run \`node scripts/ops.mjs brainstorm-archive\` to refresh*`,
];

fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`✓ Brainstorm archive → docs/BRAINSTORM_ARCHIVE.md`);
console.log(`  ${allIdeas.length} raw ideas · ${deduplicated.length} unique · ${orphaned.length} orphaned · ${highOrph.length} high-priority orphans`);

// ── Propose mode: output pre-drafted TASK_BOARD lines ────────────────────────
if (proposeMode) {
  // Top candidates: high-probability orphans mentioned 3+ times
  const candidates = orphaned
    .filter(i => i.count >= 3 || /high/i.test(i.probability))
    .sort((a, b) => {
      const aScore = (/high/i.test(a.probability) ? 20 : /medium/i.test(a.probability) ? 10 : 0) + a.count * 3;
      const bScore = (/high/i.test(b.probability) ? 20 : /medium/i.test(b.probability) ? 10 : 0) + b.count * 3;
      return bScore - aScore;
    })
    .slice(0, 5);

  if (candidates.length === 0) {
    console.log('\n  No candidates meet threshold (High probability or ≥3 recurrences). All strong ideas are already committed.\n');
  } else {
    const currentSession = (() => {
      try {
        const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'context', 'PROJECT_STATUS.json'), 'utf8'));
        return (s.currentSession ?? 69) + 1;
      } catch { return 69; }
    })();

    console.log(`\n━━━ BRAINSTORM PROPOSALS (${candidates.length} items) ━━━━━━━━━━━━━━━━━━\n`);
    console.log('Copy these lines into TASK_BOARD.md → Next bucket:\n');
    for (const idea of candidates) {
      const tag = /high/i.test(idea.probability) ? '[SIL]' : '[SIL]';
      const line = `- [ ] **${tag} ${idea.core}** — mentioned ${idea.count}× in SIL brainstorm (last S${idea.session}); probability: ${idea.probability}. (NEW S${currentSession})`;
      console.log(line);
    }
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}
