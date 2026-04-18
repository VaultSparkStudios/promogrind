#!/usr/bin/env node
// check-canon-compliance.mjs
// Verifies rollout-required canon decisions across studioOsApplied repos.
//
// Usage:
//   node scripts/check-canon-compliance.mjs
//   node scripts/check-canon-compliance.mjs --project <slug>
//   node scripts/check-canon-compliance.mjs --json
//   node scripts/check-canon-compliance.mjs --strict

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));

const args = process.argv.slice(2);
const jsonOut = args.includes('--json');
const strictMode = args.includes('--strict');
const targetSlug = readArgValue('--project');

const PUBLIC_AUDIENCES = new Set(['public-live', 'public-unlaunched', 'public-traction']);

function readArgValue(flag) {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) return null;
  const value = args[index + 1];
  return value.startsWith('--') ? null : value;
}

function fetchFile(project, relPath) {
  if (project.localPath && fs.existsSync(project.localPath)) {
    const absPath = path.join(project.localPath, relPath);
    if (fs.existsSync(absPath)) {
      return fs.readFileSync(absPath, 'utf8');
    }
    return null;
  }

  try {
    const raw = execFileSync('gh', ['api', `repos/${project.repo}/contents/${relPath}`, '--jq', '.content'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      cwd: root,
    }).trim();
    return Buffer.from(raw, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function hasCanon008(project) {
  const agents = fetchFile(project, 'AGENTS.md') || '';
  const decisions = fetchFile(project, 'context/DECISIONS.md') || '';
  const rights = fetchFile(project, 'docs/RIGHTS_PROVENANCE.md') || '';
  return agents.includes('CANON-008') ||
    decisions.includes('CANON-008') ||
    rights.includes('Proprietary') ||
    rights.includes('AGPL-3.0');
}

function evaluateProject(project) {
  const checks = [];

  const brandingApplicable = PUBLIC_AUDIENCES.has(project.audience) && project.brandingRequired === true;
  checks.push({
    canon: 'CANON-006',
    applicable: brandingApplicable,
    pass: !brandingApplicable || project.brandingCompliant === true,
    detail: brandingApplicable
      ? `brandingRequired=${project.brandingRequired} brandingCompliant=${project.brandingCompliant}`
      : 'not applicable',
  });

  const stagingApplicable = (project.vaultStatus || '').toLowerCase() === 'sparked' && project.audience !== 'internal';
  checks.push({
    canon: 'CANON-007',
    applicable: stagingApplicable,
    pass: !stagingApplicable || (project.stagingType && project.stagingType !== 'none'),
    detail: stagingApplicable
      ? `vaultStatus=${project.vaultStatus} audience=${project.audience} stagingType=${project.stagingType || 'none'}`
      : 'not applicable',
  });

  checks.push({
    canon: 'CANON-008',
    applicable: true,
    pass: hasCanon008(project),
    detail: 'Expected in AGENTS.md, DECISIONS.md, or docs/RIGHTS_PROVENANCE.md',
  });

  const missing = checks.filter(check => check.applicable && !check.pass).map(check => check.canon);
  return {
    slug: project.slug,
    name: project.name,
    repo: project.repo,
    missing,
    checks,
  };
}

const projects = registry.projects
  .filter(project => project.status !== 'archived')
  .filter(project => project.studioOsApplied === true)
  .filter(project => !targetSlug || project.slug === targetSlug);

const results = projects.map(evaluateProject);
const failing = results.filter(result => result.missing.length > 0);

if (jsonOut) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(strictMode && failing.length > 0 ? 1 : 0);
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Canon Compliance Check');
console.log(`  rollout-required canons across ${results.length} repo(s)`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

for (const result of results) {
  if (!result.missing.length) {
    console.log(`✓ ${result.name} [${result.slug}]`);
    continue;
  }

  console.log(`⛔ ${result.name} [${result.slug}] — missing ${result.missing.join(', ')}`);
  for (const check of result.checks.filter(item => item.applicable && !item.pass)) {
    console.log(`   - ${check.canon}: ${check.detail}`);
  }
}

console.log('');
console.log(`Missing canon rollout on ${failing.length} repo(s).`);
console.log('');

process.exit(strictMode && failing.length > 0 ? 1 : 0);
