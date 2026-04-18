#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));
const baselinePath = path.join(root, 'ignis', 'output', 'portfolio-baseline.json');
const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;
const today = new Date().toISOString().slice(0, 10);

// PROJECT_STATUS_DIR: optional env var pointing to pre-fetched status files (used in CI
// where Windows localPaths in the registry are not accessible on Linux runners).
// When set, files are expected at: $PROJECT_STATUS_DIR/{slug}.json and {slug}-truth.md
const statusDir = process.env.PROJECT_STATUS_DIR ?? '';

const projects = registry.projects
  .filter((project) => project.status !== 'archived' && project.studioOsApplied)
  .map((project) => {
    const localStatusPath = path.join(project.localPath ?? '', 'context', 'PROJECT_STATUS.json');
    const fallbackStatusPath = statusDir ? path.join(statusDir, `${project.slug}.json`) : '';
    const status = readJson(localStatusPath) ?? readJson(fallbackStatusPath);
    const localTruthPath = path.join(project.localPath ?? '', 'context', 'TRUTH_AUDIT.md');
    const fallbackTruthPath = statusDir ? path.join(statusDir, `${project.slug}-truth.md`) : '';
    const truthAudit = readText(localTruthPath) || readText(fallbackTruthPath);
    const contradictions = extractContradictions(truthAudit);
    const score = Number(status?.ignisScore);
    const tracked = Number.isFinite(score);
    return {
      ...project,
      status,
      score: tracked ? score : null,
      grade: status?.ignisGrade ?? 'UNTRACKED',
      computedAt: status?.ignisLastComputed ?? null,
      truthStatus: status?.truthAuditStatus ?? 'unknown',
      contradictions,
      contradictionCount: contradictions.length,
    };
  });

const tracked = projects.filter((project) => project.score != null).sort((a, b) => b.score - a.score);
const untracked = projects.filter((project) => project.score == null);
const avgScore = tracked.length ? Math.round(tracked.reduce((sum, project) => sum + project.score, 0) / tracked.length) : null;
const topProject = tracked[0] ?? null;
const weakestTracked = tracked.at(-1) ?? null;
const yellowTruth = projects.filter((project) => project.truthStatus === 'yellow');
const redTruth = projects.filter((project) => project.truthStatus === 'red');
const contradictionDebt = projects.reduce((sum, project) => sum + project.contradictionCount, 0);
const staleSummary = projects.filter((project) =>
  project.contradictions.some((entry) => /stale|session 9|session 8/i.test(entry))
);
const baselineProjectsScored = baseline?.results?.length ?? tracked.length;
const baselineDate = baseline?.timestamp?.slice?.(0, 10) ?? null;
// Always use live-computed avg to prevent stale baseline from masking current state.
// Baseline avg is shown as a reference footnote only (eliminates PROJECT_STATUS.json vs IGNIS_CORE.md discrepancy).
const portfolioAvg = avgScore ?? baseline?.summary?.averageIQ;
const portfolioTier = tracked.length
  ? (() => {
      // Derive tier from the majority grade among tracked projects
      const gradeCounts = tracked.reduce((acc, p) => { acc[p.grade] = (acc[p.grade] || 0) + 1; return acc; }, {});
      return Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'FORGE';
    })()
  : (baseline?.summary?.averageTier ?? null);

const lines = [
  '# IGNIS Core Intelligence — VaultSpark Studios',
  '',
  `Last synthesised: ${today} | Data window: live project status + truth-audit surfaces | Tracked projects: ${tracked.length}/${projects.length}`,
  'Synthesis type: GENERATED (JSON-first founder synthesis)',
  '',
  '---',
  '',
  '## Rolling Status Header',
  '',
  '```',
  `IGNIS Phase: 5 (Self-Evolution — Active)`,
  `Portfolio compliance: ${projects.length}/${registry.projects.filter((project) => project.status !== 'archived').length} active projects on Studio OS`,
  `Tracked IGNIS coverage: ${tracked.length}/${projects.length} applied projects · untracked: ${untracked.length}`,
  `Average tracked IQ: ${portfolioAvg?.toLocaleString?.() ?? '—'}${portfolioTier ? ` (${portfolioTier})` : ''}${baselineDate ? ` · baseline ${baselineDate}` : ''}`,
  `Truth debt: ${contradictionDebt} open contradiction(s) across applied repos`,
  `Truth status mix: green ${projects.filter((project) => project.truthStatus === 'green').length} · yellow ${yellowTruth.length} · red ${redTruth.length} · unknown ${projects.filter((project) => project.truthStatus === 'unknown').length}`,
  `Top tracked project: ${topProject ? `${topProject.name} (${topProject.score.toLocaleString()} ${topProject.grade})` : '—'}`,
  `Highest current founder-facing risk: ${staleSummary.length ? `${staleSummary[0].name} stale synthesis/derived drift` : 'No stale founder-facing surfaces flagged'}`,
  '```',
  '',
  '---',
  '',
  '## Project IGNIS Scores',
  '',
  '| Project | ignisScore | Grade | Truth | Contradictions | Note |',
  '|---|---|---|---|---:|---|',
  ...projects
    .sort((a, b) => {
      if (a.score == null && b.score == null) return a.name.localeCompare(b.name);
      if (a.score == null) return 1;
      if (b.score == null) return -1;
      return b.score - a.score;
    })
    .map((project) => {
      const score = project.score == null ? '—' : project.score.toLocaleString();
      const noteParts = [];
      if (project.computedAt) noteParts.push(`computed ${project.computedAt}`);
      if (project.status?.silScore != null) noteParts.push(`SIL ${project.status.silScore}/500`);
      if (project.contradictions.some((entry) => /stale|session 9|session 8/i.test(entry))) noteParts.push('stale derived surface');
      return `| ${project.name} | ${score} | ${project.grade} | ${project.truthStatus} | ${project.contradictionCount} | ${noteParts.join(' · ') || 'live status present'} |`;
    }),
  '',
  '---',
  '',
  '## Portfolio Intelligence Summary',
  '',
  `IGNIS itself is live across the applied portfolio. The current gap is no longer raw scoring coverage; it is founder-facing consumption and contradiction visibility. ${tracked.length} repos now carry live \`ignisScore\` in \`context/PROJECT_STATUS.json\`, while ${untracked.length} still need either local scoring or a baseline entry.`,
  '',
  `The strongest current signal is operational honesty: machine-readable status, truth audits, and live IGNIS scores are aligned enough to surface real drift instead of hiding it. The main penalty remains stale or weakly consumed derived views, especially where the Hub or founder-facing summaries lag behind current JSON truth.`,
  '',
  '---',
  '',
  '## Coverage Signals',
  '',
  `- Tracked: ${tracked.length}/${projects.length}`,
  `- Untracked: ${untracked.length}${untracked.length ? ` — ${untracked.map((project) => project.name).join(', ')}` : ''}`,
  `- Worst tracked gap: ${weakestTracked ? `${weakestTracked.name} (${weakestTracked.score.toLocaleString()} ${weakestTracked.grade})` : '—'}`,
  `- Truth-audit attention: ${[...redTruth, ...yellowTruth].map((project) => project.name).join(', ') || 'No non-green truth audits'}`,
  '',
  '---',
  '',
  '## Recommended Actions',
  '',
  '1. Keep Studio Hub consuming `silScore`, `silAvg3`, `truthAuditStatus`, `truthAuditLastRun`, and contradiction counts from project status/truth surfaces.',
  '2. Eliminate remaining untracked repos by running local IGNIS scoring or adding them to the next portfolio baseline.',
  '3. Use the contradiction dashboard as the founder-facing source for stale derived-surface risk; do not let markdown summaries outrun JSON truth again.',
  '',
  '*IGNIS Core — VaultSpark Studios Intelligence Layer*',
  `*Generated: ${today} | Phase: 5 (Self-Evolution) | Source precedence: PROJECT_STATUS.json > TRUTH_AUDIT.md > derived markdown*`,
];

fs.writeFileSync(path.join(root, 'portfolio', 'IGNIS_CORE.md'), `${lines.join('\n')}\n`);

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
