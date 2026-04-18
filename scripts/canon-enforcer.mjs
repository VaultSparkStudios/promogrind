#!/usr/bin/env node
// canon-enforcer.mjs — Pre-push canon violation checker
// Reads docs/CANON_RULES.json (declarative rules) and runs each rule against
// the working tree. Any violation blocks push (exit 1) or is reported (exit 0)
// depending on --report vs --gate mode.
//
// Use:
//   node scripts/canon-enforcer.mjs --report          (exit 0 regardless)
//   node scripts/canon-enforcer.mjs --gate            (exit 1 on any violation)
//   node scripts/canon-enforcer.mjs --json            (machine-readable)

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const gateMode = args.has('--gate');
const asJson = args.has('--json');

const rulesPath = path.join(ROOT, 'docs/CANON_RULES.json');
if (!fs.existsSync(rulesPath)) {
  console.error('canon-enforcer: CANON_RULES.json not found');
  process.exit(2);
}
const { rules } = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

const violations = [];
const passed = [];

function read(p) {
  try {
    return fs.readFileSync(path.join(ROOT, p), 'utf8');
  } catch {
    return null;
  }
}

for (const r of rules) {
  let violated = false;
  let detail = '';
  switch (r.kind) {
    case 'file-exists': {
      if (!fs.existsSync(path.join(ROOT, r.path))) {
        violated = true;
        detail = `missing: ${r.path}`;
      }
      break;
    }
    case 'regex-must-match': {
      const content = read(r.path);
      if (content == null) {
        violated = true;
        detail = `file missing: ${r.path}`;
      } else if (!new RegExp(r.pattern, r.flags || '').test(content)) {
        violated = true;
        detail = `no match for /${r.pattern}/ in ${r.path}`;
      }
      break;
    }
    case 'regex-must-not-match': {
      const content = read(r.path);
      if (content != null && new RegExp(r.pattern, r.flags || '').test(content)) {
        violated = true;
        detail = `forbidden match /${r.pattern}/ in ${r.path}`;
      }
      break;
    }
    case 'json-field-equals': {
      const content = read(r.path);
      if (content == null) {
        violated = true;
        detail = `file missing: ${r.path}`;
        break;
      }
      try {
        const j = JSON.parse(content);
        const val = r.field.split('.').reduce((o, k) => (o == null ? o : o[k]), j);
        if (val !== r.value) {
          violated = true;
          detail = `${r.path}#${r.field}=${JSON.stringify(val)} (expected ${JSON.stringify(r.value)})`;
        }
      } catch {
        violated = true;
        detail = `invalid json: ${r.path}`;
      }
      break;
    }
    case 'shell': {
      try {
        execSync(r.command, { cwd: ROOT, stdio: 'ignore' });
      } catch {
        violated = true;
        detail = `command failed: ${r.command}`;
      }
      break;
    }
    default:
      violated = true;
      detail = `unknown rule kind: ${r.kind}`;
  }
  if (violated) violations.push({ id: r.id, severity: r.severity || 'error', canon: r.canon, detail });
  else passed.push(r.id);
}

const blocking = violations.filter((v) => v.severity === 'error').length;

if (asJson) {
  console.log(JSON.stringify({ passed, violations, blocking }, null, 2));
} else {
  console.log(`canon-enforcer: ${passed.length} passed · ${violations.length} violations (${blocking} blocking)`);
  for (const v of violations) console.log(`  [${v.severity}] ${v.id} (${v.canon || '-'}) — ${v.detail}`);
}

process.exit(gateMode && blocking > 0 ? 1 : 0);
