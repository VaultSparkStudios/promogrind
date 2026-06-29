#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from './lib/safe-spawn.mjs';

const batch = JSON.parse(fs.readFileSync('portfolio/compiled/BATCH_ONBOARD_RESULT.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('portfolio/PROJECT_REGISTRY.json', 'utf8'));
const bySlug = new Map(registry.projects.map(p => [p.slug, p]));

const MSG = `chore(studio-os): onboard v3.2 — manifest + runtime-pack + skills

Applied via studio-ops ops-onboard --repair. Generates real
context/STUDIO_MANIFEST.json, runtime-pack assets, prompts, and
Claude skills so release-gate + rollout-scoreboard can track the
project without synthesized fallback.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`;

const results = [];

for (const r of batch.results) {
  if (r.status !== 'onboarded') continue;
  if (r.slug === 'studio-ops') continue; // handled by closeout autopilot
  const p = bySlug.get(r.slug);
  if (!p?.localPath || !fs.existsSync(p.localPath)) {
    results.push({ slug: r.slug, status: 'skipped', reason: 'path-missing' });
    continue;
  }
  const cwd = p.localPath.replace(/\\/g, '/');
  const sh = (cmd) => spawnSync(cmd, { cwd, shell: true, encoding: 'utf8' });

  const status = sh('git status --porcelain');
  if (!status.stdout.trim()) {
    results.push({ slug: r.slug, status: 'clean' });
    continue;
  }

  // Lock recheck
  if (fs.existsSync(path.join(p.localPath, 'context', '.session-lock'))) {
    results.push({ slug: r.slug, status: 'locked-at-commit' });
    continue;
  }

  const paths = [
    'context/STUDIO_MANIFEST.json',
    'context/runtime-pack',
    '.claude/skills',
    '.claude/settings.local.json',
    'prompts/start.md',
    'prompts/closeout.md'
  ].filter(rel => fs.existsSync(path.join(p.localPath, rel)));

  if (paths.length === 0) {
    results.push({ slug: r.slug, status: 'nothing-to-add' });
    continue;
  }

  for (const rel of paths) sh(`git add -- "${rel}"`);

  const staged = sh('git diff --cached --name-only').stdout.trim();
  if (!staged) {
    results.push({ slug: r.slug, status: 'no-diff' });
    continue;
  }

  const commit = spawnSync('git', ['commit', '-m', MSG], { cwd, encoding: 'utf8' });
  if (commit.status !== 0) {
    results.push({ slug: r.slug, status: 'commit-failed', err: (commit.stderr || commit.stdout).slice(0, 300) });
    continue;
  }

  const push = sh('git push');
  if (push.status !== 0) {
    results.push({ slug: r.slug, status: 'pushed-failed', committed: true, err: (push.stderr || push.stdout).slice(0, 200) });
    continue;
  }

  results.push({ slug: r.slug, status: 'pushed' });
}

const pushed = results.filter(r => r.status === 'pushed').length;
const clean = results.filter(r => r.status === 'clean').length;
const failed = results.filter(r => r.status.includes('failed') || r.status === 'locked-at-commit').length;
console.log(`\nPushed: ${pushed}  ·  Clean: ${clean}  ·  Failed: ${failed}\n`);
for (const r of results) {
  const badge = r.status === 'pushed' ? '✓' : r.status === 'clean' ? '·' : '⛔';
  console.log(`  ${badge} ${r.slug.padEnd(40)} ${r.status}${r.err ? ' — ' + r.err : ''}`);
}
fs.writeFileSync('portfolio/compiled/BATCH_COMMIT_RESULT.json', JSON.stringify({ generatedAt: new Date().toISOString().slice(0,10), results }, null, 2));
