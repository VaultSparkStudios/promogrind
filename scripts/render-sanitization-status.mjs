#!/usr/bin/env node
// Renders a compact public-repo sanitization progress surface.
//
// Usage:
//   node scripts/render-sanitization-status.mjs
//   node scripts/render-sanitization-status.mjs --refresh
//   node scripts/render-sanitization-status.mjs --json

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanProjects, writeReports } from './check-public-repo-sanitization.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const auditsRoot = path.join(root, 'audits', 'sanitization');
const baselinePath = path.join(auditsRoot, 'baseline.json');
const outputPath = path.join(root, 'docs', 'SANITIZATION_STATUS.md');
const latestDir = path.join(auditsRoot, 'latest');
const args = process.argv.slice(2);
const refresh = args.includes('--refresh');
const jsonOut = args.includes('--json');

if (refresh || !fs.existsSync(path.join(latestDir, '_summary.json'))) {
  const results = scanProjects(null, true);
  writeReports(results, latestDir);
}

const baseline = readJson(baselinePath, []);
const latestPath = resolveLatestSummary();
const latest = readJson(latestPath, []);
const baselineBySlug = new Map(baseline.map(row => [row.slug, row]));
const latestBySlug = new Map(latest.map(row => [row.slug, row]));
const slugs = [...new Set([...baselineBySlug.keys(), ...latestBySlug.keys()])].sort();

const rows = slugs.map(slug => {
  const base = baselineBySlug.get(slug);
  const current = latestBySlug.get(slug);
  const name = current?.name || base?.name || slug;
  const criticalBaseline = base?.critical ?? 0;
  const warningBaseline = base?.warning ?? 0;
  const criticalCurrent = current?.critical ?? 0;
  const warningCurrent = current?.warning ?? 0;
  const criticalDelta = criticalCurrent - criticalBaseline;
  const warningDelta = warningCurrent - warningBaseline;
  const repoState = current?.repoState || (current ? 'unknown' : 'clean-or-removed');
  const status = criticalCurrent === 0
    ? 'clean'
    : repoState === 'locked'
      ? 'locked'
      : criticalDelta > 0
        ? 'regressed'
        : criticalDelta < 0
          ? 'improved'
          : 'pending';

  return {
    slug,
    name,
    repo: current?.repo || base?.repo || '',
    criticalBaseline,
    criticalCurrent,
    criticalDelta,
    warningBaseline,
    warningCurrent,
    warningDelta,
    repoState,
    status,
    issueFile: current?.issueFile || `${slug}.issue.md`,
  };
});

const totals = rows.reduce((acc, row) => {
  acc.criticalBaseline += row.criticalBaseline;
  acc.criticalCurrent += row.criticalCurrent;
  acc.warningBaseline += row.warningBaseline;
  acc.warningCurrent += row.warningCurrent;
  return acc;
}, { criticalBaseline: 0, criticalCurrent: 0, warningBaseline: 0, warningCurrent: 0 });

const statusPayload = {
  generatedAt: new Date().toISOString(),
  baselinePath: path.relative(root, baselinePath).replace(/\\/g, '/'),
  latestPath: path.relative(root, latestPath).replace(/\\/g, '/'),
  strictGateReady: totals.criticalCurrent === 0,
  totals,
  rows,
};

if (jsonOut) {
  console.log(JSON.stringify(statusPayload, null, 2));
  process.exit(0);
}

const lines = [
  '# Sanitization Status',
  '',
  '<!-- generated-by: scripts/render-sanitization-status.mjs -->',
  `<!-- generated-at: ${new Date().toISOString().slice(0, 10)} -->`,
  '',
  '## Summary',
  '',
  `- Strict gate ready: **${statusPayload.strictGateReady ? 'yes' : 'no'}**`,
  `- Critical findings: **${totals.criticalCurrent}** (${delta(totals.criticalCurrent - totals.criticalBaseline)} vs baseline ${totals.criticalBaseline})`,
  `- Warning findings: **${totals.warningCurrent}** (${delta(totals.warningCurrent - totals.warningBaseline)} vs baseline ${totals.warningBaseline})`,
  `- Source: \`${statusPayload.latestPath}\``,
  '',
  '## Repo Status',
  '',
  '| Repo | Status | Critical | Warning | Repo state | Handoff |',
  '|---|---|---:|---:|---|---|',
  ...rows.map(row => `| ${row.name} | ${statusLabel(row.status)} | ${row.criticalCurrent} (${delta(row.criticalDelta)}) | ${row.warningCurrent} (${delta(row.warningDelta)}) | ${row.repoState} | [issue](../audits/sanitization/latest/${row.issueFile}) |`),
  '',
  '## Operating Rule',
  '',
  'Project agents own repo-local cleanup. Studio Ops owns scanner quality, issue packets, ratchet baselines, and the final strict gate flip.',
  '',
];

fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${path.relative(root, outputPath)}`);

function resolveLatestSummary() {
  const preferred = path.join(latestDir, '_summary.json');
  if (fs.existsSync(preferred)) return preferred;

  const dated = fs.readdirSync(auditsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .map(entry => path.join(auditsRoot, entry.name, '_summary.json'))
    .filter(filePath => fs.existsSync(filePath))
    .sort()
    .reverse();

  if (!dated.length) {
    throw new Error('No sanitization summary found. Run with --refresh first.');
  }
  return dated[0];
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function delta(value) {
  if (value < 0) return `-${Math.abs(value)}`;
  if (value > 0) return `+${value}`;
  return '0';
}

function statusLabel(status) {
  const labels = {
    clean: 'clean',
    improved: 'improved',
    pending: 'pending',
    regressed: 'regressed',
    locked: 'locked',
  };
  return labels[status] || status;
}
