#!/usr/bin/env node
/**
 * harden-workflow-permissions.mjs
 *
 * Adds least-privilege `permissions:` blocks to all GitHub Actions workflows
 * that don't already have one. Infers required permissions from workflow content.
 *
 * Heuristics:
 *   - Workflows that commit/push → contents: write
 *   - Workflows that open/update issues → issues: write
 *   - Workflows that read only → contents: read
 *   - All get: contents: read (minimum)
 *
 * Usage:
 *   node scripts/harden-workflow-permissions.mjs            → dry run (shows changes)
 *   node scripts/harden-workflow-permissions.mjs --apply    → write changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT     = path.resolve(__dirname, '..');
const WF_DIR   = process.env.HARDEN_WF_DIR ?? path.join(ROOT, '.github', 'workflows');
const applyMode = process.argv.includes('--apply');

const wfFiles = fs.readdirSync(WF_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

let changed = 0;
let skipped = 0;

for (const file of wfFiles) {
  const fpath   = path.join(WF_DIR, file);
  const content = fs.readFileSync(fpath, 'utf8');

  // Already has a top-level permissions block
  if (/^permissions:/m.test(content)) {
    skipped++;
    console.log(`  ✓  ${file} — already has permissions`);
    continue;
  }

  // Infer needed permissions
  const needsContentWrite = /git commit|git push|actions\/checkout.*token.*push|writeFileSync.*workflow/i.test(content) ||
    /push.*commits|create-commit|update-file/i.test(content);
  const needsIssuesWrite  = /issues\.create|issues\.update|github-script.*issues/i.test(content) ||
    /create_issue|open.*issue/i.test(content);
  const needsPullReqs     = /pull_requests\.create|pull_requests\.update/i.test(content);
  const needsActionsRead  = /actions\/runs|check-runs|workflow_run/i.test(content);

  const permsLines = ['permissions:'];
  permsLines.push(`  contents: ${needsContentWrite ? 'write' : 'read'}`);
  if (needsIssuesWrite)  permsLines.push('  issues: write');
  if (needsPullReqs)     permsLines.push('  pull-requests: write');
  if (needsActionsRead)  permsLines.push('  actions: read');

  const permBlock = permsLines.join('\n') + '\n\n';

  // Insert after `on:` block — find end of the `on:` stanza
  // Strategy: find the `on:` line, then find the next top-level key (jobs:, env:, etc.)
  const lines = content.split('\n');
  let insertLine = -1;
  let inOnBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^on:/.test(line)) { inOnBlock = true; continue; }
    if (inOnBlock && /^[a-z]/.test(line) && !/^\s/.test(line)) {
      insertLine = i;
      break;
    }
  }

  if (insertLine === -1) {
    console.log(`  ⚠  ${file} — could not find insertion point, skipping`);
    continue;
  }

  const newLines = [...lines.slice(0, insertLine), ...permBlock.split('\n').slice(0, -1), '', ...lines.slice(insertLine)];
  const newContent = newLines.join('\n');

  const summary = `contents:${needsContentWrite ? 'write' : 'read'}${needsIssuesWrite ? ' issues:write' : ''}${needsPullReqs ? ' pull-requests:write' : ''}`;
  console.log(`  ${applyMode ? '✓' : '→'}  ${file} — adding [${summary}]`);

  if (applyMode) {
    fs.writeFileSync(fpath, newContent, 'utf8');
    changed++;
  }
}

console.log(`\n${applyMode ? 'Hardened' : 'Would harden'} ${changed || (wfFiles.length - skipped)} workflow(s)  ·  ${skipped} already compliant`);
if (!applyMode && changed === 0 && skipped < wfFiles.length) {
  console.log('Run with --apply to write changes.\n');
}
