#!/usr/bin/env node
/**
 * render-founder-queue.mjs — Founder Queue renderer (v3.1)
 *
 * Aggregates three sources into `context/FOUNDER_QUEUE.md`:
 *   1. Studio Pulse anomalies (from portfolio/STUDIO_PULSE.ndjson, last 7d)
 *   2. TASK_BOARD "Human Action Required" items across all projects
 *   3. Cross-repo-locked items that have been deferred ≥2 sessions
 *
 * Each entry has: signal, hypothesis, recommended action, one-click command.
 * Hub Founder Queue tab reads this file.
 *
 * Usage:
 *   node scripts/render-founder-queue.mjs
 *   node scripts/render-founder-queue.mjs --json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveCapability } from './lib/secrets.mjs';
import { classifyBlocker } from './lib/blocker-rules.mjs';
import { latestDecisionMap, normalizeSignal } from './lib/founder-decisions.mjs';
import { extractSection, parseHumanItems } from './lib/task-board.mjs';
import { appendEvent } from './lib/studio-events.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
const NDJSON   = path.join(ROOT, 'portfolio', 'STUDIO_PULSE.ndjson');
const OUT      = path.join(ROOT, 'context', 'FOUNDER_QUEUE.md');

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

const jsonMode = process.argv.includes('--json');
const decisions = latestDecisionMap();

// ── Source 1: Anomalies (last 7d, severity ≥ medium) ─────────────────────────
function collectAnomalies() {
  const cutoff = Date.now() - 7 * 86400_000;
  const out = [];
  try {
    const lines = fs.readFileSync(NDJSON, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const l of lines) {
      try {
        const e = JSON.parse(l);
        if (new Date(e.ts).getTime() < cutoff) continue;
        if (e.severity !== 'medium' && e.severity !== 'high') continue;
        out.push({
          source: 'pulse',
          signal: `${e.slug}: ${e.type}`,
          severity: e.severity,
          hypothesis: hypothesisFor(e),
          action: actionFor(e),
          command: commandFor(e),
          ts: e.ts,
        });
      } catch {}
    }
  } catch { /* no pulse log yet */ }
  return out;
}

function hypothesisFor(e) {
  const type = e.type;
  switch (type) {
    case 'sil-regression':  return `Session quality dropped ${e.detail?.delta} pts. Likely scope overrun or unresolved debt.`;
    case 'ignis-drop':      return `IGNIS IQ fell ${e.detail?.pct}. Look for protocol fidelity or CDR gaps.`;
    case 'test-count-drop': return `${(e.detail?.from || 0) - (e.detail?.to || 0)} tests disappeared. Probably a deletion or build break.`;
    case 'health-change':   return `Health flipped ${e.detail?.from} → ${e.detail?.to}. Check CURRENT_STATE + last deploy.`;
    case 'blocker-spike':   return `Blockers jumped ${e.detail?.from} → ${e.detail?.to}. New external dependency surfaced.`;
    case 'deploy-red':      return `Deploy turned red. CI failing or infra issue.`;
    default:                return 'Anomaly detected — needs review.';
  }
}

function actionFor(e) {
  switch (e.type) {
    case 'sil-regression':  return `Review last session handoff; split next session scope; run brainstorm-propose.`;
    case 'ignis-drop':      return `Re-score project and compare to baseline; check for missing context files.`;
    case 'test-count-drop': return `Run test suite locally; check git log for deletions.`;
    case 'health-change':   return `Read PROJECT_STATUS.json currentFocus; address top blocker.`;
    case 'blocker-spike':   return `Run check-phantom-blockers + check-secrets; resolve autonomously if possible.`;
    case 'deploy-red':      return `Check CI logs + latest commit.`;
    default:                return 'Review pulse log entry.';
  }
}

function commandFor(e) {
  switch (e.type) {
    case 'ignis-drop':      return `node scripts/ops.mjs rescore --project ${e.slug}`;
    case 'test-count-drop': return `cd $(jq -r '.projects[] | select(.slug==\"${e.slug}\") | .localPath' portfolio/PROJECT_REGISTRY.json) && npm test`;
    case 'blocker-spike':   return `node scripts/ops.mjs phantom-check && node scripts/ops.mjs check-secrets`;
    case 'deploy-red':      return `node scripts/ops.mjs ci-health --project ${e.slug}`;
    default:                return `node scripts/ops.mjs pulse --once`;
  }
}

// ── Source 2: Cross-project Human Action Required ────────────────────────────
function collectHumanItems() {
  const registry = readJson(REGISTRY, { projects: [] });
  const out = [];
  // Studio Ops TASK_BOARD (always read)
  const board = readText(path.join(ROOT, 'context', 'TASK_BOARD.md'));
  for (const item of parseHumanItems(board)) {
    const title = `${item.title} — ${item.description}`.slice(0, 90);
    out.push({
      source: 'human-required',
      signal: `studio-ops: ${title}`,
      severity: 'medium',
      hypothesis: 'Human action required to unblock.',
      action: inferAutoAction(title),
      command: inferCommand(title),
    });
  }
  // Scan other projects where localPath exists
  for (const p of (registry.projects || [])) {
    if (!p.localPath) continue;
    const board = readText(path.join(p.localPath, 'context', 'TASK_BOARD.md'));
    if (!board) continue;
    for (const item of parseHumanItems(board).slice(0, 3)) {
      const title = `${item.title} — ${item.description}`.slice(0, 90);
      out.push({ source: 'human-required', signal: `${p.slug}: ${title}`, severity: 'medium', hypothesis: 'Human action required.', action: inferAutoAction(title), command: inferCommand(title) });
    }
  }
  return out;
}

function inferAutoAction(title) {
  const info = classifyBlocker(title);
  if (info.capabilities.length > 0) {
    return `Mandatory preflight: ${info.capabilities.join(', ')} secrets discovery, then elevated/admin probe. ${info.humanAction}`;
  }
  return info.humanAction;
}

function inferCommand(title) {
  const info = classifyBlocker(title);
  if (info.probeCommands.length > 0) return info.probeCommands.join(' && ');
  return 'node scripts/ops.mjs blocker-preflight';
}

// ── Assemble ─────────────────────────────────────────────────────────────────
const anomalies = collectAnomalies();
const human     = collectHumanItems();
const all       = [...anomalies, ...human];

// Auto-resolve: if capability is already satisfied in secrets, drop the human item
const resolvedAuto = [];
const remaining   = [];
const handled     = [];
for (const item of all) {
  const latestDecision = decisions.get(normalizeSignal(item.signal));
  if (latestDecision && ['yes', 'no', 'defer'].includes(latestDecision.decision)) {
    handled.push({ ...item, latestDecision });
    continue;
  }
  if (item.source === 'human-required') {
    const info = classifyBlocker(item.signal);
    let autoResolved = false;
    for (const capability of info.capabilities) {
      const res = resolveCapability(capability);
      if (res.ok) {
        resolvedAuto.push({ ...item, resolution: `Auto-resolved: ${capability} capability is READY in secrets/.` });
        autoResolved = true;
        break;
      }
    }
    if (autoResolved) continue;
  }
  remaining.push(item);
}

if (jsonMode) {
  console.log(JSON.stringify({ queue: remaining, handled, autoResolved: resolvedAuto }, null, 2));
  process.exit(0);
}

// ── Render MD ────────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const md = [
  `<!-- generated-by: scripts/render-founder-queue.mjs v3.1 -->`,
  `<!-- generated-at: ${today} -->`,
  ``,
  `# Founder Queue`,
  ``,
  `> Items needing Studio Owner attention. Aggregated from Studio Pulse anomalies + cross-project "Human Action Required". Auto-resolved items are logged at the bottom.`,
  ``,
  `**${remaining.length} open** · ${handled.length} handled by decision · ${resolvedAuto.length} auto-resolved · updated ${today}`,
  ``,
  `---`,
  ``,
];

for (const item of remaining) {
  md.push(`## ${iconFor(item.severity)} ${item.signal}`);
  md.push('');
  md.push(`- **Hypothesis:** ${item.hypothesis}`);
  md.push(`- **Recommended action:** ${item.action}`);
  const latestDecision = decisions.get(normalizeSignal(item.signal));
  if (latestDecision) {
    md.push(`- **Latest decision:** ${latestDecision.decision.toUpperCase()} · ${latestDecision.ts.slice(0, 10)}${latestDecision.note ? ` · ${latestDecision.note}` : ''}`);
  }
  if (item.command) md.push('', '```bash', item.command, '```');
  md.push('');
  md.push('**Decision:** [ ] Yes · [ ] No · [ ] Defer · [ ] More info');
  md.push('');
  md.push('---');
  md.push('');
}

if (handled.length > 0) {
  md.push('## ✓ Decision-handled this run');
  md.push('');
  for (const item of handled) {
    md.push(`- **${item.signal}** — ${item.latestDecision.decision.toUpperCase()} · ${item.latestDecision.ts.slice(0, 10)}${item.latestDecision.note ? ` · ${item.latestDecision.note}` : ''}`);
  }
  md.push('');
}

if (resolvedAuto.length > 0) {
  md.push('## ✓ Auto-resolved this run');
  md.push('');
  for (const r of resolvedAuto) {
    md.push(`- **${r.signal}** — ${r.resolution}`);
  }
  md.push('');
}

function iconFor(sev) { return sev === 'high' ? '⛔' : sev === 'medium' ? '⚠' : '💡'; }

fs.writeFileSync(OUT, md.join('\n'));
console.log(`✓ Founder Queue → context/FOUNDER_QUEUE.md  (${remaining.length} open · ${resolvedAuto.length} auto-resolved)`);

if (!jsonMode && (remaining.length > 0 || resolvedAuto.length > 0)) {
  appendEvent(ROOT, {
    type: 'founder-queue-refreshed',
    slug: 'studio-ops',
    source: 'render-founder-queue',
    severity: remaining.length >= 5 ? 'medium' : 'low',
    signal: `studio-ops: founder queue refreshed (${remaining.length} open)`,
    action: remaining.length > 0 ? 'review founder queue' : null,
    attemptable: false,
    requiresFounderDecision: remaining.length > 0,
    note: `open=${remaining.length} auto-resolved=${resolvedAuto.length}`
  });
}
