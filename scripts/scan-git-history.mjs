#!/usr/bin/env node
/**
 * scan-git-history.mjs
 *
 * Full git history secret scanner. Scans the complete commit log for
 * accidentally committed secrets that the working-tree pre-push hook
 * would not catch after the fact.
 *
 * Usage:
 *   node scripts/scan-git-history.mjs
 *   node scripts/scan-git-history.mjs --since 2026-01-01
 *   node scripts/scan-git-history.mjs --repo ../other-project
 *   node scripts/scan-git-history.mjs --json
 *   node scripts/ops.mjs history-scan [--since <date>] [--repo <path>] [--json]
 */

import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const argv      = process.argv.slice(2);
const jsonMode  = argv.includes('--json');
const sinceIdx  = argv.indexOf('--since');
const repoIdx   = argv.indexOf('--repo');
const since     = sinceIdx !== -1 ? argv[sinceIdx + 1] : null;
const repoPath  = repoIdx !== -1 ? path.resolve(argv[repoIdx + 1]) : ROOT;

// ── Secret patterns ───────────────────────────────────────────────────────────
const PATTERNS = [
  { id: 'stripe-live',   label: 'Stripe live key',       regex: /sk_live_[A-Za-z0-9]{20,}/g },
  { id: 'stripe-pub',    label: 'Stripe publishable',    regex: /pk_live_[A-Za-z0-9]{20,}/g },
  { id: 'github-pat',    label: 'GitHub PAT (classic)',  regex: /ghp_[A-Za-z0-9]{36,}/g },
  { id: 'github-pat2',   label: 'GitHub PAT (fine)',     regex: /github_pat_[A-Za-z0-9_]{80,}/g },
  { id: 'aws-key',       label: 'AWS access key',        regex: /AKIA[0-9A-Z]{16}/g },
  { id: 'aws-secret',    label: 'AWS secret key',        regex: /(?<![A-Za-z0-9])[A-Za-z0-9\/+=]{40}(?![A-Za-z0-9\/+=])/g },
  { id: 'supabase-jwt',  label: 'Supabase JWT',          regex: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
  { id: 'db-url',        label: 'DB URL with password',  regex: /postgres:\/\/[^:]+:[^@]+@[^\s"']+/g },
  { id: 'render-key',    label: 'Render API key',        regex: /rnd_[A-Za-z0-9]{30,}/g },
  { id: 'anthropic-key', label: 'Anthropic API key',     regex: /sk-ant-[A-Za-z0-9_-]{80,}/g },
  { id: 'local-path',    label: 'Absolute local path',   regex: /[A-Za-z]:\\Users\\[^\s"'<>]+/g },
  { id: 'private-env',   label: '.env file reference',   regex: /\b\.env\.(local|production|private|secret)\b/g },
];

// Files/paths to skip in git output
const SKIP_PATTERNS = [
  /\.claude\/worktrees\//,
  /audits\/sanitization\/allowlist/,
  /scripts\/lib\/validate\.mjs/,
  /scripts\/git-hooks\/pre-push/,
  /scan-git-history\.mjs/,   // this script itself
];

// ── Run git log to get all commit patches ────────────────────────────────────
function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', cwd, maxBuffer: 50 * 1024 * 1024 });
  return res.stdout ?? '';
}

// Get list of commits
const logArgs = ['log', '--oneline', '--no-merges'];
if (since) logArgs.push(`--since=${since}`);
const logOut = run('git', logArgs, repoPath);
const commits = logOut.split('\n').filter(Boolean).map(l => ({
  sha: l.slice(0, 7),
  full: l.slice(0, 40).replace(/\s.*$/, ''),
  msg: l.slice(8).trim(),
}));

if (commits.length === 0) {
  if (jsonMode) { console.log(JSON.stringify({ findings: [], scanned: 0 })); }
  else console.log('\n✓ No commits to scan.\n');
  process.exit(0);
}

// ── Scan each commit's diff ───────────────────────────────────────────────────
const findings = []; // { sha, msg, date, file, pattern, matches }

process.stderr.write(`Scanning ${commits.length} commit(s) in ${repoPath}...\n`);

for (const commit of commits) {
  // Get full diff for this commit
  const diff = run('git', ['show', '--no-color', '-U0', commit.full], repoPath);
  if (!diff) continue;

  // Get commit date
  const dateOut = run('git', ['log', '-1', '--format=%ai', commit.full], repoPath).trim();
  const date = dateOut.slice(0, 10);

  // Parse diff chunks: + lines only (additions)
  const lines = diff.split('\n');
  let currentFile = '';
  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      currentFile = line.match(/b\/(.+)$/)?.[1] ?? '';
    }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    if (SKIP_PATTERNS.some(p => p.test(currentFile))) continue;

    const content = line.slice(1);
    for (const { id, label, regex } of PATTERNS) {
      regex.lastIndex = 0;
      const matches = content.match(regex);
      if (matches) {
        // Redact matches in output
        const redacted = matches.map(m => m.slice(0, 8) + '...[REDACTED]');
        findings.push({ sha: commit.sha, msg: commit.msg, date, file: currentFile, patternId: id, label, count: matches.length, preview: redacted[0] });
      }
    }
  }
}

// ── Output ────────────────────────────────────────────────────────────────────
if (jsonMode) {
  console.log(JSON.stringify({ scanned: commits.length, findings }, null, 2));
  process.exit(findings.length > 0 ? 1 : 0);
}

const W = 66;
function pad(s, w) { const str = String(s ?? ''); return str.length >= w ? str.slice(0, w) : str + ' '.repeat(w - str.length); }

console.log(`\n╔${'═'.repeat(W)}╗`);
console.log(`║  ${'GIT HISTORY SECRET SCAN'.padEnd(W - 2)}  ║`);
console.log(`║  ${pad(`${commits.length} commits · ${repoPath.split('/').pop()}`, W - 2)}  ║`);
console.log(`╠${'═'.repeat(W)}╣`);

if (findings.length === 0) {
  console.log(`║  ${'✓  No secret patterns found in git history'.padEnd(W - 2)}  ║`);
} else {
  // Group by commit
  const bySha = {};
  for (const f of findings) {
    if (!bySha[f.sha]) bySha[f.sha] = { sha: f.sha, date: f.date, msg: f.msg, items: [] };
    bySha[f.sha].items.push(f);
  }
  for (const { sha, date, msg, items } of Object.values(bySha)) {
    console.log(`║  ${'⛔  ' + sha + '  ' + date + '  ' + msg.slice(0, 30)}`.padEnd(W + 2) + '  ║');
    for (const item of items) {
      console.log(`║      ${pad(`[${item.label}] ${item.file.split('/').pop()} — ${item.preview}`, W - 6)}  ║`);
    }
  }
}

console.log(`╠${'═'.repeat(W)}╣`);
const icon = findings.length === 0 ? '✓' : '⛔';
console.log(`║  ${pad(`${icon}  ${findings.length} finding(s) across ${commits.length} commit(s)`, W - 2)}  ║`);
if (findings.length > 0) {
  console.log(`║  ${pad('  Action: git filter-repo or BFG Repo Cleaner to purge', W - 2)}  ║`);
  console.log(`║  ${pad('  See: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository', W - 2)}  ║`);
}
console.log(`╚${'═'.repeat(W)}╝\n`);

process.exit(findings.length > 0 ? 1 : 0);
