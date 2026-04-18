#!/usr/bin/env node
/**
 * sync-skill-map-remote.mjs — Clone each registry repo via GitHub + ORG_PAT,
 * sync docs/SKILL_MAP.md from the canonical template, commit + push if changed.
 *
 * Designed to run in GitHub Actions (or locally with ORG_PAT set). Uses
 * `git clone` (HTTPS with embedded token) so it doesn't depend on local
 * paths or disk layout — closes the drift that local `propagate-skill-map.mjs`
 * can't touch when child repos are session-locked or diverged on your machine.
 *
 * Usage:
 *   GH_TOKEN=$ORG_PAT node scripts/sync-skill-map-remote.mjs [--dry-run] [--only=slug1,slug2]
 *
 * Env:
 *   GH_TOKEN   — PAT with Contents:Write on target repos (e.g. ORG_PAT)
 *   GIT_AUTHOR — "Name <email>" for commits (default: Studio OS Template Bot)
 *
 * Exits 0 if all operations succeeded (including no-op), non-zero if any failed.
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
const onlyFlag = args.find(a => a.startsWith('--only='));
const ONLY = onlyFlag ? new Set(onlyFlag.split('=')[1].split(',').map(s => s.trim()).filter(Boolean)) : null;

const TOKEN = process.env.GH_TOKEN || process.env.ORG_PAT || '';
if (!TOKEN && !DRY) {
  console.error('⛔ GH_TOKEN (or ORG_PAT) not set. Refusing to run without a PAT.');
  console.error('   Set the token in GitHub Actions → Secrets, or export it locally.');
  process.exit(2);
}

const AUTHOR = process.env.GIT_AUTHOR || 'Studio OS Template Bot <ops@vaultsparkstudios.com>';
const AUTHOR_NAME = AUTHOR.match(/^(.+?)\s*<.*>$/)?.[1] ?? 'Studio OS Template Bot';
const AUTHOR_EMAIL = AUTHOR.match(/<(.+?)>/)?.[1] ?? 'ops@vaultsparkstudios.com';

const REGISTRY_PATH = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
const TEMPLATE_PATH = path.join(ROOT, 'docs', 'templates', 'project-system', 'SKILL_MAP.template.md');
const COMMIT_MSG = 'docs: sync SKILL_MAP.md from studio-ops';

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

function sh(cmd, argv, opts = {}) {
  return spawnSync(cmd, argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function parseRepoFromProject(project) {
  // Prefer explicit `github` URL; fall back to deriving from slug.
  const url = project.github || project.githubUrl || project.repoUrl || null;
  if (url) {
    const m = url.match(/github\.com[/:]([^/]+\/[^/.]+)/);
    if (m) return m[1];
  }
  if (project.repo && /^[^/]+\/[^/]+$/.test(project.repo)) return project.repo;
  return null;
}

const results = [];
const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-map-sync-'));
console.log(`Workspace: ${tmpBase}`);
console.log(`Mode: ${DRY ? 'DRY RUN (no clone, no push)' : 'APPLY'}`);
console.log('');

try {
  for (const project of registry.projects ?? []) {
    const slug = project.slug;
    if (ONLY && !ONLY.has(slug)) continue;
    if (project.status === 'archived') { results.push({ slug, status: 'skipped-archived' }); continue; }

    const repoSlug = parseRepoFromProject(project);
    if (!repoSlug) { results.push({ slug, status: 'skipped-no-repo' }); continue; }

    if (DRY) { results.push({ slug, repo: repoSlug, status: 'would-sync' }); continue; }

    const workDir = path.join(tmpBase, slug.replace(/[^\w.-]/g, '_'));
    const cloneUrl = `https://x-access-token:${TOKEN}@github.com/${repoSlug}.git`;

    // Shallow clone default branch
    const clone = sh('git', ['clone', '--depth', '1', '--quiet', cloneUrl, workDir]);
    if (clone.status !== 0) {
      results.push({ slug, repo: repoSlug, status: 'clone-failed', err: (clone.stderr || '').slice(0, 200) });
      continue;
    }

    // Configure committer
    sh('git', ['config', 'user.name', AUTHOR_NAME], { cwd: workDir });
    sh('git', ['config', 'user.email', AUTHOR_EMAIL], { cwd: workDir });

    // Write template (create docs/ if needed)
    const docsDir = path.join(workDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    const targetPath = path.join(docsDir, 'SKILL_MAP.md');
    let existing = '';
    try { existing = fs.readFileSync(targetPath, 'utf8'); } catch {}

    if (existing === template) {
      results.push({ slug, repo: repoSlug, status: 'unchanged' });
      continue;
    }

    fs.writeFileSync(targetPath, template, 'utf8');

    const add = sh('git', ['add', 'docs/SKILL_MAP.md'], { cwd: workDir });
    if (add.status !== 0) {
      results.push({ slug, repo: repoSlug, status: 'add-failed', err: (add.stderr || '').slice(0, 200) });
      continue;
    }

    const commit = sh('git', ['commit', '-m', COMMIT_MSG], { cwd: workDir });
    if (commit.status !== 0) {
      results.push({ slug, repo: repoSlug, status: 'commit-failed', err: (commit.stderr || commit.stdout || '').slice(0, 200) });
      continue;
    }

    const push = sh('git', ['push', 'origin', 'HEAD'], { cwd: workDir });
    if (push.status !== 0) {
      results.push({ slug, repo: repoSlug, status: 'push-failed', err: (push.stderr || push.stdout || '').slice(0, 200) });
      continue;
    }

    results.push({ slug, repo: repoSlug, status: existing ? 'updated' : 'created' });
  }
} finally {
  // Clean up
  try { fs.rmSync(tmpBase, { recursive: true, force: true }); } catch {}
}

// Report
console.log('\nSKILL_MAP remote sync · results');
console.log('─'.repeat(60));
for (const r of results) {
  const icon = {
    created: '✓', updated: '↻', unchanged: '=',
    'would-sync': '+', 'skipped-archived': '·', 'skipped-no-repo': '·',
    'clone-failed': '✗', 'add-failed': '✗', 'commit-failed': '✗', 'push-failed': '✗',
  }[r.status] ?? '?';
  const err = r.err ? ` err=${r.err}` : '';
  console.log(`  ${icon} ${r.slug.padEnd(36)} ${r.status}${err}`);
}
console.log('─'.repeat(60));

const count = (s) => results.filter(r => r.status === s).length;
console.log(`  created: ${count('created')}  ·  updated: ${count('updated')}  ·  unchanged: ${count('unchanged')}`);
console.log(`  skipped: archived=${count('skipped-archived')}  no-repo=${count('skipped-no-repo')}`);
const failed = count('clone-failed') + count('add-failed') + count('commit-failed') + count('push-failed');
if (failed) console.log(`  ⛔ failed: ${failed}`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
