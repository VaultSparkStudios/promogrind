#!/usr/bin/env node
/**
 * harden-all-repos.mjs
 *
 * Runs workflow permissions hardening across ALL studioOsApplied child repos
 * using the same harden-workflow-permissions.mjs logic.
 *
 * Usage:
 *   node scripts/harden-all-repos.mjs              → dry run (show what would change)
 *   node scripts/harden-all-repos.mjs --apply       → write changes to all repos
 *   node scripts/harden-all-repos.mjs --apply --push → write + git commit + push each repo
 *   node scripts/ops.mjs harden-all-repos
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const applyMode = argv.includes('--apply');
const pushMode  = argv.includes('--push');
const node      = process.execPath;
const hardenScript = path.join(ROOT, 'scripts', 'harden-workflow-permissions.mjs');

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }

const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
const repos = (registry.projects ?? []).filter(p =>
  p.studioOsApplied && p.localPath && p.slug !== 'studio-ops'
);

console.log(`\n${'═'.repeat(64)}`);
console.log(` Workflow Permissions Hardening — All Child Repos`);
console.log(` ${repos.length} repos · mode: ${applyMode ? (pushMode ? 'apply+push' : 'apply') : 'dry-run'}`);
console.log(`${'═'.repeat(64)}\n`);

let hardened = 0;
let skipped  = 0;
let missing  = 0;
const results = [];

for (const repo of repos) {
  const repoPath   = repo.localPath.replace(/\\/g, '/');
  const wfDir      = path.join(repoPath, '.github', 'workflows');

  if (!fs.existsSync(repoPath)) {
    console.log(`  ⚠  ${repo.slug} — local path not found: ${repoPath}`);
    missing++;
    results.push({ slug: repo.slug, status: 'missing' });
    continue;
  }

  if (!fs.existsSync(wfDir)) {
    console.log(`  ·  ${repo.slug} — no .github/workflows/ directory`);
    skipped++;
    results.push({ slug: repo.slug, status: 'no-workflows' });
    continue;
  }

  const wfCount = fs.readdirSync(wfDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml')).length;
  if (wfCount === 0) {
    console.log(`  ·  ${repo.slug} — no workflow files`);
    skipped++;
    results.push({ slug: repo.slug, status: 'no-workflows' });
    continue;
  }

  // Run harden script against this repo's workflow dir
  const hardenArgs = [hardenScript, ...(applyMode ? ['--apply'] : [])];
  // Temporarily set the working dir so the script targets this repo's workflows
  const envWithDir = { ...process.env, HARDEN_WF_DIR: wfDir };
  const res = spawnSync(node, hardenArgs, { encoding: 'utf8', cwd: repoPath, env: envWithDir });

  const changed = (res.stdout ?? '').match(/✓.*adding/g)?.length ?? 0;
  const already = (res.stdout ?? '').match(/already has permissions/g)?.length ?? 0;
  const icon    = changed > 0 ? (applyMode ? '✓' : '→') : '✓';

  console.log(`  ${icon}  ${repo.slug.padEnd(32)} ${changed > 0 ? `${changed} workflow(s) ${applyMode ? 'hardened' : 'to harden'}` : `all compliant (${already})`}`);

  if (changed > 0) {
    hardened++;
    results.push({ slug: repo.slug, status: applyMode ? 'hardened' : 'would-harden', count: changed });
  } else {
    results.push({ slug: repo.slug, status: 'compliant', count: already });
  }

  // Commit + push if --apply --push
  if (applyMode && pushMode && changed > 0) {
    const gitAdd = spawnSync('git', ['add', '.github/workflows/'], { cwd: repoPath, encoding: 'utf8' });
    const gitCommit = spawnSync('git', ['commit', '-m', 'chore: add least-privilege permissions to all GitHub Actions workflows\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>'], { cwd: repoPath, encoding: 'utf8' });
    const gitPush = spawnSync('git', ['push'], { cwd: repoPath, encoding: 'utf8' });
    const pushStatus = gitPush.status === 0 ? '✓ pushed' : `⚠ push failed: ${gitPush.stderr?.trim().slice(0, 60)}`;
    console.log(`      └─ ${pushStatus}`);
  }
}

console.log(`\n${'─'.repeat(64)}`);
console.log(` Summary: ${hardened} ${applyMode ? 'hardened' : 'would harden'} · ${skipped} skipped · ${missing} missing`);
if (!applyMode) {
  console.log(` Run with --apply to write changes.`);
  console.log(` Run with --apply --push to write + commit + push each repo.`);
}
console.log(`${'─'.repeat(64)}\n`);
