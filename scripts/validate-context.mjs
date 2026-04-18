#!/usr/bin/env node
// validate-context.mjs — Studio OS context schema validator
// Asserts required fields exist in every context/*.md file.
// Exit 0 = valid; exit 1 = missing fields; exit 2 = missing files.
// Use: node scripts/validate-context.mjs [--json] [--fix-missing]

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CTX = path.join(ROOT, 'context');
const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const fixMissing = args.has('--fix-missing');

// Required file → required headings (regex) or text markers.
// For TASK_BOARD we accept EITHER the bucket-style (## Now / ## Next / ## Blocked)
// OR the unified-genius-list table style (## Unified Genius List + ranked table header).
const SCHEMA = {
  'PROJECT_BRIEF.md': [/^#\s+Project Brief/im, /(Scope|Purpose|Mission|Identity|Focus)/i],
  'SOUL.md': [/(^#\s+SOUL|## SOUL|Non[-\s]Negotiable)/im, /(Tone|Voice)/i, /(Audience|Reader|Player|User)/i],
  'CURRENT_STATE.md': [/^#\s+Current State/im, /(Shipped|Live|Active|Status|State)/i],
  'TASK_BOARD.md': [/(^##\s+Now|^##\s+Unified Genius List|## Unified Genius List)/m],
  'LATEST_HANDOFF.md': [/^#\s+Latest Handoff/im, /(Session|Last|Where)/i],
  'DECISIONS.md': [/^#\s+Decisions/im],
  'SELF_IMPROVEMENT_LOOP.md': [/<!-- rolling-status-start -->/, /<!-- rolling-status-end -->/],
  'PROJECT_STATUS.json': ['__json__', ['status', 'health', 'currentFocus', 'lastUpdated']],
};

const report = { ok: true, files: [], missingFiles: [], missingFields: [] };

for (const [fname, rules] of Object.entries(SCHEMA)) {
  const fpath = path.join(CTX, fname);
  if (!fs.existsSync(fpath)) {
    report.missingFiles.push(fname);
    report.ok = false;
    continue;
  }
  const raw = fs.readFileSync(fpath, 'utf8');
  if (rules[0] === '__json__') {
    try {
      const j = JSON.parse(raw);
      const needed = rules[1];
      const missing = needed.filter((k) => !(k in j));
      if (missing.length) {
        report.missingFields.push({ file: fname, missing });
        report.ok = false;
      }
      report.files.push({ file: fname, valid: missing.length === 0 });
    } catch (e) {
      report.missingFields.push({ file: fname, missing: ['__invalid_json__'] });
      report.ok = false;
    }
    continue;
  }
  const missing = [];
  for (const rule of rules) {
    if (rule instanceof RegExp && !rule.test(raw)) missing.push(String(rule));
  }
  if (missing.length) {
    report.missingFields.push({ file: fname, missing });
    report.ok = false;
  }
  report.files.push({ file: fname, valid: missing.length === 0 });
}

if (fixMissing && report.missingFiles.length) {
  for (const f of report.missingFiles) {
    const tpl = path.join(ROOT, 'docs/templates/project-system', f.replace('.md', '.template.md'));
    if (fs.existsSync(tpl)) {
      fs.mkdirSync(CTX, { recursive: true });
      fs.copyFileSync(tpl, path.join(CTX, f));
      console.error(`  seeded: ${f}`);
    }
  }
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const label = report.ok ? 'PASS' : 'FAIL';
  console.log(`validate-context: ${label}`);
  if (report.missingFiles.length) {
    console.log(`  missing files: ${report.missingFiles.join(', ')}`);
  }
  for (const m of report.missingFields) {
    console.log(`  ${m.file}: missing ${m.missing.join(', ')}`);
  }
}

process.exit(report.ok ? 0 : 1);
