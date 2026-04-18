#!/usr/bin/env node
/**
 * render-launch-momentum.mjs
 *
 * Launch momentum decay tracker.
 * Finds all deployed-but-unannounced projects, estimates days since
 * last meaningful activity, computes urgency, and surfaces a ranked
 * action list to clear the announcement backlog.
 *
 * Usage:
 *   node scripts/render-launch-momentum.mjs
 *   node scripts/ops.mjs launch-momentum
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { appendEvent } from './lib/studio-events.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'docs', 'LAUNCH_MOMENTUM.md');

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function readText(p)     { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function daysBetween(a, b) { try { return Math.floor((new Date(b) - new Date(a)) / 86400000); } catch { return 0; } }

const today    = new Date().toISOString().slice(0, 10);
const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
const projects  = registry.projects ?? [];

// ── Filter to deployed-unannounced ────────────────────────────────────────────
const unannounced = projects.filter(p =>
  p.launchStatus === 'deployed-unannounced' ||
  (p.vaultStatus === 'SPARKED' && p.launchStatus !== 'announced')
);

// ── Try to get last git activity for each project ─────────────────────────────
function getLastPushDate(localPath) {
  if (!localPath) return null;
  try {
    const norm = localPath.replace(/\\/g, '/');
    const res  = spawnSync('git', ['-C', norm, 'log', '-1', '--format=%ci'], {
      encoding: 'utf8', timeout: 5000,
    });
    if (res.status !== 0 || !res.stdout) return null;
    return res.stdout.trim().slice(0, 10); // YYYY-MM-DD
  } catch { return null; }
}

// Urgency tiers by days waiting
function urgency(days) {
  if (days === null || days === undefined) return { tier: 'unknown', icon: '?' };
  if (days >= 30) return { tier: 'CRITICAL', icon: '🔥' };
  if (days >= 14) return { tier: 'HIGH',     icon: '⚡' };
  if (days >= 7)  return { tier: 'MEDIUM',   icon: '⚠' };
  return { tier: 'LOW', icon: '•' };
}

const enriched = unannounced.map(p => {
  const lastPush   = getLastPushDate(p.localPath);
  const daysSince  = lastPush ? daysBetween(lastPush, today) : null;
  const urg        = urgency(daysSince);
  const liveUrl    = p.liveUrl ?? p.stagingUrl ?? null;
  const type       = p.type ?? 'unknown';
  return { ...p, lastPush, daysSince, ...urg, liveUrl, type };
}).sort((a, b) => (b.daysSince ?? 0) - (a.daysSince ?? 0));

// ── Revenue impact estimate ────────────────────────────────────────────────────
const revProjects = enriched.filter(p => p.revenueModel && p.revenueModel !== 'none');
const criticalCount = enriched.filter(p => p.tier === 'CRITICAL').length;
const highCount     = enriched.filter(p => p.tier === 'HIGH').length;

// ── Per-project action guidance ────────────────────────────────────────────────
function actionGuide(p) {
  if (p.type === 'game') return `Take screenshots → post to X + Reddit (r/gaming, niche subs) · ~30min`;
  if (p.type === 'saas' || p.type === 'app') return `Post to ProductHunt + relevant subreddits · set up launch checklist`;
  if (p.type === 'tool' || p.type === 'library') return `Post to HackerNews (Show HN) + npm/GitHub announcement`;
  return `Announce via X, Reddit, Discord · 30–60 min`;
}

// ── Write output ──────────────────────────────────────────────────────────────
const overallUrgencyTier = criticalCount > 0 ? 'CRITICAL' :
                           highCount > 0 ? 'HIGH' : enriched.length > 0 ? 'MEDIUM' : 'CLEAR';

const lines = [
  `# Launch Momentum`,
  ``,
  `> Generated: ${today} | Unannounced: ${enriched.length} | Overall urgency: ${overallUrgencyTier}`,
  ``,
  `---`,
  ``,
  `## Status`,
  ``,
  `| Project | Vault | Days Waiting | Urgency | Live URL |`,
  `|---|---|---:|---|---|`,
  ...enriched.map(p => {
    const days = p.daysSince != null ? `${p.daysSince}d` : '?';
    const url  = p.liveUrl ? `[link](${p.liveUrl})` : '—';
    return `| **${p.name ?? p.slug}** | ${p.vaultStatus ?? '—'} | ${days} | ${p.icon} ${p.tier} | ${url} |`;
  }),
  ...(enriched.length === 0 ? ['| — | — | — | ✓ All announced | — |'] : []),
  ``,
  `---`,
  ``,
  `## Recommended Actions (priority order)`,
  ``,
  ...enriched.map((p, i) => [
    `### ${i + 1}. ${p.icon} ${p.name ?? p.slug} (${p.daysSince != null ? `${p.daysSince} days` : 'age unknown'})`,
    ``,
    `${actionGuide(p)}`,
    ...(p.vaultStatus !== 'SPARKED'
      ? [``, `⚠ **Requires SPARKED approval** from Studio Owner before announce.`]
      : []),
    ...(p.liveUrl ? [``, `Live: ${p.liveUrl}`] : []),
    ``,
  ]).flat(),
  ...(enriched.length === 0 ? ['All deployed projects are announced. Launch backlog clear. ✓'] : []),
  `---`,
  ``,
  `## Revenue Impact`,
  ``,
  enriched.length === 0
    ? `No unannounced projects. Revenue surface fully exploited.`
    : [
        `${enriched.length} unannounced project(s) represent **unrealized launch traction**.`,
        ``,
        revProjects.length > 0
          ? `${revProjects.map(p => p.name ?? p.slug).join(', ')} — monetization configured but not announced.`
          : `None have revenue models configured yet — announcement still builds audience.`,
      ].join('\n'),
  ``,
  `---`,
  ``,
  `*Generated by \`scripts/render-launch-momentum.mjs\` · run \`node scripts/ops.mjs launch-momentum\` to refresh*`,
];

fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`✓ Launch momentum → docs/LAUNCH_MOMENTUM.md`);
console.log(`  ${enriched.length} unannounced project(s) · ${criticalCount} CRITICAL · ${highCount} HIGH`);
if (enriched.length > 0) {
  enriched.forEach(p => console.log(`  ${p.icon} ${(p.name ?? p.slug).padEnd(25)} ${p.daysSince != null ? p.daysSince + 'd' : '?d'} · ${p.tier}`));
}

for (const p of enriched) {
  if (p.tier !== 'CRITICAL' && p.tier !== 'HIGH') continue;
  appendEvent(ROOT, {
    type: 'launch-decay',
    slug: p.slug,
    source: 'launch-momentum',
    severity: p.tier === 'CRITICAL' ? 'high' : 'medium',
    signal: `${p.slug}: deployed ${p.daysSince ?? '?'}d unannounced`,
    action: 'announce project / promote launch',
    attemptable: p.vaultStatus === 'SPARKED',
    requiresFounderDecision: p.vaultStatus !== 'SPARKED',
    note: actionGuide(p)
  });
}
