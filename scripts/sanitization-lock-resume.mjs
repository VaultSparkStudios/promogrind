#!/usr/bin/env node
// sanitization-lock-resume.mjs
// Re-checks public repos that are currently session-locked and prints the exact
// remaining sanitization work so project agents can resume cleanly when locks clear.
//
// Usage:
//   node scripts/sanitization-lock-resume.mjs
//   node scripts/sanitization-lock-resume.mjs --project <slug>
//   node scripts/sanitization-lock-resume.mjs --include-clear
//   node scripts/sanitization-lock-resume.mjs --write-report [dir]

import fs from 'fs';
import path from 'path';
import { execFileSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'url';
import { scanProjects, writeReports } from './check-public-repo-sanitization.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);

const args = process.argv.slice(2);
const includeClear = args.includes('--include-clear');
const targetSlug = readArgValue('--project');
const reportDirArg = readArgValue('--write-report');

const PUBLIC_AUDIENCES = new Set(['public-live', 'public-unlaunched', 'public-traction']);

function readArgValue(flag) {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) return null;
  const value = args[index + 1];
  return value.startsWith('--') ? null : value;
}

function getRepoState(localPath) {
  const lockPath = path.join(localPath, 'context', '.session-lock');
  const state = {
    lockPath: fs.existsSync(lockPath) ? lockPath : null,
    ahead: 0,
    behind: 0,
  };

  try {
    state.ahead = Number(execFileSync('git', ['-C', localPath, 'rev-list', '--count', '@{u}..HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()) || 0;
  } catch {}
  try {
    state.behind = Number(execFileSync('git', ['-C', localPath, 'rev-list', '--count', 'HEAD..@{u}'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()) || 0;
  } catch {}

  state.status = state.lockPath
    ? 'locked'
    : (state.ahead > 0 || state.behind > 0)
      ? 'diverged'
      : 'clear';
  return state;
}

const projects = registry.projects
  .filter(project => project.status !== 'archived')
  .filter(project => PUBLIC_AUDIENCES.has(project.audience))
  .filter(project => project.localPath && fs.existsSync(project.localPath))
  .filter(project => !targetSlug || project.slug === targetSlug);

const candidates = [];
for (const project of projects) {
  const repoState = getRepoState(project.localPath);
  if (!includeClear && repoState.status === 'clear') {
    continue;
  }
  candidates.push({ project, repoState });
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Sanitization Lock Resume Helper');
console.log(`  ${today} · ${candidates.length} repo(s) listed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

if (!candidates.length) {
  console.log('No locked or diverged public repos found.');
  process.exit(0);
}

const scans = scanProjects(targetSlug, false);
const scanMap = new Map(scans.map(result => [result.slug, result]));
if (reportDirArg) {
  const reportDir = path.resolve(root, reportDirArg);
  const reportResults = scans.filter(result => candidates.some(candidate => candidate.project.slug === result.slug));
  writeReports(reportResults, reportDir);
}

for (const candidate of candidates) {
  const { project, repoState } = candidate;
  const result = scanMap.get(project.slug) || null;
  if (!result) continue;

  const statusIcon = repoState.status === 'locked'
    ? '⚠'
    : repoState.status === 'diverged'
      ? '⛔'
      : '✓';

  console.log(`${statusIcon} ${project.name} [${project.slug}] — ${repoState.status} · critical ${result.summary.critical} · warning ${result.summary.warning}`);
  if (repoState.lockPath) {
    console.log(`   - lock: ${repoState.lockPath}`);
  }
  if (repoState.ahead || repoState.behind) {
    console.log(`   - git: ahead=${repoState.ahead} behind=${repoState.behind}`);
  }
  for (const finding of result.findings) {
    const fileLabel = finding.file ? `${finding.file} — ` : '';
    console.log(`   - [${finding.priorityBand}] ${fileLabel}${finding.detail}`);
  }
  console.log('');
}
