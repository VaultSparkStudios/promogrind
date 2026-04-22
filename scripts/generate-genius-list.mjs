#!/usr/bin/env node
/**
 * generate-genius-list.mjs
 *
 * Pattern-based genius hit list generator.
 * Reads live state from 10+ sources, runs pattern detectors, scores
 * and ranks items to produce a fresh top-8 list every session.
 *
 * Usage:
 *   node scripts/generate-genius-list.mjs           → writes docs/GENIUS_LIST.md
 *   node scripts/generate-genius-list.mjs --brief   → outputs formatted text block (for startup brief)
 *   node scripts/generate-genius-list.mjs --json    → outputs JSON to stdout
 *   node scripts/ops.mjs genius-list
 *   node scripts/generate-genius-list.mjs --think   → Opus 4.6 extended thinking for deeper synthesis
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { MODELS, buildThinkingConfig, withCache, callClaude, logMetrics } from './lib/model-router.mjs';
import { rankItems as ignisRank, isLiveRankingAvailable } from './lib/ignis-rank.mjs';
import { loadPortfolioTaskBoards } from './lib/cross-repo-tasks.mjs';
import { resolveCapability } from './lib/secrets.mjs';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, '..');

const jsonMode   = process.argv.includes('--json');
const briefMode  = process.argv.includes('--brief');
const thinkMode  = process.argv.includes('--think');
const portfolioMode = process.argv.includes('--portfolio');
const noCrossRepo = process.argv.includes('--no-cross-repo');
const localOnly = process.argv.includes('--local-only');
const projectIdx = process.argv.indexOf('--project');
const projectArg = projectIdx !== -1 ? process.argv[projectIdx + 1] : null;
const topIdxA    = process.argv.indexOf('--top');
const TOP_N     = topIdxA !== -1 ? parseInt(process.argv[topIdxA + 1]) : 12;
const W         = 64; // box inner width
const ACTIONABLE_STATUSES = new Set(['unblocked', 'now']);

// ── Helpers ───────────────────────────────────────────────────────────────────
function readText(p)       { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function readJson(p, fb)   { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function daysBetween(a, b) { try { return Math.floor((new Date(b) - new Date(a)) / 86400000); } catch { return 999; } }
function extractSection(content, heading) {
  const parts = content.split(/^## /m);
  const match = parts.find(p => p.startsWith(heading));
  if (!match) return '';
  const nl = match.indexOf('\n');
  return nl === -1 ? '' : match.slice(nl + 1);
}
function extractBetween(content, start, end) {
  const s = content.indexOf(start); const e = content.indexOf(end);
  if (s === -1 || e === -1 || e <= s) return '';
  return content.slice(s + start.length, e).trim();
}
function statusKey(value) {
  return String(value || 'unblocked').trim().toLowerCase();
}
function isActionableStatus(value) {
  return ACTIONABLE_STATUSES.has(statusKey(value));
}

function normPath(p) {
  if (!p) return '';
  return path.resolve(p).toLowerCase().replace(/\\/g, '/');
}

function resolveActiveProject(projects) {
  const cwd = normPath(process.cwd());
  const root = normPath(ROOT);
  const explicit = projectArg?.trim();
  if (explicit) {
    const bySlug = projects.find(p => p.slug === explicit || p.name === explicit);
    if (bySlug) return bySlug;
    const explicitPath = normPath(path.resolve(process.cwd(), explicit));
    return projects.find(p => normPath(p.localPath) === explicitPath || explicitPath.startsWith(`${normPath(p.localPath)}/`)) ?? null;
  }
  if (cwd !== root) {
    return projects.find(p => {
      const local = normPath(p.localPath);
      return local && (cwd === local || cwd.startsWith(`${local}/`));
    }) ?? null;
  }
  return null;
}

// ── Load state ────────────────────────────────────────────────────────────────
const today    = new Date().toISOString().slice(0, 10);
const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
const activeProject = resolveActiveProject(registry.projects ?? []);
const PROJECT_ROOT = activeProject?.localPath ? path.resolve(activeProject.localPath) : ROOT;
const projectScoped = Boolean(activeProject);
const status   = readJson(path.join(PROJECT_ROOT, 'context', 'PROJECT_STATUS.json'), readJson(path.join(ROOT, 'context', 'PROJECT_STATUS.json'), {}));
const sil      = readText(path.join(PROJECT_ROOT, 'context', 'SELF_IMPROVEMENT_LOOP.md')) || readText(path.join(ROOT, 'context', 'SELF_IMPROVEMENT_LOOP.md'));
const taskBoard = readText(path.join(PROJECT_ROOT, 'context', 'TASK_BOARD.md')) || readText(path.join(ROOT, 'context', 'TASK_BOARD.md'));
const handoff  = readText(path.join(PROJECT_ROOT, 'context', 'LATEST_HANDOFF.md')) || readText(path.join(ROOT, 'context', 'LATEST_HANDOFF.md'));
const genome   = readJson(path.join(ROOT, 'context', 'GENOME_HISTORY.json'), { snapshots: [] });
const revSig   = readText(path.join(ROOT, 'portfolio', 'REVENUE_SIGNALS.md')) || readText(path.join(ROOT, 'docs', 'REVENUE_SIGNALS.md'));
const sessionPlan = readText(path.join(ROOT, 'docs', 'SESSION_PLAN.md'));
const cdr      = readText(path.join(ROOT, 'docs', 'CREATIVE_DIRECTION_RECORD.md'));
const faq      = readText(path.join(ROOT, 'docs', 'PROTOCOL_FAQ.md'));
const brainstormArchive = readText(path.join(ROOT, 'docs', 'BRAINSTORM_ARCHIVE.md'));
const doctorDate = status.doctorScore?.date ?? null;
const rolloutScoreboard = readJson(path.join(ROOT, 'portfolio', 'compiled', 'ROLLOUT_SCOREBOARD.json'), null);
const releaseGates = readJson(path.join(ROOT, 'portfolio', 'compiled', 'RELEASE_GATES.json'), null);
const capacityPlan = readJson(path.join(ROOT, 'portfolio', 'compiled', 'CAPACITY_PLAN.json'), null);
const feedbackDashboard = readJson(path.join(ROOT, 'portfolio', 'compiled', 'FEEDBACK_LOOP_DASHBOARD.json'), null);
const socialReady = (() => {
  try {
    const reddit = resolveCapability('social.reddit');
    const twitter = resolveCapability('social.twitter');
    return { ok: reddit.ok && twitter.ok, reddit, twitter };
  } catch {
    return { ok: false, reddit: { ok: false }, twitter: { ok: false } };
  }
})();

function parseGeniusMarkdown(content) {
  const sections = content.split(/^## /m).slice(1);
  return sections.map((section) => {
    const titleLine = section.split('\n')[0]?.trim() ?? '';
    const title = titleLine.replace(/^[^\s]+\s+#\d+\s+/, '').trim();
    const score = parseInt(section.match(/\*\*Score:\*\*\s*(\d+)/)?.[1] ?? '0', 10);
    const tier = section.match(/\*\*Tier:\*\*\s*([^·\n]+)/)?.[1]?.trim() ?? 'UNKNOWN';
    const category = section.match(/\*\*Category:\*\*\s*([^·\n]+)/)?.[1]?.trim() ?? 'unknown';
    const rationale = section.split('\n').find(line => line && !line.startsWith('**Tier:**') && !line.startsWith('```'))?.trim() ?? '';
    return { title, score, tier, category, rationale };
  }).filter(item => item.title);
}

if (portfolioMode) {
  const portfolioRows = [];

  for (const project of registry.projects ?? []) {
    if (!project.localPath) continue;
    const geniusPath = path.join(project.localPath, 'docs', 'GENIUS_LIST.md');
    const statusPath = path.join(project.localPath, 'context', 'PROJECT_STATUS.json');
    if (!fs.existsSync(geniusPath)) continue;

    const geniusItems = parseGeniusMarkdown(readText(geniusPath)).slice(0, 3);
    const projectStatus = readJson(statusPath, {});
    for (const item of geniusItems) {
      const silBoost = Math.round((projectStatus.silScore ?? 0) / 25);
      const ignisBoost = Math.round((projectStatus.ignisScore ?? 0) / 5000);
      portfolioRows.push({
        project: project.name ?? project.slug,
        slug: project.slug,
        title: item.title,
        category: item.category,
        tier: item.tier,
        score: item.score,
        combinedScore: item.score + silBoost + ignisBoost,
        rationale: item.rationale,
      });
    }
  }

  const rankedPortfolio = portfolioRows
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, TOP_N);

  if (jsonMode) {
    console.log(JSON.stringify({ date: today, mode: 'portfolio', ranked: rankedPortfolio }, null, 2));
    process.exit(0);
  }

  const lines = [
    '# Portfolio Genius List',
    '',
    `> Generated: ${today} | Projects scanned: ${registry.projects?.length ?? 0} | Top ${rankedPortfolio.length} shown`,
    '',
    '---',
    '',
    '| Rank | Project | Category | Item | Combined score |',
    '|---|---|---|---|---:|',
    ...rankedPortfolio.map((item, idx) =>
      `| ${idx + 1} | ${item.project} | ${item.category} | ${item.title} | ${item.combinedScore} |`
    ),
    '',
    '## Notes',
    '',
    ...rankedPortfolio.map((item, idx) => `${idx + 1}. **${item.project}** — ${item.title}. ${item.rationale}`),
    '',
    `*Generated by \`scripts/generate-genius-list.mjs --portfolio\`*`,
  ];

  const outPath = path.join(ROOT, 'portfolio', 'GENIUS_LIST.md');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`✓ Portfolio genius list → portfolio/GENIUS_LIST.md  (${rankedPortfolio.length} items)`);
  rankedPortfolio.forEach((item, idx) => {
    console.log(`  ${String(idx + 1).padStart(2)}. ${item.project} · ${item.title.slice(0, 60)}`);
  });
  process.exit(0);
}

// ── Parse SIL header ──────────────────────────────────────────────────────────
const silHeader  = extractBetween(sil, '<!-- rolling-status-start -->', '<!-- rolling-status-end -->');
const runway     = parseFloat(silHeader.match(/Runway:\s*~?([\d.]+)/)?.[1] ?? '5');
const velocity   = parseInt(silHeader.match(/Velocity:\s*(\d+)/)?.[1] ?? '2');
const intentRate = parseInt(silHeader.match(/Intent rate:\s*(\d+)%/)?.[1] ?? '100');
const silTotal   = parseInt(silHeader.match(/Total:\s*(\d+)\/500/)?.[1] ?? '400');
const currentSession = status.currentSession ?? 63;

// Parse sparkline for trend
const sparkline = silHeader.match(/Sparkline[^:]*:\s*([▁▂▃▄▅▆▇█ ]+)/)?.[1]?.trim() ?? '';
const sparkPoints = [...sparkline].filter(c => '▁▂▃▄▅▆▇█'.includes(c))
  .map(c => '▁▂▃▄▅▆▇█'.indexOf(c));
const slopeTrend = sparkPoints.length >= 3
  ? sparkPoints[sparkPoints.length - 1] - sparkPoints[Math.max(0, sparkPoints.length - 3)]
  : 0;

// ── Parse task board ──────────────────────────────────────────────────────────
// v3.1: Unified Genius List table (tier · status · category · effort · item)
// Backward compatible with legacy Now/Next/Blocked buckets if still present.

const unifiedSection = extractSection(taskBoard, 'Unified Genius List');
const unifiedItems = []; // { tier, cat, status, effort, title, item: fullLine }
if (unifiedSection) {
  const rows = unifiedSection.split(/\r?\n/).filter(l => /^\|\s*[\d.]+\s*\|/.test(l));
  for (const row of rows) {
    const cells = row.split('|').map(c => c.trim());
    if (cells.length < 7) continue;
    const [, rank, tierCell, cat, status, effort, item] = cells;
    let tier = 'medium';
    if (tierCell.includes('🔥')) tier = 'critical';
    else if (tierCell.includes('⚡')) tier = 'high';
    else if (tierCell.includes('💡')) tier = 'medium';
    else if (tierCell.includes('🔧')) tier = 'low';
    const titleMatch = item.match(/\*\*(.+?)\*\*/);
    const title = (titleMatch ? titleMatch[1] : item).slice(0, 70);
    unifiedItems.push({ rank: parseFloat(rank), tier, cat: cat.toLowerCase(), status, effort, title, item });
  }
}

// Legacy sections (may be empty post-v3.1)
const nowSection     = extractSection(taskBoard, 'Now');
const nextSection    = extractSection(taskBoard, 'Next');
const humanSection   = extractSection(taskBoard, 'Human Action Required');
const openNow        = nowSection.split(/\r?\n/).filter(l => /^- \[ \]/.test(l));
const openNext       = nextSection.split(/\r?\n/).filter(l => /^- \[ \]/.test(l));
const actionableLegacy = line => !/\[(HUMAN|BLOCKER|EXTERNAL|OWNER)\]/i.test(line);
const actionableOpenNow = openNow.filter(actionableLegacy);
const actionableOpenNext = openNext.filter(actionableLegacy);

// v3.1: merge unblocked high/critical unified items into "openNow" for detectors
const unblockedUnifiedNow = unifiedItems.filter(i => isActionableStatus(i.status) && (i.tier === 'critical' || i.tier === 'high'));
const effectiveNow = actionableOpenNow.length > 0 ? actionableOpenNow : unblockedUnifiedNow.map(i => `- [ ] **${i.title}**`);
const effectiveNext = actionableOpenNext.length > 0 ? actionableOpenNext : unifiedItems.filter(i => i.tier === 'medium' || i.tier === 'low').slice(0, 5).map(i => `- [ ] **${i.title}**`);

const sil2Items      = [...openNow, ...openNext].filter(l => /\[SIL:2⛔\]/.test(l))
  .concat(unifiedItems.filter(i => /\[SIL:2⛔\]/.test(i.item)).map(i => `- [ ] ${i.item}`));
const humanItems     = humanSection.split(/\r?\n/).filter(l => /^- \[ \]/.test(l));
const agedHumanItems = humanItems.filter(l => {
  const m = l.match(/\(NEW S(\d+)|\(~(\d+) sessions/);
  if (!m) return false;
  if (m[1]) return (currentSession - parseInt(m[1])) >= 10;
  if (m[2]) return parseInt(m[2]) >= 10;
  return false;
});

// ── Genome drops ─────────────────────────────────────────────────────────────
const snaps = genome.snapshots ?? [];
const lastSnap = snaps[snaps.length - 1]?.dimensions ?? {};
const prevSnap = snaps[snaps.length - 2]?.dimensions ?? {};
const droppedDims = Object.entries(lastSnap)
  .filter(([k, v]) => prevSnap[k] != null && v < prevSnap[k])
  .map(([k, v]) => ({ dim: k, from: prevSnap[k], to: v, drop: prevSnap[k] - v }));

// ── IGNIS / entropy ───────────────────────────────────────────────────────────
const ignisAge     = status.ignisLastComputed ? daysBetween(status.ignisLastComputed, today) : 999;
const entropyScore = status.entropyScore ?? 0;

// ── Revenue signals freshness ─────────────────────────────────────────────────
const revMatch  = revSig.match(/Generated:\s*(\d{4}-\d{2}-\d{2})/);
const revAge    = revMatch ? daysBetween(revMatch[1], today) : 999;

// ── CDR gap check ─────────────────────────────────────────────────────────────
const lastCdrMatch      = cdr.match(/\*\*(2\d{3}-\d{2}-\d{2})\*\*/g);
const lastCdrDate       = lastCdrMatch ? lastCdrMatch[lastCdrMatch.length - 1].replace(/\*\*/g, '') : null;
const lastHandoffDate   = handoff.match(/Last updated:\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
const cdrGap            = lastCdrDate && lastHandoffDate
  ? daysBetween(lastCdrDate, lastHandoffDate) > 0 : false;

// ── Protocol version drift ────────────────────────────────────────────────────
const startVer    = readText(path.join(ROOT, 'prompts', 'start.md')).match(/template-version: ([\d.]+)/)?.[1];
const startTplVer = readText(path.join(ROOT, 'docs', 'templates', 'project-system', 'START_PROMPT.template.md')).match(/template-version: ([\d.]+)/)?.[1];
const versionDrift = startVer && startTplVer && startVer !== startTplVer;

// ── Unannounced projects ──────────────────────────────────────────────────────
const projects = registry.projects ?? [];
const unannounced = projects.filter(p => p.launchStatus === 'deployed-unannounced');

// ── Session plan risk flags ───────────────────────────────────────────────────
const planRisks = (sessionPlan.match(/^- ⚠.*$/gm) ?? []).concat(sessionPlan.match(/^- ⛔.*$/gm) ?? []);

// ── Sanitization ─────────────────────────────────────────────────────────────
const sanitCritical = status.blockers?.find(b => /sanitization/i.test(b))?.match(/(\d+) critical/)?.[1];
const criticalCount = sanitCritical ? parseInt(sanitCritical) : 0;

// ── FAQ / Oracle staleness ────────────────────────────────────────────────────
const faqLastUpdate = faq.match(/\*Generated:\s*(\d{4}-\d{2}-\d{2})/)?.[1];
const faqAge        = faqLastUpdate ? daysBetween(faqLastUpdate, today) : 999;

// ── Pattern detectors → candidate items ──────────────────────────────────────
// tier: 'critical'=100  'high'=70  'medium'=40  'low'=15
// score: tier + category + ageBonus + novelty

const candidates = [];

function add(id, tier, cat, icon, title, rationale, command = null, ageBonus = 0, meta = {}) {
  const tierScore = { critical: 100, high: 70, medium: 40, low: 15 }[tier] ?? 40;
  const catScore  = { blocker: 30, sil: 20, speed: 18, security: 18, launch: 22,
                      debt: 10, protocol: 15, intelligence: 12 }[cat] ?? 10;
  const noveltyBonus = 10; // all pattern items are context-fresh
  const score = tierScore + catScore + ageBonus + noveltyBonus;
  candidates.push({
    id, tier, cat, icon, title, rationale, command, score,
    status: meta.status ?? 'unblocked',
    effortMin: meta.effortMin ?? null,
    sourceSurface: meta.sourceSurface ?? 'TASK_BOARD',
    signals: meta.signals ?? {},
  });
}

// ── Critical: Now bucket items (always surface open Now items first) ───────────
// v3.1: pulls from effectiveNow (legacy Now bucket OR high-tier unblocked unified items)
if (effectiveNow.length > 0) {
  const top = effectiveNow[0].replace(/^- \[ \]\s*/, '').replace(/\*\*/g, '').slice(0, 55);
  add('now-1', 'critical', 'sil', '🔥',
    top,
    'Top unblocked unified-list item — highest priority this session.',
    'node scripts/ops.mjs preload', 5);
}
if (effectiveNow.length > 1) {
  const top2 = effectiveNow[1].replace(/^- \[ \]\s*/, '').replace(/\*\*/g, '').slice(0, 55);
  add('now-2', 'critical', 'sil', '🔥',
    top2,
    'Second-priority unblocked item — complete both for session velocity.',
    null, 5);
}

// ── Unified Genius List — surface top N unblocked + top blocked as candidates ──
const iconMap = { critical: '🔥', high: '⚡', medium: '💡', low: '🔧' };
for (const ui of unifiedItems.filter(i => isActionableStatus(i.status)).slice(0, 10)) {
  add(`unified-${ui.rank}`, ui.tier, ui.cat || 'protocol', iconMap[ui.tier] || '💡',
    ui.title,
    `Unified Genius List #${ui.rank} · ${ui.effort} · ${ui.cat}`,
    null, ui.tier === 'critical' ? 10 : ui.tier === 'high' ? 5 : 0);
}
// Surface high-tier blocked items so they don't vanish — IGNIS adapter will
// de-weight them via status penalty but they remain visible.
for (const ui of unifiedItems.filter(i => !isActionableStatus(i.status) && i.status !== 'done' && (i.tier === 'critical' || i.tier === 'high')).slice(0, 5)) {
  add(`unified-blocked-${ui.rank}`, ui.tier, ui.cat || 'protocol', iconMap[ui.tier] || '💡',
    ui.title,
    `BLOCKED (${ui.status}) · Unified List #${ui.rank} · ${ui.effort}`,
    null, 0,
    { status: ui.status, sourceSurface: 'TASK_BOARD' });
}

// ── Cross-repo TASK_BOARD aggregation ────────────────────────────────────────
// Stackable studio-wide view: pull top unblocked items from every project's
// context/TASK_BOARD.md so the founder's genius list surfaces the highest-
// leverage item across the whole portfolio, not just this repo.
let portfolioSummary = null;
if (!noCrossRepo) {
  try {
    portfolioSummary = loadPortfolioTaskBoards({ studioRoot: ROOT, currentRepoPath: PROJECT_ROOT });
    const CAT_MAP = {
      security: 'security', sec: 'security', launch: 'launch', blocker: 'blocker',
      blocked: 'blocker', infra: 'speed', speed: 'speed', debt: 'debt',
      protocol: 'protocol', proto: 'protocol', intelligence: 'intelligence',
      ignis: 'intelligence', sil: 'sil', automation: 'sil', legacy: 'protocol',
    };
    let surfaced = 0;
    for (const proj of portfolioSummary.byProject) {
      if (!proj.present) continue;
      if (projectScoped && !proj.isCurrent) continue;
      if (!projectScoped && proj.isCurrent) continue;
      const topUnblocked = proj.items
        .filter(i => i.bucket === 'unblocked' && isActionableStatus(i.status))
        .sort((a, b) => {
          const tierOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return (tierOrder[a.tier] ?? 4) - (tierOrder[b.tier] ?? 4);
        })
        .slice(0, 1);
      for (const it of topUnblocked) {
        if (surfaced >= 8) break;
        const icon = it.tier === 'critical' ? '🔥' : it.tier === 'high' ? '⚡' : '💡';
        const cat = CAT_MAP[it.cat] ?? 'protocol';
        add(`xrepo-${proj.slug}-${it.rank}`, it.tier, cat, icon,
          `[${proj.name || proj.slug}] ${it.title}`.slice(0, 80),
          `Cross-repo: ${proj.name || proj.slug} TASK_BOARD #${it.rank} · ${it.effort || 'no estimate'} · ${it.cat || 'uncategorised'}`,
          null, 0,
          { status: it.status || 'unblocked', sourceSurface: `xrepo:${proj.slug}:TASK_BOARD` });
        surfaced++;
      }
      if (surfaced >= 8) break;
    }
  } catch (err) {
    portfolioSummary = { error: err.message };
  }
}

// ── SIL:2⛔ escalation ────────────────────────────────────────────────────────
if (sil2Items.length > 0) {
  add('sil-escalation', 'critical', 'sil', '🔥',
    `Escalate ${sil2Items.length} [SIL:2⛔] item(s) to Now immediately`,
    `${sil2Items.length} SIL item(s) hit the 2-skip limit — must-do this session.`,
    null, 20);
}

// ── Runway critical ────────────────────────────────────────────────────────────
if (runway <= 1.5 && openNow.length < 2) {
  add('runway-critical', 'critical', 'sil', '🔥',
    'Pre-load Now bucket — runway ⛔',
    `Runway ~${runway} sessions. Move 2–3 items from Next into Now before any work.`,
    'node scripts/ops.mjs rank-tasks --bucket next', 15);
}

// ── Sanitization backlog ───────────────────────────────────────────────────────
if (criticalCount > 0) {
  add('sanitization', 'high', 'blocker', '⚡',
    `Clear sanitization backlog (${criticalCount} critical findings)`,
    `Open MindFrame, CoD, or Vorn → say \`start\` → resolve per audits/sanitization/latest/*.issue.md`,
    null, Math.min(20, criticalCount * 3));
}

// ── Declining SIL trend ────────────────────────────────────────────────────────
if (slopeTrend <= -2) {
  add('sil-decline', 'high', 'sil', '⚡',
    `Arrest SIL decline (${slopeTrend > 0 ? '+' : ''}${slopeTrend} sparkline trend)`,
    'Last 3 sessions declining. Focus on a high-velocity implementation sprint.',
    null, 10);
}

// ── IGNIS stale ───────────────────────────────────────────────────────────────
if (ignisAge >= 7) {
  const urgency = ignisAge >= 14 ? 'critical' : 'high';
  add('ignis-stale', urgency, 'intelligence', urgency === 'critical' ? '🔥' : '⚡',
    `IGNIS re-score overdue (${ignisAge}d stale)`,
    'Portfolio intelligence scores degrade with age. Re-score before CI auto-flags it.',
    'npx tsx cli.ts score <project-path>', Math.min(20, ignisAge));
}

// ── Genome dimension drop ─────────────────────────────────────────────────────
if (droppedDims.length > 0) {
  const worst = droppedDims.sort((a, b) => b.drop - a.drop)[0];
  add('genome-drop', 'high', 'protocol', '⚡',
    `Repair genome drop: ${worst.dim} (${worst.from}→${worst.to})`,
    `Protocol genome dimension dropped. Investigate and repair before it compounds.`,
    'node scripts/ops.mjs genome-history', 15);
}

// ── Revenue signals stale ─────────────────────────────────────────────────────
if (revAge > 7) {
  add('revenue-stale', 'medium', 'intelligence', '💡',
    `Refresh REVENUE_SIGNALS.md (${revAge}d stale)`,
    'Revenue intelligence is time-sensitive. Regenerate to surface current opportunities.',
    'node scripts/ops.mjs revenue-signals', Math.min(15, revAge - 7));
}

// ── CDR gap ───────────────────────────────────────────────────────────────────
if (cdrGap) {
  add('cdr-gap', 'high', 'protocol', '⚡',
    'Recover CDR gap — human directions not fully recorded',
    'Session directions are missing from docs/CREATIVE_DIRECTION_RECORD.md. Recover at closeout.',
    null, 15);
}

// ── Protocol version drift ────────────────────────────────────────────────────
if (versionDrift) {
  add('version-drift', 'high', 'protocol', '⚡',
    `Propagate template updates (start.md v${startVer} ≠ template v${startTplVer})`,
    'Prompt template version drifted from child repos. Run propagation to sync all 25.',
    'bash scripts/propagate-templates.sh --apply', 10);
}

// ── Unannounced projects with launch urgency ──────────────────────────────────
const scopedUnannounced = projectScoped
  ? unannounced.filter(p => p.slug === activeProject.slug)
  : unannounced;
if (scopedUnannounced.length > 0) {
  const oldest = scopedUnannounced[0];
  const launchStatus = socialReady.ok ? 'unblocked' : 'human-blocked';
  const launchRationale = socialReady.ok
    ? 'Projects deployed but silent = zero traction from existing work. Quick win.'
    : 'Projects deployed but silent, but social.reddit/social.twitter capabilities are missing.';
  add('launch-unannounced', 'high', 'launch', '⚡',
    `Announce ${scopedUnannounced.length} deployed-unannounced project(s) (${oldest?.name ?? ''} first)`,
    launchRationale,
    'node scripts/ops.mjs launch-momentum', scopedUnannounced.length * 5,
    { status: launchStatus, sourceSurface: 'TASK_BOARD' });
}

// ── Aged human action items ───────────────────────────────────────────────────
if (agedHumanItems.length > 0) {
  add('aged-human', 'high', 'blocker', '⚡',
    `${agedHumanItems.length} human action item(s) aged ≥10 sessions — escalate`,
    'Long-pending human tasks are blocking downstream work. Surface to Studio Owner.',
    null, 15,
    { status: 'human-blocked', sourceSurface: 'TASK_BOARD' });
}

// ── Entropy elevated ──────────────────────────────────────────────────────────
if (entropyScore > 0.5) {
  add('entropy-high', 'medium', 'protocol', '💡',
    `Protocol entropy elevated (${entropyScore.toFixed(3)})`,
    'System divergence above healthy threshold. Run a protocol cleanup or sync sprint.',
    'node scripts/ops.mjs entropy --update', 8);
}

// ── Intent rate low ───────────────────────────────────────────────────────────
if (intentRate < 70) {
  add('intent-rate', 'medium', 'sil', '💡',
    `Intent completion rate low (${intentRate}%) — reduce session scope`,
    'More sessions ending Partial than Achieved. Halve declared scope for next 2 sessions.',
    null, 10);
}

// ── Protocol FAQ stale ────────────────────────────────────────────────────────
if (faqAge > 30) {
  add('faq-stale', 'low', 'protocol', '🔧',
    `Protocol Oracle FAQ cache stale (${faqAge}d)`,
    'Refresh the 10 Q&A pairs so agents self-serve current protocol knowledge.',
    'node scripts/ops.mjs ask --list', 5);
}

// ── Orphaned brainstorm ideas (from archive if available) ─────────────────────
if (brainstormArchive) {
  const recentHighOrphans = (brainstormArchive.match(/^\- \*\*.+\*\* \*\(mentioned .* last S(\d+)\)\*/gm) ?? [])
    .filter(line => {
      const match = line.match(/last S(\d+)/);
      return match && (currentSession - parseInt(match[1], 10) <= 6);
    });
  if (recentHighOrphans.length > 0) {
    add('orphaned-ideas', 'medium', 'sil', '💡',
      `Convert top orphaned brainstorm idea to TASK_BOARD`,
      `${recentHighOrphans.length} recent high-priority orphan idea(s) remain uncommitted in BRAINSTORM_ARCHIVE.md.`,
      'node scripts/ops.mjs brainstorm-archive', 8);
  }
}

// ── Doctor / health check (standing recommendation) ──────────────────────────
if (doctorDate !== today) {
  add('run-doctor', 'medium', 'speed', '💡',
    'Run ops.mjs doctor — full studio health check before planning',
    'One command runs all validators. Use at session start to catch issues early.',
    'node scripts/ops.mjs doctor', 0);
}

// ── Rollout scoreboard ────────────────────────────────────────────────────────
if (rolloutScoreboard?.pilots) {
  const missingPilotManifests = rolloutScoreboard.pilots.filter(item => !item.manifestPresent);
  const laggingPilots = rolloutScoreboard.pilots.filter(item => item.score < 70);
  if (missingPilotManifests.length > 0) {
    add('pilot-manifest-rollout', 'critical', 'protocol', '🔥',
      `Manifest rollout incomplete in ${missingPilotManifests.length} pilot repo(s)`,
      `${missingPilotManifests.map(item => item.slug).join(', ')} still rely on fallback manifests.`,
      'node scripts/ops.mjs rollout-scoreboard', 18);
  } else if (laggingPilots.length > 0) {
    add('pilot-rollout-score', 'high', 'protocol', '⚡',
      `${laggingPilots.length} pilot repo(s) still below rollout target`,
      `${laggingPilots[0].slug} is the current highest-leverage rollout catch-up target.`,
      'node scripts/ops.mjs rollout-scoreboard', 10);
  }
}

// ── Release gates ─────────────────────────────────────────────────────────────
if (releaseGates?.projects) {
  const heldPublic = releaseGates.projects.filter(item =>
    item.publicFacing &&
    item.decision === 'hold' &&
    (!projectScoped || item.slug === activeProject.slug)
  );
  if (heldPublic.length > 0) {
    add('release-gate-hold', 'critical', 'security', '🔥',
      `${heldPublic.length} public-facing repo(s) blocked by release gates`,
      `${heldPublic[0].slug} is held on ${heldPublic[0].summary.join(', ')}.`,
      'node scripts/ops.mjs release-gate', 16);
  }
}

// ── Capacity plan ─────────────────────────────────────────────────────────────
if (!projectScoped && capacityPlan?.providers) {
  const stressedProvider = capacityPlan.providers.find(item => item.pressure === 'high');
  if (stressedProvider) {
    add('capacity-pressure', 'high', 'speed', '⚡',
      `Capacity pressure on ${stressedProvider.provider}`,
      `${stressedProvider.projects} projects currently route through ${stressedProvider.provider}; platform planning should be updated before more services land there.`,
      'node scripts/ops.mjs capacity-planner', 10);
  }
}

// ── Feedback loop health ──────────────────────────────────────────────────────
if (!projectScoped && feedbackDashboard && feedbackDashboard.loopHealthScore < 80) {
  add('feedback-loop', 'high', 'intelligence', '⚡',
    `Feedback loop health below target (${feedbackDashboard.loopHealthScore}/100)`,
    `Implementation rate ${feedbackDashboard.implementationRate}% · try-before-escalating items ${feedbackDashboard.totals.tryBeforeEscalating}.`,
    'node scripts/ops.mjs feedback-dashboard', 8);
}

// ── Dedupe by title (v3.1) — unified + now detectors can overlap ─────────────
const seen = new Set();
const deduped = candidates.filter(c => {
  const key = c.title.toLowerCase().replace(/\s+/g, ' ').slice(0, 40);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// ── IGNIS rank blend (v3.2) ──────────────────────────────────────────────────
// Feed candidates through the IGNIS adapter. Live IGNIS MCP if IGNIS_MCP_URL
// is set, otherwise deterministic fallback (same shape). Returned ignisScore
// [0,100] is blended with the pattern score (~40-180 range) at 50% weight so
// IGNIS can meaningfully reorder but pattern urgency still dominates ties.
const CATEGORY_MAP = {
  blocker: 'SECURITY', sil: 'AUTOMATION', speed: 'INFRA', security: 'SECURITY',
  launch: 'LAUNCH', debt: 'REFACTOR', protocol: 'PROTOCOL', intelligence: 'INTELLIGENCE',
};
const rankable = deduped.map(c => ({
  id: c.id,
  title: c.title,
  category: CATEGORY_MAP[c.cat] ?? c.cat.toUpperCase(),
  status: c.status ?? 'unblocked',
  effortMin: c.effortMin ?? null,
  sourceSurface: c.sourceSurface ?? 'TASK_BOARD',
  signals: c.signals ?? {},
}));
const ranks = await ignisRank(rankable);
const rankById = new Map(ranks.map(r => [r.id, r]));
const ignisSource = ranks[0]?.ignisSource ?? 'fallback';

// Compounding bonus: rows that unblock ≥2 other rows get a boost so focused
// sessions don't bury high-leverage items under cross-repo-locked numeric tops.
function buildCompoundIndex(tbText) {
  const tbRowRe = /^\|\s*([\d.]+)\s*\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|(.+)\|\s*$/gm;
  const downstream = new Map();
  const rowTitles  = new Map();
  let m;
  while ((m = tbRowRe.exec(tbText)) !== null) {
    const row = m[1];
    const body = m[2];
    const tMatch = body.match(/\*\*(.+?)\*\*/);
    if (tMatch) rowTitles.set(row, tMatch[1].slice(0, 60).toLowerCase());
    const refs = body.matchAll(/(?:depends?\s+on|unblocks?|blocked\s+on|blocks|after|once|requires?|needs?|pending|awaiting|see)\s+#([\d.]+)/gi);
    for (const r of refs) {
      const target = r[1];
      if (target === row) continue;
      downstream.set(target, (downstream.get(target) ?? 0) + 1);
    }
  }
  return { downstream, rowTitles };
}
const compoundIdx = buildCompoundIndex(taskBoard);

function compoundRefsFor(title) {
  const needle = title.toLowerCase().slice(0, 30);
  if (needle.length < 8) return 0;
  for (const [row, rowTitle] of compoundIdx.rowTitles.entries()) {
    if (rowTitle.includes(needle) || needle.includes(rowTitle.slice(0, 30))) {
      return compoundIdx.downstream.get(row) ?? 0;
    }
  }
  return 0;
}

const enriched = deduped.map(c => {
  const r = rankById.get(c.id);
  const ignisScore = r?.ignisScore ?? 50;
  const ignisTier = r?.ignisTier ?? 'medium';
  const ignisRationale = r?.ignisRationale ?? '';
  const compoundRefs = compoundRefsFor(c.title);
  const compoundBonus = compoundRefs >= 2 ? Math.min(25, compoundRefs * 10) : 0;
  const compoundNote = compoundBonus > 0 ? ` · compound +${compoundBonus} (unblocks ${compoundRefs})` : '';
  return {
    ...c,
    ignisScore,
    ignisTier,
    ignisRationale: ignisRationale + compoundNote,
    compoundBonus,
    compoundRefs,
    finalScore: c.score + ignisScore * 0.5 + compoundBonus,
  };
});

// --local-only strips items that require founder unlocks / cross-repo locks
// so focused sprints see only the surface they can actually act on.
const BLOCKED_STATUSES = new Set(['cross-repo-locked', 'human-blocked', 'blocked-on-hub', 'externally-blocked', 'staged', 'staged-cross-repo', 'blocked-on-deploy']);
const enrichedFiltered = localOnly
  ? enriched.filter(c => !BLOCKED_STATUSES.has((c.status || '').toLowerCase()))
  : enriched;

const ranked = enrichedFiltered
  .sort((a, b) => b.finalScore - a.finalScore)
  .slice(0, TOP_N);

// ── Output ────────────────────────────────────────────────────────────────────

// Tier label mapping
const TIER_LABEL = { critical: '🔥 CRITICAL', high: '⚡ HIGH', medium: '💡 MEDIUM', low: '🔧 LOW' };
const CAT_TAG    = { blocker: 'BLOCK', sil: 'SIL', speed: 'SPEED', security: 'SEC',
                     launch: 'LAUNCH', debt: 'DEBT', protocol: 'PROTO', intelligence: 'IGNIS' };

if (jsonMode) {
  console.log(JSON.stringify({
    date: today,
    session: currentSession,
    project: activeProject ? {
      slug: activeProject.slug,
      name: activeProject.name,
      localPath: activeProject.localPath,
    } : {
      slug: status.slug ?? 'studio-ops',
      name: status.name ?? 'Studio Ops',
      localPath: ROOT,
    },
    projectScoped,
    ignisSource,
    ignisLive: isLiveRankingAvailable(),
    count: ranked.length,
    portfolio: portfolioSummary ? {
      projectsScanned: portfolioSummary.projectsScanned,
      projectsWithWork: portfolioSummary.projectsWithWork,
      totals: portfolioSummary.totals,
      byProject: portfolioSummary.byProject?.map(p => ({
        slug: p.slug, name: p.name, remaining: p.remaining,
        unblocked: p.unblocked, blocked: p.blocked,
        critical: p.critical, high: p.high, isCurrent: p.isCurrent,
      })),
    } : null,
    ranked,
  }, null, 2));
  process.exit(0);
}

// ── Brief mode: formatted text block for embedding in startup brief ───────────
function pad(s, w) { return s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length); }
function boxLine(content, width = W) {
  return '║  ' + pad(content, width - 4) + '  ║';
}
function divider(title = '', width = W) {
  if (!title) return '╠' + '═'.repeat(width) + '╣';
  const t = `══ ${title} `;
  return '╠' + t + '═'.repeat(Math.max(1, width - t.length)) + '╣';
}

if (briefMode) {
  const lines = [];
  const boxW = W + 2;
  lines.push('╔' + '═'.repeat(W) + '╗');
  lines.push(boxLine(`GENIUS HIT LIST  ·  Session ${currentSession}`, W));
  lines.push(boxLine(`${projectScoped ? `Project: ${activeProject.name || activeProject.slug}` : 'Founder portfolio scope'} · ranked by impact`, W));
  if (portfolioSummary?.totals) {
    const t = portfolioSummary.totals;
    lines.push(boxLine(
      `Portfolio: ${t.remaining} open · ${t.unblocked} unblocked · ${t.blocked} blocked · ${portfolioSummary.projectsWithWork}/${portfolioSummary.projectsScanned} repos`,
      W));
  }
  lines.push('║' + ' '.repeat(W) + '║');
  ranked.forEach(({ tier, cat, icon, title, rationale, command }, i) => {
    const num = String(i + 1).padStart(2);
    const tag = `[${CAT_TAG[cat] ?? cat.toUpperCase()}]`;
    const header = `${icon} ${num}  ${tag}  ${title}`.slice(0, W - 4);
    lines.push(boxLine(header, W));
    const rat = `      ${rationale}`.slice(0, W - 4);
    lines.push(boxLine(rat, W));
    if (command) {
      const cmd = `      ↳ ${command}`.slice(0, W - 4);
      lines.push(boxLine(cmd, W));
    }
    if (i < ranked.length - 1) lines.push('║' + ' '.repeat(W) + '║');
  });
  lines.push('╚' + '═'.repeat(W) + '╝');
  console.log(lines.join('\n'));
  process.exit(0);
}

// ── Full output mode: write docs/GENIUS_LIST.md ───────────────────────────────
const mdLines = [
  `# Genius Hit List — ${projectScoped ? (activeProject.name || activeProject.slug) : `Session ${currentSession}`}`,
  ``,
  `> Generated: ${today} | Scope: ${projectScoped ? `project:${activeProject.slug}` : 'founder-portfolio'} | Pattern detectors: ${candidates.length} signals evaluated | Top ${TOP_N} shown`,
  ``,
  `---`,
  ``,
];

ranked.forEach(({ tier, cat, icon, title, rationale, command, score, ignisScore, ignisTier, ignisRationale, finalScore }, i) => {
  mdLines.push(`## ${icon} #${i + 1}  ${title}`);
  mdLines.push(``);
  mdLines.push(`**Tier:** ${TIER_LABEL[tier]} · **Category:** ${cat} · **Pattern:** ${score} · **IGNIS:** ${ignisScore} (${ignisTier}) · **Final:** ${Math.round(finalScore)}`);
  mdLines.push(``);
  mdLines.push(rationale);
  if (ignisRationale) mdLines.push(``, `*IGNIS rank:* ${ignisRationale}`);
  if (command) mdLines.push(``, `\`\`\`bash\n${command}\n\`\`\``);
  mdLines.push(``, `---`, ``);
});

mdLines.push(`*Generated by \`scripts/generate-genius-list.mjs\` · IGNIS source: **${ignisSource}** · run \`node scripts/ops.mjs genius-list\` to refresh*`);

// ── Extended thinking enrichment (--think flag) ───────────────────────────────
// Uses scripts/lib/model-router.mjs: callClaude + buildThinkingConfig + prompt
// caching on the stable intelligence-engine preamble (≈90% token savings on repeat).
async function enrichWithOpusThinking(lines, items) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('⚠  --think requires ANTHROPIC_API_KEY'); return lines; }
  console.log('  Querying Opus 4.6 with extended thinking for deeper synthesis...');

  const itemSummary = items.map((t, i) => `${i+1}. [${t.cat}] ${t.title}: ${t.rationale.slice(0,100)}`).join('\n');

  const systemBlocks = [
    { type: 'text',
      text: 'You are the VaultSpark Studio OS Intelligence Engine. Analyse the provided genius hit list and provide enhanced strategic insights.' },
    withCache({
      type: 'text',
      text: [
        'Studio OS intelligence rubric (stable — safe to cache):',
        '',
        '- Genius Hit List categories: [SIL] self-improvement items, [BLOCK] blockers, [LAUNCH] unannounced launches, [PROTO] protocol work, [SPEED] quick wins, [SEC] security, [DEBT] tech debt, [IGNIS] intelligence surfaces.',
        '- Priority tiers (decreasing): 🔥 critical → ⚡ high → 💡 medium → 🔧 low.',
        '- Cross-item synergy: two items that share context or unblock each other should be sequenced together.',
        '- Hidden dependencies: blockers must resolve before dependent items; protocol changes propagate last.',
        '- One-sentence verdict: what concrete deliverable defines session success?',
        '- Writing style: direct, specific, no hedging, no "consider", name files/commands where possible.',
      ].join('\n'),
    }),
  ];

  try {
    const parsed = await callClaude({
      apiKey,
      model:     MODELS.opus,
      maxTokens: 3000,
      system:    systemBlocks,
      messages:  [{ role: 'user', content: `These are the top genius list items for this session:\n\n${itemSummary}\n\nProvide: (1) Cross-item synergies (items that compound each other), (2) Hidden dependency order (what must happen first), (3) One unexpected insight the pattern detector may have missed, (4) Single most important sentence about what this session should achieve. Be direct and specific.` }],
      thinking:  buildThinkingConfig(10000),
    }, https);
    const text = parsed.content?.find(b => b.type === 'text')?.text ?? '';
    if (!text) return lines;
    const usage = parsed.usage ?? {};
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheCreate = usage.cache_creation_input_tokens ?? 0;
    if (cacheRead > 0)        process.stderr.write(`  ✓ Cache hit: ${cacheRead} tokens read from cache\n`);
    else if (cacheCreate > 0) process.stderr.write(`  ✓ Cache created: ${cacheCreate} tokens cached for next 5 min\n`);
    logMetrics({ script: 'generate-genius-list', mode: 'think', model: MODELS.opus, usage });
    return [...lines, '', '---', '', '## 🧠 Opus Strategic Intelligence (Extended Thinking)', '', text, ''];
  } catch (e) {
    console.error(`  API: ${e.message}`);
    return lines;
  }
}

const finalLines = thinkMode ? await enrichWithOpusThinking(mdLines, ranked) : mdLines;

const outPath = path.join(ROOT, 'docs', 'GENIUS_LIST.md');
fs.writeFileSync(outPath, finalLines.join('\n'), 'utf8');
console.log(`✓ Genius list → docs/GENIUS_LIST.md  (${ranked.length} items, ${candidates.length} patterns evaluated)${thinkMode ? ' + Opus thinking' : ''}`);
ranked.forEach(({ icon, tier, title, ignisScore }, i) => {
  console.log(`  ${String(i + 1).padStart(2)}. ${icon} [${tier.toUpperCase()}]  IGNIS ${String(ignisScore).padStart(3)}  ${title.slice(0, 58)}`);
});
console.log(`  IGNIS source: ${ignisSource}${isLiveRankingAvailable() ? ' (MCP configured)' : ' (fallback — set IGNIS_MCP_URL for live)'}`);
