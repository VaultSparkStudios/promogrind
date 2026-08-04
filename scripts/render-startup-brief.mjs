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
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from './lib/safe-spawn.mjs';
import { renderTitleHeader, renderLastCompleted, renderTestItNow } from './lib/brief-blocks.mjs';
import { extractCurrentSessionIntent, parseUnifiedItems } from './lib/task-board.mjs';
import {
  loadPortfolioTaskBoardBlock,
  renderFounderUnlocksBlock,
  renderOrchestratorBlock,
} from './lib/startup-orchestrator-blocks.mjs';
import { loadIgnisInsight } from './lib/ignis-insight.mjs';
import { contextWindowForAgent } from './lib/model-router.mjs';
import { loadProvenanceMap } from './classify-warning-provenance.mjs';
import { isWarning } from './lib/doctor-predicates.mjs';
import { sparkline as _sparkline } from './lib/visual-blocks.mjs';
import { parseSilSessions } from './lib/sil-ledger.mjs';
import { BLOCKED_STATUSES_CORE } from './lib/shared-policies.mjs';
import { runBriefPreflight } from './lib/brief-preflight.mjs';
import { run as codexTrustedProjectRun } from './check-codex-trusted-project.mjs';
import {
  classifyQualifiedStatus,
  resolvePrimaryTestCommand,
  resolveProjectProfile,
  selectComplianceEvidence,
} from './lib/startup-signal-semantics.mjs';
import { buildStartupSourceReceipt, writeStartupSourceReceipt } from './lib/startup-source-receipt.mjs';
import { createStartupBriefBox } from './lib/startup-brief-box.mjs';
import { resolveTestSignal } from './lib/test-signal.mjs';
import { loadStartupContextMeter, renderStartupContextMeterBlock } from './lib/startup-context-meter-block.mjs';
import { loadStartupPatternMemory } from './lib/startup-pattern-memory.mjs';
import { renderStartupGeniusBlock } from './lib/startup-genius-block.mjs';
import { writeStartupBriefWithTelemetry } from './lib/startup-brief-output.mjs';
import { loadStartupBriefSources } from './lib/startup-source-loader.mjs';
import { renderStartupScoreBlock } from './lib/startup-score-block.mjs';
import {
  renderExecutionPlanBlock,
  renderExternalSignalsBlock,
  renderHumanPressureBlock,
  renderIgnisInsightBlock,
  renderMomentumMeterBlock,
  renderSilForecastBlock,
} from './lib/startup-summary-blocks.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'docs', 'STARTUP_BRIEF.md');
const node = process.execPath;
export const STARTUP_BRIEF_VERSION = '3.2';
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/render-startup-brief.mjs [--v5] [--legacy]');
  process.exit(0);
}

// S120 #1 — brief-v5 promote opt-in. Set BRIEF_V5=1 or pass --v5 to delegate
// to render-startup-brief-v5.mjs (71% token reduction, validated S117). Default
// remains v3.1 until 3-session hash-stability monitoring completes.
if (process.argv.includes('--v5') || process.env.BRIEF_V5 === '1') {
  const r = spawnSync(node, [path.join(__dirname, 'render-startup-brief-v5.mjs'), ...process.argv.slice(2).filter(a => a !== '--v5')], { stdio: 'inherit', cwd: root });
  process.exit(r.status ?? 0);
}

// ── Constants ─────────────────────────────────────────────────────────────────
const W  = 62; // inner box width (content between ║  and  ║)
const {
  totalWidth: BW,
  truncateWordAware,
  pad,
  row,
  blank,
  top,
  mid,
  bot,
  bar20,
  bar10,
  bar24,
} = createStartupBriefBox(W);

// ── Preflight: doctor --fix --update-json (S120 audit #2 — clear stable warns) ─
// S173 [audit #1 · CANON-031 observability honesty]: the preflight already runs
// a full doctor pass, but historically WITHOUT --update-json, so the brief read
// `status.doctorScore` as last written at the PRIOR session's closeout. When a
// probe self-healed between sessions (e.g. propagation-adoption fail→warn) the
// brief kept surfacing a PHANTOM ⛔ "N failing" the live doctor no longer agreed
// with. Adding --update-json persists the freshly-computed score (spawnSync is
// synchronous and completes before loadAllFiles reads PROJECT_STATUS.json), so
// the SIGNALS box always reflects the doctor run the brief itself just triggered.
// S244 [audit #2]: preflight is now the SHARED lib/brief-preflight.mjs so the
// v5 renderer runs the identical side-effects — the inlining here was the named
// blocker for the brief-v5 canonical flip (SIL:1 S240 #1). Freshness-gated so
// the flag-file flow (v3 render → spawned v5 render) runs the doctor once.
try {
  runBriefPreflight(root);
} catch { /* non-fatal — a broken preflight must never block a brief render */ }

// ── Helpers ───────────────────────────────────────────────────────────────────
// S126 audit #28: PROJECT_PROFILE lens — one-line header above SCORE
function renderProfileLensHeader() {
  try {
    const p = readJson(path.join(root, '.cache', 'project-profile.json'), null);
    const lens = resolveProjectProfile({ profile: p, status });
    const line = `Profile · ${lens.medium} · ${lens.stage} · arch=${lens.archetype} · top-axis=${lens.topAxis} · ${lens.source}`;
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

const { fileCache, revenueSignalsPath, elapsedMs: sourceLoadMs } = await loadStartupBriefSources(root);
process.stderr.write(`  ⚡ Parallel file load: ${sourceLoadMs}ms\n`);

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

// S220 audit #7 — persist the SIGNALS box verbatim as context/SIGNALS.md, the
// single-file producer for brief v5's 'signals' computed block (v5 resolver
// already targets this path; it resolved null since S209). Pass-through: the
// caller spreads the same rows into the brief. Advisory write — never blocks.
function writeSignalsArtifact(rows) {
  try {
    fs.writeFileSync(path.join(root, 'context', 'SIGNALS.md'), rows.join('\n') + '\n');
  } catch { /* advisory */ }
  return rows;
}
// ── Load source files ─────────────────────────────────────────────────────────
const status      = readJson(path.join(root, 'context', 'PROJECT_STATUS.json'), {});
const packageJson = readJson(path.join(root, 'package.json'), {});
const taskBoard   = readText(path.join(root, 'context', 'TASK_BOARD.md'));
const handoff     = readText(path.join(root, 'context', 'LATEST_HANDOFF.md'));
const sil         = readText(path.join(root, 'context', 'SELF_IMPROVEMENT_LOOP.md'));
const truth       = readText(path.join(root, 'context', 'TRUTH_AUDIT.md'));
const csmd        = readText(path.join(root, 'context', 'CURRENT_STATE.md'));
const sessionPlan = readText(path.join(root, 'docs', 'SESSION_PLAN.md'));
const cdr         = readText(path.join(root, 'docs', 'CREATIVE_DIRECTION_RECORD.md'));
const revSig      = readText(revenueSignalsPath);
const complianceHistory = readJson(path.join(root, 'context', 'COMPLIANCE_HISTORY.json'), { snapshots: [] });
const intentPlan  = readText(path.join(root, 'context', 'SESSION_INTENT_PLAN.md'));
const canonAdoption = readText(path.join(root, 'context', 'CANON_ADOPTION.md'));
const humanPressure = readJson(path.join(root, 'portfolio', 'compiled', 'HUMAN_ACTION_PRESSURE.json'), { items: [] });

const meterAgent = lockValue('agent') || 'unknown';
const meterLimit = contextWindowForAgent(meterAgent);
const meter = loadStartupContextMeter({
  root,
  scriptsDir: __dirname,
  node,
  agent: meterAgent,
  limit: meterLimit,
});

// ── Parse Rolling Status ──────────────────────────────────────────────────────
const silHeader = extractBetween(sil, '<!-- rolling-status-start -->', '<!-- rolling-status-end -->');

const silTotalMatch = silHeader.match(/Total:\s*(\d+)\/(\d+)/);
// Headline metrics: prefer the latest scored SIL entry (set below, after the
// robust session parser) over the rolling-status block, which can lag closeouts.
let silTotal        = parseInt(silTotalMatch?.[1] ?? '') || 0;
let silMax          = parseInt(silTotalMatch?.[2] ?? '') || status.silMax || 1000;
let velocity        = parseInt(silHeader.match(/Velocity:\s*(\d+)/)?.[1] ?? '') || 0;
const sparkline     = silHeader.match(/Sparkline[^:]*:\s*([▁▂▃▄▅▆▇█ ]+)/)?.[1]?.trim() ?? '';
const avg3Raw       = parseFloat(silHeader.match(/Avgs\s*[-—]\s*3:\s*([\d.]+)/)?.[1] ?? '') || status.silAvg3 || null;
const runwayRaw     = silHeader.match(/[Mm]omentum runway:\s*([^|]+)/)?.[1]?.trim()
                   ?? silHeader.match(/Runway:\s*([^|]+)/)?.[1]?.trim()
                   ?? 'unknown';
const intentRate    = silHeader.match(/Intent rate:\s*([^\n|]+)/)?.[1]?.trim() ?? 'unknown';
const lastSessionStr = silHeader.match(/Last session:\s*(.+)/)?.[1]?.trim() ?? '';
const debtRaw       = silHeader.match(/Debt:\s*([↑↓→])/)?.[1] ?? '→';
const velTrend      = silHeader.match(/Velocity trend:\s*([↑↓→])/)?.[1] ?? '';

// Per-category 3-session avgs
const cat3 = {};
const cat3Match = silHeader.match(/3-session:\s*Dev ([\d.]+)\s*\|\s*Align ([\d.]+)\s*\|\s*Momentum ([\d.]+)\s*\|\s*Engage ([\d.]+)\s*\|\s*Process ([\d.]+)/);
if (cat3Match) {
  cat3.dev = parseFloat(cat3Match[1]);
  cat3.align = parseFloat(cat3Match[2]);
  cat3.momentum = parseFloat(cat3Match[3]);
  cat3.engage = parseFloat(cat3Match[4]);
  cat3.process = parseFloat(cat3Match[5]);
}

// ── Robust SIL session parsing (S142 audit item 1) ───────────────────────────
// SELF_IMPROVEMENT_LOOP.md carries TWO header formats and they are NOT in a
// reliable document order:
//   A) `## DATE — Session N | Total: X/Y | Velocity: V`   (inline metrics)
//   B) `## Session N — DATE`                              (Total in a later **Total: X/Y** line)
// The old parser only matched format A and assumed first-document-order =
// most-recent, so it locked onto a stale block (brief rendered S135/928 while
// real state was S141/996). We now scan EVERY `## …Session N…` header in either
// format, capture each body, and select the latest by session NUMBER.
const allSilEntries = parseSilSessions(sil);

// Highest session number present in the SIL log (source of truth for "what session are we on").
const silMaxSession = allSilEntries.length ? allSilEntries[0].session : null;

// Latest entry that actually carries category scores (for the per-category bars).
const lastEntry = (allSilEntries.find(e => /\|\s*Dev Health\s*\|/i.test(e.body))?.body)
               ?? (allSilEntries[0]?.body ?? '');

// Latest entry that carries a Total — header-inline (format A) OR a **Total: X/Y** body line (format B).
function entryTotal(e) {
  return e?.total == null ? null : { total: e.total, max: e.max };
}
function entryVelocity(e) {
  return e?.velocity ?? null;
}
const latestScored = allSilEntries.find(e => entryTotal(e) !== null) ?? null;

// Override headline metrics from the latest scored entry when it is fresher than
// the rolling-status block (compared by session number). Falls back to the
// rolling-status values, then PROJECT_STATUS.json.
if (latestScored) {
  const t = entryTotal(latestScored);
  if (t) { silTotal = t.total; silMax = t.max; }
  const v = entryVelocity(latestScored);
  if (v != null) velocity = v;
}
if (!silTotal && status.silScore) { silTotal = status.silScore; silMax = status.silMax || 1000; }
const silStreak = status.silStreak ?? 0;  // S202: consecutive max-score sessions
function parseScore(label) {
  // Tolerate suffixes like "Engagement (infra)" — match label followed by optional
  // whitespace + parenthesized note before the column separator.
  const m = lastEntry.match(new RegExp(`\\|\\s*${label}(?:\\s*\\([^)]*\\))?\\s*\\|\\s*(\\d+)`, 'i'));
  return m ? parseInt(m[1]) : null;
}
const lastDev      = parseScore('Dev Health') ?? cat3.dev ?? 0;
const lastAlign    = parseScore('Creative Alignment') ?? cat3.align ?? 0;
const lastMomentum = parseScore('Momentum') ?? cat3.momentum ?? 0;
const lastEngage   = parseScore('Engagement') ?? cat3.engage ?? 0;
const lastProcess  = parseScore('Process Quality') ?? cat3.process ?? 0;

// Trend arrows per category (compare last to avg3)
function trend(last, avg) {
  if (!last || !avg) return '→';
  const delta = last - avg;
  return delta >= 2 ? '↑' : delta <= -2 ? '↓' : '→';
}

// ── v4.0: Per-category sparkline history (last N sessions) ────────────────────
// Parse all SIL entries for each of the 5 v2 categories. v3 categories come from
// PROJECT_STATUS.json silCategoriesV3 (single snapshot) + any future append-only history.
function parseCategoryHistory(label) {
  const series = [];
  // allSilEntries is sorted newest→oldest by session number; reverse at the end
  // to render oldest→newest sparklines.
  for (const entry of allSilEntries) {
    const m = entry.body.match(new RegExp(`\\|\\s*${label}(?:\\s*\\([^)]*\\))?\\s*\\|\\s*(\\d+)`, 'i'));
    if (m) series.push(parseInt(m[1], 10));
  }
  return series.reverse().slice(-8);  // oldest → newest, last 8
}
// Migrated to scripts/lib/visual-blocks.mjs (S114 compound refinement).
// Library uses min=0,max=100 by default → mathematically identical output.
const spark = (values, max = 100) => _sparkline(values, { max, min: 0 });
const catHistory = {
  dev:      parseCategoryHistory('Dev Health'),
  align:    parseCategoryHistory('Creative Alignment'),
  momentum: parseCategoryHistory('Momentum'),
  engage:   parseCategoryHistory('Engagement'),
  process:  parseCategoryHistory('Process Quality'),
};
// v3 categories — single-point snapshot (will grow as new sessions score v3)
const v3Cats = status.silCategoriesV3 || {};
const lastCoherence  = v3Cats.crossRepoCoherence ?? 0;
const lastSecurity   = v3Cats.securityPosture ?? 0;
const lastEcosystem  = v3Cats.ecosystemIntegration ?? 0;
const lastCapital    = v3Cats.capitalEfficiency ?? 0;
const lastAutomation = v3Cats.automationCoverage ?? 0;

// ── v4.0: Momentum meter — velocity streak + intent + cost ────────────────────
function momentumStreak() {
  // Parse last 10 SIL entries; count consecutive sessions where intent was "achieved".
  // S220 audit #19 — this read `match[1]` after allSilEntries was refactored to
  // {session, header, body} objects, so body was ALWAYS undefined and streak was
  // ALWAYS 0 — directly contradicting the header-derived "Intent: 100% achieved"
  // line rendered two rows above it (CANON-031: a brief must not disagree with
  // itself). Now reads entry.body — the same entries the header rate summarizes.
  let streak = 0;
  for (const entry of allSilEntries.slice(0, 10)) {
    const body = entry.body ?? '';
    if (/Classification:.*(Achieved|achieved)|Intent outcome:\*{0,2}\s*(Achieved|achieved|✓)/i.test(body)) streak++;
    else break;
  }
  return streak;
}
const streak = momentumStreak();
const intentPct = parseFloat(intentRate.match(/(\d+)%/)?.[1] ?? '0');
const cacheLedger = readJson(path.join(root, 'portfolio', 'compiled', 'CACHE_HIT_LEDGER.json'), {});
const cacheHitPct = typeof cacheLedger.avgHitRate === 'number' ? Math.round(cacheLedger.avgHitRate * 100) : null;
const weeklyCost = null; // Flat-rate Max-plan agent telemetry is notional, never a spend alarm.

// ── Parse TASK_BOARD ──────────────────────────────────────────────────────────
const unifiedItems   = parseUnifiedItems(taskBoard);
const openNow        = unifiedItems.filter((item) => item.status === 'unblocked');
const openBlocked    = unifiedItems.filter((item) =>
  BLOCKED_STATUSES_CORE.includes(item.status)
);

// ── Derived values ─────────────────────────────────────────────────────────────
const today          = new Date().toISOString().slice(0, 10);
// Next session = (latest session in the SIL log) + 1. The SIL log is the source
// of truth; PROJECT_STATUS.currentSession is only a fallback when the log can't
// be parsed (it has lagged real state before — see S142 audit item 1).
const currentSession = (silMaxSession ?? status.currentSession ?? 62) + 1;
const ctxUpdated     = csmd.match(/^Last updated:\s*(\d{4}-\d{2}-\d{2})/m)?.[1] ?? null;
const ctxAge         = ctxUpdated ? daysBetween(ctxUpdated, today) : '?';
const scopeCap       = velocity > 0 ? Math.floor(velocity * 1.5) : null;

// ── Last active (freshest of: SIL closeout, lastUpdated, lastHandoffDate) ────
// "Days since last" was previously SIL-only, which lied when sessions shipped without
// running /closeout. Now takes the newest signal across all three sources.
const lastSilDateMatch = lastSessionStr.match(/(\d{4}-\d{2}-\d{2})/);
const lastSilDate = lastSilDateMatch?.[1] || null;
// S220 audit #12 — strict date guard: silLastSession is a session NUMBER, not a
// date; "219" lex-sorts after "2026-07-02" and produced "Last active: 660175d".
// Only well-formed ISO dates may enter the max.
const candidateDates = [
  lastSilDate,
  status.lastUpdated,
  status.lastHandoffDate,
  status.silLastSession,
].filter(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v));
const freshestDate = candidateDates.length > 0
  ? candidateDates.sort().slice(-1)[0]  // max lex-sorted date
  : null;
const daysSinceActive = freshestDate ? daysBetween(freshestDate, today) : '?';
const daysSinceClosedOut = lastSilDate ? daysBetween(lastSilDate, today) : '?';

// IGNIS freshness
const ignisAge = status.ignisLastComputed ? daysBetween(status.ignisLastComputed, today) : '?';

// ── SESSION_PLAN prediction ───────────────────────────────────────────────────
const planGenAt  = sessionPlan.match(/<!-- generated-at: (\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
const planAge    = planGenAt ? daysBetween(planGenAt, today) : null;
const planFresh  = planAge !== null && planAge < 2;
const planPredSIL = planFresh ? sessionPlan.match(/Predicted SIL:\s*([^\n(]+)/)?.[1]?.trim() : null;
const planTrend  = planFresh ? sessionPlan.match(/Trend:\s*([^\n]+)/)?.[1]?.trim() : null;
const planCap    = planFresh ? sessionPlan.match(/Scope cap:\s*([\d]+)/)?.[1] ?? null : null;
const intentLine = extractCurrentSessionIntent(handoff) || intentPlan.match(/- \*\*Intent:\*\* (.+)/)?.[1] || null;
const repoTouchLine = intentPlan.match(/- \*\*Repo touch set:\*\* (.+)/)?.[1] ?? null;
const yieldLine = intentPlan.match(/- \*\*Expected yield:\*\* (.+)/)?.[1] ?? null;
const topPressure = Array.isArray(humanPressure.items) && humanPressure.items.length > 0 ? humanPressure.items[0] : null;

// ── CDR gap detection ─────────────────────────────────────────────────────────
const cdrEntryDates  = [...cdr.matchAll(/\*\*(2\d{3}-\d{2}-\d{2})\*\*/g)].map(m => m[1]);
const lastCdrDate    = cdrEntryDates.length > 0 ? cdrEntryDates[cdrEntryDates.length - 1] : null;
const handoffDate    = handoff.match(/Last updated:\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
const cdrGapDays     = lastCdrDate && handoffDate ? daysBetween(lastCdrDate, handoffDate) : 0;
const cdrGap         = cdrGapDays > 0;

// ── Protocol version drift ────────────────────────────────────────────────────
function extractVersion(p) { return readText(path.join(root, p)).match(/template-version: ([\d.]+)/)?.[1] ?? null; }
const startVer    = extractVersion('prompts/start.md');
const startTplVer = extractVersion('docs/templates/project-system/START_PROMPT.template.md');
const closVer     = extractVersion('prompts/closeout.md');
const closTplVer  = extractVersion('docs/templates/project-system/CLOSEOUT_PROMPT.template.md');
const versionDrift = (startVer && startTplVer && startVer !== startTplVer) ||
                     (closVer  && closTplVer  && closVer  !== closTplVer);

// ── Revenue signals freshness ─────────────────────────────────────────────────
const revGenDate  = revSig.match(/Generated:\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
const revAge      = revGenDate ? daysBetween(revGenDate, today) : 999;

// ── Truth status ──────────────────────────────────────────────────────────────
const truthStatus = truth.match(/^Overall status:\s*(.+)$/m)?.[1] ?? status.truthAuditStatus ?? 'unknown';

const patternMemory = loadStartupPatternMemory({ root });
const sigPatterns = patternMemory.length > 0 ? '⚠' : '✓';
const patternsDetail = patternMemory.length === 0
  ? 'no recurring pressure detected'
  : patternMemory.length === 1
    ? `${patternMemory[0].category} top-5 × ${patternMemory[0].sessions} sessions — carry-forward`
    : `${patternMemory[0].category} × ${patternMemory[0].sessions} · +${patternMemory.length - 1} more — carry-forward`;

// ── Genome history (dimension alert) ─────────────────────────────────────────
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

// ── Deploy gaps ──────────────────────────────────────────────────────────────
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

// ── Cost anomaly signal — SHARED evaluator (S181 [audit #1]) ─────────────────
// Previously an inline rolling-window check on NOTIONAL list-price (entryCost),
// which double-counted flat-rate Max-Plan interactive tokens as metered API spend
// → a phantom ⛔ "$916 4.4× spike". It also diverged from check-cost-anomaly.mjs
// (the S153 two-implementations class). Now both surfaces call ONE evaluator that
// runs the alarm on REAL metered cost and reports notional separately.
const sigCost = '✓';
const costDetail = 'flat-rate Max Plan · ledger telemetry is notional';

// ── Doctor score ─────────────────────────────────────────────────────────────
const doctorScore  = status.doctorScore ?? null;
const sigDoctor    = !doctorScore ? '⚠' : doctorScore.failing === 0 ? (doctorScore.warning > 0 ? '⚠' : '✓') : '⛔';
// S171 [audit #4] — aggregate-honesty: a bare "9 warning" reads as 9 studio-ops
// problems. Append the ownership split (self vs sibling-rollout) so the founder
// sees that ~all of them are portfolio-rollout trackers studio-ops surfaces but
// does not own. Reuses the warning-provenance classifier (no recompute) and
// degrades gracefully to the bare count if checks/map are unavailable.
// Compact ownership split (box inner width is 62; date is dropped when warnings
// exist so the split fits — ownership is the load-bearing signal, not the date).
let ownershipSplit = '';
try {
  if (doctorScore?.checks && doctorScore.warning > 0) {
    // Classify exactly the set the doctor TALLIES as warnings (the canonical
    // isWarning predicate — shared with run-doctor.mjs via doctor-predicates.mjs,
    // S172 [audit #4]) so the split always sums to the displayed count. (The
    // provenance classifier walks the BROADER isNonGreen set on purpose — naming
    // both predicates is what kills the silent divergence the old inline copies
    // carried.)
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
let sigCodexTrust = '⚠';
let codexTrustDetail = 'not checked';
try {
  const trust = codexTrustedProjectRun(root);
  sigCodexTrust = trust.ok ? '✓' : '⚠';
  codexTrustDetail = trust.ok ? 'trusted project active' : 'local hooks/config not trusted';
} catch {
  codexTrustDetail = 'trust check unavailable';
}
let sigCanonAdoption = '⚠';
let canonAdoptionDetail = 'not checked';
try {
  const m = canonAdoption.match(/Live ACTIVE canons:\s*(\d+)\s*·\s*Pending review:\s*(\d+)/i);
  if (m) {
    const total = Number(m[1]);
    const pending = Number(m[2]);
    sigCanonAdoption = pending === 0 ? '✓' : '⚠';
    canonAdoptionDetail = `${pending}/${total} pending review`;
  }
} catch {
  canonAdoptionDetail = 'summary unavailable';
}

// ── Entropy ───────────────────────────────────────────────────────────────────
const entropy      = status.entropyScore ?? null;
const sigEntropy   = entropy === null ? '⚠' : entropy < 0.3 ? '✓' : entropy < 0.6 ? '⚠' : '⛔';
const entropyLabel = entropy !== null
  ? `${entropy.toFixed(3)}  ${entropy < 0.3 ? '(healthy)' : entropy < 0.6 ? '(elevated)' : '(high)'}`
  : 'not computed';

// ── Velocity history (last 5 session velocities from SIL entries) ──────────
// Velocity history from inline-metric session headers (format A), newest→oldest → reverse to chronological.
const velEntries  = [...sil.matchAll(/##[^\n]*?\bSession\s+\d+\b[^\n]*Velocity:\s*(\d+)/g)].map(m => parseInt(m[1])).reverse();
const velLast5    = velEntries.slice(-5);
const velBar      = v => v === 0 ? '▁' : v <= 2 ? '▂' : v <= 5 ? '▄' : v <= 8 ? '▆' : v <= 12 ? '▇' : '█';
const velHistBar  = velLast5.length > 0 ? velLast5.map(velBar).join('') : sparkline;

// ── Handoff "shipped" line ────────────────────────────────────────────────────
const handoffBlock = handoff.match(/^## Where We Left Off \([^)]+\)\n([\s\S]*?)(?=\n---|\n## )/m)?.[1]?.trim() ?? '';
const shippedLine  = handoffBlock.match(/^- Shipped:\s*(.+)$/m)?.[1] ?? 'see LATEST_HANDOFF.md';

// ── Signal thresholds ─────────────────────────────────────────────────────────
function sig(val, green, warn) {
  // green fn, warn fn — if green(val) → ✓, if warn(val) → ⚠, else ⛔
  if (green(val)) return '✓';
  if (warn(val))  return '⚠';
  return '⛔';
}
// Runway is qualitative ("strong"/"healthy") OR quantitative ("~3 sessions"). Never match embedded version numbers like "v1.3".
const runwayQualitative = /\b(strong|healthy|robust)\b/i.test(runwayRaw);
const runwayWeak = /\b(weak|low|critical|depleted|empty)\b/i.test(runwayRaw);
const runwayNumMatch = runwayRaw.match(/~\s*([\d.]+)\s*(?:session|sprint|run)/i);
const runwayNum = runwayNumMatch ? parseFloat(runwayNumMatch[1])
                : runwayQualitative ? 9
                : runwayWeak ? 1
                : 5;
// G1 S121 — prefer fresh .cache/test-count.json (from refresh-test-count.mjs) over PROJECT_STATUS values.
// S181 [audit #2] — freshness guard: the cache silently went stale (179 files cached
// while the live suite had 225), so the brief reported a confident-but-wrong count.
// Flag the count stale when the cache is >24h old OR predates the newest test file
// — a stale count is surfaced as such, never as fresh truth (CANON-031).
let testsStale = false;
try {
  const tcPath = path.join(root, '.cache', 'test-count.json');
  if (fs.existsSync(tcPath)) {
    const tc = JSON.parse(fs.readFileSync(tcPath, 'utf8'));
    // S220 audit #1 — foreign-root artifact rejection: a test-count generated in
    // another repo (shared/copied cache) must not be read as this repo's truth.
    const tcRoot = tc.__provenance?.root;
    const foreign = tcRoot && path.resolve(tcRoot).toLowerCase() !== path.resolve(root).toLowerCase();
    if (!foreign && typeof tc.total === 'number' && typeof tc.passed === 'number') {
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

// Reconcile file-level and assertion-level evidence through one typed contract.
const testsExempt = !status.testsTotal && (status.audience === 'internal' || status.type === 'infrastructure' || status.type === 'internal-ops') && !status.testsPassing;
let sigTests, testsLabel;
const testSignal = resolveTestSignal(status);
if (testSignal.state !== 'unknown') {
  sigTests = testsStale ? '⚠' : testSignal.ok ? '✓' : '⛔';
  testsLabel = testSignal.detail + (status.testsLastRun ? ` (${status.testsLastRun})` : '');
  if (testsStale) testsLabel += ` · STALE — run ${resolvePrimaryTestCommand(status, packageJson)}`;
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
const sigTruth  = classifyQualifiedStatus(truthStatus).icon;
const complianceSnapshots = Array.isArray(complianceHistory.snapshots) ? complianceHistory.snapshots : [];
const complianceEvidence = selectComplianceEvidence(complianceSnapshots);
const complianceLatest = complianceEvidence.current;
const compliancePrev = complianceEvidence.previous;
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
const sigCompliance = !complianceLatest ? '⚠' : complianceLatest.score >= 100 ? '✓' : complianceLatest.score >= 95 ? '⚠' : '⛔';
const complianceDetail = complianceLatest
  ? `${complianceLatest.passed}/${complianceLatest.total} (${complianceLatest.score}%) ${complianceTrend} ${complianceSpark}`
  : `${complianceEvidence.state}: ${complianceEvidence.reason} — run: node scripts/ops.mjs compliance-velocity`;

const buildGeniusBoxFromMarkdown = (markdown) =>
  renderStartupGeniusBlock(markdown, { top, row, blank, bot });

function buildPortfolioBoxLines() {
  return loadPortfolioTaskBoardBlock({ root });
}

function buildOrchestratorBox() {
  // S236 audit #10 — never render the founder tile from a stale fleet picture:
  // refresh the conductor snapshot inline when >6h old (cheap, <5s, idempotent).
  // Failure keeps the stale data; the age badge below stays honest either way.
  try {
    const pre = readJson(path.join(root, 'portfolio', 'ACTIVE_SESSIONS.json'), null);
    const ageMin = pre?._generatedAt ? (Date.now() - new Date(pre._generatedAt).getTime()) / 60000 : Infinity;
    if (ageMin > 360) {
      spawnSync(process.execPath, [path.join(root, 'scripts', 'studio-conductor.mjs')], { timeout: 30000, windowsHide: true, stdio: 'ignore' });
    }
  } catch { /* badge stays honest */ }
  return renderOrchestratorBlock({ root, node });
}

// ── FOUNDER UNLOCKS — outstanding human actions that reopen sprint surface ───
function buildFounderUnlocksBox() {
  return renderFounderUnlocksBlock({ root, taskBoard });
}

// ── IGNIS INSIGHT summary ─────────────────────────────────────────────────────
const ignisInsight = (() => { try { return loadIgnisInsight({ studioRoot: root }); } catch { return { present: false }; } })();

function buildIgnisInsightBox() {
  return renderIgnisInsightBlock(ignisInsight);
}

// ── External signal summary ──────────────────────────────────────────────────
function buildExternalSignalsBox() {
  return renderExternalSignalsBlock({ root });
}

// ── Genius list: call generate-genius-list.mjs --brief ────────────────────────
let geniusBlock = '';
try {
  // --top 8: the brief is a fast-boot surface and must stay under the 15KB hard
  // budget (validate-brief-format). Full ranked list lives in docs/GENIUS_LIST.md.
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

// ── Brief integrity self-assertion (S142 audit item 2) ──────────────────────
// The brief is the SOLE context source for every session. A three-way coherence
// check makes silent staleness impossible: the SIL log, PROJECT_STATUS.json, and
// the rendered headline must agree on the latest session. On divergence we either
// self-heal (PROJECT_STATUS lag) or render a ⛔ STALE BRIEF banner that the
// validator turns into a hard /start stop.
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
  // PROJECT_STATUS.json lagged the SIL log (the historical failure mode). Self-heal it.
  try {
    const statusPath = path.join(root, 'context', 'PROJECT_STATUS.json');
    const live = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    // Sync ONLY the session number. silScore/silCategoriesV3 are owned by the
    // closeout SIL scorer — writing silScore here would desync it from the
    // category breakdown (tier1-sil-migration invariant: score == sum(categories)).
    live.currentSession = silMaxSession;
    fs.writeFileSync(statusPath, JSON.stringify(live, null, 2) + '\n', 'utf8');
    console.log(`  ↻ self-heal: PROJECT_STATUS.currentSession ${statusLatest} → ${silMaxSession} (synced from SIL log)`);
  } catch (e) {
    console.warn(`  ⚠ could not self-heal PROJECT_STATUS.json: ${e.message}`);
  }
}
const staleBanner = briefCoherent ? null : [
  top('⛔ STALE BRIEF — DO NOT TRUST'),
  row(staleReason),
  row('Repair: node scripts/render-startup-brief.mjs  (then re-run /start)'),
  bot(),
].join('\n');

// ── Build the brief ───────────────────────────────────────────────────────────
const pct = silTotal > 0 ? `${Math.round(silTotal / silMax * 100)}%` : '?%';

const lines = [
  `<!-- generated-by: scripts/render-startup-brief.mjs v${STARTUP_BRIEF_VERSION} -->`,
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
    tests: testSignal.detail,
    deploy: status.lastDeployStatus || 'N/A',
  }),
  ``,
  ...(Array.isArray(status.testingSurfaces) && status.testingSurfaces.length
    ? [renderTestItNow({ name: status.name || 'Studio Ops', testingSurfaces: status.testingSurfaces }), ``]
    : []),
  // S126 audit #28: PROJECT_PROFILE lens header
  renderProfileLensHeader(),
  ``,
  // ── SCORE box (v4.0 — 10-category breakdown + sparklines) ──────────────────
  renderStartupScoreBlock({
    silTotal, silMax, bar24, pct, avg3Raw, velocity, velTrend, silStreak,
    daysSinceActive, daysSinceClosedOut, velHistBar, sparkline, velLast5,
    bar10, spark, trend, catHistory, cat3, lastDev, lastAlign, lastMomentum,
    lastEngage, lastProcess, lastCoherence, lastSecurity, lastEcosystem,
    lastCapital, lastAutomation,
  }),
  ``,
  // ── WHERE WE LEFT OFF ──────────────────────────────────────────────────────
  top(`WHERE WE LEFT OFF  ·  Session ${currentSession - 1}`),
  row(`Shipped:  ${shippedLine.slice(0, W - 10)}`),
  // S181 [audit #2] — was `${testsTotal} passing`, which labelled the TOTAL as
  // PASSING (179 "passing" while 10 failed) — a CANON-031 lying surface that
  // contradicted the SIGNALS block. Show passing/total, matching testsLabel.
  row(`Tests:    ${typeof status.testsPassing === 'number' ? `${status.testsPassing}/${status.testsTotal ?? '?'}` : (status.testsTotal ?? '?')} passing  ·  Deploy: ${status.lastDeployStatus || 'N/A'}`),
  bot(),
  ``,
  // ── CONTEXT METER (S119 founder directive — was buried, now first-class) ──
  renderStartupContextMeterBlock(meter, { row, top, bot }),
  ``,
  // ── SIGNALS ────────────────────────────────────────────────────────────────
  // S220 audit #7 — the SIGNALS rows also persist to context/SIGNALS.md (see
  // writeSignalsArtifact below): that file is the single-file producer brief v5's
  // 'signals' computed block was gated on since S209 (v5 resolver already reads it).
  ...writeSignalsArtifact([
    top('SIGNALS'),
    row(`${sigTests}  Tests         ${testsLabel}`),
    row(`${sigVel}  Velocity      ${velocity} ${velTrend}  ·  Debt: ${debtRaw}`),
    row(`${sigRun}  Runway        ${runwayRaw}`),
    // Headroom moved to dedicated CONTEXT METER block above (S119).
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
    row(`${sigCodexTrust}  Codex trust   ${codexTrustDetail}`),
    row(`${sigCanonAdoption}  Canon adopt.  ${canonAdoptionDetail}`),
    row(`${sigCost}  Cost          ${costDetail}`),
    bot(),
  ]),
  ``,
  // ── IGNIS INSIGHT ──────────────────────────────────────────────────────────
  ...(buildIgnisInsightBox() ? [buildIgnisInsightBox(), ``] : []),
  // ── EXTERNAL SIGNALS ───────────────────────────────────────────────────────
  ...(buildExternalSignalsBox() ? [buildExternalSignalsBox(), ``] : []),
  // ── FOUNDER UNLOCKS ────────────────────────────────────────────────────────
  ...(buildFounderUnlocksBox() ? [buildFounderUnlocksBox(), ``] : []),
  // ── PORTFOLIO TASK BOARDS ──────────────────────────────────────────────────
  ...(buildPortfolioBoxLines() ? [buildPortfolioBoxLines(), ``] : []),
  // ── ORCHESTRATOR ───────────────────────────────────────────────────────────
  buildOrchestratorBox(),
  ``,
  // ── PREDICTION ─────────────────────────────────────────────────────────────
  ...(planFresh && planPredSIL ? [
    top('PREDICTION  ·  SESSION_PLAN.md'),
    row(`Next session:  ${planPredSIL}${planTrend ? `  ·  ${planTrend}` : ''}`),
    row(`Scope cap:     ${planCap ?? scopeCap ?? '?'} tasks`),
    bot(),
    ``,
  ] : []),
  ...renderExecutionPlanBlock({ intentLine, repoTouchLine, yieldLine }),
  // Now/Next/Blocked buckets removed — Unified Genius List is the single
  // recommendation surface. Blocked count surfaces in SIGNALS + GENIUS LIST.
  ...renderHumanPressureBlock(topPressure),
  // ── v4.0: SESSION VOICE (personable cue) ────────────────────────────────────
  // Suppressed S116 #623 — low-signal flavor block was pushing brief over the
  // 15KB brief-golden cap. v4.1 spec already drops this. Re-enable behind a
  // flag if needed, but keep brief lean for token-cost reasons.
  ...[],
  // ── v4.0: MOMENTUM METER (velocity + intent + streak + cost) ────────────────
  ...renderMomentumMeterBlock({ velHistBar, velocity, velTrend, intentPct, streak, cacheHitPct, weeklyCost }),
  // ── SIL FORECAST (S114 audit #3) ──────────────────────────────────────────
  ...renderSilForecastBlock({ root, velocity, currentTotal: silTotal, blockerPressure: 87, contextAge: 0 }),
  // ── GENIUS HIT LIST ────────────────────────────────────────────────────────
  geniusBlock,
  ``,
  `\`\`\``,
  ``,
  `---`,
  ``,
  `*Generated by \`scripts/render-startup-brief.mjs v${STARTUP_BRIEF_VERSION}\` · Session ${currentSession - 1} closeout · ${today}*`,
  `*Run \`node scripts/ops.mjs doctor\` for live health check · \`node scripts/ops.mjs genius-list\` to refresh hit list*`,
];

let briefBody = await writeStartupBriefWithTelemetry({
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
  signals: [
    `tests ${sigTests}`, `velocity ${sigVel}`, `runway ${sigRun}`,
    `genome ${sigGenome}`, `entropy ${sigEntropy}`, `cdr ${sigCdr}`,
    `patterns ${sigPatterns}`, `templates ${sigVer}`, `revenue ${sigRev}`,
  ],
  today,
  rendererVersion: STARTUP_BRIEF_VERSION,
});
const profileReceipt = resolveProjectProfile({
  profile: readJson(path.join(root, '.cache', 'project-profile.json'), null),
  status,
});
writeStartupSourceReceipt(root, buildStartupSourceReceipt({
  body: briefBody,
  rendererVersion: STARTUP_BRIEF_VERSION,
  targetSession: currentSession,
  sourceSession: currentSession - 1,
  sources: {
    projectProfile: { medium: profileReceipt.medium, stage: profileReceipt.stage, source: profileReceipt.source },
    truth: { status: truthStatus, classification: classifyQualifiedStatus(truthStatus).state },
    compliance: { state: complianceEvidence.state, snapshots: complianceSnapshots.length },
    revenue: { source: path.relative(root, revenueSignalsPath).replace(/\\/g, '/'), ageDays: revAge },
    context: { confidence: meter.confidence || 'unknown', recommendation: meter.recommendation, measured: meter.pctUsed != null },
    tests: { command: resolvePrimaryTestCommand(status, packageJson), stale: testsStale },
  },
  claims: [
    { id: 'sil-avg3', rendered: `Avg3: ${avg3Raw ?? '?'}` },
    { id: 'notional-cost', rendered: 'flat-rate Max Plan' },
  ],
}));
