#!/usr/bin/env node
// cache-genius-list.mjs — Background pre-computed genius list cache.
// Lets every repo's /start + /go show the genius list instantly without a
// 2-8 second regeneration. Cache is invalidated when any input source is newer
// than the cache timestamp.
//
// Inputs hashed: context/TASK_BOARD.md · context/SELF_IMPROVEMENT_LOOP.md ·
//                context/PROJECT_STATUS.json · portfolio/compiled/STUDIO_BRAIN.json ·
//                portfolio/GENOME_HISTORY.json.
//
// Use:
//   node scripts/cache-genius-list.mjs --write           (refresh if stale)
//   node scripts/cache-genius-list.mjs --check           (0 = fresh, 1 = stale)
//   node scripts/cache-genius-list.mjs --read            (print cache or rebuild)
//   node scripts/cache-genius-list.mjs --force           (always regenerate)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'genius-list.json');
const args = new Set(process.argv.slice(2));

const INPUTS = [
  'context/TASK_BOARD.md',
  'context/SELF_IMPROVEMENT_LOOP.md',
  'context/PROJECT_STATUS.json',
  'context/DECISIONS.md',
  'context/LATEST_HANDOFF.md',
  'portfolio/compiled/STUDIO_BRAIN.json',
  'portfolio/GENOME_HISTORY.json',
  'portfolio/PROJECT_REGISTRY.json',
];

function signature() {
  const h = crypto.createHash('sha256');
  for (const rel of INPUTS) {
    const p = path.join(ROOT, rel);
    if (fs.existsSync(p)) {
      const s = fs.statSync(p);
      h.update(`${rel}:${s.size}:${s.mtimeMs}|`);
    }
  }
  // Cross-repo TASK_BOARD stacking: include every project's task-board mtime
  // so the cache invalidates when any repo in the portfolio changes.
  try {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));
    for (const proj of reg.projects ?? []) {
      if (!proj.localPath) continue;
      const tb = path.join(proj.localPath, 'context', 'TASK_BOARD.md');
      if (fs.existsSync(tb)) {
        const s = fs.statSync(tb);
        h.update(`xrepo:${proj.slug}:${s.size}:${s.mtimeMs}|`);
      }
    }
    const ignisCore = path.join(ROOT, 'portfolio', 'IGNIS_CORE.md');
    if (fs.existsSync(ignisCore)) {
      const s = fs.statSync(ignisCore);
      h.update(`ignis-core:${s.size}:${s.mtimeMs}|`);
    }
  } catch { /* best-effort */ }
  return h.digest('hex').slice(0, 16);
}

function readCache() {
  if (!fs.existsSync(CACHE_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { return null; }
}

function regenerate() {
  const result = spawnSync(process.execPath, ['scripts/generate-genius-list.mjs', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) throw new Error(`generate-genius-list exited ${result.status}`);
  return JSON.parse(result.stdout || '{}');
}

function writeCache(list) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify(
      {
        signature: signature(),
        generatedAt: new Date().toISOString(),
        list,
      },
      null,
      2,
    ),
  );
}

const current = readCache();
const sig = signature();
const isFresh = current && current.signature === sig;

if (args.has('--check')) {
  process.exit(isFresh ? 0 : 1);
}

if (args.has('--read') && isFresh && !args.has('--force')) {
  console.log(JSON.stringify(current, null, 2));
  process.exit(0);
}

if (args.has('--write') || args.has('--read') || args.has('--force')) {
  if (isFresh && !args.has('--force')) {
    if (!args.has('--quiet')) console.log(`cache-genius-list: FRESH (sig=${sig}, age=${ageLabel(current.generatedAt)})`);
    process.exit(0);
  }
  const list = regenerate();
  writeCache(list);
  if (args.has('--read')) console.log(JSON.stringify({ signature: sig, generatedAt: new Date().toISOString(), list }, null, 2));
  else console.log(`cache-genius-list: REFRESHED (sig=${sig})`);
  process.exit(0);
}

// Default: check + report
console.log(`cache-genius-list: ${isFresh ? 'FRESH' : 'STALE'}${current ? ` (cached ${ageLabel(current.generatedAt)} ago)` : ''}`);

function ageLabel(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${Math.round(ms / 3_600_000)}h`;
}
