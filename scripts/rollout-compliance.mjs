#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registryPath = path.join(root, 'portfolio', 'PROJECT_REGISTRY.json');
const baselinePath = path.join(root, 'ignis', 'output', 'portfolio-baseline.json');
const startTemplatePath = path.join(root, 'docs', 'templates', 'project-system', 'START_PROMPT.template.md');
const closeoutTemplatePath = path.join(root, 'docs', 'templates', 'project-system', 'CLOSEOUT_PROMPT.template.md');
const truthAuditTemplatePath = path.join(root, 'docs', 'templates', 'project-system', 'TRUTH_AUDIT.template.md');
const portfolioCardTemplatePath = path.join(root, 'docs', 'templates', 'project-system', 'PORTFOLIO_CARD.template.md');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const doCommit = args.has('--commit');
const doPush = args.has('--push');
const targetSlug = process.argv.includes('--project')
  ? process.argv[process.argv.indexOf('--project') + 1]
  : null;

const today = new Date().toISOString().slice(0, 10);

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;
const baselineDate = baseline?.timestamp?.slice?.(0, 10) ?? null;
const baselineBySlug = new Map((baseline?.results ?? []).map((entry) => [entry.slug, entry]));

const canonicalStartVersion = readVersion(startTemplatePath, 'template-version') ?? 'unknown';
const canonicalCloseoutVersion = readVersion(closeoutTemplatePath, 'template-version') ?? 'unknown';
const canonicalTruthAuditVersion = readVersion(truthAuditTemplatePath, 'truth-audit-version') ?? '1.0';

const summary = {
  changed: 0,
  current: 0,
  blocked: 0,
  missing: 0,
  errors: 0,
};

console.log('════════════════════════════════════════════════');
console.log('  Studio OS Compliance Rollout');
console.log(`  Mode: ${apply ? 'APPLY' : 'AUDIT'}`);
console.log(`  Prompts: start=${canonicalStartVersion} closeout=${canonicalCloseoutVersion}`);
console.log(`  Truth audit header: ${canonicalTruthAuditVersion}`);
if (targetSlug) console.log(`  Target: ${targetSlug}`);
console.log('════════════════════════════════════════════════');
console.log('');

for (const project of registry.projects) {
  if (!project.studioOsApplied || project.status === 'archived' || project.slug === 'studio-ops') continue;
  if (targetSlug && project.slug !== targetSlug) continue;

  const localPath = project.localPath;
  if (!localPath || !fs.existsSync(localPath)) {
    console.log(`✗ ${project.name} (${project.slug}) — localPath missing: ${localPath ?? '(none)'}`);
    summary.missing += 1;
    continue;
  }

  const lock = checkRepoLock(localPath);
  const status = [];

  const promptsDir = path.join(localPath, 'prompts');
  const contextDir = path.join(localPath, 'context');
  const docsDir = path.join(localPath, 'docs');
  const logsDir = path.join(localPath, 'logs');

  ensureDir(promptsDir, apply);
  ensureDir(contextDir, apply);
  ensureDir(docsDir, apply);
  ensureDir(logsDir, apply);

  const changes = [];

  const startPath = path.join(promptsDir, 'start.md');
  const closeoutPath = path.join(promptsDir, 'closeout.md');
  const truthAuditPath = path.join(contextDir, 'TRUTH_AUDIT.md');
  const portfolioCardPath = path.join(contextDir, 'PORTFOLIO_CARD.md');
  const statusPath = path.join(contextDir, 'PROJECT_STATUS.json');

  changes.push(...syncPrompt(startTemplatePath, startPath, 'template-version', canonicalStartVersion, apply));
  changes.push(...syncPrompt(closeoutTemplatePath, closeoutPath, 'template-version', canonicalCloseoutVersion, apply));
  changes.push(...ensureTruthAudit(truthAuditPath, project, apply));
  changes.push(...ensurePortfolioCard(portfolioCardPath, project, apply));
  changes.push(...migrateProjectStatus(statusPath, truthAuditPath, project, apply));

  if (changes.length === 0) {
    console.log(`✓ ${project.name} (${project.slug}) — current`);
    summary.current += 1;
    continue;
  }

  if (!apply) {
    console.log(`→ ${project.name} (${project.slug})`);
    for (const item of changes) console.log(`  - ${item}`);
    summary.changed += 1;
    continue;
  }

  if (lock.blocked) {
    console.log(`⚠ ${project.name} (${project.slug}) — BLOCKED: ${lock.reason}`);
    for (const item of changes) console.log(`  - pending: ${item}`);
    summary.blocked += 1;
    continue;
  }

  console.log(`✓ ${project.name} (${project.slug}) — updated`);
  for (const item of changes) console.log(`  - ${item}`);
  summary.changed += 1;

  if (doCommit) {
    try {
      git(localPath, ['add', 'prompts/start.md', 'prompts/closeout.md', 'context/TRUTH_AUDIT.md', 'context/PORTFOLIO_CARD.md', 'context/PROJECT_STATUS.json']);
      const staged = git(localPath, ['diff', '--cached', '--name-only'], { allowFailure: true }).trim();
      if (staged) {
        git(localPath, ['commit', '-m', 'studio-os: sync compliance assets and status schema']);
        if (doPush) {
          git(localPath, ['push', 'origin', 'HEAD']);
        }
      } else {
        console.log('  - nothing staged after migration');
      }
    } catch (error) {
      console.log(`  - git error: ${error.message}`);
      summary.errors += 1;
    }
  }
}

console.log('');
console.log('════════════════════════════════════════════════');
console.log(`  Changed: ${summary.changed}`);
console.log(`  Current: ${summary.current}`);
console.log(`  Blocked: ${summary.blocked}`);
console.log(`  Missing: ${summary.missing}`);
console.log(`  Errors: ${summary.errors}`);
console.log('════════════════════════════════════════════════');

function readVersion(filePath, marker) {
  if (!fs.existsSync(filePath)) return null;
  const firstLines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/, 3);
  const match = firstLines.join('\n').match(new RegExp(`<!-- ${marker}: ([0-9.]+) -->`));
  return match?.[1] ?? null;
}

function compareVersions(a, b) {
  const aa = String(a ?? '0').split('.').map((part) => Number(part) || 0);
  const bb = String(b ?? '0').split('.').map((part) => Number(part) || 0);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (aa[i] ?? 0) - (bb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function ensureDir(dirPath, write) {
  if (!write || fs.existsSync(dirPath)) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

function syncPrompt(templatePath, targetPath, marker, canonicalVersion, write) {
  const currentVersion = readVersion(targetPath, marker);
  const needsSync = !fs.existsSync(targetPath) || !currentVersion || compareVersions(currentVersion, canonicalVersion) < 0;
  if (!needsSync) return [];
  if (write) {
    fs.copyFileSync(templatePath, targetPath);
  }
  return [`${path.relative(root, targetPath)} ${currentVersion ?? 'missing'} -> ${canonicalVersion}`];
}

function ensureTruthAudit(targetPath, project, write) {
  const changes = [];
  if (!fs.existsSync(targetPath)) {
    if (write) {
      fs.writeFileSync(targetPath, buildTruthAuditScaffold(project));
    }
    changes.push(`context/TRUTH_AUDIT.md created`);
    return changes;
  }

  const content = fs.readFileSync(targetPath, 'utf8');
  const currentVersion = readVersion(targetPath, 'truth-audit-version');
  let nextContent = content;
  let changed = false;
  if (!currentVersion) {
    nextContent = `<!-- truth-audit-version: ${canonicalTruthAuditVersion} -->\n${nextContent}`;
    changed = true;
    changes.push(`context/TRUTH_AUDIT.md header added`);
  }
  if (!/^Last reviewed:\s*\d{4}-\d{2}-\d{2}$/m.test(nextContent)) {
    nextContent = nextContent.replace(/^# .+$/m, (heading) => `${heading}\n\nLast reviewed: ${today}`);
    changed = true;
    changes.push(`context/TRUTH_AUDIT.md last-reviewed added`);
  }
  if (!/^Overall status:\s*(green|yellow|red|unknown)$/m.test(nextContent)) {
    nextContent = nextContent.replace(/^Last reviewed:\s*.+$/m, (line) => `${line}\nOverall status: yellow`);
    changed = true;
    changes.push(`context/TRUTH_AUDIT.md overall-status added`);
  }
  if (write && changed) {
    fs.writeFileSync(targetPath, nextContent);
  }
  return changes;
}

function ensurePortfolioCard(targetPath, project, write) {
  if (fs.existsSync(targetPath)) return [];
  if (write) {
    fs.writeFileSync(targetPath, buildPortfolioCard(project));
  }
  return ['context/PORTFOLIO_CARD.md created'];
}

function migrateProjectStatus(targetPath, truthAuditPath, project, write) {
  const existing = fs.existsSync(targetPath) ? safeReadJson(targetPath) : {};
  if (existing == null) return ['context/PROJECT_STATUS.json unreadable'];

  const truthMeta = readTruthAuditMeta(truthAuditPath);
  const baselineEntry = pickBaseline(project, existing);
  const localIgnisEntry = readLocalIgnisScore(path.dirname(targetPath));
  const migrated = buildProjectStatus(existing, truthMeta, project, baselineEntry, localIgnisEntry);
  const currentText = fs.existsSync(targetPath) ? normalizeText(fs.readFileSync(targetPath, 'utf8')) : '';
  const nextText = `${JSON.stringify(migrated, null, 2)}\n`;

  if (currentText === normalizeText(nextText)) return [];
  if (write) {
    fs.writeFileSync(targetPath, nextText);
  }
  return ['context/PROJECT_STATUS.json migrated to v1.3'];
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n').trim();
}

function readTruthAuditMeta(filePath) {
  if (!fs.existsSync(filePath)) return { status: 'unknown', lastReviewed: null };
  const content = fs.readFileSync(filePath, 'utf8');
  const status = content.match(/^Overall status:\s*(.+)$/m)?.[1]?.trim() ?? 'unknown';
  const lastReviewed = content.match(/^Last reviewed:\s*(.+)$/m)?.[1]?.trim() ?? null;
  return { status, lastReviewed };
}

function pickBaseline(project, existing) {
  const candidates = [
    project.slug,
    String(project.repo ?? '').split('/')[1] ?? null,
    slugify(project.formerName),
    slugify(existing?.formerName),
  ].filter(Boolean);

  for (const key of candidates) {
    if (baselineBySlug.has(key)) return baselineBySlug.get(key);
  }
  return null;
}

function slugify(value) {
  if (!value) return null;
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildProjectStatus(existing, truthMeta, project, baselineEntry, localIgnisEntry) {
  const preserved = { ...(existing ?? {}) };
  delete preserved.stage;

  const blockers = Array.isArray(preserved.blockers)
    ? preserved.blockers
    : Array.isArray(preserved.topBlockers)
      ? preserved.topBlockers
      : [];

  const knownKeys = new Set([
    'schemaVersion',
    'slug',
    'name',
    'type',
    'lifecycle',
    'audience',
    'status',
    'health',
    'owner',
    'localPath',
    'github',
    'liveUrl',
    'currentFocus',
    'nextMilestone',
    'blockers',
    'lastUpdated',
    'silScore',
    'silAvg3',
    'silVelocity',
    'silDebt',
    'silLastSession',
    'silSparkline',
    'ignisScore',
    'ignisGrade',
    'ignisLastComputed',
    'testsTotal',
    'lastDeployStatus',
    'truthAuditStatus',
    'truthAuditLastRun',
  ]);

  const extras = Object.fromEntries(Object.entries(preserved).filter(([key]) => !knownKeys.has(key)));
  const githubUrl = preserved.github ?? `https://github.com/${project.repo}`;
  const liveUrl = preserved.liveUrl ?? preserved.runtimeUrl ?? project.runtimeUrl ?? null;
  const resolvedIgnisScore = baselineEntry?.iq ?? localIgnisEntry?.iqScore ?? preserved.ignisScore ?? null;
  const resolvedIgnisGrade = baselineEntry?.tier ?? localIgnisEntry?.tier ?? preserved.ignisGrade ?? null;
  const resolvedIgnisLastComputed =
    baselineEntry
      ? (baselineDate ?? preserved.ignisLastComputed ?? null)
      : localIgnisEntry
        ? (localIgnisEntry.timestamp?.slice?.(0, 10) ?? preserved.ignisLastComputed ?? null)
        : (resolvedIgnisScore != null || resolvedIgnisGrade != null ? (preserved.ignisLastComputed ?? null) : null);

  return {
    schemaVersion: '1.3',
    slug: project.slug,
    name: project.name,
    type: preserved.type ?? project.medium ?? preserved.medium ?? 'project',
    lifecycle: project.lifecycle ?? preserved.lifecycle ?? 'building',
    audience: project.audience ?? preserved.audience ?? 'internal',
    status: preserved.status ?? project.status ?? 'active',
    health: preserved.health ?? project.health ?? 'yellow',
    owner: preserved.owner ?? project.owner ?? '',
    localPath: project.localPath ?? preserved.localPath ?? null,
    github: githubUrl,
    liveUrl,
    currentFocus: preserved.currentFocus ?? project.currentFocus ?? '',
    nextMilestone: preserved.nextMilestone ?? project.nextMilestone ?? '',
    blockers,
    lastUpdated: today,
    silScore: preserved.silScore ?? null,
    silAvg3: preserved.silAvg3 ?? null,
    silVelocity: preserved.silVelocity ?? null,
    silDebt: preserved.silDebt ?? null,
    silLastSession: preserved.silLastSession ?? null,
    silSparkline: Array.isArray(preserved.silSparkline) ? preserved.silSparkline : [],
    ignisScore: resolvedIgnisScore,
    ignisGrade: resolvedIgnisGrade,
    ignisLastComputed: resolvedIgnisLastComputed,
    testsTotal: preserved.testsTotal ?? null,
    lastDeployStatus: preserved.lastDeployStatus ?? 'not-applicable',
    truthAuditStatus: preserved.truthAuditStatus ?? truthMeta.status ?? 'unknown',
    truthAuditLastRun: preserved.truthAuditLastRun ?? truthMeta.lastReviewed ?? null,
    ...extras,
  };
}

function readLocalIgnisScore(contextDir) {
  const historyPath = path.join(path.dirname(contextDir), 'ignis', 'output', 'score-history.json');
  if (!fs.existsSync(historyPath)) return null;
  try {
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    if (!Array.isArray(history) || history.length === 0) return null;
    return history[history.length - 1];
  } catch {
    return null;
  }
}

function buildTruthAuditScaffold(project) {
  return `<!-- truth-audit-version: ${canonicalTruthAuditVersion} -->
# Truth Audit

Last reviewed: ${today}
Overall status: yellow
Next action: Replace this scaffold with a repo-specific audit after the next meaningful session.

---

## Source Hierarchy

1. \`context/PROJECT_STATUS.json\`
2. \`context/LATEST_HANDOFF.md\`
3. \`context/CURRENT_STATE.md\`
4. Founder-facing derived Markdown

---

## Protocol Genome (/25)

| Dimension | Score | Notes |
|---|---|---|
| Schema alignment | 0 | Bootstrap scaffold — not yet audited |
| Prompt/template alignment | 0 | Bootstrap scaffold — not yet audited |
| Derived-view freshness | 0 | Bootstrap scaffold — not yet audited |
| Handoff continuity | 0 | Bootstrap scaffold — not yet audited |
| Contradiction density | 0 | Bootstrap scaffold — not yet audited |
| **Total** | **0 / 25** | Initial scaffold for ${project.name} |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Project identity | \`context/PROJECT_STATUS.json\` | \`context/PORTFOLIO_CARD.md\` | yellow | ${today} | Run first repo-specific truth audit |
| Session continuity | \`context/LATEST_HANDOFF.md\` | startup brief | yellow | ${today} | Validate after next closeout |
| Live state | \`context/CURRENT_STATE.md\` | founder summaries | yellow | ${today} | Refresh once repo-specific audit is written |
| Protocol assets | \`prompts/\` | templates and founder reports | yellow | ${today} | Confirm prompts/templates match canonical v${canonicalStartVersion} |

---

## Contradictions

- Bootstrap scaffold inserted by Studio Ops compliance rollout. Replace with project-specific contradictions and resolutions.

---

## Freshness

- \`context/PROJECT_STATUS.json\`: ${today}
- \`context/LATEST_HANDOFF.md\`: unknown
- \`context/CURRENT_STATE.md\`: unknown
- Derived founder-facing views: unknown

---

## Recommended Actions

1. Write the first project-specific truth audit at next closeout.
2. Refresh stale derived views from canonical JSON.
3. Sync prompts and templates if protocol changed.
`;
}

function buildPortfolioCard(project) {
  return `# Portfolio Card — ${project.name}

- **Slug:** ${project.slug}
- **Type:** ${project.medium ?? 'project'}
- **Lifecycle:** ${project.lifecycle ?? 'building'}
- **Audience:** ${project.audience ?? 'internal'}
- **Status:** ${project.status ?? 'active'}
- **Health:** ${project.health ?? 'yellow'}
- **Owner:** ${project.owner ?? 'Unknown'}
- **Local path:** \`${project.localPath ?? 'unknown'}\`
- **GitHub:** https://github.com/${project.repo}
- **Live URL:** ${project.runtimeUrl || 'N/A'}
- **Last updated:** ${today}

## One-line summary
${project.summary ?? 'Summary not yet filled.'}

## Current focus
${project.currentFocus ?? 'Current focus not yet filled.'}

## Next milestone
${project.nextMilestone ?? 'Next milestone not yet filled.'}

## Blockers
- Add project-specific blockers here.
`;
}

function checkRepoLock(repoPath) {
  const lockPath = path.join(repoPath, 'context', '.session-lock');
  if (fs.existsSync(lockPath)) {
    return { blocked: true, reason: 'active session lock present' };
  }

  const gitDir = path.join(repoPath, '.git');
  if (!fs.existsSync(gitDir)) {
    return { blocked: false, reason: null };
  }

  try {
    const upstream = git(repoPath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], { allowFailure: true }).trim();
    if (!upstream) return { blocked: false, reason: null };
    const behind = Number(git(repoPath, ['rev-list', '--count', 'HEAD..@{u}'], { allowFailure: true }).trim() || '0');
    if (behind > 0) {
      return { blocked: true, reason: `${behind} remote commit(s) ahead` };
    }
  } catch {
    return { blocked: false, reason: null };
  }

  return { blocked: false, reason: null };
}

function git(repoPath, gitArgs, options = {}) {
  const args = ['-c', `safe.directory=${repoPath.replace(/\\/g, '/')}`, '-C', repoPath, ...gitArgs];
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    if (options.allowFailure) return '';
    const stderr = error.stderr?.toString?.().trim?.() ?? error.message;
    throw new Error(stderr || error.message);
  }
}
