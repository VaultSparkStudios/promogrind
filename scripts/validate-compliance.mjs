#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { validateSlug } from './lib/validate.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));
const startTemplate = fs.readFileSync(path.join(root, 'docs', 'templates', 'project-system', 'START_PROMPT.template.md'), 'utf8');
const closeoutTemplate = fs.readFileSync(path.join(root, 'docs', 'templates', 'project-system', 'CLOSEOUT_PROMPT.template.md'), 'utf8');
const truthTemplate = fs.readFileSync(path.join(root, 'docs', 'templates', 'project-system', 'TRUTH_AUDIT.template.md'), 'utf8');
const startVersion = extractVersion(startTemplate, 'template-version');
const closeoutVersion = extractVersion(closeoutTemplate, 'template-version');
const truthVersion = extractVersion(truthTemplate, 'truth-audit-version');
const targetSlug = validateSlug('project', process.argv.includes('--project') ? process.argv[process.argv.indexOf('--project') + 1] : null);
const jsonOut = process.argv.includes('--json');
const summaryOnly = process.argv.includes('--summary');
const ciMode = process.argv.includes('--ci') || process.env.CI === 'true';
const strictMode = process.argv.includes('--strict');

let violations = 0;
const results = [];

for (const project of registry.projects) {
  if (!project.studioOsApplied || project.status === 'archived') continue;
  if (targetSlug && project.slug !== targetSlug) continue;
  const repoRoot = project.localPath;
  if (!repoRoot || !fs.existsSync(repoRoot)) {
    const issue = 'localPath missing or inaccessible';
    const skipped = ciMode && !strictMode;
    results.push({
      slug: project.slug,
      name: project.name,
      status: skipped ? 'skipped' : 'failed',
      issues: skipped ? [] : [issue],
      skippedReason: skipped ? issue : null,
    });
    if (!jsonOut && !summaryOnly) {
      console.log(skipped ? `⚠ ${project.name}: ${issue} (skipping)` : `✗ ${project.name}: ${issue}`);
    }
    if (!skipped) {
      violations += 1;
    }
    continue;
  }

  const issues = [];
  const startPath = path.join(repoRoot, 'prompts', 'start.md');
  const closeoutPath = path.join(repoRoot, 'prompts', 'closeout.md');
  const truthPath = path.join(repoRoot, 'context', 'TRUTH_AUDIT.md');
  const statusPath = path.join(repoRoot, 'context', 'PROJECT_STATUS.json');

  const start = readText(startPath);
  const closeout = readText(closeoutPath);
  const truth = readText(truthPath);
  const status = readJson(statusPath);

  if (extractVersion(start, 'template-version') !== startVersion) issues.push(`start.md not at v${startVersion}`);
  if (extractVersion(closeout, 'template-version') !== closeoutVersion) issues.push(`closeout.md not at v${closeoutVersion}`);
  if (!versionAtLeast(extractVersion(truth, 'truth-audit-version'), truthVersion)) issues.push(`TRUTH_AUDIT.md missing v${truthVersion} header`);

  if (!status) {
    issues.push('PROJECT_STATUS.json unreadable');
  } else {
    if (!status.schemaVersion || !/^\d+\.\d+$/.test(status.schemaVersion)) issues.push('PROJECT_STATUS.json schemaVersion missing or invalid');
    if ('stage' in status) issues.push('PROJECT_STATUS.json still has deprecated stage field');
    for (const field of ['lifecycle', 'audience', 'truthAuditStatus', 'truthAuditLastRun']) {
      if (!(field in status)) issues.push(`PROJECT_STATUS.json missing ${field}`);
    }
  }

  if (truth && !/^Overall status:\s*(green|yellow|red|unknown)\b/m.test(truth)) issues.push('TRUTH_AUDIT.md missing Overall status line');
  if (truth && !/^Last reviewed:\s*\d{4}-\d{2}-\d{2}(?:\s*\([^)]*\))?$/m.test(truth)) issues.push('TRUTH_AUDIT.md missing Last reviewed date');

  results.push({
    slug: project.slug,
    name: project.name,
    status: issues.length > 0 ? 'failed' : 'passed',
    issues,
    skippedReason: null,
  });

  if (issues.length > 0) {
    if (!jsonOut && !summaryOnly) {
      console.log(`✗ ${project.name}`);
      for (const issue of issues) console.log(`  - ${issue}`);
    }
    violations += issues.length;
  } else {
    if (!jsonOut && !summaryOnly) console.log(`✓ ${project.name}`);
  }
}

if (violations > 0) {
  if (jsonOut) {
    console.log(JSON.stringify({ violations, results }, null, 2));
  } else if (summaryOnly) {
    printSummary(results, violations);
  } else {
    console.error(`\nCompliance validation failed with ${violations} issue(s).`);
  }
  process.exit(1);
}

if (jsonOut) {
  console.log(JSON.stringify({ violations, results }, null, 2));
} else if (summaryOnly) {
  printSummary(results, violations);
} else {
  console.log('\nCompliance validation passed.');
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function extractVersion(content, marker) {
  return content.match(new RegExp(`<!-- ${marker}: ([0-9.]+) -->`))?.[1] ?? null;
}

function versionAtLeast(a, b) {
  if (!a || !b) return false;
  const [ma, na] = a.split('.').map(Number);
  const [mb, nb] = b.split('.').map(Number);
  return ma > mb || (ma === mb && na >= nb);
}

function printSummary(results, violations) {
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  console.log(`Compliance validation: ${passed} passed · ${failed} failed · ${skipped} skipped · ${violations} issue(s)`);
  for (const result of results.filter(r => r.status === 'failed')) {
    console.log(`✗ ${result.name}: ${result.issues.join(' · ')}`);
  }
}
