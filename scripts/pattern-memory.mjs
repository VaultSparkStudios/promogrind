#!/usr/bin/env node
/**
 * pattern-memory.mjs — auto-write `project` memory entries for recurring genius-list categories (S85).
 *
 * Fulfills TASK_BOARD #72: when a category lands in the top N of the Unified
 * Genius List for 3+ consecutive sessions, this script auto-writes a project
 * memory entry summarizing the recurring pattern + its cause. Reduces the
 * cold-start forgetting cost across 27 repos.
 *
 * Flow:
 *   1. Run `generate-genius-list.mjs --json` (or read cached JSON) to get the
 *      current top-N categories.
 *   2. Append the snapshot to `portfolio/compiled/GENIUS_HISTORY.json`
 *      (schemaVersion 1.0). Idempotent on (session, date).
 *   3. Detect any category with ≥ `--threshold` consecutive appearances in
 *      the last `--threshold` entries of history.
 *   4. For each new pattern, write a memory file under the Studio Ops memory
 *      root and append a one-line index entry to MEMORY.md.
 *
 * Usage:
 *   node scripts/ops.mjs pattern-memory
 *   node scripts/ops.mjs pattern-memory --threshold 3 --top 5 --dry-run
 *
 * Exit 0 on success. Exit 1 if any write fails.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');

function argValue(flag, fallback) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] !== undefined ? args[idx + 1] : fallback;
}

const THRESHOLD = Number(argValue('--threshold', '3'));
const TOP_N = Number(argValue('--top', '5'));

const HISTORY_PATH = path.join(ROOT, 'portfolio', 'compiled', 'GENIUS_HISTORY.json');
const MEMORY_ROOT = path.join(
  os.homedir(),
  '.claude',
  'projects',
  'C--Users-p4cka-documents-development-vaultspark-studio-ops',
  'memory'
);
const MEMORY_INDEX = path.join(MEMORY_ROOT, 'MEMORY.md');

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

// ── Step 1: fetch current genius list ──────────────────────────────────────

function fetchCurrentList() {
  const result = spawnSync(process.execPath, ['scripts/generate-genius-list.mjs', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(`generate-genius-list.mjs failed: ${result.stderr?.slice(0, 200)}`);
  }
  const parsed = JSON.parse(result.stdout);
  if (!Array.isArray(parsed.ranked)) {
    throw new Error('genius-list JSON missing ranked[]');
  }
  return parsed;
}

// ── Step 2: append to history (idempotent on session) ──────────────────────

function appendToHistory(current) {
  const history = readJson(HISTORY_PATH, { schemaVersion: '1.0', entries: [] });
  const entries = Array.isArray(history.entries) ? history.entries : [];
  const existingIdx = entries.findIndex(
    (e) => e?.session === current.session && e?.date === current.date
  );

  const snapshot = {
    session: current.session,
    date: current.date,
    ignisSource: current.ignisSource,
    topCategories: current.ranked
      .slice(0, TOP_N)
      .map((r) => String(r.cat || '').toLowerCase())
      .filter(Boolean),
    topTitles: current.ranked.slice(0, TOP_N).map((r) => r.title)
  };

  if (existingIdx >= 0) {
    entries[existingIdx] = snapshot;
  } else {
    entries.push(snapshot);
  }

  entries.sort((a, b) => (a.session ?? 0) - (b.session ?? 0));

  const next = {
    schemaVersion: '1.0',
    updatedAt: new Date().toISOString(),
    entries
  };

  if (!DRY) writeJson(HISTORY_PATH, next);
  return next;
}

// ── Step 3: detect recurring categories ────────────────────────────────────

function detectPatterns(history) {
  const entries = history.entries || [];
  if (entries.length < THRESHOLD) return [];

  const window = entries.slice(-THRESHOLD);
  const counts = new Map();
  for (const entry of window) {
    const seen = new Set();
    for (const cat of entry.topCategories || []) {
      if (seen.has(cat)) continue;
      seen.add(cat);
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
  }

  const recurring = [];
  for (const [cat, count] of counts) {
    if (count >= THRESHOLD) {
      recurring.push({
        category: cat,
        consecutiveCount: count,
        windowSessions: window.map((e) => e.session),
        recentTitles: window
          .map((e) => (e.topTitles || []).find((t) => true))
          .filter(Boolean)
      });
    }
  }
  return recurring;
}

// ── Step 4: write memory files ─────────────────────────────────────────────

function memoryFileName(category) {
  return `project_pattern_${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md`;
}

function buildMemoryBody(pattern, currentSession) {
  const sessions = pattern.windowSessions.map((s) => `S${s}`).join(', ');
  const titleList = pattern.recentTitles.slice(0, pattern.consecutiveCount).map((t) => `- ${t}`).join('\n');

  const frontmatter =
    `---\n` +
    `name: Recurring ${pattern.category.toUpperCase()} pressure (${pattern.consecutiveCount} sessions)\n` +
    `description: ${pattern.category.toUpperCase()} category has surfaced in genius-list top ${TOP_N} for ${pattern.consecutiveCount} consecutive sessions — persistent portfolio leverage point worth treating as carry-forward, not one-session work.\n` +
    `type: project\n` +
    `---\n\n`;

  const body =
    `## Pattern\n\n` +
    `**${pattern.category.toUpperCase()}** category has appeared in the genius-list top ${TOP_N} for ${pattern.consecutiveCount} consecutive sessions (${sessions}).\n\n` +
    `**Representative recent items:**\n${titleList}\n\n` +
    `**Why:** Category recurrence over ${THRESHOLD}+ sessions indicates an upstream gate that single-session work does not clear — usually an owner-only credential, cross-repo lock, or compounding protocol surface. Detector: \`scripts/pattern-memory.mjs\` threshold ${THRESHOLD}.\n\n` +
    `**How to apply:** When planning a session, budget ${pattern.category.toUpperCase()} work as carry-forward unless blocker preflight proves the upstream gate is now agent-resolvable. Do not re-propose the same category as a "quick win" without re-checking the gate state.\n\n` +
    `*Auto-written by \`scripts/pattern-memory.mjs\` on ${new Date().toISOString().slice(0, 10)} · Session ${currentSession}.*\n`;

  return frontmatter + body;
}

function indexEntryFor(pattern, fileName) {
  return `- [Recurring ${pattern.category.toUpperCase()} pressure](${fileName}) — ${pattern.category.toUpperCase()} in top-${TOP_N} for ${pattern.consecutiveCount} consecutive sessions (${pattern.windowSessions.map((s) => 'S' + s).join(', ')}) · auto-pattern`;
}

function ensureMemoryIndexEntry(fileName, entryLine) {
  if (!fs.existsSync(MEMORY_INDEX)) return;
  const current = fs.readFileSync(MEMORY_INDEX, 'utf8');
  const needle = `](${fileName})`;
  if (current.includes(needle)) return; // already indexed
  const next = current.replace(/\n+$/, '\n') + entryLine + '\n';
  if (!DRY) fs.writeFileSync(MEMORY_INDEX, next);
}

function writeMemoryForPattern(pattern, currentSession) {
  if (!fs.existsSync(MEMORY_ROOT)) {
    throw new Error(`memory root not found: ${MEMORY_ROOT}`);
  }
  const fileName = memoryFileName(pattern.category);
  const filePath = path.join(MEMORY_ROOT, fileName);
  const body = buildMemoryBody(pattern, currentSession);
  const alreadyExists = fs.existsSync(filePath);

  if (alreadyExists) {
    // Refresh: only re-write if content changed (keeps mtime clean on re-runs)
    const current = fs.readFileSync(filePath, 'utf8');
    if (current === body) return { filePath, status: 'unchanged' };
    if (!DRY) fs.writeFileSync(filePath, body);
    return { filePath, status: 'updated' };
  }

  if (!DRY) fs.writeFileSync(filePath, body);
  ensureMemoryIndexEntry(fileName, indexEntryFor(pattern, fileName));
  return { filePath, status: 'created' };
}

// ── Main ───────────────────────────────────────────────────────────────────

try {
  const current = fetchCurrentList();
  const history = appendToHistory(current);
  const patterns = detectPatterns(history);

  console.log(`pattern-memory · threshold=${THRESHOLD} · top=${TOP_N} · mode=${DRY ? 'DRY RUN' : 'APPLY'}`);
  console.log(`  history entries: ${history.entries.length}`);
  console.log(`  current session: ${current.session}  date: ${current.date}`);
  console.log(`  current top categories: ${current.ranked.slice(0, TOP_N).map((r) => r.cat).join(', ')}`);

  if (patterns.length === 0) {
    console.log(`  recurring patterns: none (need ${THRESHOLD} consecutive appearances)`);
    process.exit(0);
  }

  console.log(`  recurring patterns: ${patterns.length}`);
  let failed = 0;
  for (const pattern of patterns) {
    try {
      const result = writeMemoryForPattern(pattern, current.session);
      const icon = { created: '✓ new', updated: '↻ refresh', unchanged: '= noop' }[result.status] || '?';
      console.log(`    ${icon}  ${pattern.category.padEnd(14)} (${pattern.consecutiveCount}× in S${pattern.windowSessions.join(',S')})`);
    } catch (err) {
      failed += 1;
      console.error(`    ✗  ${pattern.category.padEnd(14)} — ${err.message}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
} catch (err) {
  console.error(`pattern-memory failed: ${err.message}`);
  process.exit(1);
}
