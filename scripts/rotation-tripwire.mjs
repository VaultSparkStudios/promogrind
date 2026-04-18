#!/usr/bin/env node
// rotation-tripwire.mjs — Secret-rotation + sanitization-audit freshness tripwire
// Checks each secret's age (from secrets/.rotation.json) and flags any > 90 days.
// Also checks audit dir freshness (docs/audits/sanitization-YYYY-MM-DD/) and
// auto-runs a fresh sanitization scan if latest is > 7 days old (when --auto-refresh).
//
// Use:
//   node scripts/rotation-tripwire.mjs
//   node scripts/rotation-tripwire.mjs --auto-refresh
//   node scripts/rotation-tripwire.mjs --json

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const autoRefresh = args.has('--auto-refresh');
const asJson = args.has('--json');
const ROTATION_DAYS = 90;
const AUDIT_DAYS = 7;

const now = Date.now();
const report = { rotations: [], audit: null, refreshed: false, warnings: [] };

// --- Rotation check
const rotPath = path.join(ROOT, 'secrets/.rotation.json');
if (fs.existsSync(rotPath)) {
  try {
    const rot = JSON.parse(fs.readFileSync(rotPath, 'utf8'));
    for (const [key, meta] of Object.entries(rot)) {
      const lastRotated = new Date(meta.lastRotated || meta.created || 0).getTime();
      const ageDays = Math.floor((now - lastRotated) / 86400000);
      const overdue = ageDays > ROTATION_DAYS;
      report.rotations.push({ key, ageDays, overdue });
      if (overdue) report.warnings.push(`secret ${key} is ${ageDays}d old (> ${ROTATION_DAYS})`);
    }
  } catch (e) {
    report.warnings.push(`secrets/.rotation.json unreadable: ${e.message}`);
  }
} else {
  report.warnings.push('secrets/.rotation.json missing — no rotation metadata to check');
}

// --- Audit freshness
const auditDir = path.join(ROOT, 'docs/audits');
if (fs.existsSync(auditDir)) {
  const dirs = fs
    .readdirSync(auditDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^sanitization-\d{4}-\d{2}-\d{2}/.test(d.name))
    .map((d) => d.name)
    .sort()
    .reverse();
  const latest = dirs[0];
  if (latest) {
    const datePart = latest.slice('sanitization-'.length, 'sanitization-'.length + 10);
    const ageDays = Math.floor((now - new Date(datePart).getTime()) / 86400000);
    report.audit = { latest, ageDays, stale: ageDays > AUDIT_DAYS };
    if (ageDays > AUDIT_DAYS) {
      report.warnings.push(`sanitization audit is ${ageDays}d old (> ${AUDIT_DAYS})`);
      if (autoRefresh) {
        try {
          execSync('node scripts/check-public-repo-sanitization.mjs --write-report', {
            cwd: ROOT,
            stdio: 'inherit',
          });
          report.refreshed = true;
        } catch (e) {
          report.warnings.push(`auto-refresh failed: ${e.message}`);
        }
      }
    }
  } else {
    report.warnings.push('no sanitization audit dirs found');
  }
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`rotation-tripwire: ${report.warnings.length} warnings`);
  for (const w of report.warnings) console.log(`  ! ${w}`);
  if (report.refreshed) console.log('  ✓ sanitization audit refreshed');
}

process.exit(report.warnings.length ? 1 : 0);
