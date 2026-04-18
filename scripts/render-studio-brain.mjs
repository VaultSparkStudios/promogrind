#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));
const automationGate = readText(path.join(root, 'portfolio', 'AUTOMATION_VALUE_GATE.md'));
const truthDashboard = readText(path.join(root, 'portfolio', 'TRUTH_DASHBOARD.md'));
const ignisCore = readText(path.join(root, 'portfolio', 'IGNIS_CORE.md'));
const studioIntelligence = readText(path.join(root, 'portfolio', 'STUDIO_INTELLIGENCE.md'));
const today = new Date().toISOString().slice(0, 10);

// PROJECT_STATUS_DIR: optional env var pointing to pre-fetched status files (used in CI
// where Windows localPaths in the registry are not accessible on Linux runners).
// When set, files are expected at: $PROJECT_STATUS_DIR/{slug}.json and {slug}-truth.md
const statusDir = process.env.PROJECT_STATUS_DIR ?? '';

const activeProjects = registry.projects.filter((project) => project.status !== 'archived');
const appliedProjects = activeProjects.filter((project) => project.studioOsApplied);

const projectRows = activeProjects.map((project) => {
  const localStatusPath = path.join(project.localPath ?? '', 'context', 'PROJECT_STATUS.json');
  const fallbackStatusPath = statusDir ? path.join(statusDir, `${project.slug}.json`) : '';
  const status = readJson(localStatusPath) ?? readJson(fallbackStatusPath);

  const localTruthPath = path.join(project.localPath ?? '', 'context', 'TRUTH_AUDIT.md');
  const fallbackTruthPath = statusDir ? path.join(statusDir, `${project.slug}-truth.md`) : '';
  const truthAudit = readText(localTruthPath) || readText(fallbackTruthPath);

  const contradictions = extractContradictions(truthAudit);
  const truthStatus = status?.truthAuditStatus ?? extractScalar(truthAudit, /^Overall status:\s*(.+)$/m) ?? 'unknown';
  const blockers = Array.isArray(status?.blockers) ? status.blockers : [];
  const silScore = Number.isFinite(Number(status?.silScore)) ? Number(status.silScore) : null;
  const ignisScore = Number.isFinite(Number(status?.ignisScore)) ? Number(status.ignisScore) : null;
  return {
    ...project,
    status,
    truthStatus,
    contradictions,
    contradictionCount: contradictions.length,
    blockers,
    blockerCount: blockers.length,
    silScore,
    silAvg3: Number.isFinite(Number(status?.silAvg3)) ? Number(status.silAvg3) : null,
    ignisScore,
    ignisGrade: status?.ignisGrade ?? null,
    health: status?.health ?? 'unknown',
    focus: status?.currentFocus ?? null,
    milestone: status?.nextMilestone ?? null,
    lastUpdated: status?.lastUpdated ?? null,
    vaultStatus: (project.vaultStatus ?? 'unknown').toUpperCase(),
  };
});

const appliedRows = projectRows.filter((row) => row.studioOsApplied);
const totalTruthDebt = appliedRows.reduce((sum, row) => sum + row.contradictionCount, 0);
const truthMix = {
  green: appliedRows.filter((row) => row.truthStatus === 'green').length,
  yellow: appliedRows.filter((row) => row.truthStatus === 'yellow').length,
  red: appliedRows.filter((row) => row.truthStatus === 'red').length,
  unknown: appliedRows.filter((row) => row.truthStatus === 'unknown').length,
};
const avgSil = average(appliedRows.map((row) => row.silScore).filter((value) => value != null));
const avgIgnis = average(appliedRows.map((row) => row.ignisScore).filter((value) => value != null));
const automationRows = extractAutomationRows(automationGate);
const rebuildRows = automationRows.filter((row) => row.status === 'rebuild');
const highestRiskLine = extractLine(truthDashboard, /^- Total contradiction debt:.*$/m);
const ignisRiskLine = extractFenceLine(ignisCore, 'Highest current founder-facing risk:');

const watchlist = [...appliedRows]
  .sort((a, b) =>
    severityScore(b) - severityScore(a)
    || b.blockerCount - a.blockerCount
    || b.contradictionCount - a.contradictionCount
    || compareNullable(a.silScore, b.silScore)
    || a.name.localeCompare(b.name)
  )
  .slice(0, 6);

const blockers = appliedRows
  .flatMap((row) => row.blockers.map((blocker) => ({ project: row.name, blocker })))
  .slice(0, 8);

const momentumRows = [...appliedRows]
  .filter((row) => row.silAvg3 != null || row.silScore != null)
  .sort((a, b) => compareNullable(a.silAvg3 ?? a.silScore, b.silAvg3 ?? b.silScore))
  .slice(0, 5);

const launchRows = activeProjects
  .filter((project) => project.launchStatus === 'deployed-unannounced')
  .sort((a, b) => {
    const priority = { high: 0, critical: 0, medium: 1, low: 2 };
    return (priority[a.priority] ?? 1) - (priority[b.priority] ?? 1);
  })
  .map((project) => ({
    name: project.name,
    slug: project.slug,
    vaultStatus: (project.vaultStatus ?? 'unknown').toUpperCase(),
    runtimeUrl: project.runtimeUrl ?? project.liveUrl ?? '—',
    launchPlan: `docs/launch/${project.slug}-launch-plan.md`,
  }));

const recommendedActions = buildRecommendedActions({
  rebuildRows,
  blockers,
  watchlist,
  truthMix,
  launchRows,
});

// ── Portfolio audience matrix (lifecycle × audience) ──────────────────────────
const LIFECYCLES = ['deployed', 'building', 'concept'];
const AUDIENCES  = ['public-live', 'public-unlaunched', 'private-beta', 'internal'];
const audienceMatrix = {};
for (const lc of LIFECYCLES) {
  audienceMatrix[lc] = {};
  for (const au of AUDIENCES) {
    audienceMatrix[lc][au] = activeProjects
      .filter(p => p.lifecycle === lc && p.audience === au)
      .map(p => ({ name: p.name, vaultStatus: (p.vaultStatus ?? 'unknown').toUpperCase() }));
  }
}
function matrixCell(projects) {
  if (!projects.length) return '—';
  const label = projects.map(p => p.name).join(', ');
  return `**${projects.length}** — ${label}`;
}

const lines = [
  '# Studio Brain',
  '',
  'Generated by `scripts/render-studio-brain.mjs` from live project truth surfaces.',
  'Purpose: give every agent a current portfolio brief with actionable priorities instead of mechanical activity logs.',
  '',
  '---',
  '',
  `## CURRENT — ${today}`,
  '',
  '### Session startup brief',
  `> ${buildStartupBrief({ appliedProjects, activeProjects, rebuildRows, blockers, watchlist })}`,
  '',
  '### Priority flags',
  ...renderBullets(buildPriorityFlags({ rebuildRows, blockers, watchlist, highestRiskLine, ignisRiskLine })),
  '',
  '### Portfolio health snapshot',
  '',
  '| Metric | Value | Why it matters |',
  '|---|---|---|',
  `| Studio OS applied | ${appliedProjects.length} / ${activeProjects.length} | Compliance floor for founder visibility and startup continuity |`,
  `| Truth status mix | green ${truthMix.green} · yellow ${truthMix.yellow} · red ${truthMix.red} · unknown ${truthMix.unknown} | Yellow-heavy portfolio means founder-facing drift still needs active management |`,
  `| Total contradiction debt | ${totalTruthDebt} | Contradiction count measures how much founder reporting can still mislead |`,
  `| Avg SIL score | ${formatNumber(avgSil, 1)}/500 | Fast signal for current portfolio execution quality across applied repos |`,
  `| Avg IGNIS score | ${formatLarge(avgIgnis)} | IQ coverage is live; the current gap is interpretation and follow-through |`,
  `| Automation rebuild queue | ${rebuildRows.length} surface(s) | Derived founder surfaces should justify their existence or be rebuilt/retired |`,
  '',
  '### Portfolio audience matrix',
  '',
  '> Lifecycle × audience breakdown. Helps focus session work and agent assignment.',
  '',
  '| Lifecycle | public-live | public-unlaunched | private-beta | internal |',
  '|---|---|---|---|---|',
  ...LIFECYCLES.map(lc =>
    `| **${lc}** | ${AUDIENCES.map(au => matrixCell(audienceMatrix[lc][au])).join(' | ')} |`
  ),
  '',
  '### Highest-priority project watchlist',
  '',
  '| Project | Status | Health | Truth | Blockers | SIL | IGNIS | Why it is on the list |',
  '|---|---|---|---|---:|---:|---:|---|',
  ...watchlist.map((row) => `| ${row.name} | ${row.vaultStatus} | ${row.health} | ${row.truthStatus} | ${row.blockerCount} | ${row.silScore ?? '—'} | ${row.ignisScore?.toLocaleString?.() ?? '—'} | ${watchReason(row)} |`),
  '',
  '### Active blockers rollup',
  '',
  ...(blockers.length
    ? blockers.map(({ project, blocker }, index) => `${index + 1}. **${project}** — ${blocker}`)
    : ['- No active blockers recorded in project status JSON.']),
  '',
  '### Lowest-momentum projects',
  '',
  '| Project | SIL avg3 | Last SIL | Current focus | Next milestone |',
  '|---|---:|---:|---|---|',
  ...momentumRows.map((row) => `| ${row.name} | ${formatNumber(row.silAvg3, 1)} | ${row.silScore ?? '—'} | ${row.focus ?? '—'} | ${row.milestone ?? '—'} |`),
  '',
  '### Launch tracker — deployed but unannounced',
  '',
  ...(launchRows.length
    ? [
        '| Project | Status | Live URL | Launch plan |',
        '|---|---|---|---|',
        ...launchRows.map((row) => `| ${row.name} | ${row.vaultStatus} | ${row.runtimeUrl} | \`${row.launchPlan}\` |`),
      ]
    : ['- No deployed-unannounced projects. All live projects are either announced or have no launch path.']),
  '',
  '### Automation value gate',
  '',
  '| Surface | Status | Signals |',
  '|---|---|---|',
  ...automationRows.map((row) => `| ${row.surface} | ${row.status} | ${row.signals || '—'} |`),
  '',
  '### Recommended actions',
  '',
  ...recommendedActions.map((action, index) => `${index + 1}. ${action}`),
  '',
  ...buildXpiSection(studioIntelligence),
  '',
  '### Source precedence',
  '',
  '1. `context/PROJECT_STATUS.json` in each repo',
  '2. `context/TRUTH_AUDIT.md` in each repo',
  '3. `portfolio/TRUTH_DASHBOARD.md` and `portfolio/IGNIS_CORE.md`',
  '4. This file (`portfolio/STUDIO_BRAIN.md`) as a derived startup brief',
  '5. `portfolio/STUDIO_INTELLIGENCE.md` — quarterly XPI synthesis',
  '',
  `*Generated: ${today} | Source precedence: PROJECT_STATUS.json > TRUTH_AUDIT.md > founder-facing derived markdown*`,
];

fs.writeFileSync(path.join(root, 'portfolio', 'STUDIO_BRAIN.md'), `${lines.join('\n')}\n`);

// ── XPI Intelligence section builder ─────────────────────────────────────────
function buildXpiSection(intel) {
  if (!intel) return [];
  const statusMatch  = intel.match(/\*\*Status:\*\*\s*(.+)/);
  if (!statusMatch) return [];
  const xpiStatus = statusMatch[1].trim();

  // Extract cross-project patterns
  const patternSection = intel.match(/### Cross-Project Pattern Synthesis\s+([\s\S]*?)(?=\n###\s+|---\s*$)/)?.[1] ?? '';
  const patterns = [];
  for (const m of patternSection.matchAll(/^\d+\.\s+\*\*([^*]+)\*\*\s*—\s*([^\n]+)/gm)) {
    patterns.push(`**${m[1].trim()}** — ${m[2].trim()}`);
  }

  // Extract velocity heatmap (top 5 rows by session count)
  const velSection = intel.match(/### Portfolio Velocity Heatmap\s+[\s\S]*?\|[-| ]+\|\s*\n([\s\S]*?)(?=\n\*\*Velocity pattern:|$)/)?.[1] ?? '';
  const velRows = velSection.split('\n')
    .filter(l => l.startsWith('|'))
    .slice(0, 5)
    .map(row => {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean);
      return cells.length >= 4 ? `| ${cells[0]} | ${cells[1]} | ${cells[2]} | ${cells[3]} |` : null;
    })
    .filter(Boolean);

  return [
    '## XPI Intelligence',
    '',
    `> ${xpiStatus}`,
    '',
    ...(patterns.length > 0 ? [
      '**Cross-project patterns (≥3 projects):**',
      ...patterns.map(p => `- ${p}`),
      '',
    ] : []),
    ...(velRows.length > 0 ? [
      '**Velocity heatmap (top 5 active projects):**',
      '',
      '| Project | Sessions (90d) | Avg SIL velocity | SIL trend |',
      '|---|---:|---|---|',
      ...velRows,
      '',
    ] : []),
    '**Strategic recommendations:**',
    '',
    '1. Unblock the credential-intake bottleneck — R2 key, Railway env vars, and Stripe product IDs each stall 3–8 projects simultaneously.',
    '2. Announce the 7 deployed-unannounced projects; build cadence leads marketing cadence by 2+ quarters.',
    '3. Complete Foundation sessions for CANON, TLP, Orva EON, and Velaxis to build agent continuity before repos go stale.',
    '4. Establish quarterly IGNIS re-score cadence — `node scripts/ops.mjs rescore --stale` at every session with >7d-stale projects.',
    '5. Activate Stripe for MindFrame (code complete — blocked on env var config only; see `docs/launch/mindframe-stripe-checklist.md`).',
    '',
    `*XPI source: \`portfolio/STUDIO_INTELLIGENCE.md\` — ${xpiStatus.split('—')[0]?.trim() ?? 'see file for cadence'}*`,
  ];
}

function readJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function readText(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function extractScalar(markdown, pattern) {
  return markdown.match(pattern)?.[1]?.trim() ?? null;
}

function extractContradictions(markdown) {
  const section = markdown.match(/## Contradictions\s+([\s\S]*?)(?=\n##\s+|$)/);
  if (!section) return [];
  return section[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter((line) => line && !/^none recorded/i.test(line));
}

function extractAutomationRows(markdown) {
  const lines = markdown.split(/\r?\n/);
  return lines
    .filter((line) => line.startsWith('|') && !line.includes('---') && !line.includes('Surface | Status'))
    .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
    .filter((cells) => cells.length >= 5)
    .map(([surface, status, freshness, signals, why]) => ({ surface, status, freshness, signals, why }));
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatNumber(value, digits = 0) {
  return value == null ? '—' : Number(value).toFixed(digits);
}

function formatLarge(value) {
  return value == null ? '—' : Math.round(value).toLocaleString();
}

function compareNullable(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

function severityScore(row) {
  let score = 0;
  if (row.health === 'red') score += 6;
  else if (row.health === 'yellow') score += 3;
  if (row.truthStatus === 'red') score += 6;
  else if (row.truthStatus === 'yellow') score += 3;
  score += Math.min(row.blockerCount, 3) * 2;
  score += Math.min(row.contradictionCount, 3) * 2;
  if (row.silScore != null && row.silScore < 400) score += 2;
  return score;
}

function watchReason(row) {
  if (row.blockerCount > 0) return row.blockers[0];
  if (row.truthStatus === 'yellow' || row.truthStatus === 'red') return row.contradictions[0] ?? 'truth audit still non-green';
  if (row.silScore != null && row.silScore < 400) return 'low SIL score relative to applied portfolio';
  return row.focus ?? 'portfolio attention item';
}

function buildStartupBrief({ appliedProjects, activeProjects, rebuildRows, blockers, watchlist }) {
  const topProject = watchlist[0];
  const parts = [
    `${appliedProjects.length}/${activeProjects.length} active projects are on Studio OS with live status/truth coverage.`,
    blockers.length ? `${blockers.length} active blocker(s) are recorded across project status files.` : 'No blocker is currently recorded in project status files.',
    rebuildRows.length ? `${rebuildRows.length} derived surface(s) are queued for rebuild, led by ${rebuildRows[0].surface}.` : 'No derived founder surfaces are currently flagged for rebuild.',
  ];
  if (topProject) parts.push(`Highest attention project: ${topProject.name}.`);
  return parts.join(' ');
}

function buildPriorityFlags({ rebuildRows, blockers, watchlist, highestRiskLine, ignisRiskLine }) {
  const flags = [];
  if (highestRiskLine) flags.push(highestRiskLine.replace(/^- /, ''));
  if (ignisRiskLine) flags.push(ignisRiskLine);
  if (rebuildRows.length) {
    flags.push(`Automation rebuild queue remains open: ${rebuildRows.map((row) => row.surface).join(', ')}.`);
  }
  if (blockers.length) {
    const blockerProjects = [...new Set(blockers.map(({ project }) => project))];
    flags.push(`Portfolio blockers are active in project status: ${blockerProjects.slice(0, 3).join(', ')}${blockerProjects.length > 3 ? ', ...' : ''}.`);
  }
  if (watchlist.some((row) => row.truthStatus === 'yellow' || row.truthStatus === 'red')) {
    flags.push('Founder-facing trust is limited by the current yellow-heavy truth-audit mix; keep derived reporting subordinate to JSON truth.');
  }
  return flags;
}

function renderBullets(items) {
  return items.length ? items.map((item) => `- ${item}`) : ['- No active priority flags.'];
}

function buildRecommendedActions({ rebuildRows, blockers, watchlist, truthMix, launchRows = [] }) {
  const actions = [];
  if (blockers.length) {
    const blockerProjects = [...new Set(blockers.map(({ project }) => project))];
    actions.push(`Clear the highest-impact project blockers first: ${blockerProjects.slice(0, 2).join(' and ')}.`);
  }
  if (rebuildRows.length) {
    actions.push(`Rebuild founder-facing derived surfaces in order: ${rebuildRows.map((row) => row.surface).join(', ')}.`);
  }
  if (truthMix.yellow + truthMix.red > 0) {
    actions.push('Drive yellow truth audits toward green by replacing placeholder contradiction text and stale summary claims with project-specific truth.');
  }
  if (launchRows.length) {
    const top = launchRows.slice(0, 2).map((row) => row.name).join(' and ');
    actions.push(`Announce deployed-unannounced projects — highest leverage: ${top}. Launch plans in \`docs/launch/\`.`);
  }
  if (watchlist.length) {
    actions.push(`Use the watchlist as the founder review queue instead of scanning all ${watchlist.length} flagged projects ad hoc.`);
  }
  return actions;
}

function extractFenceLine(markdown, prefix) {
  const match = markdown.match(/```([\s\S]*?)```/);
  if (!match) return null;
  const line = match[1]
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));
  return line ?? null;
}

function extractLine(markdown, pattern) {
  return markdown.match(pattern)?.[0]?.trim() ?? null;
}
