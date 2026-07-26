#!/usr/bin/env node
/**
 * render-startup-brief.mjs  (v2.8)
 *
 * Pre-renders the next session's startup brief to docs/STARTUP_BRIEF.md.
 * v2.8: genome dimension alert, entropy signal, velocity history bar.
 * v2.7: box-drawing UI, SIL category bars, CDR gap detection,
 *       protocol version drift detection, revenue freshness signal,
 *       embedded genius hit list (calls generate-genius-list.mjs --brief).
 *
 * Usage:
 *   node scripts/render-startup-brief.mjs
 *   node scripts/ops.mjs startup-brief
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from './lib/safe-spawn.mjs';
import { renderTitleHeader, renderLastCompleted, renderTestItNow } from './lib/brief-blocks.mjs';
import { renderStartupScoreBlock } from './lib/startup-score-block.mjs';
import { parseUnifiedItems } from './lib/task-board.mjs';
import { loadIgnisInsight } from './lib/ignis-insight.mjs';
import { loadStartupContextMeter, renderStartupContextMeterBlock } from './lib/startup-context-meter-block.mjs';
import { loadPortfolioTaskBoardBlock, renderFounderUnlocksBlock, renderOrchestratorBlock } from './lib/startup-orchestrator-blocks.mjs';
import { renderExecutionPlanBlock, renderExternalSignalsBlock, renderHumanPressureBlock, renderIgnisInsightBlock, renderMomentumMeterBlock, renderSilForecastBlock } from './lib/startup-summary-blocks.mjs';
import { writeStartupBriefWithTelemetry } from './lib/startup-brief-output.mjs';
import { loadProvenanceMap } from './classify-warning-provenance.mjs';
import { isWarning } from './lib/doctor-predicates.mjs';
import { sparkline as _sparkline } from './lib/visual-blocks.mjs';
import { BLOCKED_STATUSES_CORE } from './lib/shared-policies.mjs';
import { classifyRatioSnapshot, resolveProjectProfile, signalIcon, SIGNAL_STATE } from './lib/signal-state.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'docs', 'STARTUP_BRIEF.md');
const node = process.execPath;

if (process.argv.includes('--v5') || process.env.BRIEF_V5 === '1') {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(node, [path.join(__dirname, 'render-startup-brief-v5.mjs'), ...process.argv.slice(2).filter(a => a !== '--v5')], { stdio: 'inherit', cwd: root });
  process.exit(r.status ?? 0);
}

const W  = 62; // inner box width (content between ║  and  ║)

if (!process.env.STUDIO_BRIEF_NO_DOCTOR_FIX) {
  try {
    spawnSync(process.execPath, [path.join(__dirname, 'ops.mjs'), 'doctor', '--fix', '--update-json', '--quiet'], {
      stdio: 'ignore', timeout: 30000,
    });
  } catch { /* non-fatal */ }
}

function renderProfileLensHeader(status) {
  try {
    const p = readJson(path.join(root, '.cache', 'project-profile.json'), null);
    const profile = resolveProjectProfile(status, p || {});
    const line = `Profile · ${profile.medium} · ${profile.stage} · source=${profile.source}`;
    return [top('PROJECT PROFILE'), row(line), bot()].join('\n');
  } catch { return ''; }
}

function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function daysBetween(a, b) { try { return Math.floor((new Date(b) - new Date(a)) / 86400000); } catch { return 999; } }
function lockValue(key) {
  const lock = readText(path.join(root, 'context', '.session-lock'));
  return lock.match(new RegExp(`^${key}:\\s*(\\S+)`, 'm'))?.[1] ?? '';
}

async function loadAllFiles(filePaths) {
  return Promise.all(
    filePaths.map(({ key, path: p, json: isJson }) =>
      new Promise(resolve => {
        fs.readFile(p, 'utf8', (err, data) => {
          if (err || !data) { resolve({ key, value: isJson ? {} : '' }); return; }
          if (isJson) {
            try { resolve({ key, value: JSON.parse(data) }); }
            catch { resolve({ key, value: {} }); }
          } else {
            resolve({ key, value: data });
          }
        });
      })
    )
  );
}

const FILE_MANIFEST = [
  { key: 'status',    path: path.join(root, 'context', 'PROJECT_STATUS.json'),        json: true  },
  { key: 'sil',       path: path.join(root, 'context', 'SELF_IMPROVEMENT_LOOP.md'),   json: false },
  { key: 'taskBoard', path: path.join(root, 'context', 'TASK_BOARD.md'),              json: false },
  { key: 'handoff',   path: path.join(root, 'context', 'LATEST_HANDOFF.md'),          json: false },
  { key: 'genome',    path: path.join(root, 'context', 'GENOME_HISTORY.json'),        json: true  },
  { key: 'state',     path: path.join(root, 'context', 'STATE_VECTOR.json'),          json: true  },
  { key: 'cdr',       path: path.join(root, 'docs', 'CREATIVE_DIRECTION_RECORD.md'),  json: false },
  { key: 'sessionPlan', path: path.join(root, 'docs', 'SESSION_PLAN.md'),             json: false },
  { key: 'startMd',  path: path.join(root, 'prompts', 'start.md'),                    json: false },
  { key: 'startTpl', path: path.join(root, 'docs', 'templates', 'project-system', 'START_PROMPT.template.md'), json: false },
  { key: 'registry', path: path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'),    json: true  },
  { key: 'revSig',   path: path.join(root, 'portfolio', 'REVENUE_SIGNALS.md'),       json: false },
  { key: 'doctorOut', path: path.join(root, 'context', 'PROJECT_STATUS.json'),       json: true  }, // same as status, reuse
];

const startMs = Date.now();
const loaded = await loadAllFiles(FILE_MANIFEST);
const fileCache = Object.fromEntries(loaded.map(({ key, value }) => [key, value]));
process.stderr.write(`  ⚡ Parallel file load: ${Date.now() - startMs}ms\n`);

function extractBetween(content, start, end) {
  const s = content.indexOf(start); const e = content.indexOf(end);
  if (s === -1 || e === -1 || e <= s) return '';
  return content.slice(s + start.length, e).trim();
}
function extractSection(content, heading) {
  const parts = content.split(/^## /m);
  const match = parts.find(p => p.startsWith(heading));
  if (!match) return '';
  const nl = match.indexOf('\n');
  return nl === -1 ? '' : match.slice(nl + 1);
}

function pad(s, w) { const str = String(s ?? ''); return str.length >= w ? str.slice(0, w) : str + ' '.repeat(w - str.length); }
function row(content) { return `║  ${pad(content, W)}  ║`; }
function blank() { return `║  ${' '.repeat(W)}  ║`; }
function top(title) {
  const t = title ? `══ ${title} ` : '';
  return '╔' + t + '═'.repeat(Math.max(1, W + 2 - t.length)) + '╗';
}
function bot() { return '╚' + '═'.repeat(W + 2) + '╝'; }

function bar10(score) {
  const n = Math.min(10, Math.max(0, Math.round((score ?? 0) / 10)));
  return '█'.repeat(n) + '░'.repeat(10 - n);
}
function bar24(total, max = 1000) {
  const n = Math.min(24, Math.max(0, Math.floor((total ?? 0) / max * 24)));
  return '█'.repeat(n) + '░'.repeat(24 - n);
}

const status      = readJson(path.join(root, 'context', 'PROJECT_STATUS.json'), {});
const taskBoard   = readText(path.join(root, 'context', 'TASK_BOARD.md'));
const handoff     = readText(path.join(root, 'context', 'LATEST_HANDOFF.md'));
const sil         = readText(path.join(root, 'context', 'SELF_IMPROVEMENT_LOOP.md'));
const truth       = readText(path.join(root, 'context', 'TRUTH_AUDIT.md'));
const csmd        = readText(path.join(root, 'context', 'CURRENT_STATE.md'));
const sessionPlan = readText(path.join(root, 'docs', 'SESSION_PLAN.md'));
const cdr         = readText(path.join(root, 'docs', 'CREATIVE_DIRECTION_RECORD.md'));
const revSig      = readText(path.join(root, 'portfolio', 'REVENUE_SIGNALS.md'));
const complianceHistory = readJson(path.join(root, 'context', 'COMPLIANCE_HISTORY.json'), { snapshots: [] });
const intentPlan  = readText(path.join(root, 'context', 'SESSION_INTENT_PLAN.md'));
const humanPressure = readJson(path.join(root, 'portfolio', 'compiled', 'HUMAN_ACTION_PRESSURE.json'), { items: [] });

const meterAgent = lockValue('agent') || 'unknown';

const meter = loadStartupContextMeter({
  root,
  scriptsDir: __dirname,
  node,
  agent: meterAgent,
  limit: status.modelTierCtxLimit || 1000000,
});
const meterUsed = meter.usedTokens;
const meterRemaining = Math.max(0, meter.limit - meterUsed);
const estimatedItemsFit = Math.max(0, Math.floor(meterRemaining / 100000));

const silHeader = extractBetween(sil, '<!-- rolling-status-start -->', '<!-- rolling-status-end -->');

const silTotalMatch = silHeader.match(/Total:\s*(\d+)\/(\d+)/);
let silTotal        = parseInt(silTotalMatch?.[1] ?? '') || 0;
let silMax          = parseInt(silTotalMatch?.[2] ?? '') || status.silMax || 1000;
let velocity        = parseInt(silHeader.match(/Velocity:\s*(\d+)/)?.[1] ?? '') || 0;
const sparkline     = silHeader.match(/Sparkline[^:]*:\s*([▁▂▃▄▅▆▇█ ]+)/)?.[1]?.trim() ?? '';
const avg3Raw       = parseFloat(silHeader.match(/Avgs — 3:\s*([\d.]+)/)?.[1] ?? '') || null;
const runwayRaw     = silHeader.match(/[Mm]omentum runway:\s*([^|]+)/)?.[1]?.trim()
                   ?? silHeader.match(/Runway:\s*([^|]+)/)?.[1]?.trim()
                   ?? 'unknown';
const intentRate    = silHeader.match(/Intent rate:\s*([^\n|]+)/)?.[1]?.trim() ?? 'unknown';
const lastSessionStr = silHeader.match(/Last session:\s*(.+)/)?.[1]?.trim() ?? '';
const debtRaw       = silHeader.match(/Debt:\s*([↑↓→])/)?.[1] ?? '→';
const velTrend      = silHeader.match(/Velocity trend:\s*([↑↓→])/)?.[1] ?? '';

const cat3 = {};
const cat3Match = silHeader.match(/3-session:\s*Dev ([\d.]+)\s*\|\s*Align ([\d.]+)\s*\|\s*Momentum ([\d.]+)\s*\|\s*Engage ([\d.]+)\s*\|\s*Process ([\d.]+)/);
if (cat3Match) {
  cat3.dev = parseFloat(cat3Match[1]);
  cat3.align = parseFloat(cat3Match[2]);
  cat3.momentum = parseFloat(cat3Match[3]);
  cat3.engage = parseFloat(cat3Match[4]);
  cat3.process = parseFloat(cat3Match[5]);
}

const allSilEntries = [...sil.matchAll(/##[^\n]*?\bSession\s+(\d+)\b[^\n]*\n([\s\S]*?)(?=\n##\s|$)/g)]
  .map(m => ({ session: parseInt(m[1], 10), header: m[0].split('\n')[0], body: m[2] ?? '' }))
  .sort((a, b) => b.session - a.session);

const silMaxSession = allSilEntries.length ? allSilEntries[0].session : null;

const lastEntry = (allSilEntries.find(e => /\|\s*Dev Health\s*\|/i.test(e.body))?.body)
               ?? (allSilEntries[0]?.body ?? '');

function entryTotal(e) {
  const inline = e.header.match(/Total:\s*(\d+)\/(\d+)/);
  const body   = e.body.match(/Total:\s*(\d+)\/(\d+)/);
  const mt = inline ?? body;
  return mt ? { total: parseInt(mt[1], 10), max: parseInt(mt[2], 10) } : null;
}
function entryVelocity(e) {
  const m = (e.header + '\n' + e.body).match(/Velocity:\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}
const latestScored = allSilEntries.find(e => entryTotal(e) !== null) ?? null;

if (latestScored) {
  const t = entryTotal(latestScored);
  if (t) { silTotal = t.total; silMax = t.max; }
  const v = entryVelocity(latestScored);
  if (v != null) velocity = v;
}
if (!silTotal && status.silScore) { silTotal = status.silScore; silMax = status.silMax || 1000; }
const silStreak = status.silStreak ?? 0;  // S202: consecutive max-score sessions
function parseScore(label) {
  const m = lastEntry.match(new RegExp(`\\|\\s*${label}(?:\\s*\\([^)]*\\))?\\s*\\|\\s*(\\d+)`, 'i'));
  return m ? parseInt(m[1]) : null;
}
const lastDev      = parseScore('Dev Health') ?? cat3.dev ?? 0;
const lastAlign    = parseScore('Creative Alignment') ?? cat3.align ?? 0;
const lastMomentum = parseScore('Momentum') ?? cat3.momentum ?? 0;
const lastEngage   = parseScore('Engagement') ?? cat3.engage ?? 0;
const lastProcess  = parseScore('Process Quality') ?? cat3.process ?? 0;

function trend(last, avg) {
  if (!last || !avg) return '→';
  const delta = last - avg;
  return delta >= 2 ? '↑' : delta <= -2 ? '↓' : '→';
}

function parseCategoryHistory(label) {
  const series = [];
  for (const entry of allSilEntries) {
    const m = entry.body.match(new RegExp(`\\|\\s*${label}(?:\\s*\\([^)]*\\))?\\s*\\|\\s*(\\d+)`, 'i'));
    if (m) series.push(parseInt(m[1], 10));
  }
  return series.reverse().slice(-8);  // oldest → newest, last 8
}
const spark = (values, max = 100) => _sparkline(values, { max, min: 0 });
const catHistory = {
  dev:      parseCategoryHistory('Dev Health'),
  align:    parseCategoryHistory('Creative Alignment'),
  momentum: parseCategoryHistory('Momentum'),
  engage:   parseCategoryHistory('Engagement'),
  process:  parseCategoryHistory('Process Quality'),
};
const v3Cats = status.silCategoriesV3 || {};
const lastCoherence  = v3Cats.crossRepoCoherence ?? 0;
const lastSecurity   = v3Cats.securityPosture ?? 0;
const lastEcosystem  = v3Cats.ecosystemIntegration ?? 0;
const lastCapital    = v3Cats.capitalEfficiency ?? 0;
const lastAutomation = v3Cats.automationCoverage ?? 0;

const today = new Date().toISOString().slice(0, 10);
const currentSession = (silMaxSession ?? status.currentSession ?? 62) + 1;
const intentPct = parseInt(String(intentRate).match(/\\d+/)?.[0] ?? '', 10) || null;
const streak = 0;
const ctxUpdated     = csmd.match(/^Last updated:\s*(\d{4}-\d{2}-\d{2})/m)?.[1] ?? null;
const ctxAge         = ctxUpdated ? daysBetween(ctxUpdated, today) : '?';
const scopeCap       = velocity > 0 ? Math.floor(velocity * 1.5) : null;

const lastSilDateMatch = lastSessionStr.match(/(\d{4}-\d{2}-\d{2})/);
const lastSilDate = lastSilDateMatch?.[1] || null;
const candidateDates = [
  lastSilDate,
  status.lastUpdated,
  status.lastHandoffDate,
  status.silLastSession,
].filter(Boolean);
const freshestDate = candidateDates.length > 0
  ? candidateDates.sort().slice(-1)[0]  // max lex-sorted date
  : null;
const daysSinceActive = freshestDate ? daysBetween(freshestDate, today) : '?';
const daysSinceClosedOut = lastSilDate ? daysBetween(lastSilDate, today) : '?';
const daysSinceLast = daysSinceActive;

const ignisAge = status.ignisLastComputed ? daysBetween(status.ignisLastComputed, today) : '?';

const planGenAt  = sessionPlan.match(/<!-- generated-at: (\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
const planAge    = planGenAt ? daysBetween(planGenAt, today) : null;
const planFresh  = planAge !== null && planAge < 2;
const planPredSIL = planFresh ? sessionPlan.match(/Predicted SIL:\s*([^\n(]+)/)?.[1]?.trim() : null;
const planTrend  = planFresh ? sessionPlan.match(/Trend:\s*([^\n]+)/)?.[1]?.trim() : null;
const planCap    = planFresh ? sessionPlan.match(/Scope cap:\s*([\d]+)/)?.[1] ?? null : null;
const intentLine = intentPlan.match(/- \*\*Intent:\*\* (.+)/)?.[1] ?? null;
const repoTouchLine = intentPlan.match(/- \*\*Repo touch set:\*\* (.+)/)?.[1] ?? null;
const yieldLine = intentPlan.match(/- \*\*Expected yield:\*\* (.+)/)?.[1] ?? null;
const topPressure = Array.isArray(humanPressure.items) && humanPressure.items.length > 0 ? humanPressure.items[0] : null;

const cdrEntryDates  = [...cdr.matchAll(/\*\*(2\d{3}-\d{2}-\d{2})\*\*/g)].map(m => m[1]);
const lastCdrDate    = cdrEntryDates.length > 0 ? cdrEntryDates[cdrEntryDates.length - 1] : null;
const handoffDate    = handoff.match(/Last updated:\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
const cdrGapDays     = lastCdrDate && handoffDate ? daysBetween(lastCdrDate, handoffDate) : 0;
const cdrGap         = cdrGapDays > 0;

function extractVersion(p) { return readText(path.join(root, p)).match(/template-version: ([\d.]+)/)?.[1] ?? null; }
const startVer    = extractVersion('prompts/start.md');
const startTplVer = extractVersion('docs/templates/project-system/START_PROMPT.template.md');
const closVer     = extractVersion('prompts/closeout.md');
const closTplVer  = extractVersion('docs/templates/project-system/CLOSEOUT_PROMPT.template.md');
const versionDrift = (startVer && startTplVer && startVer !== startTplVer) ||
                     (closVer  && closTplVer  && closVer  !== closTplVer);

const revGenDate  = revSig.match(/Generated:\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
const revAge      = revGenDate ? daysBetween(revGenDate, today) : 999;

const truthStatus = truth.match(/^Overall status:\s*(.+)$/m)?.[1] ?? status.truthAuditStatus ?? 'unknown';

function loadPatternMemory() {
  const patterns = [];
  const memoryRoot = path.join(
    os.homedir(),
    '.claude',
    'projects',
    'C--Users-p4cka-documents-development-vaultspark-studio-ops',
    'memory'
  );

  try {
    if (fs.existsSync(memoryRoot)) {
      const files = fs.readdirSync(memoryRoot)
        .filter(f => /^project_pattern_.+\.md$/.test(f));
      for (const file of files) {
        const body = fs.readFileSync(path.join(memoryRoot, file), 'utf8');
        const name = body.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? '';
        const nameMatch = name.match(/Recurring\s+(\S+)\s+pressure\s*\((\d+)\s*sessions\)/i);
        if (!nameMatch) continue;
        const windowMatch = body.match(/\((S\d+(?:,\s*S\d+)+)\)/);
        patterns.push({
          category: nameMatch[1].toUpperCase(),
          sessions: parseInt(nameMatch[2], 10),
          window: windowMatch?.[1] ?? '',
          source: 'memory',
        });
      }
    }
  } catch { /* fall through to history fallback */ }

  if (patterns.length === 0) {
    const hist = readJson(path.join(root, 'portfolio', 'compiled', 'GENIUS_HISTORY.json'), null);
    const entries = Array.isArray(hist?.entries) ? hist.entries : [];
    const latest = entries[entries.length - 1];
    const histAgeDays = latest?.date ? Math.floor((Date.now() - new Date(latest.date).getTime()) / 86400000) : 999;
    if (histAgeDays > 3) return patterns;  // stale — memory-based detection is canonical; frozen history produces phantom pressure
    const THRESH = 3;
    if (entries.length >= THRESH) {
      const window = entries.slice(-THRESH);
      const counts = new Map();
      for (const e of window) {
        const seen = new Set();
        for (const cat of e.topCategories ?? []) {
          if (seen.has(cat)) continue;
          seen.add(cat);
          counts.set(cat, (counts.get(cat) ?? 0) + 1);
        }
      }
      for (const [cat, n] of counts) {
        if (n >= THRESH) {
          patterns.push({
            category: cat.toUpperCase(),
            sessions: n,
            window: window.map(e => `S${e.session}`).join(', '),
            source: 'history',
          });
        }
      }
    }
  }

  patterns.sort((a, b) => b.sessions - a.sessions);
  return patterns;
}
const patternMemory = loadPatternMemory();
const sigPatterns = patternMemory.length > 0 ? '⚠' : '✓';
const patternsDetail = patternMemory.length === 0
  ? 'no recurring pressure detected'
  : patternMemory.length === 1
    ? `${patternMemory[0].category} top-5 × ${patternMemory[0].sessions} sessions — carry-forward`
    : `${patternMemory[0].category} × ${patternMemory[0].sessions} · +${patternMemory.length - 1} more — carry-forward`;

const genomeData   = readJson(path.join(root, 'context', 'GENOME_HISTORY.json'), { snapshots: [] });
const genSnaps     = genomeData.snapshots ?? [];
const genLast      = genSnaps.length > 0 ? (genSnaps[genSnaps.length - 1]?.dimensions ?? {}) : {};
const genPrev      = genSnaps.length >= 2 ? (genSnaps[genSnaps.length - 2]?.dimensions ?? {}) : {};
const droppedDims  = Object.entries(genLast)
  .filter(([k, v]) => genPrev[k] != null && v < genPrev[k])
  .map(([k, v]) => ({ dim: k.replace(/_/g, '-'), from: genPrev[k], to: v }));
const sigGenome    = droppedDims.length > 0 ? '⚠' : '✓';
const genomeDetail = droppedDims.length > 0
  ? `drop: ${droppedDims.map(d => `${d.dim} ${d.from}→${d.to}`).join(' · ')}`
  : `all stable  (${genSnaps.length > 0 ? genSnaps[genSnaps.length - 1].total : '?'}/25)`;

let sigDeploy = '✓';
let deployLabel = 'no gaps (run: ops deploy-gaps)';
try {
  const gapsPath = path.join(root, 'portfolio', 'DEPLOY_GAPS.json');
  if (fs.existsSync(gapsPath)) {
    const gaps = JSON.parse(fs.readFileSync(gapsPath, 'utf8'));
    if (gaps.flaggedCount > 0) {
      sigDeploy = gaps.flaggedCount >= 3 ? '⛔' : '⚠';
      const top = (gaps.results || []).filter(r => r.flagged).slice(0, 2).map(r => r.slug).join(', ');
      deployLabel = `${gaps.flaggedCount}/${gaps.sparkedCount} SPARKED flagged (${top}${gaps.flaggedCount > 2 ? '…' : ''})`;
    } else if (gaps.sparkedCount > 0) {
      deployLabel = `0/${gaps.sparkedCount} gaps — all SPARKED shipped through`;
    }
  }
} catch { /* keep defaults */ }

let sigCost = '✓', costDetail = 'no ledger data';
try {
  const { readEntries, evaluateCostAnomaly } = await import('./cache-ledger-rollup.mjs');
  const ledgerPath = path.join(root, 'docs', 'cache-ledger.ndjson');
  const ledEntries = readEntries(ledgerPath);
  if (ledEntries.length > 0) {
    const v = evaluateCostAnomaly(ledEntries);
    sigCost = v.sig;
    const realPart = `real $${v.realMetered7d.toFixed(2)}/7d`;
    costDetail = v.notionalNote
      ? `${realPart} · ${v.notionalNote}`
      : `${realPart} · ${v.reasons[0] || 'normal'}`;
  }
} catch { /* best-effort */ }

const doctorScore  = status.doctorScore ?? null;
const sigDoctor    = !doctorScore ? '⚠' : doctorScore.failing === 0 ? (doctorScore.warning > 0 ? '⚠' : '✓') : '⛔';
let ownershipSplit = '';
try {
  if (doctorScore?.checks && doctorScore.warning > 0) {
    const map = loadProvenanceMap();
    const byOwner = { self: 0, sibling: 0, chronic: 0 };
    for (const c of doctorScore.checks) {
      if (!isWarning(c)) continue;
      const o = map[c.id]?.owner || 'self';
      byOwner[o] = (byOwner[o] || 0) + 1;
    }
    const parts = [];
    if (byOwner.self) parts.push(`${byOwner.self} self`);
    if (byOwner.sibling) parts.push(`${byOwner.sibling} sib`);
    if (byOwner.chronic) parts.push(`${byOwner.chronic} chronic`);
    if (parts.length) ownershipSplit = `: ${parts.join('·')}`;
  }
} catch { /* split is advisory */ }
const doctorDetail = !doctorScore
  ? 'not yet tracked — run: node scripts/ops.mjs doctor --update-json'
  : doctorScore.failing > 0
    ? `${doctorScore.passing}/${doctorScore.total} (${doctorScore.score}%)  ·  ${doctorScore.failing} failing`
    : doctorScore.warning > 0
      ? `${doctorScore.passing}/${doctorScore.total} (${doctorScore.score}%)  ·  ${doctorScore.warning} warn${ownershipSplit}`
      : `${doctorScore.passing}/${doctorScore.total} (${doctorScore.score}%)  ·  ${doctorScore.date}  ✓`;

const entropy      = status.entropyScore ?? null;
const sigEntropy   = entropy === null ? '⚠' : entropy < 0.3 ? '✓' : entropy < 0.6 ? '⚠' : '⛔';
const entropyLabel = entropy !== null
  ? `${entropy.toFixed(3)}  ${entropy < 0.3 ? '(healthy)' : entropy < 0.6 ? '(elevated)' : '(high)'}`
  : 'not computed';

const velEntries  = [...sil.matchAll(/##[^\n]*?\bSession\s+\d+\b[^\n]*Velocity:\s*(\d+)/g)].map(m => parseInt(m[1])).reverse();
const velLast5    = velEntries.slice(-5);
const velBar      = v => v === 0 ? '▁' : v <= 2 ? '▂' : v <= 5 ? '▄' : v <= 8 ? '▆' : v <= 12 ? '▇' : '█';
const velHistBar  = velLast5.length > 0 ? velLast5.map(velBar).join('') : sparkline;

const handoffBlock = handoff.match(/^## Where We Left Off \([^)]+\)\n([\s\S]*?)(?=\n---|\n## )/m)?.[1]?.trim() ?? '';
const shippedLine  = handoffBlock.match(/^- Shipped:\s*(.+)$/m)?.[1] ?? 'see LATEST_HANDOFF.md';

function sig(val, green, warn) {
  if (green(val)) return '✓';
  if (warn(val))  return '⚠';
  return '⛔';
}
const runwayQualitative = /\b(strong|healthy|robust)\b/i.test(runwayRaw);
const runwayWeak = /\b(weak|low|critical|depleted|empty)\b/i.test(runwayRaw);
const runwayNumMatch = runwayRaw.match(/~\s*([\d.]+)\s*(?:session|sprint|run)/i);
const runwayNum = runwayNumMatch ? parseFloat(runwayNumMatch[1])
                : runwayQualitative ? 9
                : runwayWeak ? 1
                : 5;
let testsStale = false;
try {
  const tcPath = path.join(root, '.cache', 'test-count.json');
  if (fs.existsSync(tcPath)) {
    const tc = JSON.parse(fs.readFileSync(tcPath, 'utf8'));
    if (typeof tc.total === 'number' && typeof tc.passed === 'number') {
      status.testsTotal = tc.total;
      status.testsPassing = tc.passed;
      if (tc.generatedAt) status.testsLastRun = tc.generatedAt.slice(0, 10);
      const cacheMs = fs.statSync(tcPath).mtimeMs;
      const ageH = (Date.now() - cacheMs) / 3.6e6;
      let newestTestMs = 0;
      try {
        const td = path.join(root, 'scripts', 'test');
        for (const f of fs.readdirSync(td)) {
          if (!/\.(mjs|ts)$/.test(f)) continue;
          const m = fs.statSync(path.join(td, f)).mtimeMs;
          if (m > newestTestMs) newestTestMs = m;
        }
      } catch { /* no test dir */ }
      testsStale = ageH > 24 || (newestTestMs > 0 && newestTestMs > cacheMs);
    }
  }
} catch { /* non-fatal — fall through to PROJECT_STATUS values */ }
function listSignalCount(value) {
  return Array.isArray(value) ? value.length : (typeof value === 'number' ? value : 0);
}

function compactFileList(files, max = 2) {
  const list = Array.isArray(files) ? files : [];
  const names = list.slice(0, max).map(f => path.basename(String(f)));
  const extra = Math.max(0, list.length - names.length);
  return names.join(', ') + (extra ? ` +${extra}` : '');
}

const testsExempt = !status.testsTotal && (status.audience === 'internal' || status.type === 'infrastructure' || status.type === 'internal-ops') && !status.testsPassing;
let sigTests, testsLabel;
if (typeof status.testsPassing === 'number' && typeof status.testsTotal === 'number' && status.testsTotal > 0) {
  const deferredCount = listSignalCount(status.testsDeferred);
  const envBlockedCount = listSignalCount(status.testsEnvBlocked);
  const allPass = status.testsPassing === status.testsTotal;
  const mostlyPass = status.testsPassing / status.testsTotal >= 0.9;
  sigTests = testsStale || deferredCount || envBlockedCount ? '⚠' : allPass ? '✓' : mostlyPass ? '⚠' : '⛔';
  testsLabel = `${status.testsPassing}/${status.testsTotal} passing` + (status.testsLastRun ? ` (${status.testsLastRun})` : '');
  if (deferredCount) testsLabel += ` · ${deferredCount} deferred: ${compactFileList(status.testsDeferred)}`;
  if (envBlockedCount) testsLabel += ` · ${envBlockedCount} env-blocked: ${compactFileList(status.testsEnvBlocked)}`;
  if (testsStale) testsLabel += ' · STALE — run node scripts/run-tests.mjs';
} else if (testsExempt) {
  sigTests = '✓';
  testsLabel = 'N/A (protocol repo)';
} else {
  sigTests = '⚠';
  testsLabel = `${status.testsTotal ?? '?'}/? passing`;
}
const sigVel    = sig(velocity, v => v >= 2, v => v === 1);
const sigRun    = sig(runwayNum, v => v > 4, v => v >= 2);
const sigCtx    = sig(typeof ctxAge === 'number' ? ctxAge : 99, v => v <= 7, v => v <= 14);
const sigIgnis  = sig(typeof ignisAge === 'number' ? ignisAge : 99, v => v < 7, v => v < 14);
const sigCdr    = cdrGap ? '⚠' : '✓';
const sigVer    = versionDrift ? '⚠' : '✓';
const sigRev    = revAge <= 7 ? '✓' : revAge <= 14 ? '⚠' : '⛔';
const sigTruth  = truthStatus === 'green' ? '✓' : truthStatus === 'yellow' ? '⚠' : '⛔';
const complianceSnapshots = Array.isArray(complianceHistory.snapshots) ? complianceHistory.snapshots : [];
const complianceLatest = complianceSnapshots[complianceSnapshots.length - 1] ?? null;
const compliancePrev = complianceSnapshots[complianceSnapshots.length - 2] ?? null;
const complianceTrend = complianceLatest && compliancePrev
  ? complianceLatest.score - compliancePrev.score >= 2 ? '↑' : compliancePrev.score - complianceLatest.score >= 2 ? '↓' : '→'
  : '→';
const complianceSpark = complianceSnapshots.slice(-8).map(s => {
  const score = Number(s.score || 0);
  if (score >= 100) return '█';
  if (score >= 95) return '▇';
  if (score >= 85) return '▆';
  if (score >= 70) return '▄';
  if (score >= 50) return '▂';
  return '▁';
}).join('') || '—';
const complianceState = classifyRatioSnapshot(complianceLatest);
const sigCompliance = signalIcon(complianceState);
const complianceDetail = complianceState === SIGNAL_STATE.UNAVAILABLE
  ? 'unavailable (0 checks) · public-repo shim'
  : complianceState === SIGNAL_STATE.SKIPPED
    ? `${complianceLatest.skipped}/${complianceLatest.total} skipped · not a pass`
    : `${complianceLatest.passed}/${complianceLatest.total} (${complianceLatest.score}%) ${complianceTrend} ${complianceSpark}`;

function buildGeniusBoxFromMarkdown(markdown) {
  const entries = [];
  const regex = /##\s+([^\n]+)\n\n\*\*Tier:\*\*.*?\n\n([^\n]+)(?:\n\n```bash\n([^\n]+)\n```)?/g;
  let match;
  while ((match = regex.exec(markdown)) !== null && entries.length < 5) {
    entries.push({
      title: match[1].trim(),
      summary: match[2].trim(),
      command: match[3]?.trim() || null,
    });
  }
  if (entries.length === 0) return '';

  const out = [top('GENIUS HIT LIST')];
  const rankMatch = markdown.match(/\*\*Rank source:\*\*\s*(\w+)/i);
  if (rankMatch) {
    const src = rankMatch[1].toLowerCase();
    const genMatch = markdown.match(/\*\*Generated:\*\*\s*(\S+)/);
    let ageStr = '';
    if (genMatch) {
      const ageD = (Date.now() - new Date(genMatch[1])) / 86_400_000;
      if (!Number.isNaN(ageD)) ageStr = ` · ${ageD < 1 ? '<1' : Math.round(ageD)}d old`;
    }
    const icon = src === 'live' ? '✓' : '⚠';
    out.push(row(`${icon} rank source: ${src}${ageStr}`.slice(0, W)));
    out.push(blank());
  }
  for (const entry of entries) {
    out.push(row(entry.title.slice(0, W)));
    out.push(row(entry.summary.slice(0, W)));
    if (entry.command) out.push(row(`↳ ${entry.command}`.slice(0, W)));
    out.push(blank());
  }
  out.push(bot());
  return out.join('\n');
}

const portfolioTaskBoardBlock = loadPortfolioTaskBoardBlock({ root });
const founderUnlocksBlock = renderFounderUnlocksBlock({ root, taskBoard });

const ignisInsight = (() => { try { return loadIgnisInsight({ studioRoot: root }); } catch { return { present: false }; } })();

const ignisInsightBlock = renderIgnisInsightBlock(ignisInsight);
const externalSignalsBlock = renderExternalSignalsBlock({ root });

let geniusBlock = '';
try {
  const res = spawnSync(node, [path.join(root, 'scripts', 'generate-genius-list.mjs'), '--brief', '--top', '8'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000,
  });
  geniusBlock = (res.stdout ?? '').trim();
} catch { /* fallback below */ }
if (!geniusBlock) {
  geniusBlock = buildGeniusBoxFromMarkdown(readText(path.join(root, 'docs', 'GENIUS_LIST.md')));
}
if (!geniusBlock) {
  geniusBlock = [top('GENIUS HIT LIST'), row('Run `node scripts/ops.mjs genius-list` to generate fresh recommendations.'), bot()].join('\n');
}

const statusLatest = (typeof status.currentSession === 'number') ? status.currentSession : null;
let briefCoherent = true;
let staleReason = '';
if (silMaxSession == null) {
  briefCoherent = false;
  staleReason = 'SIL log unparseable — no session headers matched. Brief cannot establish current state.';
} else if (!silTotal) {
  briefCoherent = false;
  staleReason = `SIL session S${silMaxSession} has no parseable Total — headline score is untrustworthy.`;
} else if (statusLatest != null && statusLatest !== silMaxSession) {
  try {
    const statusPath = path.join(root, 'context', 'PROJECT_STATUS.json');
    const live = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    live.currentSession = silMaxSession;
    fs.writeFileSync(statusPath, JSON.stringify(live, null, 2) + '\n', 'utf8');
    console.log(`  ↻ self-heal: PROJECT_STATUS.currentSession ${statusLatest} → ${silMaxSession} (synced from SIL log)`);
  } catch (e) {
    console.warn(`  ⚠ could not self-heal PROJECT_STATUS.json: ${e.message}`);
  }
}
const staleBanner = briefCoherent ? null : [
  top('⛔ STALE BRIEF — DO NOT TRUST'),
  row(staleReason.slice(0, W)),
  row('Repair: node scripts/render-startup-brief.mjs  (then re-run /start)'.slice(0, W)),
  bot(),
].join('\n');

const pct = silTotal > 0 ? `${Math.round(silTotal / silMax * 100)}%` : '?%';

const lines = [
  `<!-- generated-by: scripts/render-startup-brief.mjs v3.1 -->`,
  `<!-- generated-at: ${today} (Session ${currentSession - 1} closeout) -->`,
  `<!-- fast-boot-valid-until: next session if within 24h -->`,
  `<!-- brief-coherent: ${briefCoherent} -->`,
  ``,
  `# Startup Brief — ${status.name || 'Studio Ops'}`,
  ``,
  `> **Fast-boot brief** — generated at Session ${currentSession - 1} closeout · ${today}.`,
  `> Valid for next session if started within 24h. For sessions >24h later, load context files fresh (start.md §3).`,
  ``,
  `---`,
  ``,
  `\`\`\``,
  ...(staleBanner ? [staleBanner, ``] : []),
  renderTitleHeader({
    name: status.name || 'Studio Ops',
    type: status.type,
    lifecycle: status.lifecycle,
    audience: status.audience,
    vaultStatus: status.vaultStatus || 'FORGE',
    session: currentSession,
    date: today,
    mode: (status.sessionMode || 'builder').toUpperCase(),
    owner: status.owner,
  }),
  ``,
  renderLastCompleted(status.lastSessionSummary, {
    expectedSession: currentSession - 1,
    fallback: status.currentFocus || shippedLine || 'Latest session details unavailable.',
  }),
  ``,
  ...(Array.isArray(status.testingSurfaces) && status.testingSurfaces.length
    ? [renderTestItNow({ name: status.name || 'Studio Ops', testingSurfaces: status.testingSurfaces }), ``]
    : []),
  renderProfileLensHeader(status),
  ``,
  ...renderStartupScoreBlock({
    silTotal, silMax, bar24, pct, avg3Raw, velocity, velTrend, silStreak,
    daysSinceActive, daysSinceClosedOut, velHistBar, sparkline, velLast5,
    bar10, spark, trend, catHistory, cat3,
    lastDev, lastAlign, lastMomentum, lastEngage, lastProcess,
    lastCoherence, lastSecurity, lastEcosystem, lastCapital, lastAutomation,
  }).split('\n'),
  ``,
  top(`WHERE WE LEFT OFF  ·  Session ${currentSession - 1}`),
  row(`Shipped:  ${shippedLine.slice(0, W - 10)}`),
  row(`Tests:    ${typeof status.testsPassing === 'number' ? `${status.testsPassing}/${status.testsTotal ?? '?'}` : (status.testsTotal ?? '?')} passing  ·  Deploy: ${status.lastDeployStatus || 'N/A'}`),
  bot(),
  ``,
  ...renderStartupContextMeterBlock(meter, { row, top, bot }).split('\\n'),
  ``,
  top('SIGNALS'),
  row(`${sigTests}  Tests         ${testsLabel}`),
  row(`${sigVel}  Velocity      ${velocity} ${velTrend}  ·  Debt: ${debtRaw}`),
  row(`${sigRun}  Runway        ${runwayRaw}`),
  row(`${sigCtx}  Context age   ${ctxAge}d`),
  row(`${sigIgnis}  IGNIS         ${status.ignisScore ?? '?'} ${status.ignisGrade || ''}  ·  ${ignisAge}d old`),
  row(`${sigTruth}  Truth         ${truthStatus}  ·  Genome: ${status.truthGenome || '?'}`),
  row(`${sigCompliance}  Compliance   ${complianceDetail}`),
  row(`${sigGenome}  Genome dims   ${genomeDetail}`),
  row(`${sigEntropy}  Entropy       ${entropyLabel}`),
  row(`${sigCdr}  CDR           ${cdrGap ? `gap detected (${cdrGapDays}d)  — recover at closeout` : 'no gap detected'}`),
  row(`${sigPatterns}  Patterns      ${patternsDetail}`),
  row(`${sigVer}  Templates     ${versionDrift ? `version drift (start: ${startVer} vs tpl: ${startTplVer})` : `v${startVer || '?'} aligned`}`),
  row(`${sigRev}  Revenue sig.  ${revGenDate ? `${revAge}d old (${revGenDate})` : 'not found'}${revAge > 7 ? '  ⚠ stale' : ''}`),
  row(`${sigDeploy}  Deploy gaps   ${deployLabel}`),
  row(`${sigDoctor}  Doctor        ${doctorDetail}`),
  row(`${sigCost}  Cost          ${costDetail}`),
  bot(),
  ``,
  ...(ignisInsightBlock ? [ignisInsightBlock, ``] : []),
  ...(externalSignalsBlock ? [externalSignalsBlock, ``] : []),
  ...(founderUnlocksBlock ? [founderUnlocksBlock, ``] : []),
  ...(portfolioTaskBoardBlock ? [portfolioTaskBoardBlock, ``] : []),
  renderOrchestratorBlock({ root, node }),
  ``,
  ...(planFresh && planPredSIL ? [
    top('PREDICTION  ·  SESSION_PLAN.md'),
    row(`Next session:  ${planPredSIL}${planTrend ? `  ·  ${planTrend}` : ''}`),
    row(`Scope cap:     ${planCap ?? scopeCap ?? '?'} tasks`),
    bot(),
    ``,
  ] : []),
  ...renderExecutionPlanBlock({ intentLine, repoTouchLine, yieldLine }),
  ...renderHumanPressureBlock(topPressure),
  ...[],
  ...renderMomentumMeterBlock({ velHistBar, velocity, velTrend, intentPct, streak, cacheHitPct: null, weeklyCost: null }),
  ...renderSilForecastBlock({ root, velocity, currentTotal: silTotal }),
  geniusBlock,
  ``,
  `\`\`\``,
  ``,
  `---`,
  ``,
  `*Generated by \`scripts/render-startup-brief.mjs v3.1\` · Session ${currentSession - 1} closeout · ${today}*`,
  `*Run \`node scripts/ops.mjs doctor\` for live health check · \`node scripts/ops.mjs genius-list\` to refresh hit list*`,
];

const summaryItems = parseUnifiedItems(taskBoard);
const openNow = summaryItems.filter(item => item.status === 'unblocked');
const openBlocked = summaryItems.filter(item => BLOCKED_STATUSES_CORE.includes(item.status));
const signals = [
  sigTests + '  Tests',
  sigVel + '  velocity',
  sigRun + '  runway',
  sigGenome + '  genome',
  sigEntropy + '  entropy',
  sigCdr + '  cdr',
  sigPatterns + '  patterns',
  sigVer + '  templates',
  sigRev + '  revenue',
];
await writeStartupBriefWithTelemetry({
  root,
  scriptsDir: __dirname,
  node,
  outputPath,
  briefBody: lines.join('\n'),
  currentSession,
  silTotal,
  silMax,
  pct,
  openNow,
  openBlocked,
  signals,
  today,
});
