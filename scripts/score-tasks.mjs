#!/usr/bin/env node
/**
 * score-tasks.mjs
 *
 * Stake-weighted task prioritization engine.
 * Parses TASK_BOARD.md open items, scores each by a multi-factor stake formula,
 * and outputs a ranked agenda sorted by priority.
 *
 * Stake formula:
 *   base(category) + age_pressure(sessionAge) + sil_counter_bonus + urgency_flags
 *
 * Usage:
 *   node scripts/score-tasks.mjs [--json] [--top N] [--bucket now|next|all]
 *   node scripts/ops.mjs rank-tasks [--json] [--top N]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const jsonOut = process.argv.includes('--json');
const topIdx  = process.argv.indexOf('--top');
const topN    = topIdx !== -1 ? parseInt(process.argv[topIdx + 1]) : 10;
const bucketArg = (() => {
  const i = process.argv.indexOf('--bucket');
  return i !== -1 ? process.argv[i + 1] : 'all';
})();

function readJson(p, fb = {}) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; }
}
function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}
function extractSection(content, heading) {
  const parts = content.split(/^## /m);
  const match = parts.find(p => p.startsWith(heading));
  if (!match) return '';
  const nl = match.indexOf('\n');
  return nl === -1 ? '' : match.slice(nl + 1);
}

const taskBoard = readText(path.join(ROOT, 'context', 'TASK_BOARD.md'));
const status    = readJson(path.join(ROOT, 'context', 'PROJECT_STATUS.json'));
const session   = status.currentSession ?? 59;

// ── Parse open items ──────────────────────────────────────────────────────────
function parseItems(section, bucket) {
  return section.split(/\r?\n/)
    .filter(l => /^- \[ \]/.test(l))
    .map(line => {
      const text = line.replace(/^- \[ \]\s*/, '').trim();
      return { text, line, bucket };
    });
}

const buckets = {
  now:     parseItems(extractSection(taskBoard, 'Now'), 'Now'),
  next:    parseItems(extractSection(taskBoard, 'Next'), 'Next'),
  blocked: parseItems(extractSection(taskBoard, 'Blocked'), 'Blocked'),
};

const allItems = bucketArg === 'now' ? buckets.now
  : bucketArg === 'next' ? buckets.next
  : [...buckets.now, ...buckets.next]; // exclude blocked from ranking

// ── Stake formula ─────────────────────────────────────────────────────────────
function computeStake(item) {
  const { text, bucket } = item;
  let stake = 0;
  const reasons = [];

  // Bucket bonus
  if (bucket === 'Now') { stake += 20; reasons.push('Now(+20)'); }

  // Category bonuses
  if (/\[SEC\]|\[SECURITY\]/.test(text))  { stake += 18; reasons.push('Security(+18)'); }
  if (/\[SIL:2⛔\]/.test(text))           { stake += 35; reasons.push('SIL:2⛔(+35) MUST-DO'); }
  if (/\[SIL:1\]/.test(text))             { stake += 20; reasons.push('SIL:1(+20)'); }
  if (/\[SIL\]/.test(text))               { stake += 12; reasons.push('SIL(+12)'); }
  if (/\[DEPTH\]/.test(text))             { stake += 10; reasons.push('Depth(+10)'); }
  if (/\[SPEED\]/.test(text))             { stake += 9;  reasons.push('Speed(+9)'); }
  if (/\[UX\]/.test(text))                { stake += 9;  reasons.push('UX(+9)'); }
  if (/\[FEEDBACK\]/.test(text))          { stake += 8;  reasons.push('Feedback(+8)'); }
  if (/\[BLOCKER\]/.test(text))           { stake += 25; reasons.push('Blocker(+25)'); }
  if (/\[LAUNCH\]/.test(text))            { stake += 14; reasons.push('Launch(+14)'); }

  // Age pressure (from NEW SNN annotation)
  const sessM = text.match(/\(NEW S(\d+)/);
  if (sessM) {
    const age = session - parseInt(sessM[1]);
    const agePressure = Math.min(30, age * 2);
    if (age > 0) { stake += agePressure; reasons.push(`Age:${age}s(+${agePressure})`); }
  }

  // Negative modifiers
  if (/externally blocked|pending first automated run/i.test(text)) {
    stake -= 15; reasons.push('Ext-blocked(-15)');
  }

  return { stake: Math.max(0, stake), reasons };
}

// ── Score all items ───────────────────────────────────────────────────────────
const scored = allItems.map(item => {
  const { stake, reasons } = computeStake(item);
  return { ...item, stake, reasons };
}).sort((a, b) => b.stake - a.stake).slice(0, topN);

// ── Output ────────────────────────────────────────────────────────────────────
if (jsonOut) {
  console.log(JSON.stringify({
    date: new Date().toISOString().slice(0, 10),
    session,
    totalOpen: allItems.length,
    ranked: scored.map(({ text, bucket, stake, reasons }) => ({ bucket, stake, reasons, text })),
  }, null, 2));
} else {
  const W = 72;
  console.log(`\nStake-Ranked Tasks — Top ${topN} (Session ${session})`);
  console.log('─'.repeat(W));
  if (scored.length === 0) {
    console.log('  No open tasks found.');
  } else {
    scored.forEach(({ text, bucket, stake, reasons }, i) => {
      const bucketTag = bucket === 'Now' ? '[NOW]' : '[NEXT]';
      console.log(`  ${String(i + 1).padStart(2)}. [${String(stake).padStart(3)}]  ${bucketTag}  ${text.slice(0, 70)}`);
      console.log(`       Factors: ${reasons.join(' · ')}`);
    });
  }
  console.log('─'.repeat(W));
  console.log(`  Total open: ${allItems.length} items (${buckets.now.length} Now, ${buckets.next.length} Next, ${buckets.blocked.length} Blocked)\n`);
  console.log(`  Tip: run with --json to pipe results into other scripts.`);
  console.log(`  Add --bucket now|next to filter by bucket.\n`);
}
