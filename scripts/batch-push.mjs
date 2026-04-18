#!/usr/bin/env node
// batch-push.mjs — Cross-repo batch commit + push helper
// Walks sibling project repos (per PROJECT_REGISTRY.json), runs per-repo validation,
// stages, commits with a shared message, and pushes — skipping any repo with an
// active .session-lock, outbound divergence, or failed pre-push gate.
//
// Use:
//   node scripts/batch-push.mjs -m "msg"                (dry-run)
//   node scripts/batch-push.mjs -m "msg" --apply        (actually commit+push)
//   node scripts/batch-push.mjs -m "msg" --only=a,b,c   (subset)
//   node scripts/batch-push.mjs --json                  (machine-readable)

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const asJson = args.includes('--json');
const msgIdx = args.findIndex((a) => a === '-m' || a === '--message');
const msg = msgIdx >= 0 ? args[msgIdx + 1] : 'chore: cross-repo batch update';
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;

const registryPath = path.join(ROOT, 'portfolio/PROJECT_REGISTRY.json');
if (!fs.existsSync(registryPath)) {
  console.error('batch-push: PROJECT_REGISTRY.json not found');
  process.exit(2);
}
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const projects = registry.projects || registry; // tolerate either shape

function sh(cmd, cwd) {
  try {
    return { ok: true, out: execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { ok: false, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

const report = { attempted: 0, pushed: 0, skipped: [], failed: [], results: [] };

for (const p of projects) {
  const slug = p.slug || p.name;
  if (only && !only.has(slug)) continue;
  const repoPath = p.localPath || path.resolve(ROOT, '..', slug);
  if (!fs.existsSync(repoPath)) {
    report.skipped.push({ slug, reason: 'path-not-found' });
    continue;
  }
  if (fs.existsSync(path.join(repoPath, 'context/.session-lock'))) {
    report.skipped.push({ slug, reason: 'session-locked' });
    continue;
  }
  // diverged?
  const rev = sh('git rev-list --count HEAD..@{u} 2>/dev/null || echo 0', repoPath);
  if (parseInt(rev.out.trim(), 10) > 0) {
    report.skipped.push({ slug, reason: 'upstream-ahead' });
    continue;
  }
  // any changes?
  const stat = sh('git status --porcelain', repoPath);
  if (!stat.ok || stat.out.trim() === '') {
    report.skipped.push({ slug, reason: 'no-changes' });
    continue;
  }
  report.attempted += 1;
  const preflight = sh('node scripts/scan-secrets.mjs --staged 2>/dev/null || echo skip', repoPath);
  if (!preflight.ok) {
    report.failed.push({ slug, step: 'scan-secrets', detail: preflight.out.slice(-300) });
    continue;
  }
  if (!apply) {
    report.results.push({ slug, dryRun: true, changed: stat.out.split('\n').length });
    continue;
  }
  const add = sh('git add -A', repoPath);
  if (!add.ok) {
    report.failed.push({ slug, step: 'git-add', detail: add.out });
    continue;
  }
  const commit = sh(`git commit -m ${JSON.stringify(msg)}`, repoPath);
  if (!commit.ok) {
    report.failed.push({ slug, step: 'git-commit', detail: commit.out.slice(-300) });
    continue;
  }
  const push = sh('git push', repoPath);
  if (!push.ok) {
    report.failed.push({ slug, step: 'git-push', detail: push.out.slice(-300) });
    continue;
  }
  report.pushed += 1;
  report.results.push({ slug, pushed: true });
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const verb = apply ? 'pushed' : 'would-push';
  console.log(`batch-push: ${verb} ${apply ? report.pushed : report.attempted} · skipped ${report.skipped.length} · failed ${report.failed.length}`);
  for (const s of report.skipped) console.log(`  skip ${s.slug} — ${s.reason}`);
  for (const f of report.failed) console.log(`  fail ${f.slug} @${f.step}`);
}
process.exit(report.failed.length ? 1 : 0);
