#!/usr/bin/env node
/**
 * check-model-router-adherence.mjs
 *
 * Ensures Studio Ops scripts keep all direct Anthropic model/API references
 * inside scripts/lib/model-router.mjs. This protects the model-router
 * chokepoint without relying on brittle CI-only grep snippets.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const scriptsDir = path.join(ROOT, 'scripts');
const allowed = path.normalize(path.join(scriptsDir, 'lib', 'model-router.mjs'));
const patterns = [
  { id: 'anthropic-api-host', regex: /api\.anthropic\.com/ },
  { id: 'anthropic-sdk', regex: /@anthropic-ai\/sdk/ },
  { id: 'hardcoded-claude-model', regex: /claude-(?:opus|sonnet|haiku|3|4)[A-Za-z0-9._-]*/ },
];
const skipDirs = new Set(['.git', 'node_modules', '.cache', 'dist', 'build']);
const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(?:mjs|js|ts|cjs)$/.test(entry.name)) continue;
    if (path.normalize(full) === allowed) continue;
    scanFile(full);
  }
}

function scanFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of patterns) {
      if (pattern.regex.test(lines[i])) {
        findings.push({
          file: path.relative(ROOT, file).replace(/\\/g, '/'),
          line: i + 1,
          pattern: pattern.id,
          excerpt: lines[i].trim().slice(0, 180),
        });
      }
      pattern.regex.lastIndex = 0;
    }
  }
}

walk(scriptsDir);

const report = {
  ok: findings.length === 0,
  checkedRoot: path.relative(ROOT, scriptsDir) || 'scripts',
  allowedFile: path.relative(ROOT, allowed).replace(/\\/g, '/'),
  findings,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else if (report.ok) {
  console.log(`✓ model-router adherence · no direct Anthropic refs outside ${report.allowedFile}`);
} else {
  console.error(`✗ model-router adherence · ${findings.length} direct Anthropic reference(s) outside ${report.allowedFile}`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line} [${f.pattern}] ${f.excerpt}`);
  }
}

process.exit(report.ok ? 0 : 1);

