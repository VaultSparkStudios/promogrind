#!/usr/bin/env node
/**
 * compute-entropy.mjs
 *
 * Computes a protocol entropy score (0.0–1.0) for a project.
 * Entropy rises as context files age, SIL skip counters accumulate,
 * Human Action Required items linger, and IGNIS/truth audit go stale.
 *
 * 0.0 = fully fresh  ·  1.0 = fully decayed
 *
 * Thresholds:
 *   entropy < 0.30  → ✓ healthy
 *   entropy 0.30–0.60 → ⚠ drifting
 *   entropy > 0.60  → ⛔ maintenance sprint recommended
 *
 * Usage:
 *   node scripts/compute-entropy.mjs [--project <localPath>] [--json] [--update]
 *   node scripts/ops.mjs entropy [--project <localPath>] [--json] [--update]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const projectIdx = process.argv.indexOf('--project');
const targetPath = projectIdx !== -1 ? path.resolve(process.argv[projectIdx + 1]) : ROOT;
const jsonOut = process.argv.includes('--json');
const doUpdate = process.argv.includes('--update');

const today = new Date();

// ── Helpers ───────────────────────────────────────────────────────────────────
function readJson(p, fb = {}) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; }
}
function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}
function mtimeDays(filePath) {
  try { return (today - fs.statSync(filePath).mtime) / 86400000; }
  catch { return 999; }
}
function dateDays(dateStr) {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  return isNaN(d) ? 999 : Math.max(0, (today - d) / 86400000);
}
/** Exponential decay: 0 when age=0, approaches 1 as age→∞. */
function decay(ageDays, halfLifeDays) {
  return 1 - Math.exp(-(ageDays / halfLifeDays) * Math.LN2);
}
function clamp(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }

// ── Load source files ─────────────────────────────────────────────────────────
const ctx = (f) => path.join(targetPath, 'context', f);
const status = readJson(ctx('PROJECT_STATUS.json'));
const taskBoard = readText(ctx('TASK_BOARD.md'));

// ── Signals ───────────────────────────────────────────────────────────────────
const signals = [];
function sig(name, score, weight, note) {
  signals.push({ name, score: parseFloat(clamp(score).toFixed(3)), weight, note });
}

// File freshness (exponential decay with per-file half-lives)
sig('CURRENT_STATE.md',       decay(mtimeDays(ctx('CURRENT_STATE.md')),       7),  1.0, `${mtimeDays(ctx('CURRENT_STATE.md')).toFixed(1)}d`);
sig('TASK_BOARD.md',          decay(mtimeDays(ctx('TASK_BOARD.md')),           5),  1.2, `${mtimeDays(ctx('TASK_BOARD.md')).toFixed(1)}d`);
sig('LATEST_HANDOFF.md',      decay(mtimeDays(ctx('LATEST_HANDOFF.md')),       5),  1.0, `${mtimeDays(ctx('LATEST_HANDOFF.md')).toFixed(1)}d`);
sig('SELF_IMPROVEMENT_LOOP',  decay(mtimeDays(ctx('SELF_IMPROVEMENT_LOOP.md')),7),  0.8, `${mtimeDays(ctx('SELF_IMPROVEMENT_LOOP.md')).toFixed(1)}d`);

// Truth audit staleness (half-life: 14d)
const truthAge = dateDays(status.truthAuditLastRun);
sig('Truth audit',            decay(truthAge, 14), 1.0, status.truthAuditLastRun ? `${truthAge.toFixed(1)}d since run` : 'never run');

// IGNIS staleness (half-life: 14d)
const ignisAge = dateDays(status.ignisLastComputed);
sig('IGNIS score',            decay(ignisAge, 14), 0.8, status.ignisLastComputed ? `${ignisAge.toFixed(1)}d old` : 'never scored');

// SIL skip counter pressure
const skip1 = (taskBoard.match(/\[SIL:1\]/g) || []).length;
const skip2 = (taskBoard.match(/\[SIL:2⛔\]/g) || []).length;
sig('SIL skip pressure',      clamp(skip1 * 0.15 + skip2 * 0.45), 1.5, `${skip1} at :1, ${skip2} at :2⛔`);

// Oldest open Human Action Required item (by session age)
const session = status.currentSession || 59;
const harAges = [...taskBoard.matchAll(/\(NEW S(\d+)/g)].map(m => session - parseInt(m[1]));
const oldestHAR = harAges.length ? Math.max(...harAges) : 0;
sig('Oldest HAR item',        clamp(oldestHAR / 30), 1.0, `${oldestHAR} sessions old (oldest)`);

// Now bucket fullness (empty Now = stale direction, not zero entropy)
const openNow = (taskBoard.match(/^- \[ \]/gm) || []).length;
sig('Now bucket',             openNow === 0 ? 0.55 : openNow <= 2 ? 0.15 : 0.0, 0.6, `${openNow} open item(s)`);

// ── Composite score ───────────────────────────────────────────────────────────
const totalWeight = signals.reduce((s, g) => s + g.weight, 0);
const entropy = clamp(signals.reduce((s, g) => s + g.score * g.weight, 0) / totalWeight);

const signal = entropy < 0.30 ? '✓' : entropy < 0.60 ? '⚠' : '⛔';
const label  = entropy < 0.30 ? 'healthy' : entropy < 0.60 ? 'drifting — review recommended' : 'critical — maintenance sprint needed';

// ── Output ────────────────────────────────────────────────────────────────────
if (jsonOut) {
  console.log(JSON.stringify({
    project: path.basename(targetPath),
    date: today.toISOString().slice(0, 10),
    entropy: parseFloat(entropy.toFixed(3)),
    signal: signal === '✓' ? 'healthy' : signal === '⚠' ? 'drifting' : 'critical',
    signals,
  }, null, 2));
} else {
  const W = 54;
  const bar = (score) => '█'.repeat(Math.round(score * 12)).padEnd(12, '░');
  const flag = (score) => score > 0.65 ? ' ⛔' : score > 0.38 ? ' ⚠' : '';
  console.log(`\nProtocol Entropy — ${path.basename(targetPath)}`);
  console.log('─'.repeat(W));
  console.log(`  Score  ${entropy.toFixed(3)}  ${signal}  ${label}`);
  console.log('─'.repeat(W));
  for (const s of signals) {
    console.log(`  ${s.name.padEnd(28)} ${bar(s.score)}  ${s.score.toFixed(3)}${flag(s.score)}`);
    console.log(`  ${''.padEnd(28)} ${s.note}`);
  }
  console.log('─'.repeat(W) + '\n');
  if (entropy >= 0.60) {
    console.log('  ⛔ Recommended: run `node scripts/ops.mjs session-plan` for a maintenance sprint.');
    console.log('  ⛔ Then address SIL skip counters and oldest HAR items first.\n');
  }
}

// ── Update PROJECT_STATUS.json ────────────────────────────────────────────────
if (doUpdate) {
  const statusPath = ctx('PROJECT_STATUS.json');
  const current = readJson(statusPath);
  current.entropyScore = parseFloat(entropy.toFixed(3));
  current.entropyLastComputed = today.toISOString().slice(0, 10);
  fs.writeFileSync(statusPath, JSON.stringify(current, null, 2) + '\n', 'utf8');
  if (!jsonOut) console.log(`✓ Updated PROJECT_STATUS.json  entropyScore = ${entropy.toFixed(3)}`);
}
