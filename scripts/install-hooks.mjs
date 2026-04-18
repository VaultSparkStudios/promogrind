#!/usr/bin/env node
/**
 * install-hooks.mjs — Install Studio Ops git hooks into a repo.
 *
 * Installs the pre-push secret scan + router-adherence hook and any future hooks defined in
 * scripts/git-hooks/. Backs up any existing hook before overwriting.
 *
 * Usage:
 *   node scripts/install-hooks.mjs                  # installs into the current repo (studio-ops)
 *   node scripts/install-hooks.mjs --repo <path>    # installs into another local repo
 *   node scripts/install-hooks.mjs --dry-run        # show what would be installed
 *   node scripts/install-hooks.mjs --list           # list available hooks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const hooksSourceDir = path.join(__dirname, 'git-hooks');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const listOnly = args.includes('--list');
const repoIdx = args.indexOf('--repo');
const targetRepo = repoIdx !== -1 ? path.resolve(args[repoIdx + 1]) : root;

// ── List available hooks ───────────────────────────────────────────────────
if (listOnly) {
  const hooks = fs.readdirSync(hooksSourceDir).filter(f => !f.startsWith('.'));
  console.log('\nAvailable hooks in scripts/git-hooks/:');
  for (const h of hooks) {
    console.log(`  ${h}`);
  }
  process.exit(0);
}

// ── Validate target repo ───────────────────────────────────────────────────
const gitDir = path.join(targetRepo, '.git');
const hooksDir = path.join(gitDir, 'hooks');

if (!fs.existsSync(gitDir)) {
  console.error(`ERROR: Not a git repository: ${targetRepo}`);
  process.exit(1);
}

if (!fs.existsSync(hooksDir)) {
  if (!dryRun) fs.mkdirSync(hooksDir, { recursive: true });
  console.log(`Created .git/hooks directory`);
}

// ── Install each hook ──────────────────────────────────────────────────────
const hookFiles = fs.readdirSync(hooksSourceDir).filter(f => !f.startsWith('.'));

if (hookFiles.length === 0) {
  console.log('No hooks found in scripts/git-hooks/ — nothing to install');
  process.exit(0);
}

let installed = 0;
let upToDate = 0;
let backed = 0;

console.log(`\nInstalling Studio Ops git hooks${dryRun ? ' (dry run)' : ''}`);
console.log(`  Source: ${hooksSourceDir}`);
console.log(`  Target: ${hooksDir}`);
console.log('');

for (const hookName of hookFiles) {
  const sourcePath = path.join(hooksSourceDir, hookName);
  const destPath = path.join(hooksDir, hookName);
  const sourceContent = fs.readFileSync(sourcePath, 'utf8');

  if (fs.existsSync(destPath)) {
    const existing = fs.readFileSync(destPath, 'utf8');
    if (existing === sourceContent) {
      console.log(`  ✓ ${hookName}: already up to date`);
      upToDate++;
      continue;
    }
    // Backup the existing hook
    const backupPath = `${destPath}.pre-studio-ops.bak`;
    if (!dryRun) {
      fs.writeFileSync(backupPath, existing);
    }
    console.log(`  ↳ Backed up existing ${hookName} → ${path.basename(backupPath)}`);
    backed++;
  }

  if (!dryRun) {
    fs.writeFileSync(destPath, sourceContent, { mode: 0o755 });
  }
  console.log(`  ${dryRun ? '[dry-run] would install' : '✓ Installed'} ${hookName}`);
  installed++;
}

console.log('');
console.log(`Done — installed: ${installed} · up-to-date: ${upToDate} · backed-up: ${backed}`);
if (dryRun) console.log('(dry run — no files were changed)');
console.log(`Repo: ${targetRepo}`);
