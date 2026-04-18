#!/usr/bin/env node
/**
 * plan-next-session.mjs
 *
 * Predictive session planner. Reads SIL history + current state and generates
 * docs/SESSION_PLAN.md — an AI-optimized agenda for the next session including:
 *   - Predicted SIL score range (regression on last 10 sessions)
 *   - Recommended scope (based on velocity cap)
 *   - Priority-sorted task agenda (Now items ranked by stake)
 *   - Risk flags (entropy, staleness, skip counters)
 *   - Estimated outcome by item count
 *
 * Usage:
 *   node scripts/plan-next-session.mjs
 *   node scripts/plan-next-session.mjs --think          → Opus 4.6 extended thinking for richer predictions
 *   node scripts/ops.mjs session-plan
 *   node scripts/ops.mjs session-plan --think
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { MODELS, buildThinkingConfig, withCache, callClaude, logMetrics } from './lib/model-router.mjs';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, '..');
const thinkMode  = process.argv.includes('--think');

// ── Helpers ───────────────────────────────────────────────────────────────────
function readJson(p, fb = {}) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; }
}
function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}
function extractBetween(content, start, end) {
  const si = content.indexOf(start);
  const ei = content.indexOf(end);
  if (si === -1 || ei === -1 || ei <= si) return '';
  return content.slice(si + start.length, ei).trim();
}
function extractSection(content, heading) {
  const parts = content.split(/^## /m);
  const match = parts.find(p => p.startsWith(heading));
  if (!match) return '';
  const nl = match.indexOf('\n');
  return nl === -1 ? '' : match.slice(nl + 1);
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ── Load sources ──────────────────────────────────────────────────────────────
const status    = readJson(path.join(ROOT, 'context', 'PROJECT_STATUS.json'));
const silText   = readText(path.join(ROOT, 'context', 'SELF_IMPROVEMENT_LOOP.md'));
const taskBoard = readText(path.join(ROOT, 'context', 'TASK_BOARD.md'));
const handoff   = readText(path.join(ROOT, 'context', 'LATEST_HANDOFF.md'));

// ── Parse SIL entry history ───────────────────────────────────────────────────
// Matches: ## YYYY-MM-DD — Session N | Total: NNN/500 | Velocity: N
const SIL_ENTRY = /^## (\d{4}-\d{2}-\d{2}) — Session (\d+) \| Total: (\d+)\/500 \| Velocity: (\d+)/gm;
const history = [];
let m;
while ((m = SIL_ENTRY.exec(silText)) !== null) {
  history.push({
    date: m[1],
    session: parseInt(m[2]),
    total: parseInt(m[3]),
    velocity: parseInt(m[4]),
  });
}
history.sort((a, b) => a.session - b.session);
// Use last 10 entries
const recent = history.slice(-10);
const last3  = history.slice(-3);

// ── Parse Rolling Status header ───────────────────────────────────────────────
const silHeader = extractBetween(silText, '<!-- rolling-status-start -->', '<!-- rolling-status-end -->');
const lastVelocity = parseInt(silHeader.match(/Velocity:\s*(\d+)/)?.[1] ?? '') || (last3.at(-1)?.velocity ?? 5);
const runway       = silHeader.match(/Momentum runway:\s*([^\|]+)/)?.[1]?.trim() ?? 'unknown';
const intentRate   = silHeader.match(/Intent rate:\s*([^\n|]+)/)?.[1]?.trim() ?? 'unknown';

// ── Parse task board ──────────────────────────────────────────────────────────
function parseUnifiedItems(markdown) {
  const unifiedSection = extractSection(markdown, 'Unified Genius List');
  if (!unifiedSection) return [];
  const rows = unifiedSection.split(/\r?\n/).filter(l => /^\|\s*[\d.]+\s*\|/.test(l));
  return rows.map((row) => {
    const cells = row.split('|').map(c => c.trim());
    if (cells.length < 7) return null;
    const [, rank, tierCell, cat, status, effort, item] = cells;
    let tier = 'medium';
    if (tierCell.includes('🔥')) tier = 'critical';
    else if (tierCell.includes('⚡')) tier = 'high';
    else if (tierCell.includes('🔧')) tier = 'low';
    const titleMatch = item.match(/\*\*(.+?)\*\*/);
    return {
      rank: parseFloat(rank),
      tier,
      cat: cat.toLowerCase(),
      status: status.toLowerCase(),
      effort,
      item,
      title: (titleMatch ? titleMatch[1] : item).replace(/\s+/g, ' ').trim(),
    };
  }).filter(Boolean);
}

const unifiedItems = parseUnifiedItems(taskBoard);
const openNow = unifiedItems.filter(i => i.status === 'unblocked');
const openBlocked = unifiedItems.filter(i =>
  ['human-blocked', 'cross-repo-locked', 'externally-blocked', 'blocked-on-hub'].includes(i.status)
).length;

// ── Predictive model (linear regression on recent totals) ─────────────────────
function linearRegression(points) {
  // points: [{x, y}]
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 460 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

const points = recent.map((e, i) => ({ x: i, y: e.total }));
const { slope, intercept } = linearRegression(points);
const nextX = points.length;
const predictedBase = Math.round(intercept + slope * nextX);
const stdDev = recent.length > 1
  ? Math.sqrt(recent.reduce((s, e, i) => s + Math.pow(e.total - (intercept + slope * i), 2), 0) / recent.length)
  : 10;

const intentPct = parseFloat(intentRate.match(/(\d+)%/)?.[1] ?? '100');
const intentFactor = clamp(intentPct / 100, 0.55, 1);
const predicted = Math.round(predictedBase - ((1 - intentFactor) * stdDev * 0.8));
const adjustedStdDev = Math.max(4, stdDev * (0.55 + (0.45 * intentFactor)));
const predLow  = Math.max(0,   Math.round(predicted - adjustedStdDev));
const predHigh = Math.min(500, Math.round(predicted + adjustedStdDev));
const trendDir = slope > 1 ? '↑ improving' : slope < -1 ? '↓ declining' : '→ stable';

// ── Scope cap ─────────────────────────────────────────────────────────────────
const scopeCapBase = Math.floor(lastVelocity * 1.5);
const scopeCap = Math.max(1, Math.floor(scopeCapBase * intentFactor));
const avgVelocity3 = last3.length > 0
  ? Math.round(last3.reduce((s, e) => s + e.velocity, 0) / last3.length)
  : lastVelocity;

// ── Score potential of each task ──────────────────────────────────────────────
// Simple heuristics: SIL items > SEC/DEPTH/SPEED > regular; newer items score higher
function scoreTask(line) {
  let s = 10;
  if (/\[SIL\]/.test(line)) s += 15;
  if (/\[SEC\]|\[SECURITY\]/.test(line)) s += 12;
  if (/\[DEPTH\]/.test(line)) s += 10;
  if (/\[SPEED\]/.test(line)) s += 8;
  if (/\[UX\]/.test(line)) s += 8;
  if (/\[FEEDBACK\]/.test(line)) s += 7;
  const sessionM = line.match(/\(NEW S(\d+)/);
  if (sessionM) {
    const age = (status.currentSession ?? 59) - parseInt(sessionM[1]);
    s += Math.min(20, age * 2); // urgency pressure from age
  }
  return s;
}

function tierScore(tier) {
  return tier === 'critical' ? 20 : tier === 'high' ? 12 : tier === 'medium' ? 6 : 2;
}
const scoredNow = openNow
  .map((item) => ({
    text: `${item.title} [${item.cat}]`.slice(0, 90),
    score: scoreTask(item.item) + tierScore(item.tier) + Math.max(0, 10 - item.rank),
  }))
  .sort((a, b) => b.score - a.score);

// ── Risk flags ────────────────────────────────────────────────────────────────
const risks = [];
const ignisAge = status.ignisLastComputed
  ? Math.floor((Date.now() - new Date(status.ignisLastComputed)) / 86400000)
  : 999;
if (ignisAge >= 7)  risks.push(`⚠ IGNIS age: ${ignisAge}d — re-score recommended`);
if (ignisAge >= 14) risks.push(`⛔ IGNIS age: ${ignisAge}d — staleness guard will open CI issue`);
const silSkip2 = (taskBoard.match(/\[SIL:2⛔\]/g) || []).length;
if (silSkip2 > 0)   risks.push(`⛔ ${silSkip2} SIL item(s) at [SIL:2⛔] — must move to Now`);
const silSkip1 = (taskBoard.match(/\[SIL:1\]/g) || []).length;
if (silSkip1 > 0)   risks.push(`⚠ ${silSkip1} SIL item(s) at [SIL:1] — increment or action`);
if (status.entropyScore >= 0.6) risks.push(`⛔ Protocol entropy ${status.entropyScore} — maintenance sprint recommended`);
else if (status.entropyScore >= 0.3) risks.push(`⚠ Protocol entropy ${status.entropyScore} — drifting`);
if (openNow.length === 0) risks.push(`⚠ Now bucket empty — pre-load before starting work`);
if (slope < -2) risks.push(`⛔ SIL trend declining (slope ${slope.toFixed(1)} pts/session) — investigate gaps`);
if (intentPct < 70) risks.push(`⚠ Intent completion rate ${intentPct}% — under 70% threshold`);

// ── Estimated outcomes at different scope levels ──────────────────────────────
function estimatedScore(items) {
  // Higher velocity → higher momentum score → better total
  const momentumBoost = Math.min(30, items * 3);
  return Math.round(predicted + momentumBoost / 2);
}

// ── Build output ──────────────────────────────────────────────────────────────
const today   = new Date().toISOString().slice(0, 10);
const nextSess = (status.currentSession ?? 59) + 1;

const outLines = [
  `<!-- generated-by: scripts/plan-next-session.mjs -->`,
  `<!-- generated-at: ${today} -->`,
  ``,
  `# Session Plan — Session ${nextSess}`,
  ``,
  `> Auto-generated at Session ${nextSess - 1} closeout · ${today}.`,
  `> Recalculate with \`node scripts/ops.mjs session-plan\` after any task board change.`,
  ``,
  `---`,
  ``,
  `## Prediction`,
  ``,
  `\`\`\``,
  `Predicted SIL:  ${predLow}–${predHigh}/500  (regression on last ${recent.length} sessions)`,
  `Trend:          ${trendDir}  (slope ${slope.toFixed(1)} pts/session)`,
  `Scope cap:      ${scopeCap} tasks  (base ${scopeCapBase} × intent factor ${intentFactor.toFixed(2)})`,
  `Avg velocity:   ${avgVelocity3} tasks/session  (last 3)`,
  `Intent rate:    ${intentRate}`,
  `Runway:         ${runway}`,
  `\`\`\``,
  ``,
  `| Scope | Predicted score | Confidence |`,
  `|---|---|---|`,
  `| ${Math.min(scopeCap, 3)} tasks (conservative) | ~${estimatedScore(3)}/500 | Higher |`,
  `| ${Math.min(scopeCap, 5)} tasks (moderate) | ~${estimatedScore(5)}/500 | Medium |`,
  `| ${scopeCap} tasks (full cap) | ~${estimatedScore(scopeCap)}/500 | Lower |`,
  ``,
  `---`,
  ``,
  `## Recommended Agenda (priority order)`,
  ``,
  `### Now bucket (${scoredNow.length} items)`,
  ``,
  ...(scoredNow.length > 0
    ? scoredNow.map((t, i) => `${i + 1}. **[stake:${t.score}]** ${t.text}`)
    : ['*(Now bucket empty — pull from Next)*']),
  ``,
  `---`,
  ``,
  `## Risk Flags`,
  ``,
  ...(risks.length > 0 ? risks.map(r => `- ${r}`) : ['- ✓ No active risk flags']),
  ``,
  `---`,
  ``,
  `## Session Scope Gate`,
  ``,
  `At session start, compare declared scope items to **cap: ${scopeCap}**. Items beyond cap should be deferred unless a blocker makes them highest-priority.`,
  ``,
  `**Open blockers:** ${openBlocked} items in Blocked bucket`,
  ``,
  `---`,
  ``,
  `*Generated by \`scripts/plan-next-session.mjs\` · Session ${nextSess - 1} closeout · ${today}*`,
  ``,
];

const outPath = path.join(ROOT, 'docs', 'SESSION_PLAN.md');

// ── Extended thinking enhancement (--think flag) ───────────────────────────────
// Uses scripts/lib/model-router.mjs: callClaude + buildThinkingConfig + prompt
// caching on the stable Studio OS protocol block (≈90% token savings on repeat).
async function enrichWithThinking(baseLines) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('⚠  --think requires ANTHROPIC_API_KEY'); return baseLines; }

  console.log('  Querying Opus 4.6 with extended thinking for deeper analysis...');

  const contextSummary = [
    `Session: ${nextSess}. SIL history: ${recent.map(e => e.total).join(', ')}`,
    `Velocity: ${lastVelocity}. Trend: ${trendDir}. Runway: ${runway}.`,
    `Open Now items: ${openNow.length}. Risk flags: ${risks.join('; ')}`,
    `Task scores: ${scoredNow.slice(0, 5).map(t => t.text.slice(0, 60)).join('; ')}`,
    `Predicted range: ${predLow}–${predHigh}/500.`,
  ].join('\n');

  const systemBlocks = [
    { type: 'text',
      text: 'You are the Studio OS Session Planner. Provide deep strategic analysis for the next session based on the data. Be specific and actionable. Format as markdown sections.' },
    withCache({
      type: 'text',
      text: [
        'Studio OS protocol context (stable across sessions — safe to cache):',
        '',
        '- SIL is the 5-category /500 scoring rubric: Dev Health, Creative Alignment, Momentum, Engagement, Process Quality.',
        '- Velocity = number of tasks checked off in the session.',
        '- Runway = open Now-bucket items ÷ recent avg velocity. Runway ≤ 2.0 is a ⛔ flag.',
        '- Scope cap = floor(lastVelocity × 1.5). Declared session scope must fit in the cap.',
        '- Intent rate = % of declared session intents achieved (target ≥ 70%).',
        '- [SIL:N] skip counters: 0 fresh / 1 warn / 2⛔ must escalate to Now.',
        '- Sparkline trajectory > total score — 3 sessions of decline is a signal to intervene.',
        '- Genome dimensions track 25 protocol compliance fields; any drop is a regression.',
        '- Entropy > 0.3 elevated, > 0.6 critical — protocol drift signal.',
        '- IGNIS score measures project intelligence; ≥7d stale warrants re-score.',
      ].join('\n'),
    }),
  ];

  try {
    const parsed = await callClaude({
      apiKey,
      model:     MODELS.opus,
      maxTokens: 4000,
      system:    systemBlocks,
      messages:  [{ role: 'user', content: `Analyse this session data and provide: (1) 2-3 strategic insights about session health, (2) the single highest-leverage item to complete, (3) one risk to watch, (4) confidence level for the prediction. Be concise.\n\n${contextSummary}` }],
      thinking:  buildThinkingConfig(8000),
    }, https);
    const text = parsed.content?.find(b => b.type === 'text')?.text ?? '';
    if (!text) return baseLines;
    const usage = parsed.usage ?? {};
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheCreate = usage.cache_creation_input_tokens ?? 0;
    if (cacheRead > 0)        process.stderr.write(`  ✓ Cache hit: ${cacheRead} tokens read from cache\n`);
    else if (cacheCreate > 0) process.stderr.write(`  ✓ Cache created: ${cacheCreate} tokens cached for next 5 min\n`);
    logMetrics({ script: 'plan-next-session', mode: 'think', model: MODELS.opus, usage });
    return [...baseLines, '', '---', '', '## Strategic Intelligence (Opus 4.6 Extended Thinking)', '', text, ''];
  } catch (e) {
    console.error(`  API error: ${e.message}`);
    return baseLines;
  }
}

const finalLines = thinkMode ? await enrichWithThinking(outLines) : outLines;
fs.writeFileSync(outPath, finalLines.join('\n'), 'utf8');
console.log(`✓ Session plan → docs/SESSION_PLAN.md${thinkMode ? ' (with Opus thinking)' : ''}`);
console.log(`  S${nextSess} · predicted ${predLow}–${predHigh}/500 · cap ${scopeCap} tasks · ${risks.length} risk flag(s)`);
