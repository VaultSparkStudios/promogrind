#!/usr/bin/env node
// rename-drift-audit.mjs
// Detects currentName / formerName mismatches across registry, generated Markdown, and rollout tooling.
// Reports anywhere stale names are referenced — before they surface as path blockers.
//
// Usage:
//   node scripts/rename-drift-audit.mjs           — report only
//   node scripts/rename-drift-audit.mjs --verbose — include context snippets

import fs from 'fs';
import path from 'path';

const verbose = process.argv.includes('--verbose');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);

// Build rename map: projects that have a formerName field
const renames = registry.projects
  .filter((p) => p.formerName)
  .map((p) => ({
    slug: p.slug,
    currentName: p.name,
    formerName: p.formerName,
    currentSlug: p.slug,
    formerSlug: p.formerSlug ?? null,
  }));

if (renames.length === 0) {
  console.log('✓  No renamed projects found in registry. Nothing to audit.\n');
  process.exit(0);
}

console.log(`\n  Rename Drift Audit — ${today}`);
console.log(`  Checking ${renames.length} renamed project(s)...\n`);

// Files and directories to scan (within the studio-ops repo)
const SCAN_TARGETS = [
  'context',
  'portfolio',
  'scripts',
  'docs',
  'agents',
  '.github/workflows',
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.md', '.json', '.mjs', '.sh', '.js', '.ts', '.yml', '.yaml'];

let totalDrifts = 0;
const report = [];

for (const rename of renames) {
  const { slug, currentName, formerName, formerSlug } = rename;
  const drifts = [];

  const searchTerms = [formerName];
  if (formerSlug) searchTerms.push(formerSlug);

  for (const dir of SCAN_TARGETS) {
    const dirPath = path.join(root, dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = walkDir(dirPath, SCAN_EXTENSIONS);

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(root, filePath).replace(/\\/g, '/');

      for (const term of searchTerms) {
        const regex = new RegExp(escapeRegex(term), 'gi');
        const matches = [...content.matchAll(regex)];
        if (matches.length === 0) continue;

        const lineNumbers = getLineNumbers(content, matches);

        drifts.push({
          file: relPath,
          term,
          count: matches.length,
          lines: lineNumbers,
          snippets: verbose ? getSnippets(content, lineNumbers, term) : [],
        });
      }
    }
  }

  if (drifts.length > 0) {
    totalDrifts += drifts.length;
    report.push({ slug, currentName, formerName, formerSlug, drifts });
  }
}

// Output report
if (report.length === 0) {
  console.log('  ✓  No stale name references found. Registry is clean.\n');
} else {
  for (const entry of report) {
    const statusIcon = entry.drifts.length > 0 ? '⚠' : '✓';
    console.log(`  ${statusIcon}  ${entry.currentName} (formerly: ${entry.formerName}${entry.formerSlug ? ` / ${entry.formerSlug}` : ''})`);
    console.log(`     Slug: ${entry.slug}`);
    console.log(`     Drifts found: ${entry.drifts.length} file(s)\n`);

    for (const drift of entry.drifts) {
      console.log(`     📄 ${drift.file}`);
      console.log(`        Term: "${drift.term}" · ${drift.count} occurrence(s) · lines: ${drift.lines.join(', ')}`);

      if (verbose && drift.snippets.length > 0) {
        console.log('        Snippets:');
        for (const snippet of drift.snippets.slice(0, 3)) {
          console.log(`          ${snippet}`);
        }
      }
      console.log('');
    }
  }

  console.log(`  ─────────────────────────────────────────────────────`);
  console.log(`  Total: ${totalDrifts} file(s) with stale name references`);
  console.log(`  Action: Update stale references to use current names from PROJECT_REGISTRY.json`);
  console.log(`  Re-run after fixes: node scripts/rename-drift-audit.mjs\n`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function walkDir(dir, extensions) {
  const results = [];
  try {
    for (const entry of fs.readdirSync(dir)) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        results.push(...walkDir(full, extensions));
      } else if (extensions.some((ext) => full.endsWith(ext))) {
        results.push(full);
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return results;
}

function getLineNumbers(content, matches) {
  const lines = content.split('\n');
  const lineNumbers = new Set();
  for (const match of matches) {
    const before = content.slice(0, match.index);
    const lineNum = before.split('\n').length;
    lineNumbers.add(lineNum);
  }
  return [...lineNumbers].sort((a, b) => a - b);
}

function getSnippets(content, lineNumbers, term) {
  const lines = content.split('\n');
  return lineNumbers.slice(0, 3).map((num) => {
    const line = (lines[num - 1] ?? '').trim().slice(0, 120);
    return `L${num}: ${line}`;
  });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
