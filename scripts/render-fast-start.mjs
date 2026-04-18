#!/usr/bin/env node
/**
 * render-fast-start.mjs
 *
 * Token-light startup surface for founder-scale sessions. Reads only compact,
 * compiled, or header-level sources so agents can decide whether to continue,
 * /go, or open a fresh terminal before loading heavy context files.
 */

import fs from 'node:fs';
import path from 'node:path';
import { contextWindowForAgent } from './lib/model-router.mjs';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const stdoutOnly = args.has('--stdout') || asJson;

function readText(rel, fallback = '') {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return fallback; }
}
function readJson(rel, fallback = null) {
  try { return JSON.parse(readText(rel)); } catch { return fallback; }
}
function parseLock() {
  const text = readText('context/.session-lock');
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
function bytesOf(rel) {
  try { return fs.statSync(path.join(ROOT, rel)).size; } catch { return 0; }
}
function estimateContextMeter() {
  const lock = parseLock();
  const agent = lock.agent || 'unknown';
  const limit = contextWindowForAgent(agent);
  const model = agent === 'claude-code' ? 'opus-1m' : agent === 'codex' ? 'codex-1m' : 'default';
  const files = [
    'AGENTS.md', 'CLAUDE.md', 'context/PROJECT_BRIEF.md', 'context/SOUL.md',
    'context/BRAIN.md', 'context/CURRENT_STATE.md', 'context/DECISIONS.md',
    'context/TASK_BOARD.md', 'context/LATEST_HANDOFF.md',
    'context/SELF_IMPROVEMENT_LOOP.md', 'context/TRUTH_AUDIT.md',
  ];
  const ctxBytes = files.reduce((sum, file) => sum + bytesOf(file), 0);
  const usedTokens = Math.round(ctxBytes / 4);
  const remainingTokens = limit - usedTokens;
  const pctUsed = usedTokens / limit;
  const cacheHitRate = 0.5;
  const continueCostPerTurn = Math.round(usedTokens * (1 - cacheHitRate));
  const freshSessionBootstrap = usedTokens;
  const breakEvenTurns = continueCostPerTurn > 0 ? Math.ceil(freshSessionBootstrap / continueCostPerTurn) : null;
  let recommendation = 'CONTINUE';
  let reason = `${(pctUsed * 100).toFixed(0)}% used · ${remainingTokens.toLocaleString()} tokens remaining`;
  if (pctUsed >= 0.95) {
    recommendation = 'CLOSEOUT';
    reason = 'context effectively exhausted — continuation risks truncation';
  } else if (pctUsed >= 0.75) {
    recommendation = 'CONSIDER_CLOSEOUT';
    reason = `context ${(pctUsed * 100).toFixed(0)}% used`;
  }
  return {
    agent,
    model,
    limit,
    usedTokens,
    remainingTokens,
    pctUsed: +(pctUsed * 100).toFixed(1),
    cacheHitRate,
    continueCostPerTurn,
    freshSessionBootstrap,
    breakEvenTurns,
    recommendation,
    reason,
    estimated: true,
  };
}
function rollingHeader() {
  const text = readText('context/SELF_IMPROVEMENT_LOOP.md');
  const m = text.match(/<!-- rolling-status-start -->([\s\S]*?)<!-- rolling-status-end -->/);
  return (m?.[1] || '').trim().split(/\r?\n/).filter(Boolean).slice(0, 7);
}
function actionSummary() {
  const text = readText('context/ACTION_QUEUE.md');
  const exec = text.match(/## Execute Now \((\d+)\)/)?.[1] ?? '0';
  const tryFirst = text.match(/## Try Before Escalating \((\d+)\)/)?.[1] ?? '0';
  const advisory = text.match(/## Advisory Drift \((\d+)\)/)?.[1] ?? '0';
  const first = text.match(/## Execute Now[\s\S]*?\n- \*\*(.*?)\*\* — (.*)/);
  return {
    executeNow: Number(exec),
    tryBeforeEscalating: Number(tryFirst),
    advisoryDrift: Number(advisory),
    firstAction: first ? `${first[1]} — ${first[2]}`.slice(0, 220) : null,
  };
}
function externalSignalSummary() {
  const text = readText('portfolio/EXTERNAL_SIGNAL_LOG.md');
  const entries = text.split(/^### /m).slice(1);
  if (!entries.length) return { count: 0, latest: null };
  const latest = entries[entries.length - 1].split(/\r?\n/)[0]?.trim() || null;
  return { count: entries.length, latest };
}

const status = readJson('context/PROJECT_STATUS.json', {});
const genius = readJson('.cache/genius-list.json', null) || readJson('context/GENIUS_LIST.json', null);
const geniusItems = Array.isArray(genius?.items)
  ? genius.items
  : Array.isArray(genius?.list?.ranked)
    ? genius.list.ranked
    : Array.isArray(genius?.list)
      ? genius.list
      : [];
const sessions = readJson('portfolio/compiled/SESSION_ORCHESTRATOR.json', null) || readJson('portfolio/ACTIVE_SESSIONS.json', null);
const meter = estimateContextMeter();
const actions = actionSummary();
const externalSignals = externalSignalSummary();

const report = {
  generatedAt: new Date().toISOString(),
  project: {
    slug: status.slug || 'studio-ops',
    name: status.name || 'Studio Ops',
    mode: status.sessionMode || 'unknown',
    health: status.health || 'unknown',
    projectHealthScore: status.projectHealthScore ?? null,
    silScore: status.silScore ?? null,
    focus: status.currentFocus || '',
    nextMilestone: status.nextMilestone || '',
  },
  context: meter,
  rollingStatus: rollingHeader(),
  actionQueue: actions,
  externalSignals,
  genius: {
    cached: !!genius,
    count: geniusItems.length,
    top: geniusItems.slice(0, 5).map((item) => item.title || item.item || item.name || String(item).slice(0, 120)),
  },
  sessions: {
    active: sessions?.activeSessions ?? sessions?.active?.length ?? sessions?.sessions?.length ?? 0,
    stale: sessions?.staleSessions ?? sessions?.stale ?? 0,
    collisions: sessions?.collisions?.length ?? sessions?.conflicts ?? 0,
    unknownAgent: Array.isArray(sessions?.sessions)
      ? sessions.sessions.filter((s) => !s.agent || s.agent === 'unknown').length
      : 0,
  },
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const lines = [];
lines.push('FAST START · Studio Ops');
lines.push(`Generated: ${report.generatedAt}`);
lines.push(`Mode: ${report.project.mode} · Health: ${report.project.health}`);
lines.push(`Scores: project ${report.project.projectHealthScore ?? '?'} /100 · SIL ${report.project.silScore ?? '?'}`);
lines.push(`Context: ${meter ? `${meter.pctUsed}% used · ${meter.recommendation} · ${meter.remainingTokens?.toLocaleString?.() || meter.remainingTokens} left` : 'unavailable'}`);
lines.push(`Sessions: ${report.sessions.active} active · ${report.sessions.stale} stale · ${report.sessions.collisions} collisions · ${report.sessions.unknownAgent} unknown-agent`);
lines.push(`Queue: ${actions.executeNow} execute-now · ${actions.tryBeforeEscalating} try-before-escalating · ${actions.advisoryDrift} advisory`);
if (actions.firstAction) lines.push(`First action: ${actions.firstAction}`);
if (externalSignals.latest) lines.push(`External signals: ${externalSignals.count} logged · ${externalSignals.latest}`);
lines.push('');
lines.push('Rolling status:');
for (const line of report.rollingStatus) lines.push(`  ${line}`);
lines.push('');
lines.push(`Genius cache: ${report.genius.cached ? `${report.genius.count} item(s)` : 'missing'}`);
for (const [idx, item] of report.genius.top.entries()) lines.push(`  ${idx + 1}. ${item}`);

const output = `${lines.join('\n')}\n`;
if (!stdoutOnly) {
  const target = path.join(ROOT, 'docs', 'FAST_START.md');
  fs.writeFileSync(target, output);
  console.log(`✓ Fast start → docs/FAST_START.md`);
}
process.stdout.write(output);
