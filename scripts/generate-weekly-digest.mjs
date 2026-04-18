#!/usr/bin/env node
/**
 * generate-weekly-digest.mjs
 *
 * Generates portfolio/WEEKLY_DIGEST.md — the Studio Owner's weekly briefing.
 * Sections: CI failures, launch momentum, compliance velocity, revenue
 * freshness, SIL trend, human action items aging.
 *
 * Usage:
 *   node scripts/generate-weekly-digest.mjs
 *   node scripts/generate-weekly-digest.mjs --json
 *   node scripts/ops.mjs weekly-digest
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT   = path.resolve(__dirname, '..');
const OUT    = path.join(ROOT, 'portfolio', 'WEEKLY_DIGEST.md');
const today  = new Date().toISOString().slice(0, 10);
const node   = process.execPath;

const argv     = process.argv.slice(2);
const jsonMode = argv.includes('--json');

function readText(p)     { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function run(script, args = []) {
  const res = spawnSync(node, [path.join(ROOT, 'scripts', script), ...args], { encoding: 'utf8', timeout: 30000, cwd: ROOT });
  return { out: res.stdout ?? '', err: res.stderr ?? '', code: res.status ?? 1 };
}

// ── Gather data ───────────────────────────────────────────────────────────────
process.stderr.write('Gathering weekly digest data...\n');

// 1. CI health
const ciResult = run('check-ci-health.mjs', ['--json']);
let ciData = null;
try { ciData = JSON.parse(ciResult.out); } catch { /* skip */ }

// 2. Launch momentum
const launchMd = readText(path.join(ROOT, 'docs', 'LAUNCH_MOMENTUM.md'));

// 3. Revenue freshness
const revResult = run('check-revenue-freshness.mjs', ['--json']);
let revData = null;
try { revData = JSON.parse(revResult.out); } catch { /* skip */ }

// 4. Compliance velocity
const compResult = run('track-compliance-velocity.mjs', ['--json', '--no-write']);
let compData = null;
try { compData = JSON.parse(compResult.out); } catch { /* skip */ }

// 5. SIL from status
const status  = readJson(path.join(ROOT, 'context', 'PROJECT_STATUS.json'), {});
const silText = readText(path.join(ROOT, 'context', 'SELF_IMPROVEMENT_LOOP.md'));
const silHeader = silText.slice(silText.indexOf('<!-- rolling-status-start -->'), silText.indexOf('<!-- rolling-status-end -->')).slice(0, 800);

// 6. Human action items from TASK_BOARD
const taskBoard = readText(path.join(ROOT, 'context', 'TASK_BOARD.md'));
const humanSection = (() => {
  const parts = taskBoard.split(/^## /m);
  const section = parts.find(p => p.startsWith('Human Action Required'));
  if (!section) return '';
  return section.split('\n').filter(l => l.startsWith('- [ ]')).join('\n');
})();

// 7. Open blockers from LATEST_HANDOFF
const handoff     = readText(path.join(ROOT, 'context', 'LATEST_HANDOFF.md'));
const blockerLines = handoff.match(/^- \*\*.+\*\*[^\n]+/gm)?.slice(0, 6) ?? [];

// ── Build CI Red section ──────────────────────────────────────────────────────
function buildCiSection() {
  if (!ciData || !ciData.alerts) return '_CI health data unavailable — run `ops.mjs ci-health`_';
  const alerts = ciData.alerts ?? [];
  if (alerts.length === 0) return '✓ No CI failures detected this week.';
  const lines = [`**${alerts.length} alert(s)** across ${ciData.reposScanned ?? '?'} repos:\n`];
  for (const a of alerts.slice(0, 10)) {
    lines.push(`- ⛔ **${a.repo}** → \`${a.workflow}\` — ${a.failRate ?? '?'}% fail rate (last ${a.runsChecked ?? 20} runs)`);
  }
  if (alerts.length > 10) lines.push(`- _...and ${alerts.length - 10} more — run \`ops.mjs ci-health\` for full list_`);
  return lines.join('\n');
}

// ── Build revenue section ─────────────────────────────────────────────────────
function buildRevenueSection() {
  if (!revData) return '_Revenue data unavailable_';
  const age = revData.ageDays ?? '?';
  const icon = revData.stale ? '⚠' : '✓';
  return `${icon} Revenue signals last updated **${age} day(s) ago**${revData.stale ? ' — **update needed** (`ops.mjs revenue-update`)' : ' — fresh'}`;
}

// ── Build compliance section ──────────────────────────────────────────────────
function buildComplianceSection() {
  if (!compData) return '_Compliance history unavailable_';
  const s = compData;
  return `${s.passed}/${s.total} checks passing (${s.score}%)  ${s.trend ?? '→'}  ${s.sparkline ?? ''}`;
}

// ── Build launch momentum section ────────────────────────────────────────────
function buildLaunchSection() {
  const criticalMatch = launchMd.match(/### 🔴 CRITICAL[^#]*/);
  const highMatch     = launchMd.match(/### 🟠 HIGH[^#]*/);
  if (!criticalMatch && !highMatch) return '_No high-urgency launch items_';
  const lines = [];
  if (criticalMatch) {
    const projects = criticalMatch[0].match(/\*\*(.+?)\*\*/g)?.map(m => m.replace(/\*\*/g, '')) ?? [];
    lines.push(`🔴 **CRITICAL** — ${projects.join(', ')} (≥30d unannounced)`);
  }
  if (highMatch) {
    const projects = highMatch[0].match(/\*\*(.+?)\*\*/g)?.map(m => m.replace(/\*\*/g, '')) ?? [];
    lines.push(`🟠 **HIGH** — ${projects.join(', ')} (14–29d unannounced)`);
  }
  return lines.join('\n');
}

// ── Assemble digest ───────────────────────────────────────────────────────────
const sections = [
  `<!-- generated-by: scripts/generate-weekly-digest.mjs -->`,
  `<!-- generated-at: ${today} -->`,
  ``,
  `# Studio Weekly Digest — ${today}`,
  ``,
  `> Auto-generated weekly briefing for the Studio Owner. Re-generate: \`node scripts/ops.mjs weekly-digest\``,
  ``,
  `---`,
  ``,
  `## 🔴 CI Failures`,
  ``,
  buildCiSection(),
  ``,
  `---`,
  ``,
  `## 🚀 Launch Momentum`,
  ``,
  buildLaunchSection(),
  ``,
  `---`,
  ``,
  `## 📊 Compliance Velocity`,
  ``,
  buildComplianceSection(),
  ``,
  `---`,
  ``,
  `## 💰 Revenue Signals`,
  ``,
  buildRevenueSection(),
  ``,
  `---`,
  ``,
  `## 📈 SIL Trend`,
  ``,
  '```',
  silHeader.replace(/<!-[^>]*>/g, '').trim(),
  '```',
  ``,
  `---`,
  ``,
  `## 🧍 Human Action Required (${humanSection.split('\n').filter(Boolean).length} items)`,
  ``,
  humanSection || '_No open human action items_',
  ``,
  `---`,
  ``,
  `## 🚧 Open Blockers`,
  ``,
  blockerLines.length > 0 ? blockerLines.join('\n') : '_No open blockers_',
  ``,
  `---`,
  ``,
  `## Quick Commands`,
  ``,
  '```bash',
  `node scripts/ops.mjs doctor            # full health check`,
  `node scripts/ops.mjs ci-health         # refresh CI alerts`,
  `node scripts/ops.mjs launch-momentum   # launch urgency`,
  `node scripts/ops.mjs revenue-update    # enter revenue data`,
  `node scripts/ops.mjs rescore           # refresh IGNIS scores`,
  '```',
];

const md = sections.join('\n') + '\n';

if (jsonMode) {
  console.log(JSON.stringify({
    generated: today,
    ciAlerts:  ciData?.alerts?.length ?? 0,
    revenueFresh: !revData?.stale,
    complianceScore: compData?.score ?? null,
    humanItems: humanSection.split('\n').filter(Boolean).length,
  }, null, 2));
  process.exit(0);
}

fs.writeFileSync(OUT, md);
console.log(`✓ Weekly digest → portfolio/WEEKLY_DIGEST.md`);
if (ciData?.alerts?.length > 0) console.log(`  ⛔  ${ciData.alerts.length} CI failure(s) — see digest`);
if (revData?.stale) console.log(`  ⚠   Revenue signals stale`);
