#!/usr/bin/env node
// Renders the highest-signal local operating cockpit for Studio Ops.
//
// Usage:
//   node scripts/render-ops-cockpit.mjs
//   node scripts/render-ops-cockpit.mjs --json    → outputs JSON for Hub ingestion

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanProjects, writeReports } from './check-public-repo-sanitization.mjs';
import { readEntries, filterWindow, aggregate, renderSnapshot } from './render-cache-ledger.mjs';

const JSON_MODE = process.argv.includes('--json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'docs', 'OPS_COCKPIT.md');

const status = readJson(path.join(root, 'context', 'PROJECT_STATUS.json'), {});
const taskBoard = readText(path.join(root, 'context', 'TASK_BOARD.md'));
const truthAudit = readText(path.join(root, 'context', 'TRUTH_AUDIT.md'));
const sil = readText(path.join(root, 'context', 'SELF_IMPROVEMENT_LOOP.md'));
const sanitization = buildSanitizationPayload();
const validation = validateStudioOps();
const cacheLedger = buildCacheLedgerPayload();

const nowItems = extractSection(taskBoard, 'Now')
  .split(/\r?\n/)
  .filter(line => /^- \[ \]/.test(line));
const blockedItems = extractSection(taskBoard, 'Blocked')
  .split(/\r?\n/)
  .filter(line => /^- \[ \]/.test(line));
const silHeader = extractBetween(sil, '<!-- rolling-status-start -->', '<!-- rolling-status-end -->').trim();
const truthStatus = truthAudit.match(/^Overall status:\s*(.+)$/m)?.[1] || status.truthAuditStatus || 'unknown';

// Human Action Required — parse open items with session-age annotation
const currentSession = (status.currentSession || 58) + 1;
const humanActionItems = extractSection(taskBoard, 'Human Action Required')
  .split(/\r?\n/)
  .filter(line => /^- \[ \]/.test(line))
  .map(line => {
    const text = line.replace(/^- \[ \]\s*/, '').trim();
    const sessionMatch = text.match(/\(NEW S(\d+)/);
    const firstSession = sessionMatch ? parseInt(sessionMatch[1]) : null;
    const age = firstSession != null ? currentSession - firstSession : null;
    let ageFlag = '';
    if (age == null) ageFlag = ' *(age unknown)*';
    else if (age >= 10) ageFlag = ` **⛔ AGED ${age} sessions**`;
    else if (age >= 5) ageFlag = ` *(⚠ ${age} sessions old)*`;
    return { text, age, ageFlag };
  })
  .sort((a, b) => (b.age ?? 0) - (a.age ?? 0)); // oldest first

const lines = [
  '# Ops Cockpit',
  '',
  '<!-- generated-by: scripts/render-ops-cockpit.mjs -->',
  `<!-- generated-at: ${new Date().toISOString().slice(0, 10)} -->`,
  '',
  '## Snapshot',
  '',
  `- Focus: ${status.currentFocus || 'unknown'}`,
  `- Next milestone: ${status.nextMilestone || 'unknown'}`,
  `- Health: ${status.health || 'unknown'} · Truth: ${truthStatus} · Genome: ${status.truthGenome || 'unknown'}`,
  `- SIL: ${status.silScore ?? 'unknown'}/500 · Avg3 ${status.silAvg3 ?? 'unknown'} · Velocity ${status.silVelocity ?? 'unknown'}`,
  `- IGNIS: ${status.ignisScore ?? 'unknown'} ${status.ignisGrade || ''}`.trim(),
  `- Claude cache (7d): ${cacheLedger.snapshot}`,
  '',
  '## Immediate Work',
  '',
  ...listOrNone(nowItems.map(cleanTaskLine), 'No open Now items.'),
  '',
  '## Risk Signals',
  '',
  `- Local Studio Ops validation: ${validation.violations === 0 ? 'passing' : `${validation.violations} issue(s)`}`,
  `- Sanitization strict gate: ${sanitization.strictGateReady ? 'ready' : `not ready (${sanitization.totals.criticalCurrent} critical)`}`,
  `- Open blocked items: ${blockedItems.length}`,
  '',
  '## Sanitization',
  '',
  '| Repo | Status | Critical |',
  '|---|---|---:|',
  ...sanitization.rows.map(row => `| ${row.name} | ${row.status} | ${row.criticalCurrent} |`),
  '',
  '## Human Action Required',
  '',
  ...humanActionItems.length > 0
    ? humanActionItems.map(({ text, ageFlag }) => `- ${text}${ageFlag}`)
    : ['- *(none)*'],
  '',
  '## SIL Header',
  '',
  '```text',
  silHeader,
  '```',
  '',
];

// ── JSON output mode ──────────────────────────────────────────────────────────
if (JSON_MODE) {
  const jsonPayload = {
    generatedAt: new Date().toISOString().slice(0, 10),
    health: status.health ?? 'unknown',
    truthStatus,
    genome: status.truthGenome ?? 'unknown',
    silScore: status.silScore ?? null,
    silAvg3: status.silAvg3 ?? null,
    silVelocity: status.silVelocity ?? null,
    ignisScore: status.ignisScore ?? null,
    ignisGrade: status.ignisGrade ?? null,
    entropyScore: status.entropyScore ?? null,
    openNow: nowItems.length,
    openBlocked: blockedItems.length,
    validationViolations: validation.violations,
    sanitizationCritical: sanitization.totals.criticalCurrent,
    sanitizationStrictGateReady: sanitization.strictGateReady,
    humanActionRequired: humanActionItems.length,
    humanActionAged: humanActionItems.filter(i => i.age != null && i.age >= 10).length,
    currentFocus: status.currentFocus ?? null,
    nextMilestone: status.nextMilestone ?? null,
    nowItems: nowItems.map(l => l.replace(/^- \[ \]\s*/, '').slice(0, 80)),
    blockers: status.blockers ?? [],
    cacheLedger: cacheLedger.totals,
  };
  console.log(JSON.stringify(jsonPayload, null, 2));
  process.exit(0);
}

fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(`✓ Cockpit → ${path.relative(root, outputPath)}`);

function readText(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

function readJson(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function extractSection(content, heading) {
  // Split on H2 headings and find the matching section.
  // More robust than a single regex — avoids multiline $ lookahead pitfalls.
  const parts = content.split(/^## /m);
  const match = parts.find(p => p.startsWith(heading));
  if (!match) return '';
  // Drop the heading line, return section body (up to the next heading is implicit from the split)
  const newlineIdx = match.indexOf('\n');
  return newlineIdx === -1 ? '' : match.slice(newlineIdx + 1);
}

function extractBetween(content, start, end) {
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) return '';
  return content.slice(startIndex, endIndex + end.length);
}

function cleanTaskLine(line) {
  return line.replace(/^- \[ \]\s*/, '- ');
}

function listOrNone(lines, empty) {
  return lines.length ? lines : [`- ${empty}`];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSanitizationPayload() {
  const auditsRoot = path.join(root, 'audits', 'sanitization');
  const latestDir = path.join(auditsRoot, 'latest');
  const baselinePath = path.join(auditsRoot, 'baseline.json');
  const latestPath = path.join(latestDir, '_summary.json');
  const results = scanProjects(null, true);
  writeReports(results, latestDir);
  const baseline = readJson(baselinePath, []);
  const latest = readJson(latestPath, []);
  const baselineBySlug = new Map(baseline.map(row => [row.slug, row]));
  const rows = latest.map(row => {
    const base = baselineBySlug.get(row.slug) || {};
    const criticalDelta = row.critical - (base.critical ?? 0);
    return {
      ...row,
      criticalBaseline: base.critical ?? 0,
      criticalCurrent: row.critical,
      criticalDelta,
      status: row.critical === 0 ? 'clean' : criticalDelta < 0 ? 'improved' : criticalDelta > 0 ? 'regressed' : 'pending',
    };
  });
  const totals = {
    criticalCurrent: rows.reduce((sum, row) => sum + row.criticalCurrent, 0),
    warningCurrent: rows.reduce((sum, row) => sum + row.warning, 0),
  };
  return { strictGateReady: totals.criticalCurrent === 0, totals, rows };
}

function validateStudioOps() {
  const issues = [];
  const start = readText(path.join(root, 'prompts', 'start.md'));
  const closeout = readText(path.join(root, 'prompts', 'closeout.md'));
  const truth = readText(path.join(root, 'context', 'TRUTH_AUDIT.md'));
  const startTemplate = readText(path.join(root, 'docs', 'templates', 'project-system', 'START_PROMPT.template.md'));
  const closeoutTemplate = readText(path.join(root, 'docs', 'templates', 'project-system', 'CLOSEOUT_PROMPT.template.md'));
  if (extractVersion(start, 'template-version') !== extractVersion(startTemplate, 'template-version')) issues.push('start prompt version drift');
  if (extractVersion(closeout, 'template-version') !== extractVersion(closeoutTemplate, 'template-version')) issues.push('closeout prompt version drift');
  if (!/^Last reviewed:\s*\d{4}-\d{2}-\d{2}(?:\s*\([^)]*\))?$/m.test(truth)) issues.push('truth audit review date missing');
  if (!status.schemaVersion || !/^\d+\.\d+$/.test(status.schemaVersion)) issues.push('PROJECT_STATUS schemaVersion invalid');
  return { violations: issues.length, issues };
}

function extractVersion(content, marker) {
  return content.match(new RegExp(`<!-- ${marker}: ([0-9.]+) -->`))?.[1] ?? null;
}

function buildCacheLedgerPayload() {
  try {
    const entries = filterWindow(readEntries(), 7);
    const summary = aggregate(entries);
    return { snapshot: renderSnapshot(summary), totals: summary.totals };
  } catch {
    return { snapshot: 'ledger unavailable', totals: null };
  }
}
