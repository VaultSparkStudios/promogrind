#!/usr/bin/env node
// check-sanitization-ratchet.mjs
// Compares the current sanitization scan against the committed baseline.
// Fails (exit 1) if any repo's critical finding count INCREASED since baseline.
// Prints a delta table showing improvement, regression, or no change per repo.
//
// Usage:
//   node scripts/check-sanitization-ratchet.mjs
//   node scripts/check-sanitization-ratchet.mjs --report-dir audits/sanitization/latest
//   node scripts/check-sanitization-ratchet.mjs --date 2026-04-07
//   node scripts/check-sanitization-ratchet.mjs --update-baseline   # commit lower counts as new baseline
//   node scripts/check-sanitization-ratchet.mjs --update-baseline --force  # force even if counts rose

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateDate, validateDir } from './lib/validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const baselinePath = path.join(root, 'audits', 'sanitization', 'baseline.json');
const auditsBase = path.join(root, 'audits', 'sanitization');

const args = process.argv.slice(2);
const updateBaseline = args.includes('--update-baseline');
const forceUpdate = args.includes('--force');
const _rdIdx = args.indexOf('--report-dir');
const _reportDirRaw = _rdIdx !== -1 ? (args[_rdIdx + 1] ?? null) : null;
const reportDirArg = _reportDirRaw ? validateDir('report-dir', _reportDirRaw) : null;
const _dtIdx = args.indexOf('--date');
const _dateRaw = _dtIdx !== -1 ? (args[_dtIdx + 1] ?? null) : null;
const dateArg = validateDate('date', _dateRaw);

// Resolve the _summary.json to compare against
function resolveSummaryPath() {
  if (reportDirArg) {
    // reportDirArg is already an absolute path (validated by validateDir)
    return path.join(reportDirArg, '_summary.json');
  }
  if (dateArg) {
    return path.join(auditsBase, dateArg, '_summary.json');
  }
  // Auto-detect: most recent dated subdirectory
  const entries = fs.readdirSync(auditsBase, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
    .sort((a, b) => b.name.localeCompare(a.name));
  if (!entries.length) {
    console.error('ERROR: No dated audit directories found in audits/sanitization/');
    process.exit(1);
  }
  return path.join(auditsBase, entries[0].name, '_summary.json');
}

function arrow(delta) {
  if (delta < 0) return `↓${Math.abs(delta)}`;
  if (delta > 0) return `↑${delta}`;
  return '→';
}

function pad(str, len) {
  return String(str).padEnd(len);
}

async function main() {
  const summaryPath = resolveSummaryPath();

  console.log('── Sanitization baseline ratchet ──');
  console.log(`   Current: ${summaryPath}`);
  console.log(`   Baseline: ${baselinePath}`);
  console.log('');

  // Load current summary
  if (!fs.existsSync(summaryPath)) {
    console.error(`ERROR: Summary file not found: ${summaryPath}`);
    console.error('Run: node scripts/check-public-repo-sanitization.mjs --write-report audits/sanitization/<date>');
    process.exit(1);
  }
  const current = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

  // Load or initialise baseline
  let baseline = [];
  if (!fs.existsSync(baselinePath)) {
    console.log('   No baseline found — treating current scan as first baseline.');
    console.log('   Writing initial baseline...');
    const initial = current.map(e => ({
      slug: e.slug,
      name: e.name,
      repo: e.repo,
      critical: e.critical,
      warning: e.warning,
      baselineDate: new Date().toISOString().slice(0, 10),
    }));
    fs.writeFileSync(baselinePath, JSON.stringify(initial, null, 2));
    console.log(`   ✓ Baseline written: ${baselinePath}`);
    console.log('');
    console.log('   Initial baseline set — ratchet active from next run.');
    process.exit(0);
  }

  baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

  // Build lookup maps
  const baselineBySlug = Object.fromEntries(baseline.map(e => [e.slug, e]));
  const currentBySlug = Object.fromEntries(current.map(e => [e.slug, e]));

  // Compute deltas
  const allSlugs = new Set([
    ...baseline.map(e => e.slug),
    ...current.map(e => e.slug),
  ]);

  const rows = [];
  let regressions = 0;
  let improvements = 0;
  let totalCriticalBaseline = 0;
  let totalCriticalCurrent = 0;

  for (const slug of [...allSlugs].sort()) {
    const b = baselineBySlug[slug];
    const c = currentBySlug[slug];

    if (!c) {
      // Repo no longer in scan (cleaned up or removed) — treat as zero
      rows.push({ slug, name: b?.name ?? slug, bCrit: b?.critical ?? 0, cCrit: 0, bWarn: b?.warning ?? 0, cWarn: 0, status: 'removed' });
      totalCriticalBaseline += b?.critical ?? 0;
      continue;
    }

    if (!b) {
      // New repo in scan — not a regression (new finding)
      rows.push({ slug, name: c.name, bCrit: 0, cCrit: c.critical, bWarn: 0, cWarn: c.warning, status: 'new' });
      totalCriticalCurrent += c.critical;
      if (c.critical > 0) regressions++;
      continue;
    }

    const critDelta = c.critical - b.critical;
    const warnDelta = c.warning - b.warning;

    totalCriticalBaseline += b.critical;
    totalCriticalCurrent += c.critical;

    let status = 'ok';
    if (critDelta > 0) { status = 'regressed'; regressions++; }
    else if (critDelta < 0) { status = 'improved'; improvements++; }

    rows.push({ slug, name: c.name, bCrit: b.critical, cCrit: c.critical, bWarn: b.warning, cWarn: c.warning, critDelta, warnDelta, status });
  }

  // Print table
  const w = { name: 26, crit: 10, warn: 9, delta: 10, status: 10 };
  const header = [
    pad('Repo', w.name),
    pad('Baseline', w.crit),
    pad('Current', w.crit),
    pad('Delta', w.delta),
    'Status',
  ].join(' │ ');
  const divider = '─'.repeat(header.length);

  console.log(`   ${header}`);
  console.log(`   ${divider}`);

  for (const row of rows) {
    const delta = row.critDelta !== undefined ? arrow(row.critDelta) : (row.status === 'new' ? `+${row.cCrit}` : `−${row.bCrit}`);
    const statusIcon = {
      ok: '✓',
      improved: '↓ better',
      regressed: '⛔ WORSE',
      new: '⚠ new',
      removed: '✓ gone',
    }[row.status] ?? '?';

    console.log(`   ${pad(row.name, w.name)} │ ${pad(row.bCrit + 'c', w.crit)} │ ${pad(row.cCrit + 'c', w.crit)} │ ${pad(delta, w.delta)} │ ${statusIcon}`);
  }

  console.log(`   ${divider}`);
  console.log(`   ${pad('TOTAL', w.name)} │ ${pad(totalCriticalBaseline + 'c', w.crit)} │ ${pad(totalCriticalCurrent + 'c', w.crit)} │ ${pad(arrow(totalCriticalCurrent - totalCriticalBaseline), w.delta)} │`);
  console.log('');

  if (updateBaseline) {
    if (regressions > 0 && !forceUpdate) {
      console.log('   ✗ Cannot update baseline — regressions detected. Use --force to override.');
      process.exit(1);
    }
    const newBaseline = current.map(e => ({
      slug: e.slug,
      name: e.name,
      repo: e.repo,
      critical: e.critical,
      warning: e.warning,
      baselineDate: new Date().toISOString().slice(0, 10),
    }));
    fs.writeFileSync(baselinePath, JSON.stringify(newBaseline, null, 2));
    console.log(`   ✓ Baseline updated: ${baselinePath}`);
    process.exit(0);
  }

  // Verdict
  if (regressions > 0) {
    console.log(`   ⛔ RATCHET FAILED — ${regressions} repo(s) have MORE critical findings than baseline.`);
    console.log('   Fix the regressions, then re-run the sanitization scanner to regenerate the report.');
    console.log('   To lower the baseline after confirmed cleanup: node scripts/check-sanitization-ratchet.mjs --update-baseline');
    process.exit(1);
  }

  if (improvements > 0) {
    console.log(`   ✓ RATCHET PASSED — ${improvements} repo(s) improved. Run --update-baseline to lock in the new lower counts.`);
    console.log('   Command: node scripts/check-sanitization-ratchet.mjs --update-baseline');
  } else {
    console.log(`   ✓ RATCHET PASSED — no regressions. Critical count held at ${totalCriticalCurrent}.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
