#!/usr/bin/env node
/**
 * onboard-retry-remote.mjs — Autonomous retry of `ops onboard --repair` against
 * child repos that still show `manifestPresent: false` + `runtimePackPresent: false`
 * in portfolio/compiled/ROLLOUT_SCOREBOARD.json. The typical blocker is an active
 * session lock at onboard time (4 pilots in S80: mindframe, statvault, promogrind,
 * vaultspark-ignis). This driver clones each target via ORG_PAT, skips if the
 * repo still holds a lock, runs `ops onboard --project <slug> --target-path <clone>`
 * against the clone, and commits + pushes any changes back.
 *
 * Usage:
 *   GH_TOKEN=$ORG_PAT node scripts/onboard-retry-remote.mjs [--dry-run] [--only=slug1,slug2]
 *
 * Exit 0 on success (including no-op). Exit 1 if any remote op failed.
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
const onlyFlag = args.find((a) => a.startsWith('--only='));
const ONLY = onlyFlag
  ? new Set(onlyFlag.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean))
  : null;

const TOKEN = process.env.GH_TOKEN || process.env.ORG_PAT || '';
if (!TOKEN && !DRY) {
  console.error('⛔ GH_TOKEN (or ORG_PAT) not set. Refusing to run without a PAT.');
  process.exit(2);
}

const AUTHOR_NAME = process.env.GIT_AUTHOR_NAME || 'Studio OS Onboard Retry Bot';
const AUTHOR_EMAIL = process.env.GIT_AUTHOR_EMAIL || 'ops@vaultsparkstudios.com';
const COMMIT_MSG = 'chore(studio-ops): retry onboard — manifest + runtime-pack';

const scoreboardPath = path.join(ROOT, 'portfolio', 'compiled', 'ROLLOUT_SCOREBOARD.json');
const registryPath = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');

if (!fs.existsSync(scoreboardPath)) {
  console.error(`⛔ missing ${path.relative(ROOT, scoreboardPath)} — run \`ops rollout-scoreboard\` first`);
  process.exit(2);
}
if (!fs.existsSync(registryPath)) {
  console.error(`⛔ missing ${path.relative(ROOT, registryPath)}`);
  process.exit(2);
}

const scoreboard = JSON.parse(fs.readFileSync(scoreboardPath, 'utf8'));
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const targets = new Map();
for (const entry of [...(scoreboard.pilots || []), ...(scoreboard.projects || [])]) {
  if (!entry || !entry.slug) continue;
  if (entry.manifestPresent !== false || entry.runtimePackPresent !== false) continue;
  if (entry.slug === 'studio-ops') continue;
  if (ONLY && !ONLY.has(entry.slug)) continue;
  if (!targets.has(entry.slug)) targets.set(entry.slug, entry);
}

function sh(cmd, argv, opts = {}) {
  return spawnSync(cmd, argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function parseRepoFromProject(project) {
  const url = project.github || project.githubUrl || project.repoUrl || null;
  if (url) {
    const m = url.match(/github\.com[/:]([^/]+\/[^/.]+)/);
    if (m) return m[1];
  }
  if (project.repo && /^[^/]+\/[^/]+$/.test(project.repo)) return project.repo;
  return null;
}

function writeResult(payload) {
  const outDir = path.join(ROOT, 'portfolio', 'compiled');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'ONBOARD_RETRY_RESULT.json'),
    `${JSON.stringify(payload, null, 2)}\n`
  );
}

if (targets.size === 0) {
  console.log('Onboard retry: no pilots with missing manifest + runtime-pack — nothing to do.');
  writeResult({
    generatedAt: new Date().toISOString(),
    dryRun: DRY,
    results: [],
    summary: { retried: 0, unchanged: 0, skipped: 0, failed: 0 }
  });
  process.exit(0);
}

const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'onboard-retry-'));
const results = [];

console.log(`Workspace: ${tmpBase}`);
console.log(`Mode: ${DRY ? 'DRY RUN' : 'APPLY'}`);
console.log(`Candidates: ${[...targets.keys()].join(', ')}`);
console.log('');

try {
  for (const [slug] of targets) {
    const registryEntry = (registry.projects || []).find((p) => p.slug === slug);
    if (!registryEntry) {
      results.push({ slug, status: 'no-registry-entry' });
      continue;
    }

    const repoSlug = parseRepoFromProject(registryEntry);
    if (!repoSlug) {
      results.push({ slug, status: 'skipped-no-repo' });
      continue;
    }

    if (DRY) {
      results.push({ slug, repo: repoSlug, status: 'would-retry' });
      continue;
    }

    const workDir = path.join(tmpBase, slug.replace(/[^\w.-]/g, '_'));
    const cloneUrl = `https://x-access-token:${TOKEN}@github.com/${repoSlug}.git`;

    const clone = sh('git', ['clone', '--depth', '1', '--quiet', cloneUrl, workDir]);
    if (clone.status !== 0) {
      results.push({
        slug,
        repo: repoSlug,
        status: 'clone-failed',
        err: (clone.stderr || '').slice(0, 240)
      });
      continue;
    }

    const lockPath = path.join(workDir, 'context', '.session-lock');
    if (fs.existsSync(lockPath)) {
      results.push({ slug, repo: repoSlug, status: 'still-locked' });
      continue;
    }

    const onboard = sh(
      'node',
      [
        'scripts/ops.mjs',
        'onboard',
        '--project',
        slug,
        '--repair',
        '--write',
        '--target-path',
        workDir,
        '--json'
      ],
      { cwd: ROOT }
    );

    if (onboard.status !== 0) {
      results.push({
        slug,
        repo: repoSlug,
        status: 'onboard-failed',
        err: (onboard.stderr || onboard.stdout || '').slice(0, 320)
      });
      continue;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(onboard.stdout);
    } catch {
      /* tolerate non-json stdout — status check below still works */
    }

    sh('git', ['config', 'user.name', AUTHOR_NAME], { cwd: workDir });
    sh('git', ['config', 'user.email', AUTHOR_EMAIL], { cwd: workDir });

    const status = sh('git', ['status', '--porcelain'], { cwd: workDir });
    if (!status.stdout.trim()) {
      results.push({ slug, repo: repoSlug, status: 'unchanged' });
      continue;
    }

    sh('git', ['add', '-A'], { cwd: workDir });
    const commit = sh('git', ['commit', '-m', COMMIT_MSG], { cwd: workDir });
    if (commit.status !== 0) {
      results.push({
        slug,
        repo: repoSlug,
        status: 'commit-failed',
        err: (commit.stderr || commit.stdout || '').slice(0, 240)
      });
      continue;
    }

    const push = sh('git', ['push', 'origin', 'HEAD'], { cwd: workDir });
    if (push.status !== 0) {
      results.push({
        slug,
        repo: repoSlug,
        status: 'push-failed',
        err: (push.stderr || push.stdout || '').slice(0, 240)
      });
      continue;
    }

    results.push({
      slug,
      repo: repoSlug,
      status: 'retried',
      wrote: parsed?.wrote?.length ?? 0,
      repaired: parsed?.repaired?.length ?? 0,
      skills: parsed?.installedSkills?.length ?? 0,
      hooks: parsed?.installedHooks?.length ?? 0
    });
  }
} finally {
  try {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  } catch {
    /* best-effort cleanup */
  }
}

const counts = (key) => results.filter((r) => r.status === key).length;
const summary = {
  retried: counts('retried'),
  unchanged: counts('unchanged'),
  stillLocked: counts('still-locked'),
  wouldRetry: counts('would-retry'),
  skipped: counts('skipped-no-repo') + counts('no-registry-entry'),
  failed:
    counts('clone-failed') +
    counts('onboard-failed') +
    counts('commit-failed') +
    counts('push-failed')
};

writeResult({
  generatedAt: new Date().toISOString(),
  dryRun: DRY,
  results,
  summary
});

console.log('\nOnboard retry · results');
console.log('─'.repeat(68));
for (const r of results) {
  const icon =
    {
      retried: '✓',
      unchanged: '=',
      'would-retry': '+',
      'still-locked': '🔒',
      'skipped-no-repo': '·',
      'no-registry-entry': '·',
      'clone-failed': '✗',
      'onboard-failed': '✗',
      'commit-failed': '✗',
      'push-failed': '✗'
    }[r.status] ?? '?';
  const detail =
    r.status === 'retried'
      ? `wrote=${r.wrote} repaired=${r.repaired} skills=${r.skills} hooks=${r.hooks}`
      : r.err
      ? ` err=${r.err}`
      : '';
  console.log(`  ${icon} ${r.slug.padEnd(32)} ${r.status}${detail ? '  ' + detail : ''}`);
}
console.log('─'.repeat(68));
console.log(
  `  retried: ${summary.retried}  ·  unchanged: ${summary.unchanged}  ·  still-locked: ${summary.stillLocked}`
);
console.log(
  `  skipped: ${summary.skipped}  ·  would-retry: ${summary.wouldRetry}  ·  failed: ${summary.failed}`
);
console.log('');

process.exit(summary.failed > 0 ? 1 : 0);
