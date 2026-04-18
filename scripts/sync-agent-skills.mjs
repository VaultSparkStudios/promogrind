#!/usr/bin/env node
// sync-agent-skills.mjs — Claude ↔ Codex skill parity enforcer
// Mirrors ~/.claude/skills/* → ~/.agents/skills/* (Codex) and writes a
// per-skill agents/openai.yaml shim when Codex-specific overrides are needed.
//
// Use:
//   node scripts/sync-agent-skills.mjs              (dry-run, report drift)
//   node scripts/sync-agent-skills.mjs --apply      (write changes)
//   node scripts/sync-agent-skills.mjs --json       (machine-readable)
//
// Exit 0 = in-sync (or --apply succeeded); 1 = drift detected (dry-run).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HOME = os.homedir();
const CLAUDE = path.join(HOME, '.claude', 'skills');
const CODEX = path.join(HOME, '.agents', 'skills');
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const asJson = args.has('--json');

function listSkills(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function copyRecursive(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

function hashDir(dir) {
  // cheap stable signature: sorted-file-sizes joined
  const out = [];
  function walk(p) {
    for (const e of fs.readdirSync(p, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const fp = path.join(p, e.name);
      if (e.isDirectory()) walk(fp);
      else out.push(`${path.relative(dir, fp)}:${fs.statSync(fp).size}`);
    }
  }
  walk(dir);
  return out.join('|');
}

const claudeSkills = listSkills(CLAUDE);
const codexSkills = new Set(listSkills(CODEX));
const report = { synced: [], toCopy: [], drift: [], orphanedCodex: [], errors: [] };

for (const name of claudeSkills) {
  const src = path.join(CLAUDE, name);
  const dst = path.join(CODEX, name);
  const sourceErrors = validateSkillFrontmatter(path.join(src, 'SKILL.md'));
  if (sourceErrors.length) {
    report.errors.push({ name, error: `invalid source SKILL.md: ${sourceErrors.join('; ')}` });
    continue;
  }

  if (!fs.existsSync(dst)) {
    report.toCopy.push(name);
    if (apply) {
      try {
        copyRecursive(src, dst);
        report.synced.push(name);
      } catch (e) {
        report.errors.push({ name, error: String(e) });
      }
    }
    continue;
  }
  if (hashDir(src) !== hashDir(dst)) {
    report.drift.push(name);
    if (apply) {
      try {
        fs.rmSync(dst, { recursive: true, force: true });
        copyRecursive(src, dst);
        report.synced.push(name);
      } catch (e) {
        report.errors.push({ name, error: String(e) });
      }
    }
  }
  const destSkill = path.join(dst, 'SKILL.md');
  if (fs.existsSync(destSkill)) {
    const destErrors = validateSkillFrontmatter(destSkill);
    if (destErrors.length) {
      report.errors.push({ name, error: `invalid codex SKILL.md: ${destErrors.join('; ')}` });
    }
  }
  codexSkills.delete(name);
}

report.orphanedCodex = [...codexSkills];

// Write a stable manifest to codex root so users can audit
if (apply && fs.existsSync(CODEX)) {
  fs.writeFileSync(
    path.join(CODEX, 'MANIFEST.json'),
    JSON.stringify(
      {
        source: 'VaultSparkStudios/vaultspark-studio-ops scripts/sync-agent-skills.mjs',
        syncedAt: new Date().toISOString(),
        skills: claudeSkills,
      },
      null,
      2,
    ),
  );
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  if (apply) {
    console.log(`sync-agent-skills: synced ${report.synced.length} · copied ${report.toCopy.length} · drift ${report.drift.length}`);
    if (report.orphanedCodex.length) {
      console.log(`  orphaned (Codex-only, not touched): ${report.orphanedCodex.join(', ')}`);
    }
    if (report.errors.length) {
      for (const item of report.errors) console.log(`  error ${item.name}: ${item.error}`);
    }
  } else {
    const drifted = report.toCopy.length + report.drift.length;
    if (drifted === 0 && report.errors.length === 0) {
      console.log('sync-agent-skills: IN-SYNC');
    } else {
      console.log(`sync-agent-skills: DRIFT (${drifted})`);
      if (report.toCopy.length) console.log(`  missing in codex: ${report.toCopy.join(', ')}`);
      if (report.drift.length) console.log(`  content differs:  ${report.drift.join(', ')}`);
      if (report.errors.length) {
        for (const item of report.errors) console.log(`  error ${item.name}: ${item.error}`);
      }
    }
  }
}

function validateSkillFrontmatter(filePath) {
  let text = '';
  try {
    text = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    return ['missing SKILL.md'];
  }
  if (!text.startsWith('---\n')) return ['missing frontmatter fence'];
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return ['unterminated frontmatter fence'];

  const scalarOnly = new Set(['name', 'description', 'when_to_use', 'argument-hint', 'allowed-tools']);
  const errors = [];
  const fmBlock = text.slice(4, end).trim();
  for (const [index, rawLine] of fmBlock.split('\n').entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!match) {
      errors.push(`invalid frontmatter line ${index + 2}`);
      continue;
    }
    const [, key, rawValue = ''] = match;
    const value = rawValue.trim();
    const quoted = (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (!quoted && /:\s/.test(value)) errors.push(`unquoted colon in ${key}`);
    if (!quoted && scalarOnly.has(key) && /^[\[{]/.test(value)) errors.push(`unquoted scalar ${key}`);
  }
  return errors;
}

const driftCount = apply ? report.errors.length : report.toCopy.length + report.drift.length + report.errors.length;
process.exit(driftCount === 0 ? 0 : 1);
