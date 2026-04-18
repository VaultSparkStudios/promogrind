#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LEDGER = path.join(ROOT, 'portfolio', 'FEEDBACK_LOOP_LEDGER.md');
const DECISIONS = path.join(ROOT, 'portfolio', 'FOUNDER_DECISIONS.ndjson');
const AUTOMATION = path.join(ROOT, 'portfolio', 'AUTOMATION_QUEUE.json');
const ACTION_QUEUE = path.join(ROOT, 'context', 'ACTION_QUEUE.md');
const OUT_JSON = path.join(ROOT, 'portfolio', 'compiled', 'FEEDBACK_LOOP_DASHBOARD.json');
const OUT_MD = path.join(ROOT, 'docs', 'FEEDBACK_LOOP_DASHBOARD.md');
const jsonMode = process.argv.includes('--json');

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

const ledger = readText(LEDGER);
const rows = ledger
  .split(/\r?\n/)
  .filter((line) => line.startsWith('|') && !line.match(/^[|\s-]+$/))
  .slice(1)
  .map((row) => row.split('|').map((cell) => cell.trim()).filter((_, index, all) => index > 0 && index < all.length - 1))
  .map((cols) => ({
    date: cols[0] || '',
    source: cols[1] || '',
    recommendation: cols[2] || '',
    decision: cols[3] || '',
    outcome: cols[4] || '',
    followup: cols[5] || '',
  }));

const accepted = rows.filter((entry) => /accepted/i.test(entry.decision));
const implemented = accepted.filter((entry) => /implemented/i.test(entry.outcome) && !/not implemented/i.test(entry.outcome));
const partial = accepted.filter((entry) => /partial/i.test(entry.outcome));
const founderDecisions = readText(DECISIONS)
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter(Boolean);
const automation = readJson(AUTOMATION, { items: [] });
const actionQueue = readText(ACTION_QUEUE);
const executeNow = (actionQueue.match(/## Execute Now \(\d+\)([\s\S]*?)## Approved Automation/)?.[1] || '').split(/\r?\n/).filter((line) => line.startsWith('- **')).length;
const tryBeforeEscalating = (actionQueue.match(/## Try Before Escalating \(\d+\)([\s\S]*?)## Advisory Drift/)?.[1] || '').split(/\r?\n/).filter((line) => line.startsWith('- **')).length;

const acceptanceRate = rows.length ? Math.round((accepted.length / rows.length) * 100) : 0;
const implementationRate = accepted.length ? Math.round((implemented.length / accepted.length) * 100) : 0;
const recentFounderDecisions = founderDecisions.filter((entry) => String(entry.ts || '').slice(0, 10) >= new Date(Date.now() - (14 * 86400000)).toISOString().slice(0, 10));
const loopHealthScore = Math.round(
  (acceptanceRate * 0.25) +
  (implementationRate * 0.35) +
  (Math.min(100, recentFounderDecisions.length * 10) * 0.15) +
  (Math.max(0, 100 - (tryBeforeEscalating * 6)) * 0.25)
);

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'render-feedback-loop-dashboard.mjs',
  acceptanceRate,
  implementationRate,
  loopHealthScore,
  totals: {
    ledgerEntries: rows.length,
    accepted: accepted.length,
    implemented: implemented.length,
    partial: partial.length,
    founderDecisions: founderDecisions.length,
    recentFounderDecisions: recentFounderDecisions.length,
    automationReady: (automation.items || []).filter((item) => item.automationStatus === 'ready-to-run').length,
    executeNow,
    tryBeforeEscalating,
  },
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

writeJson(OUT_JSON, payload);

const lines = [
  '# Feedback Loop Dashboard',
  '',
  `> Generated: ${payload.generatedAt.slice(0, 10)} · Loop health: ${loopHealthScore}/100`,
  '',
  `- Acceptance rate: ${acceptanceRate}%`,
  `- Implementation rate: ${implementationRate}%`,
  `- Founder decisions (14d): ${payload.totals.recentFounderDecisions}`,
  `- Approved automation waiting: ${payload.totals.automationReady}`,
  `- Execute-now items: ${executeNow}`,
  `- Try-before-escalating items: ${tryBeforeEscalating}`,
  '',
  '## Interpretation',
  '',
  `- ${loopHealthScore >= 85 ? 'Strong' : loopHealthScore >= 70 ? 'Healthy with drag' : 'Needs intervention'} feedback loop.`,
  `- ${tryBeforeEscalating > 6 ? 'Blocker pressure is still suppressing founder throughput.' : 'Blocker pressure is contained enough for execution work to dominate.'}`,
  `- ${payload.totals.automationReady > 0 ? 'Founder approvals are ready to convert into action.' : 'No approved automation is waiting.'}`,
  '',
];

writeText(OUT_MD, lines.join('\n'));
console.log(`✓ Feedback loop dashboard → ${path.relative(ROOT, OUT_MD).replace(/\\/g, '/')} (${loopHealthScore}/100)`);
