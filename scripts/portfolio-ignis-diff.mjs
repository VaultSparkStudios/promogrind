#!/usr/bin/env node
/**
 * portfolio-ignis-diff.mjs
 * Compare the current IGNIS portfolio baseline to a previous baseline and
 * report per-project IQ deltas (movers, biggest gains/losses).
 *
 * Usage:
 *   node scripts/portfolio-ignis-diff.mjs
 *     Uses ignis/output/portfolio-baseline.json (current)
 *     and ignis/output/portfolio-baseline-prev.json (previous, if it exists)
 *
 *   node scripts/portfolio-ignis-diff.mjs --archive
 *     Archives the current baseline to portfolio-baseline-prev.json before comparing.
 *     Run this BEFORE a new re-score to preserve the snapshot.
 *
 *   node scripts/portfolio-ignis-diff.mjs --prev path/to/other-baseline.json
 *     Compare current against a specific file.
 */

import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const baselineDir = path.join(root, 'ignis', 'output');
const currentPath = path.join(baselineDir, 'portfolio-baseline.json');
const defaultPrevPath = path.join(baselineDir, 'portfolio-baseline-prev.json');

const args = process.argv.slice(2);
const archiveMode = args.includes('--archive');
const prevIdx = args.indexOf('--prev');
const prevPath = prevIdx !== -1 ? path.resolve(args[prevIdx + 1]) : defaultPrevPath;

// ── Archive mode: save current as prev before re-scoring ─────────────────
if (archiveMode) {
  if (!fs.existsSync(currentPath)) {
    console.error('ERROR: No current baseline found at ignis/output/portfolio-baseline.json');
    process.exit(1);
  }
  fs.copyFileSync(currentPath, defaultPrevPath);
  const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
  const ts = current.timestamp?.slice?.(0, 10) ?? 'unknown';
  console.log(`Archived current baseline (${ts}) to portfolio-baseline-prev.json`);
  console.log('Run your IGNIS re-score now, then run this script again to see the diff.');
  process.exit(0);
}

// ── Load baselines ────────────────────────────────────────────────────────
if (!fs.existsSync(currentPath)) {
  console.error('ERROR: No current baseline at ignis/output/portfolio-baseline.json');
  console.error('Run the IGNIS CLI to generate one first.');
  process.exit(1);
}

const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
const hasPrev = fs.existsSync(prevPath);
const prev = hasPrev ? JSON.parse(fs.readFileSync(prevPath, 'utf8')) : null;

// ── Build lookup maps ─────────────────────────────────────────────────────
function buildMap(baseline) {
  const map = {};
  if (!baseline?.results) return map;
  for (const entry of baseline.results) {
    const key = entry.slug ?? entry.project ?? entry.id;
    if (key) map[key] = entry;
  }
  return map;
}

const currentMap = buildMap(current);
const prevMap = prev ? buildMap(prev) : {};

const currentDate = current.timestamp?.slice?.(0, 10) ?? 'unknown';
const prevDate = prev?.timestamp?.slice?.(0, 10) ?? null;
const currentAvg = current.summary?.averageIQ ?? null;
const prevAvg = prev?.summary?.averageIQ ?? null;

// ── Compute deltas ────────────────────────────────────────────────────────
const allSlugs = new Set([...Object.keys(currentMap), ...Object.keys(prevMap)]);
const rows = [];

for (const slug of allSlugs) {
  const cur = currentMap[slug];
  const prv = prevMap[slug];
  const currentIQ = cur?.iq ?? cur?.ignisScore ?? null;
  const prevIQ = prv?.iq ?? prv?.ignisScore ?? null;
  const name = cur?.name ?? prv?.name ?? slug;
  const tier = cur?.tier ?? cur?.grade ?? null;
  const delta = currentIQ != null && prevIQ != null ? currentIQ - prevIQ : null;
  rows.push({ slug, name, currentIQ, prevIQ, delta, tier });
}

// Sort by absolute delta desc, then by current IQ desc
rows.sort((a, b) => {
  if (a.delta != null && b.delta != null) return Math.abs(b.delta) - Math.abs(a.delta);
  if (a.delta != null) return -1;
  if (b.delta != null) return 1;
  return (b.currentIQ ?? 0) - (a.currentIQ ?? 0);
});

// ── Format helpers ────────────────────────────────────────────────────────
function fmt(n) {
  return n == null ? '—' : n.toLocaleString();
}

function arrow(delta) {
  if (delta == null) return ' ';
  if (delta > 0) return '↑';
  if (delta < 0) return '↓';
  return '→';
}

function pad(str, len) {
  return String(str ?? '').slice(0, len).padEnd(len);
}

// ── Output ────────────────────────────────────────────────────────────────
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  IGNIS PORTFOLIO DIFF');
if (prevDate) {
  console.log(`  Current: ${currentDate} (avg ${fmt(currentAvg)})  vs  Prev: ${prevDate} (avg ${fmt(prevAvg)})`);
  const avgDelta = currentAvg != null && prevAvg != null ? currentAvg - prevAvg : null;
  if (avgDelta != null) {
    const sign = avgDelta >= 0 ? '+' : '';
    console.log(`  Portfolio avg: ${sign}${Math.round(avgDelta)} IQ  ${arrow(avgDelta)}`);
  }
} else {
  console.log(`  Current: ${currentDate} (avg ${fmt(currentAvg)})  |  No previous baseline found`);
  console.log('  Run with --archive before next re-score to enable diff tracking.');
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (hasPrev) {
  console.log(`  ${'Project'.padEnd(38)} ${'Prev IQ'.padStart(8)} ${'Curr IQ'.padStart(8)} ${'Delta'.padStart(8)}`);
  console.log(`  ${'-'.repeat(38)} ${'-'.repeat(8)} ${'-'.repeat(8)} ${'-'.repeat(8)}`);

  for (const row of rows) {
    const deltaStr = row.delta != null
      ? `${arrow(row.delta)} ${row.delta >= 0 ? '+' : ''}${Math.round(row.delta).toLocaleString()}`
      : row.currentIQ != null ? '  (new)' : '  (gone)';
    const tierTag = row.tier ? ` [${row.tier}]` : '';
    console.log(`  ${pad(row.name + tierTag, 38)} ${fmt(row.prevIQ).padStart(8)} ${fmt(row.currentIQ).padStart(8)} ${deltaStr.padStart(8)}`);
  }
} else {
  console.log(`  ${'Project'.padEnd(38)} ${'IQ Score'.padStart(10)} ${'Tier'.padStart(12)}`);
  console.log(`  ${'-'.repeat(38)} ${'-'.repeat(10)} ${'-'.repeat(12)}`);
  for (const row of rows) {
    console.log(`  ${pad(row.name, 38)} ${fmt(row.currentIQ).padStart(10)} ${(row.tier ?? '—').padStart(12)}`);
  }
}

console.log('');
if (hasPrev) {
  const gained = rows.filter((r) => r.delta != null && r.delta > 0);
  const lost = rows.filter((r) => r.delta != null && r.delta < 0);
  const unchanged = rows.filter((r) => r.delta === 0);
  const newProjects = rows.filter((r) => r.delta == null && r.currentIQ != null && r.prevIQ == null);
  console.log(`  Summary: ${gained.length} gained · ${lost.length} lost · ${unchanged.length} unchanged · ${newProjects.length} new`);
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
