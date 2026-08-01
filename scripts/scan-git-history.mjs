#!/usr/bin/env node
/**
 * Bounded, streaming git-history secret scanner.
 *
 * Usage:
 *   node scripts/scan-git-history.mjs --json
 *   node scripts/scan-git-history.mjs --since 2026-07-01 --timeout-ms 30000
 *   node scripts/scan-git-history.mjs --repo ../other-project --max-commits 500
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from './lib/safe-spawn.mjs';
import { classifyCredentialLine } from './lib/credential-classifiers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

if (args.includes('--help')) {
  console.log(`Usage: node scripts/scan-git-history.mjs [options]

Options:
  --json                 Emit the stable JSON result schema
  --since <date>         Scan commits on or after an ISO date
  --repo <path>          Scan another repository (default: current repo)
  --max-commits <n>      Bound the scan to the newest n commits
  --timeout-ms <n>       Kill the git stream after n ms (default: 120000)
  --help                 Show this help

Example:
  node scripts/scan-git-history.mjs --since 2026-07-01 --json`);
  process.exit(0);
}

const jsonMode = args.includes('--json');
const repoPath = flag('--repo') ? path.resolve(flag('--repo')) : ROOT;
const since = flag('--since');
const maxCommits = positiveInt(flag('--max-commits'));
const timeoutMs = positiveInt(flag('--timeout-ms')) || 120000;

const PATTERNS = [
  { id: 'stripe-live', label: 'Stripe live key', regex: /sk_live_[A-Za-z0-9]{20,}/g },
  { id: 'stripe-pub', label: 'Stripe publishable key', regex: /pk_live_[A-Za-z0-9]{20,}/g },
  { id: 'github-pat', label: 'GitHub PAT (classic)', regex: /ghp_[A-Za-z0-9]{36,}/g },
  { id: 'github-pat2', label: 'GitHub PAT (fine)', regex: /github_pat_[A-Za-z0-9_]{80,}/g },
  { id: 'aws-key', label: 'AWS access key', regex: /AKIA[0-9A-Z]{16}/g },
  { id: 'db-url', label: 'DB URL with password', regex: /postgres:\/\/[^:]+:[^@]+@[^\s"']+/g },
  { id: 'render-key', label: 'Render API key', regex: /rnd_[A-Za-z0-9]{30,}/g },
  { id: 'anthropic-key', label: 'Anthropic API key', regex: /sk-ant-[A-Za-z0-9_-]{80,}/g },
];

const SKIP_PATHS = [
  /\.claude\/worktrees\//,
  /audits\/sanitization\/allowlist/,
  /scripts\/lib\/validate\.mjs/,
  /scripts\/git-hooks\/pre-push/,
  /scan-git-history\.mjs/,
  /credential-classifiers\.mjs/,
];

const findings = [];
const seen = new Set();
let currentCommit = { sha: '', date: '', msg: '' };
let currentFile = '';
let scanned = 0;
let timedOut = false;
let stderr = '';
let carry = '';
const startedAt = Date.now();

const gitArgs = ['log', '--no-merges', '--date=short', '--format=__PG_COMMIT__%H%x09%ad%x09%s', '-p', '-U0'];
if (since) gitArgs.push(`--since=${since}`);
if (maxCommits) gitArgs.push('-n', String(maxCommits));

const child = spawn('git', gitArgs, { cwd: repoPath, stdio: ['ignore', 'pipe', 'pipe'] });
const timer = setTimeout(() => {
  timedOut = true;
  child.kill();
}, timeoutMs);

child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', (chunk) => {
  const lines = (carry + chunk).split(/\r?\n/);
  carry = lines.pop() || '';
  for (const line of lines) consumeLine(line);
});
child.stderr.on('data', (chunk) => { stderr += chunk; });

const exitCode = await new Promise((resolve) => child.on('close', (code) => resolve(code ?? 1)));
clearTimeout(timer);
if (carry) consumeLine(carry);

const payload = {
  schemaVersion: '2.0',
  scanned,
  findings,
  timedOut,
  durationMs: Date.now() - startedAt,
};

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else renderHuman(payload, repoPath);

if (timedOut) process.exit(2);
if (exitCode !== 0) {
  if (!jsonMode) console.error(stderr.trim() || `git log exited ${exitCode}`);
  process.exit(2);
}
process.exit(findings.length ? 1 : 0);

function consumeLine(line) {
  if (line.startsWith('__PG_COMMIT__')) {
    const [sha = '', date = '', ...message] = line.slice('__PG_COMMIT__'.length).split('\t');
    currentCommit = { sha: sha.slice(0, 7), date, msg: message.join('\t') };
    scanned += 1;
    if (!jsonMode && scanned % 500 === 0) process.stderr.write(`  scanned ${scanned} commits...\n`);
    return;
  }
  if (line.startsWith('diff --git ')) {
    currentFile = line.match(/ b\/(.+)$/)?.[1] || '';
    return;
  }
  if (!line.startsWith('+') || line.startsWith('+++')) return;
  if (!currentFile || SKIP_PATHS.some((pattern) => pattern.test(currentFile))) return;

  const content = line.slice(1);
  for (const pattern of PATTERNS) {
    pattern.regex.lastIndex = 0;
    for (const match of content.matchAll(pattern.regex)) addFinding(pattern, match[0]);
  }
  for (const finding of classifyCredentialLine(content).filter((entry) => entry.type !== 'privileged-jwt')) {
    addFinding({ id: finding.type, label: finding.label }, finding.redacted);
  }
  for (const secret of contextualAwsSecrets(content)) {
    addFinding({ id: 'aws-secret', label: 'AWS secret access key' }, secret);
  }
  for (const secret of supabaseJwtSecrets(content)) {
    addFinding({ id: 'supabase-service-jwt', label: 'Supabase privileged JWT' }, secret);
  }
}

function contextualAwsSecrets(content) {
  if (!/(aws[_-]?secret[_-]?access[_-]?key|secretAccessKey)/i.test(content)) return [];
  const matches = [];
  const regex = /(?:aws[_-]?secret[_-]?access[_-]?key|secretAccessKey)\s*["']?\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})/gi;
  for (const match of content.matchAll(regex)) {
    if (shannonEntropy(match[1]) >= 4.2) matches.push(match[1]);
  }
  return matches;
}

function supabaseJwtSecrets(content) {
  const matches = content.match(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g) || [];
  return matches.filter((token) => {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      return payload.role && payload.role !== 'anon';
    } catch {
      return false;
    }
  });
}

function addFinding(pattern, raw) {
  const preview = `<redacted:${pattern.id}>`;
  const key = [currentCommit.sha, currentFile, pattern.id, preview].join('|');
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({
    sha: currentCommit.sha,
    msg: currentCommit.msg,
    date: currentCommit.date,
    file: currentFile,
    patternId: pattern.id,
    label: pattern.label,
    count: 1,
    preview,
  });
}

function shannonEntropy(value) {
  const counts = new Map();
  for (const char of value) counts.set(char, (counts.get(char) || 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

function positiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function renderHuman(result, target) {
  console.log(`\nGIT HISTORY SECRET SCAN · ${result.scanned} commits · ${result.durationMs}ms`);
  console.log(`Repository: ${target}`);
  if (result.timedOut) console.log('⛔ timed out before a complete verdict');
  else if (!result.findings.length) console.log('✓ no secret patterns found');
  for (const finding of result.findings) {
    console.log(`⛔ ${finding.sha} ${finding.date} [${finding.label}] ${finding.file} · ${finding.preview}`);
  }
  console.log('');
}
