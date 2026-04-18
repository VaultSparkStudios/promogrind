#!/usr/bin/env node
// open-sanitization-issues.mjs
// Reads sanitization issue packets from audits/sanitization/<date>/*.issue.json
// and opens GitHub issues in each affected repo (idempotent — skips if already open).
//
// Usage:
//   node scripts/open-sanitization-issues.mjs
//   node scripts/open-sanitization-issues.mjs --date 2026-04-07
//   node scripts/open-sanitization-issues.mjs --repo call-of-doodie
//   node scripts/open-sanitization-issues.mjs --dry-run

import fs from 'fs';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { validateSlug, validateDate } from './lib/validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const auditsBase = path.join(root, 'audits', 'sanitization');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const _rpIdx = args.indexOf('--repo');
const repoFilter = validateSlug('repo', _rpIdx !== -1 ? (args[_rpIdx + 1] ?? null) : null);
const _dtIdx = args.indexOf('--date');
const dateArg = validateDate('date', _dtIdx !== -1 ? (args[_dtIdx + 1] ?? null) : null);

// Resolve audit directory
function resolveAuditDir() {
  if (dateArg) {
    const dir = path.join(auditsBase, dateArg);
    if (!fs.existsSync(dir)) {
      console.error(`ERROR: Audit directory not found: ${dir}`);
      process.exit(1);
    }
    return dir;
  }
  // Auto-detect: find the most recent dated subdirectory
  const entries = fs.readdirSync(auditsBase, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
    .sort((a, b) => b.name.localeCompare(a.name));
  if (!entries.length) {
    console.error('ERROR: No dated audit directories found in audits/sanitization/');
    process.exit(1);
  }
  return path.join(auditsBase, entries[0].name);
}

function gh(...ghArgs) {
  return execFileSync('gh', ghArgs, { encoding: 'utf8' }).trim();
}

function issueExists(repo, title) {
  try {
    const out = gh(
      'issue', 'list',
      '--repo', repo,
      '--label', 'sanitization',
      '--state', 'open',
      '--json', 'title',
      '--jq', `.[] | select(.title == "${title.replace(/"/g, '\\"')}") | .title`,
    );
    return out.length > 0;
  } catch {
    return false;
  }
}

function createIssue(repo, title, body, labels) {
  // Write body to temp file to avoid shell quoting issues
  const tmpFile = path.join(root, '.tmp-issue-body.md');
  fs.writeFileSync(tmpFile, body);
  try {
    const labelArgs = labels.flatMap(l => ['--label', l]);
    const out = gh(
      'issue', 'create',
      '--repo', repo,
      '--title', title,
      '--body-file', tmpFile,
      ...labelArgs,
    );
    return out;
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }
}

function ensureLabels(repo, labels) {
  for (const label of labels) {
    try {
      gh('label', 'create', '--repo', repo, label, '--force');
    } catch {
      // label already exists or no write access — continue
    }
  }
}

async function main() {
  const auditDir = resolveAuditDir();
  const auditDate = path.basename(auditDir);
  console.log(`── Sanitization issue opener ──`);
  console.log(`   Audit directory: ${auditDir}`);
  if (dryRun) console.log(`   DRY RUN — no issues will be created`);
  console.log('');

  // Read summary for context
  const summaryPath = path.join(auditDir, '_summary.json');
  if (!fs.existsSync(summaryPath)) {
    console.error(`ERROR: _summary.json not found in ${auditDir}`);
    process.exit(1);
  }
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

  // Collect issue files
  const issueFiles = fs.readdirSync(auditDir)
    .filter(f => f.endsWith('.issue.json') && !f.startsWith('_'))
    .sort();

  if (!issueFiles.length) {
    console.log('No issue files found. Nothing to open.');
    process.exit(0);
  }

  let opened = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of issueFiles) {
    const issue = JSON.parse(fs.readFileSync(path.join(auditDir, file), 'utf8'));
    const { title, body, labels, repo, slug } = issue;

    if (repoFilter && slug !== repoFilter) continue;

    // Find summary entry for this repo
    const entry = summary.find(e => e.slug === slug);
    const critCount = entry?.critical ?? '?';
    const warnCount = entry?.warning ?? '?';

    console.log(`── ${issue.name ?? slug} (${repo})`);
    console.log(`   ${critCount} critical · ${warnCount} warning`);

    if (dryRun) {
      console.log(`   [DRY RUN] Would open: "${title}"`);
      console.log('');
      continue;
    }

    // Check for existing open issue
    if (issueExists(repo, title)) {
      console.log(`   ✓ Issue already open — skipping`);
      skipped++;
      console.log('');
      continue;
    }

    // Ensure labels exist
    try {
      ensureLabels(repo, labels);
    } catch {
      // Non-fatal — gh issue create will fail with a clear error if labels are missing
    }

    // Create the issue
    try {
      const url = createIssue(repo, title, body, labels);
      console.log(`   ✓ Opened: ${url}`);
      opened++;
    } catch (err) {
      console.log(`   ✗ Failed: ${err.message?.split('\n')[0] ?? err}`);
      failed++;
    }

    console.log('');
  }

  console.log(`── Summary ──`);
  console.log(`   Opened:  ${opened}`);
  console.log(`   Skipped: ${skipped} (already open)`);
  console.log(`   Failed:  ${failed}`);

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
