#!/usr/bin/env node
/**
 * render-state-vector.mjs
 *
 * Generates context/STATE_VECTOR.json — a dense, single-file project state
 * representation that any agent can load in one tool call for a sub-10-second
 * cold start.
 *
 * The vector is hashed against its source files. When the hash mismatches,
 * the agent knows to fall back to the full 9-file read path.
 *
 * Usage:
 *   node scripts/render-state-vector.mjs [--project <localPath>]
 *   node scripts/ops.mjs state-vector
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { extractBetween, extractSection, readJson, readText } from './lib/context-parsing.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const projectIdx = process.argv.indexOf('--project');
const targetPath = projectIdx !== -1 ? path.resolve(process.argv[projectIdx + 1]) : ROOT;

// ── Load sources ──────────────────────────────────────────────────────────────
const ctx = (f) => path.join(targetPath, 'context', f);
const status    = readJson(ctx('PROJECT_STATUS.json'));
const taskBoard = readText(ctx('TASK_BOARD.md'));
const handoff   = readText(ctx('LATEST_HANDOFF.md'));
const sil       = readText(ctx('SELF_IMPROVEMENT_LOOP.md'));
const truth     = readText(ctx('TRUTH_AUDIT.md'));

// ── Parse data ────────────────────────────────────────────────────────────────
const silHeader = extractBetween(sil, '<!-- rolling-status-start -->', '<!-- rolling-status-end -->');
const velocity  = parseInt(silHeader.match(/Velocity:\s*(\d+)/)?.[1] ?? '') || null;
const runway    = silHeader.match(/Momentum runway:\s*([^\|]+)/)?.[1]?.trim() ?? 'unknown';
const intentRate = silHeader.match(/Intent rate:\s*([^\n|]+)/)?.[1]?.trim() ?? 'unknown';

const nowSection     = extractSection(taskBoard, 'Now');
const nextSection    = extractSection(taskBoard, 'Next');
const blockedSection = extractSection(taskBoard, 'Blocked');
const listItem = (line) => /^- (?:\[\s\]\s*)?/.test(line);
const cleanListItem = (line) => line.replace(/^- (?:\[\s\]\s*)?/, '').slice(0, 80);
const openNow     = nowSection.split(/\r?\n/).filter(listItem);
const openNext    = nextSection.split(/\r?\n/).filter(listItem);
const openBlocked = blockedSection.split(/\r?\n/).filter(listItem);

const topNow  = openNow.slice(0, 3).map(cleanListItem);
const topNext = openNext.slice(0, 3).map(cleanListItem);

const handoffBlock = handoff.match(/^## Where We Left Off \([^)]+\)\n([\s\S]*?)(?=\n---|\n## )/m)?.[1]?.trim() ?? '';
const lastShipped  = handoffBlock.match(/^- Shipped:\s*(.+)$/m)?.[1] ?? 'see LATEST_HANDOFF.md';

const truthStatus = truth.match(/^Overall status:\s*(.+)$/m)?.[1]?.trim() ?? status.truthAuditStatus ?? 'unknown';

// ── Hash source files for staleness detection ─────────────────────────────────
const sourceFiles = [
  ctx('PROJECT_STATUS.json'),
  ctx('TASK_BOARD.md'),
  ctx('LATEST_HANDOFF.md'),
  ctx('SELF_IMPROVEMENT_LOOP.md'),
  ctx('TRUTH_AUDIT.md'),
];
const hashInput = sourceFiles.map(f => {
  try { return fs.readFileSync(f, 'utf8').length + fs.statSync(f).mtimeMs; }
  catch { return '0'; }
}).join('|');
const vectorHash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 16);

// ── Build vector ──────────────────────────────────────────────────────────────
const vector = {
  vectorVersion: '1.0',
  generatedAt: new Date().toISOString().slice(0, 10),
  generatedAtMs: Date.now(),
  session: status.currentSession ?? null,
  vectorHash,
  // SIL & velocity
  silTotal: status.silScore ?? null,
  silAvg3: status.silAvg3 ?? null,
  velocity,
  debt: status.silDebt ?? null,
  runway,
  intentRate,
  // Task state
  openNow: openNow.length,
  openNext: openNext.length,
  openBlocked: openBlocked.length,
  topNow,
  topNext,
  // Health
  health: status.health ?? 'unknown',
  truthStatus,
  genome: status.truthGenome ?? null,
  ignisScore: status.ignisScore ?? null,
  ignisGrade: status.ignisGrade ?? null,
  ignisAgeDays: status.ignisLastComputed
    ? Math.floor((Date.now() - new Date(status.ignisLastComputed)) / 86400000)
    : null,
  // Project identity
  name: status.name ?? path.basename(targetPath),
  slug: status.slug ?? null,
  type: status.type ?? null,
  lifecycle: status.lifecycle ?? null,
  // Strategic
  nextMilestone: status.nextMilestone ?? null,
  currentFocus: status.currentFocus ?? null,
  lastShipped,
  blockers: (status.blockers ?? []).slice(0, 3),
};

// ── Write output ──────────────────────────────────────────────────────────────
const outPath = path.join(targetPath, 'context', 'STATE_VECTOR.json');
fs.writeFileSync(outPath, JSON.stringify(vector, null, 2) + '\n', 'utf8');

const rel = path.relative(ROOT, outPath);
console.log(`✓ State vector → ${rel}`);
console.log(`  Session ${vector.session} · hash ${vectorHash} · Now ${openNow.length} / Next ${openNext.length} / Blocked ${openBlocked.length}`);
console.log(`  SIL ${vector.silTotal}/500 · velocity ${vector.velocity} · truth ${vector.truthStatus} · genome ${vector.genome}`);
