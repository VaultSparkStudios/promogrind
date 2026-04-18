#!/usr/bin/env node
/**
 * run-template-propagation.mjs
 *
 * Node wrapper for propagate-templates.sh so Studio Ops can expose propagation
 * through ops.mjs and GitHub Actions without duplicating shell logic.
 *
 * Usage:
 *   node scripts/run-template-propagation.mjs
 *   node scripts/run-template-propagation.mjs --apply --commit --push
 */

import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const push = args.includes('--push');
const propagationArgs = args.filter(a => a !== '--push');
const bash = findBash();

if (!bash) {
  console.error('Bash is required for template propagation. Install Git for Windows or run scripts/propagate-templates.sh on Linux/macOS.');
  process.exit(1);
}

const result = spawnSync(bash, [path.join(ROOT, 'scripts', 'propagate-templates.sh'), ...propagationArgs], {
  cwd: ROOT,
  stdio: 'inherit',
});

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

if (push) {
  const pushResult = spawnSync(bash, ['-lc', `
    set -euo pipefail
    node - <<'NODE'
const fs = require('fs');
const reg = JSON.parse(fs.readFileSync('portfolio/PROJECT_REGISTRY.json', 'utf8'));
for (const project of reg.projects.filter(p => p.studioOsApplied && p.status !== 'archived' && p.slug !== 'studio-ops' && p.localPath)) {
  console.log(project.localPath);
}
NODE
  `.trim()], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  if ((pushResult.status ?? 1) !== 0) {
    process.exit(pushResult.status ?? 1);
  }

  const repos = pushResult.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  let failures = 0;
  for (const repo of repos) {
    const status = spawnSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' });
    if ((status.stdout || '').trim()) continue;

    const branch = spawnSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
    if (!branch) continue;

    const res = spawnSync('git', ['push', 'origin', branch], { cwd: repo, stdio: 'inherit' });
    if ((res.status ?? 1) !== 0) failures += 1;
  }
  if (failures > 0) process.exit(1);
}

function findBash() {
  if (process.platform !== 'win32') return 'bash';
  const candidates = [
    process.env.BASH,
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}
