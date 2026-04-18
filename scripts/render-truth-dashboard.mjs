#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));
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
    return {
      ...project,
      truthStatus: status?.truthAuditStatus ?? extractScalar(truthAudit, /^Overall status:\s*(.+)$/m) ?? 'unknown',
      truthRun: status?.truthAuditLastRun ?? extractScalar(truthAudit, /^Last reviewed:\s*(.+)$/m) ?? null,
      contradictionCount: contradictions.length,
      contradictions,
      lastUpdated: status?.lastUpdated ?? null,
      ignisScore: status?.ignisScore ?? null,
    };
  })
  .sort((a, b) => severityRank(b) - severityRank(a) || b.contradictionCount - a.contradictionCount || a.name.localeCompare(b.name));

const truthDebt = projects.reduce((sum, project) => sum + project.contradictionCount, 0);
const staleDerived = projects.filter((project) => project.contradictions.some((entry) => /stale|session 9|session 8/i.test(entry)));

const lines = [
  '# Founder Contradiction Dashboard',
  '',
  `Generated: ${today}`,
  '',
  '---',
  '',
  '## Summary',
  '',
  `- Projects audited: ${projects.length}`,
  `- Total contradiction debt: ${truthDebt}`,
  `- Red truth audits: ${projects.filter((project) => project.truthStatus === 'red').length}`,
  `- Yellow truth audits: ${projects.filter((project) => project.truthStatus === 'yellow').length}`,
  `- Stale derived surfaces flagged: ${staleDerived.length}`,
  '',
  '---',
  '',
  '## Heatmap',
  '',
  '| Project | Truth | Contradictions | Last audit | Last status | IGNIS | Highest-risk contradiction |',
  '|---|---|---:|---|---|---:|---|',
  ...projects.map((project) => `| ${project.name} | ${project.truthStatus} | ${project.contradictionCount} | ${project.truthRun ?? '—'} | ${project.lastUpdated ?? '—'} | ${project.ignisScore?.toLocaleString?.() ?? '—'} | ${project.contradictions[0] ?? '—'} |`),
  '',
  '---',
  '',
  '## Highest-Risk Projects',
  '',
  ...projects.slice(0, 5).map((project, index) => `${index + 1}. **${project.name}** — ${project.truthStatus}, ${project.contradictionCount} contradiction(s). ${project.contradictions[0] ?? 'No contradiction text recorded.'}`),
  '',
  '---',
  '',
  '## Recommended Actions',
  '',
  '1. Prioritize red truth audits and any project with 2+ contradictions.',
  '2. Repair stale founder-facing summaries before adding new derived reporting surfaces.',
  '3. Treat `PROJECT_STATUS.json` and `TRUTH_AUDIT.md` as the source for Hub truth indicators.',
];

fs.writeFileSync(path.join(root, 'portfolio', 'TRUTH_DASHBOARD.md'), `${lines.join('\n')}\n`);

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

function severityRank(project) {
  if (project.truthStatus === 'red') return 3;
  if (project.truthStatus === 'yellow') return 2;
  if (project.contradictionCount > 0) return 1;
  return 0;
}
