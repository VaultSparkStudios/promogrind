#!/usr/bin/env node
/** Batched pre-push checks. No per-file child processes and no remote writes. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from './lib/safe-spawn.mjs';
import { inspectModelRouterSource } from './lib/model-router-adherence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ZERO = /^0+$/;
const SHA = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/;
const LEGACY_CREDENTIALS = [
  ['Stripe live secret key', /sk_live_[A-Za-z0-9]{24,}/],
  ['Render API key', /rnd_[A-Za-z0-9]{20,}/],
  ['GitHub token', /ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}/],
  ['AWS access key', /AKIA[A-Z0-9]{16}/],
  ['JWT token', /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{50,}/],
];
export function inspectPushFile(file, buffer) {
  const findings = [];
  const add = (rule) => findings.push({ file, rule });
  const base = path.posix.basename(file);
  if ((base === '.env' || base.startsWith('.env.')) && !['.env.example', '.env.sample', '.env.template'].includes(base)) add('Committed environment file');
  if (buffer.includes(0)) return findings;
  const text = buffer.toString('utf8');
  for (const [rule, pattern] of LEGACY_CREDENTIALS) if (pattern.test(text)) add(rule);
  for (const match of text.matchAll(/postgresql:\/\/[^:\s]+:([^@\s]{8,})@([^\s/'"]+)/g)) {
    if (match[1].includes('[REDACTED]')) continue;
    if (/^(localhost|127\.0\.0\.1|db|postgres|postgres-test|shadow-db)(:[0-9]+)?$/.test(match[2])) continue;
    add('Database connection string with password');
  }
  if (file !== '.claude/settings.local.json' && /C:\\Users\\|\/Users\/[A-Za-z0-9_.-]+\/documents\/development\//i.test(text)) add('Absolute local path');
  findings.push(...inspectModelRouterSource(text, file).map(({ line, pattern }) => ({ file, line, rule: `Router adherence: ${pattern}` })));
  return findings;
}

export function parseBatchBlobs(output, files) {
  const result = [];
  let cursor = 0;
  for (const file of files) {
    const newline = output.indexOf(10, cursor);
    if (newline < 0) throw new Error('Incomplete git object response');
    const header = output.subarray(cursor, newline).toString('utf8');
    const match = header.match(/^[a-f0-9]+ blob (\d+)$/);
    if (!match) throw new Error('Outgoing file could not be read as a committed blob');
    const size = Number(match[1]);
    const start = newline + 1;
    if (!Number.isSafeInteger(size) || start + size >= output.length || output[start + size] !== 10) throw new Error('Invalid git object size');
    result.push({ file, content: output.subarray(start, start + size) });
    cursor = start + size + 1;
  }
  return result;
}

/** Git runs twice per updated ref, regardless of file count; gates run once. */
export function runPrePush({ updates, root = ROOT, git, gate } = {}) {
  const runGit = git || ((args, input) => execFileSync('git', args, { cwd: root, input, encoding: null, timeout: 60_000, maxBuffer: 128 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }));
  const runGate = gate || ((script, args) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }));
  const findings = [], changed = new Set();
  let filesScanned = 0;
  try {
    for (const line of String(updates || '').split(/\r?\n/).filter(Boolean)) {
      const fields = line.trim().split(/\s+/);
      if (fields.length !== 4 || !SHA.test(fields[1]) || !SHA.test(fields[3])) throw new Error('Malformed pre-push ref update');
      const local = fields[1], remote = fields[3];
      if (ZERO.test(local)) continue;
      const args = ZERO.test(remote)
        ? ['ls-tree', '-r', '--name-only', '-z', local]
        : ['diff', '--name-only', '-z', '--diff-filter=ACMRT', remote, local, '--'];
      const files = runGit(args).toString('utf8').split('\0').filter(Boolean);
      if (!files.length) continue;
      if (files.some((file) => /[\r\n]/.test(file))) throw new Error('Newline-containing paths require manual review');
      const blobs = parseBatchBlobs(runGit(['cat-file', '--batch'], files.map((file) => `${local}:${file}\n`).join('')), files);
      for (const { file, content } of blobs) {
        changed.add(file);
        findings.push(...inspectPushFile(file, content));
        filesScanned += 1;
      }
    }
    const gates = [
      ['scripts/scan-secrets.mjs', ['--tracked', '--no-ledger', '--json'], 'Tracked-tree secret scan'],
      ['scripts/canon-enforcer.mjs', ['--gate'], 'Canon gate'],
    ];
    if (changed.has('.claude/settings.local.json')) gates.push(['scripts/sanitize-claude-settings.mjs', ['--check'], 'Claude settings sanitization']);
    for (const [script, args, rule] of gates) {
      if (!fs.existsSync(path.join(root, script))) { findings.push({ file: script, rule: `${rule}: required checker missing` }); continue; }
      const result = runGate(script, args);
      if (result.error || result.status !== 0) findings.push({ file: script, rule: `${rule} failed; run the named checker for details` });
    }
  } catch {
    findings.push({ file: '(pre-push)', rule: 'Could not verify the complete outgoing change set; push refused' });
  }
  return { ok: findings.length === 0, filesScanned, findings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = runPrePush({ updates: fs.readFileSync(0, 'utf8') });
  for (const finding of report.findings) console.error(`${finding.file}${finding.line ? `:${finding.line}` : ''}: ${finding.rule}`);
  console.log(`Pre-push checks: ${report.ok ? 'PASS' : 'FAIL'} · ${report.filesScanned} committed files scanned · ${report.findings.length} issue(s)`);
  process.exitCode = report.ok ? 0 : 1;
}
