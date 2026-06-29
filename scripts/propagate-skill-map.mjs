#!/usr/bin/env node
/**
 * propagate-skill-map.mjs — Drop docs/SKILL_MAP.md into every VaultSpark repo.
 *
 * Reads portfolio/PROJECT_REGISTRY.json, copies
 * docs/templates/project-system/SKILL_MAP.template.md to each project's
 * docs/SKILL_MAP.md (creating docs/ if missing). Skips repos whose
 * localPath is missing or doesn't exist on disk.
 *
 * Usage:
 *   node scripts/propagate-skill-map.mjs           # dry-run by default
 *   node scripts/propagate-skill-map.mjs --apply   # actually write
 *   node scripts/propagate-skill-map.mjs --json    # machine-readable summary
 *
 * Safety:
 *   - Honors scripts/check-repo-lock.sh — skips repos with active session locks
 *     or unpushed commits (so we don't stomp on in-flight work).
 *   - Never writes into the source repo (vaultspark-studio-ops) itself — the
 *     source template lives at docs/templates/, the rendered copy lives at
 *     docs/SKILL_MAP.md via the same propagation pass (self-render is safe).
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const JSON_OUT = args.includes('--json');
const COMMIT = args.includes('--commit');   // after --apply, commit+push in each touched repo
const NO_PUSH = args.includes('--no-push'); // commit only; skip push

const TEMPLATE = path.join(ROOT, 'docs', 'templates', 'project-system', 'SKILL_MAP.template.md');
const REGISTRY = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
const LOCK_CHECK = path.join(ROOT, 'scripts', 'check-repo-lock.sh');

function log(msg) { if (!JSON_OUT) console.log(msg); }

if (!fs.existsSync(TEMPLATE)) {
  console.error(`⛔ template missing: ${TEMPLATE}`);
  process.exit(2);
}
if (!fs.existsSync(REGISTRY)) {
  console.error(`⛔ registry missing: ${REGISTRY}`);
  process.exit(2);
}

const templateContent = fs.readFileSync(TEMPLATE, 'utf8');
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const projects = registry.projects ?? [];

const results = [];

for (const project of projects) {
  const { slug, name, localPath } = project;

  if (!localPath) {
    results.push({ slug, status: 'skipped', reason: 'no-localPath' });
    continue;
  }
  if (!fs.existsSync(localPath)) {
    results.push({ slug, status: 'skipped', reason: 'path-missing', localPath });
    continue;
  }

  const docsDir = path.join(localPath, 'docs');
  const target = path.join(docsDir, 'SKILL_MAP.md');

  // Lock check for non-self repos
  const isSelf = path.resolve(localPath) === path.resolve(ROOT);
  if (!isSelf && fs.existsSync(LOCK_CHECK)) {
    const lockCheck = spawnSync('bash', [LOCK_CHECK, localPath], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    });
    if (lockCheck.status === 1) {
      results.push({ slug, status: 'skipped', reason: 'locked-or-diverged', localPath });
      continue;
    }
  }

  // Skip if exists and content is identical
  let existing = '';
  try { existing = fs.readFileSync(target, 'utf8'); } catch {}
  if (existing === templateContent) {
    results.push({ slug, status: 'unchanged', localPath });
    continue;
  }

  if (APPLY) {
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(target, templateContent, 'utf8');
    results.push({ slug, status: existing ? 'updated' : 'created', target });
  } else {
    results.push({ slug, status: existing ? 'would-update' : 'would-create', target });
  }
}

// ── Optional: commit + push in each updated/created repo ────────────────────
if (APPLY && COMMIT) {
  const COMMIT_MSG = 'docs: add SKILL_MAP.md cheatsheet from studio-ops propagation';
  for (const r of results) {
    if (r.status !== 'created' && r.status !== 'updated') continue;
    // Locate the project's localPath
    const project = projects.find(p => p.slug === r.slug);
    if (!project || !project.localPath) continue;
    const cwd = project.localPath;

    const isSelf = path.resolve(cwd) === path.resolve(ROOT);
    if (isSelf) {
      // Don't commit in the source repo here — it's handled by the overall
      // Studio Ops session flow (closeout autopilot).
      r.commit = 'skipped-self';
      continue;
    }

    const add = spawnSync('git', ['add', 'docs/SKILL_MAP.md'], { cwd, encoding: 'utf8' });
    if (add.status !== 0) { r.commit = 'add-failed'; continue; }

    const diff = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd });
    if (diff.status === 0) { r.commit = 'no-staged-changes'; continue; }

    const commit = spawnSync('git', ['commit', '-m', COMMIT_MSG], { cwd, encoding: 'utf8' });
    if (commit.status !== 0) {
      r.commit = 'commit-failed';
      r.commitErr = (commit.stderr || commit.stdout || '').slice(0, 200);
      continue;
    }
    r.commit = 'committed';

    if (!NO_PUSH) {
      const push = spawnSync('git', ['push'], { cwd, encoding: 'utf8' });
      if (push.status !== 0) {
        r.push = 'push-failed';
        r.pushErr = (push.stderr || push.stdout || '').slice(0, 200);
      } else {
        r.push = 'pushed';
      }
    } else {
      r.push = 'skipped';
    }
  }
}

const summary = {
  applied: APPLY,
  commitMode: COMMIT,
  totals: {
    created:       results.filter(r => r.status === 'created').length,
    updated:       results.filter(r => r.status === 'updated').length,
    wouldCreate:   results.filter(r => r.status === 'would-create').length,
    wouldUpdate:   results.filter(r => r.status === 'would-update').length,
    unchanged:     results.filter(r => r.status === 'unchanged').length,
    skippedLock:   results.filter(r => r.reason === 'locked-or-diverged').length,
    skippedPath:   results.filter(r => r.reason === 'path-missing').length,
    skippedNoPath: results.filter(r => r.reason === 'no-localPath').length,
    committed:     results.filter(r => r.commit === 'committed').length,
    commitFailed:  results.filter(r => r.commit === 'commit-failed' || r.commit === 'add-failed').length,
    pushed:        results.filter(r => r.push === 'pushed').length,
    pushFailed:    results.filter(r => r.push === 'push-failed').length,
  },
  projects: results,
};

if (JSON_OUT) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  const t = summary.totals;
  log('');
  log(`Skill map propagation · ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  log('─'.repeat(60));
  results.forEach(r => {
    const icon = { created: '✓', updated: '↻', unchanged: '=',
                   'would-create': '+', 'would-update': '~',
                   skipped: '·' }[r.status] || '?';
    const commitNote = r.commit ? ` · commit=${r.commit}${r.push ? ' push=' + r.push : ''}` : '';
    log(`  ${icon} ${r.slug.padEnd(32)} ${r.status}${r.reason ? ` (${r.reason})` : ''}${commitNote}`);
  });
  log('─'.repeat(60));
  log(`  created: ${t.created}  ·  updated: ${t.updated}  ·  unchanged: ${t.unchanged}`);
  if (!APPLY) log(`  would-create: ${t.wouldCreate}  ·  would-update: ${t.wouldUpdate}`);
  log(`  skipped: lock=${t.skippedLock}  path-missing=${t.skippedPath}  no-localPath=${t.skippedNoPath}`);
  if (COMMIT) log(`  committed: ${t.committed}  ·  pushed: ${t.pushed}  ·  commit-failed: ${t.commitFailed}  ·  push-failed: ${t.pushFailed}`);
  log('');
  if (!APPLY) log('  Dry-run. Pass --apply to write.');
  else if (!COMMIT) log('  Files written. Re-run with --apply --commit to commit + push in each touched repo.');
}

process.exit(0);
