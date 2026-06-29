#!/usr/bin/env node
// apply-sanitization-untrack.mjs
// Reads audits/sanitization/latest/*.json and untracks confirmed-risk files
// from public repos while preserving the local/private copies on disk.

import fs from 'fs';
import path from 'path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const jsonMode = args.includes('--json');
const onlyArg = args.find(arg => arg.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map(s => s.trim()).filter(Boolean)) : null;

const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
const auditDir = path.join(ROOT, 'audits', 'sanitization', 'latest');
const reports = fs.readdirSync(auditDir)
  .filter(name => name.endsWith('.json') && !name.startsWith('_') && !name.endsWith('.issue.json'))
  .map(name => readJson(path.join(auditDir, name), null))
  .filter(Boolean)
  .filter(report => !only || only.has(report.slug));

const privateDocNames = new Set([
  'docs/CREATIVE_DIRECTION_RECORD.md',
  'docs/INNOVATION_PIPELINE.md',
  'docs/RIGHTS_PROVENANCE.md',
]);

const result = {
  generatedAt: new Date().toISOString(),
  apply,
  repos: [],
  totals: { repos: 0, candidates: 0, ignored: 0, untracked: 0, alreadyUntracked: 0, skipped: 0, errors: 0 },
};

for (const report of reports) {
  const project = registry.projects?.find(p => p.slug === report.slug);
  if (!project?.localPath || !fs.existsSync(project.localPath)) continue;
  const repo = {
    slug: report.slug,
    name: report.name,
    localPath: project.localPath,
    candidates: [],
    skipped: [],
    errors: [],
  };
  result.totals.repos++;

  const findings = report.findings ?? [];
  for (const finding of findings) {
    if (finding.severity !== 'critical' && finding.priorityBand !== 'confirmed-risk') continue;
    const rel = normalizeRel(finding.file || finding.path || '');
    if (!rel) continue;
    if (!isAllowedCandidate(rel)) {
      repo.skipped.push({ path: rel, reason: 'not in allowed untrack set' });
      result.totals.skipped++;
      continue;
    }
    result.totals.candidates++;
    const abs = path.join(project.localPath, rel);
    ensureIgnore(repo, project.localPath, rel);
    const tracked = git(project.localPath, ['ls-files', '--error-unmatch', rel]).code === 0;
    if (!tracked) {
      repo.candidates.push({ path: rel, action: 'already-untracked', exists: fs.existsSync(abs) });
      result.totals.alreadyUntracked++;
      continue;
    }
    if (apply) {
      const rm = git(project.localPath, ['rm', '--cached', '--', rel]);
      if (rm.code !== 0) {
        repo.errors.push({ path: rel, error: rm.err || rm.out || `git rm exited ${rm.code}` });
        result.totals.errors++;
        continue;
      }
      repo.candidates.push({ path: rel, action: 'untracked', exists: fs.existsSync(abs) });
      result.totals.untracked++;
    } else {
      repo.candidates.push({ path: rel, action: 'would-untrack', exists: fs.existsSync(abs) });
    }
  }
  result.repos.push(repo);
}

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`sanitization-untrack: ${apply ? 'APPLY' : 'DRY'} · ${result.totals.candidates} candidate(s), ${result.totals.untracked} untracked, ${result.totals.alreadyUntracked} already untracked, ${result.totals.errors} error(s)`);
  for (const repo of result.repos) {
    if (!repo.candidates.length && !repo.skipped.length && !repo.errors.length) continue;
    console.log(`\n${repo.name} (${repo.slug})`);
    for (const item of repo.candidates) console.log(`  ${item.action}: ${item.path}${item.exists ? '' : ' (local file absent)'}`);
    for (const item of repo.skipped) console.log(`  skipped: ${item.path} — ${item.reason}`);
    for (const item of repo.errors) console.log(`  error: ${item.path} — ${item.error}`);
  }
}

process.exit(result.totals.errors ? 1 : 0);

function normalizeRel(file) {
  return String(file).replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function isAllowedCandidate(rel) {
  if (privateDocNames.has(rel)) return true;
  const base = path.posix.basename(rel);
  if (base === '.env' || base === '.env.local' || /^\.env\./.test(base)) return true;
  if (/\.env(?:\.local)?$/.test(rel)) return true;
  if (/^CODEX_HANDOFF_\d{4}-\d{2}-\d{2}\.md$/.test(base)) return true;
  return false;
}

function ensureIgnore(repo, repoRoot, rel) {
  const ignorePath = path.join(repoRoot, '.gitignore');
  const current = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, 'utf8') : '';
  const normalized = current.replace(/\r\n/g, '\n');
  if (normalized.split('\n').includes(rel)) {
    result.totals.ignored++;
    return;
  }
  if (apply) {
    const prefix = normalized.endsWith('\n') || normalized.length === 0 ? '' : '\n';
    fs.writeFileSync(ignorePath, `${current}${prefix}${rel}\n`, 'utf8');
  }
  repo.candidates.push({ path: '.gitignore', action: apply ? `ignore-added:${rel}` : `would-ignore:${rel}`, exists: true });
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function git(cwd, gitArgs) {
  const r = spawnSync('git', gitArgs, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { code: r.status ?? -1, out: r.stdout || '', err: r.stderr || '' };
}
