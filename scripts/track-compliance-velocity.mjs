#!/usr/bin/env node
/**
 * track-compliance-velocity.mjs
 *
 * Records Studio OS compliance pass rate over time and renders a small history
 * surface for doctor/startup signals.
 *
 * Usage:
 *   node scripts/track-compliance-velocity.mjs
 *   node scripts/track-compliance-velocity.mjs --json
 *   node scripts/track-compliance-velocity.mjs --no-write
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const jsonMode = argv.includes('--json');
const noWrite = argv.includes('--no-write');
const today = new Date().toISOString().slice(0, 10);
const historyPath = path.join(ROOT, 'context', 'COMPLIANCE_HISTORY.json');
const docsPath = path.join(ROOT, 'docs', 'COMPLIANCE_HISTORY.md');

const validation = runValidation();
const history = readJson(historyPath, { snapshots: [] });
const snapshots = Array.isArray(history.snapshots) ? history.snapshots : [];
const snapshot = {
  date: today,
  passed: validation.passed,
  failed: validation.failed,
  skipped: validation.skipped,
  total: validation.total,
  issues: validation.violations,
  score: validation.score,
};

const existingToday = snapshots.findIndex(s => s.date === today);
if (existingToday === -1) snapshots.push(snapshot);
else snapshots[existingToday] = snapshot;

const updated = {
  generatedAt: today,
  snapshots: snapshots.slice(-60),
};

if (!noWrite) {
  fs.writeFileSync(historyPath, JSON.stringify(updated, null, 2) + '\n');
  fs.writeFileSync(docsPath, renderMarkdown(updated), 'utf8');
}

const payload = {
  ...snapshot,
  trend: trend(updated.snapshots),
  sparkline: sparkline(updated.snapshots.map(s => s.score)),
  historyPath: path.relative(ROOT, historyPath).replace(/\\/g, '/'),
  docsPath: path.relative(ROOT, docsPath).replace(/\\/g, '/'),
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`Compliance velocity: ${payload.passed}/${payload.total} (${payload.score}%) ${payload.trend} ${payload.sparkline}`);
  if (payload.issues > 0) console.log(`Issues: ${payload.issues}`);
  if (!noWrite) console.log(`Wrote ${payload.historyPath} + ${payload.docsPath}`);
}

process.exit(validation.violations > 0 ? 1 : 0);

function runValidation() {
  const res = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'validate-compliance.mjs'), '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
  });

  let parsed = null;
  try {
    parsed = JSON.parse(res.stdout || '{}');
  } catch {
    parsed = { violations: 1, results: [] };
  }

  const results = Array.isArray(parsed.results) ? parsed.results : [];
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const total = results.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  return {
    violations: Number(parsed.violations || 0),
    passed,
    failed,
    skipped,
    total,
    score,
  };
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function trend(snapshots) {
  if (snapshots.length < 2) return '→';
  const prev = snapshots[snapshots.length - 2].score ?? 0;
  const cur = snapshots[snapshots.length - 1].score ?? 0;
  if (cur - prev >= 2) return '↑';
  if (prev - cur >= 2) return '↓';
  return '→';
}

function sparkline(values) {
  if (!values.length) return '—';
  return values.slice(-8).map(v => {
    if (v >= 100) return '█';
    if (v >= 95) return '▇';
    if (v >= 85) return '▆';
    if (v >= 70) return '▄';
    if (v >= 50) return '▂';
    return '▁';
  }).join('');
}

function renderMarkdown(history) {
  const snapshots = history.snapshots || [];
  const latest = snapshots[snapshots.length - 1] || {};
  const lines = [
    '# Compliance History',
    '',
    `Generated: ${today}`,
    '',
    'Tracks Studio OS compliance validation pass rate so drift is visible before it becomes a hard blocker.',
    '',
    `Latest: **${latest.passed ?? 0}/${latest.total ?? 0}** passed · **${latest.score ?? 0}%** · trend ${trend(snapshots)} · ${sparkline(snapshots.map(s => s.score))}`,
    '',
    '| Date | Passed | Failed | Skipped | Issues | Score |',
    '|---|---:|---:|---:|---:|---:|',
    ...snapshots.slice(-20).reverse().map(s => `| ${s.date} | ${s.passed} | ${s.failed} | ${s.skipped} | ${s.issues} | ${s.score}% |`),
    '',
  ];
  return lines.join('\n');
}
