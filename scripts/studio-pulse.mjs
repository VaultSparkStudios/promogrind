#!/usr/bin/env node
/**
 * studio-pulse.mjs — Studio Pulse daemon (v3.1)
 *
 * Polls all 25 projects from PROJECT_REGISTRY, reads their PROJECT_STATUS.json
 * (via local path where available), emits one NDJSON event line per observed
 * change to `portfolio/STUDIO_PULSE.ndjson`. Renders a circular 7-day narrative
 * buffer to `portfolio/STUDIO_PULSE.md`.
 *
 * Anomaly detector applies rules to the event stream and writes flagged items
 * to `context/FOUNDER_QUEUE.md` (via render-founder-queue.mjs).
 *
 * Usage:
 *   node scripts/studio-pulse.mjs --once        # single poll + exit
 *   node scripts/studio-pulse.mjs --watch       # poll every 15min (local)
 *   node scripts/studio-pulse.mjs --interval 60 # custom interval (seconds)
 *
 * In CI: runs once per `studio-pulse.yml` cron tick (every 15min).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { appendEvent } from './lib/studio-events.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
const NDJSON   = path.join(ROOT, 'portfolio', 'STUDIO_PULSE.ndjson');
const PULSE_MD = path.join(ROOT, 'portfolio', 'STUDIO_PULSE.md');
const STATE    = path.join(ROOT, '.ops-cache', 'pulse-state.json');

const args = process.argv.slice(2);
const ONCE = args.includes('--once') || !args.includes('--watch');
const INTERVAL_SEC = (() => {
  const i = args.indexOf('--interval');
  return i >= 0 ? parseInt(args[i + 1] || '900', 10) : 900;
})();

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function writeJson(p, v) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
}
function appendNdjson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, JSON.stringify(obj) + '\n');
}

function loadSnapshot(localPath) {
  if (!localPath) return null;
  const statusPath = path.join(localPath, 'context', 'PROJECT_STATUS.json');
  try {
    if (!fs.existsSync(statusPath)) return null;
    const s = readJson(statusPath, null);
    if (!s) return null;
    return {
      slug:         s.slug,
      name:         s.name,
      status:       s.status,
      health:       s.health,
      silScore:     s.silScore,
      silVelocity:  s.silVelocity,
      ignisScore:   s.ignisScore,
      ignisGrade:   s.ignisGrade,
      testsTotal:   s.testsTotal,
      lastUpdated:  s.lastUpdated,
      currentFocus: s.currentFocus,
      blockers:     (s.blockers || []).length,
      lastDeployStatus: s.lastDeployStatus,
    };
  } catch { return null; }
}

// ── Anomaly detector rules ───────────────────────────────────────────────────
function diff(prev, curr) {
  const events = [];
  if (!prev) return events;
  const push = (type, severity, detail) => events.push({ type, severity, slug: curr.slug, detail });

  if (prev.silScore != null && curr.silScore != null) {
    const delta = curr.silScore - prev.silScore;
    if (delta <= -15) push('sil-regression', 'high', { from: prev.silScore, to: curr.silScore, delta });
  }
  if (prev.ignisScore != null && curr.ignisScore != null) {
    const pct = (curr.ignisScore - prev.ignisScore) / prev.ignisScore;
    if (pct <= -0.05) push('ignis-drop', 'medium', { from: prev.ignisScore, to: curr.ignisScore, pct: pct.toFixed(3) });
  }
  if (prev.testsTotal != null && curr.testsTotal != null && curr.testsTotal < prev.testsTotal) {
    push('test-count-drop', 'high', { from: prev.testsTotal, to: curr.testsTotal });
  }
  if (prev.health !== curr.health) {
    push('health-change', curr.health === 'red' ? 'high' : 'low', { from: prev.health, to: curr.health });
  }
  if (prev.blockers != null && curr.blockers > prev.blockers + 1) {
    push('blocker-spike', 'medium', { from: prev.blockers, to: curr.blockers });
  }
  if (prev.lastDeployStatus === 'green' && curr.lastDeployStatus === 'red') {
    push('deploy-red', 'high', {});
  }
  return events;
}

// ── Pulse narrative renderer ─────────────────────────────────────────────────
function renderPulseMd(events7d, projects) {
  const counts = events7d.reduce((m, e) => { m[e.type] = (m[e.type] || 0) + 1; return m; }, {});
  const now = new Date().toISOString();
  const health = projects.reduce((m, p) => { m[p.health || 'unknown'] = (m[p.health || 'unknown'] || 0) + 1; return m; }, {});

  const lines = [
    `<!-- generated-by: scripts/studio-pulse.mjs v3.1 -->`,
    `<!-- generated-at: ${now} -->`,
    ``,
    `# Studio Pulse — live`,
    ``,
    `> Portfolio heartbeat. ${projects.length} projects observed. Updated every 15 min.`,
    ``,
    `## Right now`,
    ``,
    `- Green: ${health.green || 0} · Yellow: ${health.yellow || 0} · Red: ${health.red || 0} · Unknown: ${health.unknown || 0}`,
    `- Events (last 7d): ${events7d.length}`,
    ``,
    `## Event counts (last 7d)`,
    ``,
  ];
  for (const [type, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${type}** — ${n}`);
  }

  lines.push('', '## Recent events (last 20)', '');
  lines.push('| Time | Project | Type | Severity | Detail |');
  lines.push('|---|---|---|---|---|');
  for (const e of events7d.slice(-20).reverse()) {
    const d = JSON.stringify(e.detail || {}).slice(0, 50);
    lines.push(`| ${e.ts?.slice(0, 16) ?? '—'} | ${e.slug} | ${e.type} | ${e.severity} | \`${d}\` |`);
  }

  lines.push('', '## Project snapshot', '');
  lines.push('| Project | Health | SIL | IGNIS | Deploy | Blockers |');
  lines.push('|---|---|---|---|---|---:|');
  for (const p of projects.sort((a, b) => (b.silScore || 0) - (a.silScore || 0)).slice(0, 25)) {
    lines.push(`| ${p.name || p.slug} | ${p.health || '—'} | ${p.silScore || '—'} | ${p.ignisScore || '—'} | ${p.lastDeployStatus || '—'} | ${p.blockers || 0} |`);
  }

  return lines.join('\n') + '\n';
}

// ── Main poll ────────────────────────────────────────────────────────────────
async function poll() {
  const registry = readJson(REGISTRY, { projects: [] });
  const projects = registry.projects || [];
  const prev = readJson(STATE, { snapshots: {} });
  const snapshots = {};
  const events = [];
  const nowIso = new Date().toISOString();

  for (const p of projects) {
    const snap = loadSnapshot(p.localPath);
    if (!snap) continue;
    snapshots[p.slug] = snap;
    const diffs = diff(prev.snapshots?.[p.slug], snap);
    for (const ev of diffs) {
      events.push({ ts: nowIso, ...ev });
      appendNdjson(NDJSON, { ts: nowIso, ...ev });
      if (ev.severity === 'medium' || ev.severity === 'high') {
        appendEvent(ROOT, {
          type: `pulse-${ev.type}`,
          slug: ev.slug,
          source: 'studio-pulse',
          severity: ev.severity,
          signal: `${ev.slug}: ${ev.type}`,
          action: 'review anomaly in Studio Pulse',
          attemptable: false,
          requiresFounderDecision: ev.severity === 'high',
          note: JSON.stringify(ev.detail || {}).slice(0, 200)
        });
      }
    }
  }

  writeJson(STATE, { snapshots, lastPoll: nowIso });

  // Load last 7d of events for narrative
  const cutoff = Date.now() - 7 * 86400_000;
  let events7d = [];
  try {
    events7d = fs.readFileSync(NDJSON, 'utf8').split(/\r?\n/).filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean)
      .filter(e => new Date(e.ts).getTime() >= cutoff);
  } catch { /* no log yet */ }

  const md = renderPulseMd(events7d, Object.values(snapshots));
  fs.writeFileSync(PULSE_MD, md);

  console.log(`✓ Studio Pulse — ${Object.keys(snapshots).length} projects observed, ${events.length} new events this tick, ${events7d.length} total in 7d window`);
  for (const ev of events.slice(0, 5)) {
    console.log(`  • [${ev.severity}] ${ev.slug}: ${ev.type} — ${JSON.stringify(ev.detail).slice(0, 50)}`);
  }
  return events;
}

// ── Run ──────────────────────────────────────────────────────────────────────
await poll();
if (!ONCE) {
  console.log(`Pulse watch mode — polling every ${INTERVAL_SEC}s. Ctrl+C to stop.`);
  setInterval(() => { poll().catch(e => console.error('pulse error:', e.message)); }, INTERVAL_SEC * 1000);
}
