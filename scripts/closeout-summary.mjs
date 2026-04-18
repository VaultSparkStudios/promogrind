#!/usr/bin/env node
// closeout-summary.mjs — deterministic closeout ledger for Studio OS sessions.

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { loadPortfolioTaskBoards } from './lib/cross-repo-tasks.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const projectIdx = args.indexOf('--project');
const projectRoot = projectIdx >= 0 ? path.resolve(process.cwd(), args[projectIdx + 1]) : STUDIO_ROOT;
const pushed = valueAfter('--pushed') ?? 'unknown';
const message = valueAfter('--message') ?? '';

function valueAfter(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
}

function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function sh(command, commandArgs = [], cwd = projectRoot) {
  const r = spawnSync(command, commandArgs, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { code: r.status ?? -1, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function readGitHead(repoRoot) {
  try {
    const gitDir = path.join(repoRoot, '.git');
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    if (head.startsWith('ref:')) {
      const ref = head.replace(/^ref:\s*/, '');
      const branch = ref.split('/').pop();
      const sha = fs.readFileSync(path.join(gitDir, ref), 'utf8').trim();
      return { branch, sha: sha.slice(0, 7) };
    }
    return { branch: 'detached', sha: head.slice(0, 7) };
  } catch {
    return { branch: 'unknown', sha: 'unknown' };
  }
}

function exists(rel) {
  return fs.existsSync(path.join(projectRoot, rel));
}

function countDoneThisSession(taskBoard) {
  const sessions = [...taskBoard.matchAll(/\bDONE\s+S(\d+)\b/gi)].map(m => Number(m[1]));
  if (!sessions.length) return 0;
  const latest = Math.max(...sessions);
  return sessions.filter(n => n === latest).length;
}

function countDeferred(taskBoard) {
  const matches = taskBoard.match(/\|\s*(human-blocked|cross-repo-locked|blocked-on-hub|externally-blocked|staged|staged-cross-repo)\s*\|/gi) ?? [];
  return matches.length;
}

function countMemoryEntries() {
  const localMem = path.join(projectRoot, 'memory');
  const codexMem = path.join(process.env.USERPROFILE || '', '.codex', 'memories');
  let count = 0;
  for (const dir of [localMem, codexMem]) {
    try {
      const stack = [dir];
      while (stack.length) {
        const current = stack.pop();
        if (!current || !fs.existsSync(current)) continue;
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) stack.push(full);
          else if (/\.md$/i.test(entry.name)) {
            const ageMs = Date.now() - fs.statSync(full).mtimeMs;
            if (ageMs <= 24 * 60 * 60 * 1000) count++;
          }
        }
      }
    } catch { /* best-effort */ }
  }
  return count;
}

const status = readJson(path.join(projectRoot, 'context', 'PROJECT_STATUS.json'), {});
const taskBoard = readText(path.join(projectRoot, 'context', 'TASK_BOARD.md'));
const gitFallback = readGitHead(projectRoot);
const gitBranch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']).out || gitFallback.branch;
const gitSha = sh('git', ['rev-parse', '--short', 'HEAD']).out || gitFallback.sha;
const gitStatusResult = sh('git', ['status', '--short']);
const gitStatus = gitStatusResult.out;
const dirtyKnown = gitStatusResult.code === 0;
const port = loadPortfolioTaskBoards({ studioRoot: STUDIO_ROOT, currentRepoPath: projectRoot });
const currentProject = port.byProject.find(p => p.isCurrent);

const writebacks = [
  ['CURRENT_STATE', exists('context/CURRENT_STATE.md')],
  ['TASK_BOARD', exists('context/TASK_BOARD.md')],
  ['LATEST_HANDOFF', exists('context/LATEST_HANDOFF.md')],
  ['WORK_LOG', exists('logs/WORK_LOG.md')],
  ['DECISIONS', exists('context/DECISIONS.md')],
  ['SELF_IMPROVEMENT_LOOP', exists('context/SELF_IMPROVEMENT_LOOP.md')],
  ['CREATIVE_DIRECTION_RECORD', exists('docs/CREATIVE_DIRECTION_RECORD.md')],
  ['TRUTH_AUDIT', exists('context/TRUTH_AUDIT.md')],
];

const payload = {
  generatedAt: new Date().toISOString(),
  project: {
    slug: status.slug ?? path.basename(projectRoot),
    name: status.name ?? path.basename(projectRoot),
    root: projectRoot,
  },
  git: {
    branch: gitBranch,
    sha: gitSha,
    pushed,
    message,
    dirty: dirtyKnown ? Boolean(gitStatus) : null,
    dirtyKnown,
  },
  writebacks: writebacks.map(([name, ok]) => ({ name, ok })),
  taskBoard: {
    remaining: currentProject?.remaining ?? null,
    unblocked: currentProject?.unblocked ?? null,
    blocked: currentProject?.blocked ?? null,
    doneThisSession: countDoneThisSession(taskBoard),
    deferred: countDeferred(taskBoard),
  },
  portfolio: port.totals,
  memoryEntriesTouched24h: countMemoryEntries(),
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const lines = [];
lines.push('Closeout ledger');
lines.push(`  Project: ${payload.project.name} (${payload.project.slug})`);
lines.push(`  Branch:  ${payload.git.branch}`);
lines.push(`  HEAD:    ${payload.git.sha}`);
lines.push(`  Pushed:  ${payload.git.pushed}`);
if (payload.git.message) lines.push(`  Message: ${payload.git.message}`);
lines.push('');
lines.push('Writeback');
for (const item of payload.writebacks) {
  lines.push(`  ${item.ok ? '[x]' : '[ ]'} ${item.name}`);
}
lines.push('');
lines.push('Task board');
lines.push(`  Current repo: ${payload.taskBoard.remaining ?? '?'} open · ${payload.taskBoard.unblocked ?? '?'} unblocked · ${payload.taskBoard.blocked ?? '?'} blocked`);
lines.push(`  Done this session markers: ${payload.taskBoard.doneThisSession}`);
lines.push(`  Deferred/gated rows: ${payload.taskBoard.deferred}`);
lines.push(`  Portfolio: ${payload.portfolio.remaining} open · ${payload.portfolio.unblocked} unblocked · ${payload.portfolio.blocked} blocked`);
lines.push('');
lines.push(`Memory entries touched in last 24h: ${payload.memoryEntriesTouched24h}`);
lines.push(`Working tree after closeout: ${payload.git.dirtyKnown ? (payload.git.dirty ? 'dirty' : 'clean') : 'unknown'}`);

console.log(lines.join('\n'));
