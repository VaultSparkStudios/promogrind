#!/usr/bin/env node
/**
 * batch-commit-skill-map.mjs — Commit + push docs/SKILL_MAP.md in every
 * registry repo that has an untracked or modified copy. Meant to run
 * after `propagate-skill-map.mjs --apply` dropped the file everywhere.
 *
 * Safety:
 *   - Skips locked/diverged repos (check-repo-lock.sh).
 *   - Only commits docs/SKILL_MAP.md — never `git add -A`.
 *   - Never commits in the source repo (studio-ops); that's handled by closeout.
 *   - Dry-run by default; pass --apply to actually commit + push.
 *   - --no-push to commit without pushing.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const NO_PUSH = args.includes('--no-push');

const COMMIT_MSG = 'docs: add SKILL_MAP.md cheatsheet (propagated from studio-ops)';

const REGISTRY = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
const LOCK_CHECK = path.join(ROOT, 'scripts', 'check-repo-lock.sh');
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));

const results = [];

for (const project of registry.projects ?? []) {
  const { slug, localPath } = project;
  if (!localPath || !fs.existsSync(localPath)) {
    results.push({ slug, status: 'skipped-path' });
    continue;
  }

  const isSelf = path.resolve(localPath) === path.resolve(ROOT);
  if (isSelf) {
    results.push({ slug, status: 'skipped-self' });
    continue;
  }

  const target = path.join(localPath, 'docs', 'SKILL_MAP.md');
  if (!fs.existsSync(target)) {
    results.push({ slug, status: 'no-file' });
    continue;
  }

  // Lock check
  const lockCheck = spawnSync('bash', [LOCK_CHECK, localPath], {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  });
  if (lockCheck.status === 1) {
    results.push({ slug, status: 'locked' });
    continue;
  }

  // Check if the file is untracked OR modified
  const status = spawnSync('git', ['status', '--porcelain', '--', 'docs/SKILL_MAP.md'], {
    cwd: localPath, encoding: 'utf8'
  });
  const dirty = (status.stdout || '').trim();
  if (!dirty) {
    results.push({ slug, status: 'clean' });
    continue;
  }

  if (!APPLY) {
    results.push({ slug, status: 'would-commit', dirty });
    continue;
  }

  // Add + commit
  const add = spawnSync('git', ['add', 'docs/SKILL_MAP.md'], { cwd: localPath, encoding: 'utf8' });
  if (add.status !== 0) {
    results.push({ slug, status: 'add-failed', err: (add.stderr || '').slice(0, 150) });
    continue;
  }

  const commit = spawnSync('git', ['commit', '-m', COMMIT_MSG], { cwd: localPath, encoding: 'utf8' });
  if (commit.status !== 0) {
    results.push({ slug, status: 'commit-failed', err: (commit.stderr || commit.stdout || '').slice(0, 150) });
    continue;
  }

  if (NO_PUSH) {
    results.push({ slug, status: 'committed-no-push' });
    continue;
  }

  const push = spawnSync('git', ['push'], { cwd: localPath, encoding: 'utf8' });
  if (push.status !== 0) {
    results.push({ slug, status: 'push-failed', err: (push.stderr || push.stdout || '').slice(0, 150) });
  } else {
    results.push({ slug, status: 'pushed' });
  }
}

console.log('');
console.log(`Batch commit skill-map · ${APPLY ? 'APPLY' : 'DRY RUN'}`);
console.log('─'.repeat(60));
results.forEach(r => {
  const icon = { pushed: '✓', 'committed-no-push': '◐', 'would-commit': '+',
                 clean: '=', locked: '⛔', 'no-file': '·',
                 'add-failed': '✗', 'commit-failed': '✗', 'push-failed': '✗',
                 'skipped-self': '·', 'skipped-path': '·' }[r.status] || '?';
  const note = r.err ? ` err=${r.err}` : (r.dirty ? ` dirty=${r.dirty}` : '');
  console.log(`  ${icon} ${r.slug.padEnd(32)} ${r.status}${note}`);
});
console.log('─'.repeat(60));

const count = (s) => results.filter(r => r.status === s).length;
console.log(`  pushed: ${count('pushed')}  ·  committed-no-push: ${count('committed-no-push')}  ·  would-commit: ${count('would-commit')}`);
console.log(`  clean: ${count('clean')}  ·  locked: ${count('locked')}  ·  no-file: ${count('no-file')}`);
const failed = count('add-failed') + count('commit-failed') + count('push-failed');
if (failed) console.log(`  ⛔ failed: ${failed}`);
console.log('');

if (!APPLY) console.log('  Dry-run. Pass --apply to commit + push.');

process.exit(0);
