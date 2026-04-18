#!/usr/bin/env node
/**
 * run-studio-review.mjs
 *
 * Autonomous Studio Review — generates docs/STUDIO_REVIEW_AUTO_YYYY-MM.md
 * Reads PROJECT_STATUS.json from every studioOsApplied repo locally,
 * computes portfolio-wide health metrics, and produces a monthly review
 * report without requiring any human input.
 *
 * Designed to run as a monthly GitHub Actions workflow or on-demand.
 *
 * Usage:
 *   node scripts/run-studio-review.mjs [--month YYYY-MM] [--json] [--post-issue]
 *   node scripts/ops.mjs studio-review-auto
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const monthArg  = process.argv.find(a => /^\d{4}-\d{2}$/.test(a));
const month     = monthArg ?? new Date().toISOString().slice(0, 7);
const jsonOut   = process.argv.includes('--json');
const postIssue = process.argv.includes('--post-issue');

// ── Helpers ───────────────────────────────────────────────────────────────────
function readJson(p, fb = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; }
}
function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

// ── Load portfolio registry ───────────────────────────────────────────────────
const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'));
if (!registry?.projects) {
  console.error('Could not load portfolio/PROJECT_REGISTRY.json');
  process.exit(1);
}

// Filter to studioOsApplied projects
const projects = registry.projects.filter(p =>
  p.studioOsApplied && p.status !== 'archived' && p.localPath
);

// ── Collect status from each project ─────────────────────────────────────────
const snapshots = [];
const missing   = [];

for (const proj of projects) {
  const localPath = proj.localPath.replace(/\\/g, '/').replace('~', process.env.HOME ?? '');
  const statusPath = path.join(localPath, 'context', 'PROJECT_STATUS.json');
  const silPath    = path.join(localPath, 'context', 'SELF_IMPROVEMENT_LOOP.md');
  const taskPath   = path.join(localPath, 'context', 'TASK_BOARD.md');

  const status = readJson(statusPath);
  if (!status) {
    missing.push(proj.slug);
    continue;
  }

  // Parse SIL history for velocity trend
  const silText = readText(silPath);
  const SIL_ENTRY = /^## (\d{4}-\d{2}-\d{2}) — Session (\d+) \| Total: (\d+)\/500 \| Velocity: (\d+)/gm;
  const silHistory = [];
  let m;
  while ((m = SIL_ENTRY.exec(silText)) !== null) {
    silHistory.push({ date: m[1], session: parseInt(m[2]), total: parseInt(m[3]), velocity: parseInt(m[4]) });
  }
  const last3Sil = silHistory.slice(-3);
  const avgVelocity3 = last3Sil.length > 0
    ? Math.round(last3Sil.reduce((s, e) => s + e.velocity, 0) / last3Sil.length)
    : null;

  // Parse task board
  const taskText = readText(taskPath);
  function countOpenItems(section) {
    const parts = taskText.split(/^## /m);
    const match = parts.find(p => p.startsWith(section));
    if (!match) return 0;
    return (match.match(/^- \[ \]/gm) || []).length;
  }
  const openNow     = countOpenItems('Now');
  const openNext    = countOpenItems('Next');
  const openBlocked = countOpenItems('Blocked');
  const silSkip2    = (taskText.match(/\[SIL:2⛔\]/g) || []).length;

  // Risk score (0-10)
  let riskScore = 0;
  if (status.health === 'red')    riskScore += 3;
  if (status.health === 'yellow') riskScore += 1;
  if (openBlocked > 0)            riskScore += Math.min(2, openBlocked);
  if (silSkip2 > 0)               riskScore += 2;
  if ((status.entropyScore ?? 0) >= 0.6) riskScore += 2;
  if ((status.silVelocity ?? 5) < 3)     riskScore += 1;

  const riskLevel = riskScore >= 5 ? 'high' : riskScore >= 2 ? 'medium' : 'low';

  snapshots.push({
    slug: proj.slug,
    name: status.name ?? proj.slug,
    type: status.type ?? proj.type ?? 'unknown',
    vaultStatus: proj.vaultStatus ?? 'FORGE',
    lifecycle: status.lifecycle ?? 'unknown',
    health: status.health ?? 'unknown',
    silTotal: status.silScore ?? null,
    silAvg3: status.silAvg3 ?? null,
    velocity: status.silVelocity ?? avgVelocity3,
    avgVelocity3,
    currentFocus: (status.currentFocus ?? '').slice(0, 70),
    nextMilestone: (status.nextMilestone ?? '').slice(0, 60),
    blockers: status.blockers ?? [],
    entropyScore: status.entropyScore ?? null,
    currentSession: status.currentSession ?? null,
    openNow,
    openNext,
    openBlocked,
    silSkip2,
    ignisScore: status.ignisScore ?? null,
    ignisGrade: status.ignisGrade ?? null,
    riskScore,
    riskLevel,
    lastUpdated: status.lastUpdated ?? 'unknown',
  });
}

// ── Portfolio-wide metrics ────────────────────────────────────────────────────
const withSil    = snapshots.filter(s => s.silTotal !== null);
const silScores  = withSil.map(s => s.silTotal);
const avgSil     = silScores.length > 0
  ? Math.round(silScores.reduce((a, b) => a + b, 0) / silScores.length)
  : null;
const topSil     = [...snapshots].filter(s => s.silTotal !== null).sort((a, b) => b.silTotal - a.silTotal).slice(0, 3);
const bottomSil  = [...snapshots].filter(s => s.silTotal !== null).sort((a, b) => a.silTotal - b.silTotal).slice(0, 3);
const highRisk   = snapshots.filter(s => s.riskLevel === 'high');
const medRisk    = snapshots.filter(s => s.riskLevel === 'medium');
const greenHealth = snapshots.filter(s => s.health === 'green').length;
const yellowHealth = snapshots.filter(s => s.health === 'yellow').length;
const redHealth  = snapshots.filter(s => s.health === 'red').length;
const totalBlocked = snapshots.reduce((s, p) => s + p.openBlocked, 0);
const totalSilSkip2 = snapshots.reduce((s, p) => s + p.silSkip2, 0);
const sparkedProjects = snapshots.filter(s => s.vaultStatus === 'SPARKED').length;
const forgeProjects   = snapshots.filter(s => s.vaultStatus === 'FORGE').length;

// ── Health score (0-100) ──────────────────────────────────────────────────────
// 40% from avg SIL, 30% from health distribution, 20% from risk, 10% from blockers
const silScore40 = avgSil !== null ? Math.round((avgSil / 500) * 40) : 20;
const healthScore30 = Math.round(((greenHealth * 3 + yellowHealth * 1) / Math.max(1, snapshots.length * 3)) * 30);
const riskScore20  = Math.round(((snapshots.length - highRisk.length * 2 - medRisk.length) / Math.max(1, snapshots.length)) * 20);
const blockerScore10 = Math.round(Math.max(0, 10 - totalBlocked));
const studioHealth = Math.min(100, silScore40 + healthScore30 + riskScore20 + blockerScore10);

const grade = studioHealth >= 85 ? 'A' : studioHealth >= 70 ? 'B' : studioHealth >= 55 ? 'C' : studioHealth >= 40 ? 'D' : 'F';

// ── JSON mode ─────────────────────────────────────────────────────────────────
if (jsonOut) {
  const out = {
    month,
    generatedAt: new Date().toISOString().slice(0, 10),
    studioHealth,
    grade,
    avgSil,
    scanned: snapshots.length,
    missing: missing.length,
    projects: snapshots,
  };
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

// ── Build markdown ─────────────────────────────────────────────────────────────
const today    = new Date().toISOString().slice(0, 10);
const SPARK = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
function healthBar(score, max = 500) {
  const pct = score / max;
  const idx = Math.min(SPARK.length - 1, Math.round(pct * SPARK.length));
  return SPARK[idx];
}

const lines = [
  `<!-- generated-by: scripts/run-studio-review.mjs -->`,
  `<!-- generated-at: ${today} -->`,
  ``,
  `# Autonomous Studio Review — ${month}`,
  ``,
  `> Auto-generated portfolio health report. No human input required.`,
  `> Run on-demand: \`node scripts/ops.mjs studio-review-auto\``,
  ``,
  `---`,
  ``,
  `## Studio Health Score`,
  ``,
  `\`\`\``,
  `Studio Health:   ${studioHealth}/100  (${grade})`,
  `Avg SIL:         ${avgSil ?? 'N/A'}/500`,
  `Projects:        ${snapshots.length} scanned  (${sparkedProjects} SPARKED · ${forgeProjects} FORGE · ${missing.length} unreadable)`,
  `Health:          🟢 ${greenHealth}  🟡 ${yellowHealth}  🔴 ${redHealth}`,
  `Blocked items:   ${totalBlocked} total across portfolio`,
  `SIL:2⛔ skips:   ${totalSilSkip2} must-action items`,
  `High-risk:       ${highRisk.length} project(s)`,
  `\`\`\``,
  ``,
  `---`,
  ``,
  `## Project Summary`,
  ``,
  `| Project | Vault | Health | SIL | Velocity | Risk | Focus |`,
  `|---|---|---|---|---|---|---|`,
  ...snapshots
    .sort((a, b) => (b.silTotal ?? 0) - (a.silTotal ?? 0))
    .map(p => {
      const sil  = p.silTotal !== null ? `${p.silTotal}/500` : '—';
      const vel  = p.velocity !== null ? `v${p.velocity}` : '—';
      const risk = p.riskLevel === 'high' ? '⛔ high' : p.riskLevel === 'medium' ? '⚠ med' : '✓ low';
      const h    = p.health === 'green' ? '🟢' : p.health === 'yellow' ? '🟡' : p.health === 'red' ? '🔴' : '·';
      return `| **${p.name}** | ${p.vaultStatus} | ${h} | ${sil} | ${vel} | ${risk} | ${p.currentFocus || '—'} |`;
    }),
  ``,
  `---`,
  ``,
];

// High-risk callouts
if (highRisk.length > 0) {
  lines.push(`## ⛔ High-Risk Projects`, ``);
  for (const p of highRisk) {
    lines.push(`### ${p.name} (\`${p.slug}\`)`);
    lines.push(``);
    lines.push(`- Health: ${p.health} · SIL: ${p.silTotal ?? 'N/A'}/500 · Velocity: ${p.velocity ?? 'N/A'}`);
    if (p.openBlocked > 0)  lines.push(`- Blocked items: ${p.openBlocked}`);
    if (p.silSkip2 > 0)     lines.push(`- SIL:2⛔ skips: ${p.silSkip2} — must action this session`);
    if (p.blockers.length > 0) lines.push(`- Blockers: ${p.blockers.join('; ')}`);
    lines.push(`- Focus: ${p.currentFocus || '(no focus set)'}`);
    lines.push(``);
  }
  lines.push(`---`, ``);
}

// Top/bottom SIL
lines.push(`## Top Performers`, ``);
lines.push(`| # | Project | SIL | Avg3 | Velocity | Next milestone |`);
lines.push(`|---|---|---|---|---|---|`);
topSil.forEach((p, i) => {
  lines.push(`| ${i + 1} | **${p.name}** | ${p.silTotal}/500 | ${p.silAvg3 ?? '—'} | v${p.velocity ?? '?'} | ${p.nextMilestone || '—'} |`);
});
lines.push(``);

lines.push(`## Needs Attention`, ``);
lines.push(`| # | Project | SIL | Health | Open Blocked | Velocity |`);
lines.push(`|---|---|---|---|---|---|`);
bottomSil.forEach((p, i) => {
  const h = p.health === 'green' ? '🟢' : p.health === 'yellow' ? '🟡' : p.health === 'red' ? '🔴' : '·';
  lines.push(`| ${i + 1} | **${p.name}** | ${p.silTotal}/500 | ${h} | ${p.openBlocked} | v${p.velocity ?? '?'} |`);
});
lines.push(``);
lines.push(`---`, ``);

// Missing projects
if (missing.length > 0) {
  lines.push(`## ⚠ Unreadable Projects (${missing.length})`, ``);
  lines.push(`These projects are in the registry as studioOsApplied but could not be read locally:`);
  lines.push(``);
  for (const slug of missing) {
    lines.push(`- \`${slug}\` — context/PROJECT_STATUS.json not found at registered localPath`);
  }
  lines.push(``);
  lines.push(`---`, ``);
}

lines.push(
  `## Recommendations`,
  ``,
  ...(() => {
    const recs = [];
    if (totalSilSkip2 > 0) recs.push(`- ⛔ **${totalSilSkip2} SIL:2⛔ items** across portfolio — escalate to Now in next session`);
    if (highRisk.length > 0) recs.push(`- ⛔ **${highRisk.length} high-risk project(s)** require immediate attention: ${highRisk.map(p => p.slug).join(', ')}`);
    if (totalBlocked > 5) recs.push(`- ⚠ **${totalBlocked} blocked items** portfolio-wide — run \`node scripts/ops.mjs resolve-blockers\``);
    if (avgSil !== null && avgSil < 350) recs.push(`- ⚠ Portfolio avg SIL ${avgSil}/500 is below 350 — schedule dedicated improvement sessions`);
    if (missing.length > 0) recs.push(`- ⚠ **${missing.length} project(s)** missing context files — run Foundation sessions or check localPath`);
    if (recs.length === 0) recs.push('- ✓ No critical recommendations. Studio is healthy.');
    return recs;
  })(),
  ``,
  `---`,
  ``,
  `*Generated by \`scripts/run-studio-review.mjs\` · ${today} · Studio grade: ${grade} (${studioHealth}/100)*`,
  ``,
);

// ── Write output ──────────────────────────────────────────────────────────────
const outDir  = path.join(ROOT, 'docs');
const outFile = `STUDIO_REVIEW_AUTO_${month}.md`;
const outPath = path.join(outDir, outFile);
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log(`✓ Studio review → docs/${outFile}`);
console.log(`  Studio grade: ${grade} (${studioHealth}/100) · avg SIL: ${avgSil ?? 'N/A'}/500`);
console.log(`  Scanned: ${snapshots.length} projects · ${highRisk.length} high-risk · ${totalBlocked} blocked items`);
if (missing.length > 0) console.log(`  ⚠ Could not read: ${missing.join(', ')}`);

// Optional: post summary as GitHub issue comment (for CI use)
if (postIssue) {
  console.log(`  (--post-issue: integrate with CI workflow for automated reporting)`);
}
