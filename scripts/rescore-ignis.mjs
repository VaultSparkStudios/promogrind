#!/usr/bin/env node
/**
 * rescore-ignis.mjs
 *
 * IGNIS re-score helper. Shows per-project staleness and triggers fresh
 * scoring via the IGNIS TypeScript CLI.
 *
 * Usage:
 *   node scripts/rescore-ignis.mjs                    → staleness report for all projects
 *   node scripts/rescore-ignis.mjs --project <slug>   → score a specific project
 *   node scripts/rescore-ignis.mjs --stale            → score all projects ≥ 7d stale
 *   node scripts/rescore-ignis.mjs --json             → staleness report as JSON
 *   node scripts/ops.mjs rescore [--project <slug>] [--stale] [--json]
 *
 * IGNIS repo path is auto-detected from PROJECT_REGISTRY.json (slug: vaultspark-ignis)
 * or falls back to the sibling directory convention.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const today = new Date().toISOString().slice(0, 10);
const jsonMode    = process.argv.includes('--json');
const staleMode   = process.argv.includes('--stale');
const allMode     = process.argv.includes('--all');
const projectIdx  = process.argv.indexOf('--project');
const targetSlug  = projectIdx !== -1 ? process.argv[projectIdx + 1] : null;
const STALE_DAYS  = 7;

function readJson(p, fb)  { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function readText(p)      { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function daysBetween(a,b) { try { return Math.floor((new Date(b)-new Date(a))/86400000); } catch { return 999; } }

// ── Find IGNIS repo path ──────────────────────────────────────────────────────
const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
const projects  = registry.projects ?? [];

function detectIgnisPath() {
  // 1. Check registry for vaultspark-ignis entry
  const ignisEntry = projects.find(p => p.slug === 'vaultspark-ignis' || p.slug === 'ignis');
  if (ignisEntry?.localPath) {
    const p = ignisEntry.localPath.replace(/\\/g, '/');
    if (fs.existsSync(p)) return p;
  }
  // 2. Sibling directory convention
  const parentDir = path.resolve(ROOT, '..');
  const candidates = ['vaultspark-ignis', 'ignis'];
  for (const name of candidates) {
    const p = path.join(parentDir, name);
    if (fs.existsSync(path.join(p, 'cli.ts'))) return p;
  }
  return null;
}

const ignisPath = detectIgnisPath();

// ── Build staleness report ────────────────────────────────────────────────────
const rows = projects
  .filter(p => p.studioOsApplied)
  .map(p => {
    const statusPath = p.localPath
      ? path.join(p.localPath.replace(/\\/g, '/'), 'context', 'PROJECT_STATUS.json')
      : null;
    const status = statusPath ? readJson(statusPath, {}) : {};
    const lastComputed = status.ignisLastComputed ?? null;
    const age = lastComputed ? daysBetween(lastComputed, today) : 999;
    const score = status.ignisScore ?? null;
    const grade = status.ignisGrade ?? null;
    const staleness = age < STALE_DAYS ? 'fresh' : age < 14 ? 'stale' : 'overdue';
    const localExists = p.localPath ? fs.existsSync(p.localPath.replace(/\\/g, '/')) : false;
    return {
      slug: p.slug,
      name: p.name ?? p.slug,
      localPath: p.localPath ?? null,
      lastComputed,
      age,
      score,
      grade,
      staleness,
      localExists,
    };
  })
  .sort((a, b) => b.age - a.age); // oldest first

if (jsonMode) {
  console.log(JSON.stringify({ date: today, ignisPath, staleCount: rows.filter(r => r.staleness !== 'fresh').length, rows }, null, 2));
  process.exit(0);
}

// ── Print staleness report ────────────────────────────────────────────────────
const fresh   = rows.filter(r => r.staleness === 'fresh');
const stale   = rows.filter(r => r.staleness === 'stale');
const overdue = rows.filter(r => r.staleness === 'overdue');

function sig(r) {
  if (r.staleness === 'fresh')  return '✓';
  if (r.staleness === 'stale')  return '⚠';
  return '⛔';
}

function ageStr(r) {
  if (r.age === 999) return 'never';
  return `${r.age}d`;
}

if (!targetSlug && !staleMode) {
  console.log(`\n╔══ IGNIS STALENESS REPORT ─────────────────────────────────╗`);
  console.log(`║  Today: ${today.padEnd(51)}║`);
  console.log(`║  Stale threshold: ${STALE_DAYS}d  ·  IGNIS path: ${(ignisPath ? '✓ found' : '✗ not found').padEnd(20)}║`);
  console.log(`╠════════════════════════════════════════════════════════════╣`);
  console.log(`║  ✓ Fresh (${String(fresh.length).padEnd(2)}):   ${fresh.map(r=>r.name).join(', ').slice(0,42).padEnd(42)}║`);
  console.log(`║  ⚠ Stale (${String(stale.length).padEnd(2)}):   ${stale.map(r=>r.name).join(', ').slice(0,42).padEnd(42)}║`);
  console.log(`║  ⛔ Overdue (${String(overdue.length).padEnd(2)}): ${overdue.map(r=>r.name).join(', ').slice(0,39).padEnd(39)}║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  const show = [...overdue, ...stale].slice(0, 10);
  if (show.length > 0) {
    console.log('  Projects needing re-score (oldest first):');
    console.log('  ' + '─'.repeat(64));
    for (const r of show) {
      const scoreStr = r.score ? `IQ ${r.score.toLocaleString()} ${r.grade}` : 'unscored';
      console.log(`  ${sig(r)}  ${r.name.padEnd(28)}  age: ${ageStr(r).padEnd(6)}  ${scoreStr}`);
    }
    console.log('');
    if (!ignisPath) {
      console.log('  ⚠ IGNIS repo not found — cannot auto-score.');
      console.log('    Expected at sibling dir: ../vaultspark-ignis/cli.ts');
    } else {
      console.log(`  To re-score a project:  node scripts/ops.mjs rescore --project <slug>`);
      console.log(`  To re-score all stale:  node scripts/ops.mjs rescore --stale`);
    }
  } else {
    console.log('  All projects are fresh — no action needed.\n');
  }
  process.exit(0);
}

// ── Score target project(s) ───────────────────────────────────────────────────
if (!ignisPath) {
  console.error(`⛔ IGNIS repo not found. Expected at ../vaultspark-ignis/cli.ts or in PROJECT_REGISTRY.json.`);
  process.exit(1);
}

const cliPath = path.join(ignisPath, 'cli.ts');
if (!fs.existsSync(cliPath)) {
  console.error(`⛔ IGNIS CLI not found at: ${cliPath}`);
  process.exit(1);
}

const toScore = allMode
  ? rows.filter(r => r.localExists)
  : staleMode
    ? rows.filter(r => r.staleness !== 'fresh' && r.localExists)
    : targetSlug
      ? rows.filter(r => r.slug === targetSlug)
      : [];

if (toScore.length === 0) {
  if (targetSlug) {
    console.error(`⛔ Project not found or not studioOsApplied: ${targetSlug}`);
  } else {
    console.log('  All projects fresh — nothing to re-score.');
  }
  process.exit(targetSlug ? 1 : 0);
}

console.log(`\n  IGNIS re-score: ${toScore.length} project(s)  ·  CLI: ${cliPath}\n`);

let errors = 0;
for (const r of toScore) {
  if (!r.localPath) {
    console.log(`  ⚠ ${r.name}: no localPath — skipping`);
    continue;
  }
  const localPathNorm = r.localPath.replace(/\\/g, '/');
  if (!r.localExists) {
    console.log(`  ⚠ ${r.name}: local path not accessible — skipping`);
    continue;
  }
  process.stdout.write(`  Scoring ${r.name} ...`);
  const res = spawnSync('npx', ['tsx', cliPath, 'score', localPathNorm], {
    encoding: 'utf8',
    timeout: 60000,
    cwd: ignisPath,
    shell: true,
  });
  if (res.status === 0) {
    // Parse score from CLI output: format is "31,811/100,000" and "Tier: FLARE"
    const scoreMatch = (res.stdout ?? '').match(/(\d[\d,]+)\/100,000/);
    const tierMatch  = (res.stdout ?? '').match(/Tier:\s+([A-Z]+)/i);
    const iqScore    = scoreMatch ? parseInt(scoreMatch[1].replace(/,/g, ''), 10) : null;
    const tier       = tierMatch?.[1] ?? null;
    const scoreStr   = iqScore ? `IQ ${iqScore.toLocaleString()} ${tier ?? ''}`.trim() : 'scored';
    console.log(` ✓  ${scoreStr}`);

    // Write back to project's PROJECT_STATUS.json if we have data
    if (iqScore && r.localPath) {
      const statusPath = path.join(r.localPath.replace(/\\/g, '/'), 'context', 'PROJECT_STATUS.json');
      try {
        const statusData = readJson(statusPath, {});
        statusData.ignisScore = iqScore;
        statusData.ignisGrade = tier ?? statusData.ignisGrade ?? null;
        statusData.ignisLastComputed = today;
        fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2) + '\n');
      } catch { /* non-fatal: status file may be read-only or malformed */ }
    }
  } else {
    console.log(` ⛔ failed`);
    if (res.stderr) console.log(`     ${res.stderr.split('\n')[0]}`);
    errors++;
  }
}

console.log('');
if (errors > 0) {
  console.log(`  ${errors} error(s) — check IGNIS CLI output above.`);
  process.exit(1);
}
console.log(`  Run \`node scripts/ops.mjs rescore\` to verify updated scores.`);
