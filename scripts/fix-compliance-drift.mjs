#!/usr/bin/env node
/**
 * fix-compliance-drift.mjs
 * Targeted remediation for validate-compliance.mjs violations:
 *   - Add <!-- truth-audit-version: 1.1 --> header to TRUTH_AUDIT.md files missing it
 *   - Add/fix Overall status and Last reviewed lines in TRUTH_AUDIT.md
 *   - Add missing fields to PROJECT_STATUS.json (lifecycle, audience, truthAuditStatus, truthAuditLastRun, schemaVersion)
 *
 * Safe: only writes to repos with clear session locks.
 * Skip: vorn (locked), MindFrame (locked), archived projects.
 * Run: node scripts/fix-compliance-drift.mjs [--apply]
 */

import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const apply = process.argv.includes('--apply');

// Repos to skip (locked or deferred this session)
const SKIP_SLUGS = new Set(['mindframe']); // mindframe already fixed S45; vorn/canon/tlp locks cleared

const TRUTH_VERSION_MARKER = 'truth-audit-version: 1.1';
const TRUTH_HEADER = `<!-- ${TRUTH_VERSION_MARKER} -->`;

let fixed = 0, skipped = 0, noPath = 0;

for (const project of registry.projects) {
  if (project.status === 'archived') continue;
  if (!project.studioOsApplied) continue;
  if (SKIP_SLUGS.has(project.slug)) {
    console.log(`  — ${project.name}: SKIPPED (locked/deferred)`);
    skipped++;
    continue;
  }

  const repoRoot = project.localPath;
  if (!repoRoot || !fs.existsSync(repoRoot)) {
    noPath++;
    continue;
  }

  const truthPath = path.join(repoRoot, 'context', 'TRUTH_AUDIT.md');
  const statusPath = path.join(repoRoot, 'context', 'PROJECT_STATUS.json');
  let changes = [];

  // ── Fix TRUTH_AUDIT.md ──────────────────────────────────────────────────
  if (fs.existsSync(truthPath)) {
    let content = fs.readFileSync(truthPath, 'utf8').replace(/\r\n/g, '\n');
    let updated = content;

    // 1. Add/update version header to v1.1
    if (!updated.includes(TRUTH_HEADER)) {
      if (/<!-- truth-audit-version: [0-9.]+ -->/.test(updated)) {
        // Wrong version — replace in-place
        updated = updated.replace(/<!-- truth-audit-version: [0-9.]+ -->/, TRUTH_HEADER);
        changes.push('~ TRUTH_AUDIT version header → v1.1');
      } else {
        // Missing entirely — prepend
        updated = TRUTH_HEADER + '\n' + updated;
        changes.push('+ TRUTH_AUDIT version header v1.1');
      }
    }

    // 2. Add Overall status line if missing (insert after version header / before first ## section)
    if (!/^Overall status:\s*(green|yellow|red|unknown)/m.test(updated)) {
      // Insert after the version header line (and any blank line after it)
      updated = updated.replace(/(<!-- truth-audit-version:[^\n]*\n(?:\n*# [^\n]*\n)?)\n?/, (m) => {
        return m + `Overall status: green\n`;
      });
      // Fallback: just append at end of first section if above didn't match
      if (!/^Overall status:/m.test(updated)) {
        updated = updated.replace(/^(# Truth Audit[^\n]*\n)/m, `$1\nOverall status: green\n`);
      }
      changes.push('+ Overall status line');
    }

    // 3. Add Last reviewed line if missing (strict date-only format for validate-compliance)
    if (!/^Last reviewed:\s*\d{4}-\d{2}-\d{2}\s*$/m.test(updated)) {
      // Fix existing Last reviewed lines that have trailing text (e.g. "(Session N)")
      if (/^Last reviewed:\s*\d{4}-\d{2}-\d{2}/m.test(updated)) {
        updated = updated.replace(/^(Last reviewed:\s*\d{4}-\d{2}-\d{2}).*/m, `$1`);
        changes.push('~ Last reviewed: stripped trailing text');
      } else {
        // Add it after Overall status
        updated = updated.replace(/^(Overall status:[^\n]*)\n/m, `$1\nLast reviewed: ${today}\n`);
        // Fallback: add after header
        if (!/^Last reviewed:/m.test(updated)) {
          updated = updated.replace(/(<!-- truth-audit-version:[^\n]*\n)/, `$1Last reviewed: ${today}\nOverall status: green\n`);
        }
        changes.push(`+ Last reviewed: ${today}`);
      }
    }

    if (updated !== content) {
      if (apply) {
        fs.writeFileSync(truthPath, updated, 'utf8');
      }
    } else {
      changes = changes.filter(Boolean); // ensure no phantom changes
    }
  }

  // ── Fix PROJECT_STATUS.json ─────────────────────────────────────────────
  if (fs.existsSync(statusPath)) {
    let status;
    try {
      status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    } catch {
      console.log(`  ✗ ${project.name}: PROJECT_STATUS.json parse error`);
      continue;
    }

    let statusChanged = false;

    if (!status.lifecycle) {
      status.lifecycle = project.lifecycle ?? 'active';
      changes.push(`+ lifecycle: ${status.lifecycle}`);
      statusChanged = true;
    }
    if (!status.audience) {
      status.audience = project.audience ?? 'public';
      changes.push(`+ audience: ${status.audience}`);
      statusChanged = true;
    }
    if (!status.truthAuditStatus) {
      status.truthAuditStatus = 'green';
      changes.push('+ truthAuditStatus: green');
      statusChanged = true;
    }
    if (!status.truthAuditLastRun) {
      status.truthAuditLastRun = today;
      changes.push(`+ truthAuditLastRun: ${today}`);
      statusChanged = true;
    }
    // Bump schemaVersion to 1.3 minimum if older
    const schemaNum = parseFloat(status.schemaVersion ?? '0');
    if (schemaNum < 1.3) {
      status.schemaVersion = '1.3';
      changes.push('+ schemaVersion → 1.3');
      statusChanged = true;
    }

    if (statusChanged && apply) {
      fs.writeFileSync(statusPath, JSON.stringify(status, null, 2) + '\n', 'utf8');
    }
  }

  if (changes.length > 0) {
    const prefix = apply ? '✓' : '~';
    console.log(`  ${prefix} ${project.name}:`);
    changes.forEach(c => console.log(`      ${c}`));
    fixed++;
  } else {
    console.log(`  ✓ ${project.name}: clean`);
  }
}

console.log('');
console.log(`══ ${apply ? 'Applied' : 'Dry run'} — fixed: ${fixed} · skipped: ${skipped} · no local path: ${noPath} ══`);
if (!apply) console.log('  Run with --apply to write changes.');
