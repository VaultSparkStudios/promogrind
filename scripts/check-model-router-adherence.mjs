#!/usr/bin/env node
/**
 * check-model-router-adherence.mjs
 *
 * Ensures Studio Ops scripts keep all direct Anthropic model/API references
 * inside scripts/lib/model-router.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { inspectModelRouterSource } from './lib/model-router-adherence.mjs';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const scriptsDir = path.join(ROOT, 'scripts');
const allowed = path.normalize(path.join(scriptsDir, 'lib', 'model-router.mjs'));
const skipDirs = new Set(['.git', 'node_modules', '.cache', 'dist', 'build']);
const findings = [];

function safeRead(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function scanFile(file) {
  const text = safeRead(file);
  if (text == null) return;
  findings.push(...inspectModelRouterSource(text, path.relative(ROOT, file).replace(/\\/g, '/')));
}

function walk(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
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

if (fs.existsSync(scriptsDir)) {
  walk(scriptsDir);
}

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
    console.error(`  ${f.file}:${f.line} [${f.pattern}]`);
  }
}

process.exit(report.ok ? 0 : 1);
