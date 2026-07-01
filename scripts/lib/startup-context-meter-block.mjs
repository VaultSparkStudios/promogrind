import fs from 'fs';
import path from 'path';
import { spawnSync } from './safe-spawn.mjs';

const DEFAULT_CONTEXT_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  'context/PROJECT_BRIEF.md',
  'context/SOUL.md',
  'context/BRAIN.md',
  'context/CURRENT_STATE.md',
  'context/DECISIONS.md',
  'context/TASK_BOARD.md',
  'context/LATEST_HANDOFF.md',
  'context/SELF_IMPROVEMENT_LOOP.md',
  'context/TRUTH_AUDIT.md',
];

function bytesOf(root, rel) {
  try {
    return fs.statSync(path.join(root, rel)).size;
  } catch {
    return 0;
  }
}

export function normalizeContextMeterPayload(payload, { agent = 'unknown', fallbackModel = '' } = {}) {
  return {
    live: true,
    usedTokens: payload.usedTokens,
    limit: payload.limit,
    pctUsed: payload.pctUsed,
    turnsToCompact: payload.turnsToCompact,
    continueCostPerTurn: payload.continueCostPerTurn,
    cacheHitRate: payload.cacheHitRate,
    recommendation: payload.recommendation,
    confidence: payload.confidence,
    agent: payload.agent || agent,
    model: payload.model || fallbackModel,
  };
}

export function buildHeuristicContextMeter({
  root,
  limit,
  agent = 'unknown',
  files = DEFAULT_CONTEXT_FILES,
}) {
  const bytes = files.reduce((sum, file) => sum + bytesOf(root, file), 0);
  const usedTokens = Math.round(bytes / 4);
  const pctUsed = limit > 0 ? usedTokens / limit : 0;
  return {
    live: false,
    usedTokens,
    limit,
    pctUsed,
    turnsToCompact: null,
    continueCostPerTurn: null,
    cacheHitRate: null,
    recommendation: pctUsed > 0.75 ? 'CONSIDER_CLOSEOUT' : 'CONTINUE',
    confidence: 'heuristic-stale',
    agent,
    model: '',
  };
}

export function loadStartupContextMeter({
  root,
  scriptsDir,
  node = process.execPath,
  agent = 'unknown',
  limit,
  runContextMeter = null,
} = {}) {
  try {
    const res = runContextMeter
      ? runContextMeter()
      : spawnSync(node, [path.join(scriptsDir, 'context-meter.mjs'), '--json'], {
          cwd: root,
          encoding: 'utf8',
          timeout: 5000,
        });
    if (res.status === 0 && res.stdout) {
      return normalizeContextMeterPayload(JSON.parse(res.stdout), { agent });
    }
  } catch {
    // Fall through to the deterministic stale heuristic.
  }
  return buildHeuristicContextMeter({ root, limit, agent });
}
export function renderStartupContextMeterBlock(meter, { row, top, bot }) {
  const limit = meter.limit || 1;
  const usedTokens = meter.usedTokens || 0;
  const pctUsedRaw = meter.pctUsed > 1 ? meter.pctUsed : meter.pctUsed * 100;
  const pctUsed = Math.max(0, Math.min(100, Math.round(pctUsedRaw)));
  const usedFraction = Math.max(0, Math.min(1, pctUsedRaw / 100));
  const fillN = Math.min(24, Math.max(0, Math.round(usedFraction * 24)));
  const bar = '█'.repeat(fillN) + '░'.repeat(24 - fillN);
  const tagIcon = meter.recommendation === 'CLOSEOUT' ? '⛔'
    : meter.recommendation === 'CONSIDER_CLOSEOUT' ? '⚠'
    : '✓';
  const liveTag = meter.confidence || (meter.live ? 'live' : 'heuristic');
  const lines = [
    top('CONTEXT METER'),
    row(`${tagIcon}  ${bar}  ${String(pctUsed).padStart(3)}% used`),
    row(`   ${usedTokens.toLocaleString()} / ${limit.toLocaleString()} tok  ·  ${meter.agent}${meter.model ? '/' + meter.model : ''}  ·  ${liveTag}`),
  ];

  if (meter.continueCostPerTurn != null) {
    const cacheLabel = meter.cacheHitRate != null ? `cache ${Math.round(meter.cacheHitRate * 100)}%` : 'cache n/a';
    const turnsLabel = meter.turnsToCompact != null && meter.turnsToCompact < 999 ? `${meter.turnsToCompact} turns to compact` : 'compact distant';
    lines.push(row(`   ~${meter.continueCostPerTurn.toLocaleString()} tok/turn  ·  ${cacheLabel}  ·  ${turnsLabel}`));
  }

  lines.push(row(`   Verdict: ${meter.recommendation}${meter.recommendation === 'CONTINUE' ? '' : '  ← act now'}`));
  lines.push(bot());
  return lines.join('\n');
}
