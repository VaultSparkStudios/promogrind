#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const HOME = os.homedir();
const args = new Set(process.argv.slice(2));
const json = args.has('--json');
const strict = args.has('--strict');
const includeCodex = args.has('--include-codex') || args.has('--all-agent-roots');
const skillsRoot = getArg('--skills-root') || path.join(HOME, '.claude', 'skills');
const codexSkillsRoot = path.join(HOME, '.agents', 'skills');
const commandsRoot = getArg('--commands-root') || path.join(HOME, '.claude', 'commands');
const protocolPath = path.join(ROOT, 'docs', 'SESSION_PROTOCOL.md');

const issues = [];
const warnings = [];

const protocolText = readText(protocolPath);
const protocolSections = extractProtocolSections(protocolText);

if (!protocolText) {
  issues.push(problem('protocol', 'SESSION_PROTOCOL.md', 'missing canonical protocol file'));
}

const skillRoots = [{ label: 'claude', root: skillsRoot }];
if (includeCodex && path.resolve(codexSkillsRoot) !== path.resolve(skillsRoot)) {
  skillRoots.push({ label: 'codex', root: codexSkillsRoot });
}

const skillFiles = skillRoots.flatMap(({ label, root }) => (
  fs.existsSync(root)
    ? fs.readdirSync(root, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => ({
          label,
          name: entry.name,
          path: path.join(root, entry.name, 'SKILL.md'),
        }))
        .filter(entry => fs.existsSync(entry.path))
    : []
));

const commandFiles = fs.existsSync(commandsRoot)
  ? fs.readdirSync(commandsRoot, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
      .map(entry => ({
        name: entry.name.replace(/\.md$/i, ''),
        path: path.join(commandsRoot, entry.name),
      }))
  : [];

for (const { label, root } of skillRoots) {
  if (!fs.existsSync(root)) issues.push(problem('skills-root', label, `missing skills root: ${root}`));
}
if (!fs.existsSync(commandsRoot)) issues.push(problem('commands-root', commandsRoot, 'missing commands root'));

const primarySkillNames = new Set(
  skillFiles.filter(entry => entry.label === skillRoots[0].label).map(entry => entry.name),
);

for (const entry of skillFiles) auditSkill(entry);
for (const entry of commandFiles) auditCommand(entry);

const summary = {
  ok: issues.length === 0 && (!strict || warnings.length === 0),
  checkedAt: new Date().toISOString(),
  protocolPath,
  skillsRoot,
  commandsRoot,
  counts: {
    skills: skillFiles.length,
    commands: commandFiles.length,
    sections: protocolSections.size,
    issues: issues.length,
    warnings: warnings.length,
  },
  issues,
  warnings,
};

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  printSummary(summary);
}

process.exit(summary.ok ? 0 : 1);

function auditSkill(entry) {
  const text = readText(entry.path);
  if (!text) {
    issues.push(problem('skill', entry.name, 'missing SKILL.md'));
    return;
  }

  const { frontmatter, body, errors: frontmatterErrors } = parseFrontmatter(text);
  const normalizedBody = normalize(body);
  const bodyLines = normalizedBody.trim().split('\n').filter(Boolean).length;
  const sectionRef = normalizedBody.match(/SESSION_PROTOCOL\.md[^§]*§\s*(\d+)/i)?.[1] ?? null;
  const displayName = `${entry.label}:${entry.name}`;

  for (const detail of frontmatterErrors) {
    issues.push(problem('skill', displayName, detail));
  }

  for (const key of ['name', 'description', 'allowed-tools']) {
    if (!frontmatter[key]) issues.push(problem('skill', displayName, `missing frontmatter field: ${key}`));
  }

  if (frontmatter.name && frontmatter.name !== entry.name) {
    issues.push(problem('skill', displayName, `frontmatter name mismatch (${frontmatter.name})`));
  }

  if (bodyLines > 35) {
    warnings.push(problem('skill', displayName, `skill body is ${bodyLines} non-empty lines; thin-pointer target is <= 35`));
  }

  if (!sectionRef) {
    warnings.push(problem('skill', displayName, 'no SESSION_PROTOCOL section reference found'));
  } else if (!protocolSections.has(sectionRef)) {
    issues.push(problem('skill', displayName, `references missing SESSION_PROTOCOL section §${sectionRef}`));
  }

  if (/Source of truth:/i.test(normalizedBody) && !/SESSION_PROTOCOL\.md/i.test(normalizedBody)) {
    issues.push(problem('skill', displayName, 'claims source of truth without pointing to SESSION_PROTOCOL.md'));
  }
}

function auditCommand(entry) {
  const text = readText(entry.path);
  if (!text) {
    issues.push(problem('command', entry.name, 'missing command file'));
    return;
  }

  const { frontmatter, body } = parseFrontmatter(text);
  const normalizedBody = normalize(body);
  const bodyLines = normalizedBody.trim().split('\n').filter(Boolean).length;
  const skillRef = normalizedBody.match(/Invoke the `([^`]+)` skill/i)?.[1] ?? null;

  if (!frontmatter.description) {
    issues.push(problem('command', entry.name, 'missing frontmatter description'));
  }

  if (!skillRef) {
    issues.push(problem('command', entry.name, 'does not invoke a skill explicitly'));
  } else if (!primarySkillNames.has(skillRef)) {
    issues.push(problem('command', entry.name, `references missing skill: ${skillRef}`));
  }

  if (bodyLines > 18) {
    warnings.push(problem('command', entry.name, `command shim is ${bodyLines} non-empty lines; thin-wrapper target is <= 18`));
  }
}

function extractProtocolSections(text) {
  const sections = new Map();
  for (const match of normalize(text).matchAll(/^#{2,3} §(\d+) — (.+)$/gm)) {
    sections.set(match[1], match[2].trim());
  }
  return sections;
}

function parseFrontmatter(text) {
  const normalized = normalize(text);
  if (!normalized.startsWith('---\n')) return { frontmatter: {}, body: normalized, errors: ['missing frontmatter fence'] };
  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) return { frontmatter: {}, body: normalized, errors: ['unterminated frontmatter fence'] };
  const fmBlock = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 5);
  const frontmatter = {};
  const errors = [];

  for (const [index, rawLine] of fmBlock.split('\n').entries()) {
    const lineNo = index + 2;
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!match) {
      errors.push(`invalid YAML frontmatter line ${lineNo}: ${line}`);
      continue;
    }

    const [, key, rawValue = ''] = match;
    const value = rawValue.trim();
    const quoted = isQuoted(value);
    const scalarOnly = new Set(['name', 'description', 'when_to_use', 'argument-hint', 'allowed-tools']);

    if (!quoted && /:\s/.test(value)) {
      errors.push(`frontmatter field "${key}" contains an unquoted colon on line ${lineNo}`);
    }
    if (!quoted && scalarOnly.has(key) && /^[\[{]/.test(value)) {
      errors.push(`frontmatter field "${key}" should be quoted as a scalar on line ${lineNo}`);
    }

    frontmatter[key] = stripQuotes(value);
  }
  return { frontmatter, body, errors };
}

function isQuoted(value) {
  return (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
}

function stripQuotes(value) {
  if (!isQuoted(value)) return value;
  return value.slice(1, -1);
}

function problem(kind, name, detail) {
  return { kind, name, detail };
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function normalize(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

function printSummary(summary) {
  console.log('\nSkill doctor');
  console.log(`  Skills:   ${summary.counts.skills}`);
  console.log(`  Commands: ${summary.counts.commands}`);
  console.log(`  Sections: ${summary.counts.sections}`);
  console.log(`  Issues:   ${summary.counts.issues}`);
  console.log(`  Warnings: ${summary.counts.warnings}`);

  if (summary.issues.length) {
    console.log('\nIssues');
    for (const item of summary.issues) {
      console.log(`  ⛔ [${item.kind}] ${item.name} — ${item.detail}`);
    }
  }

  if (summary.warnings.length) {
    console.log('\nWarnings');
    for (const item of summary.warnings) {
      console.log(`  ⚠ [${item.kind}] ${item.name} — ${item.detail}`);
    }
  }

  if (!summary.issues.length && !summary.warnings.length) {
    console.log('\n  ✓ Skill and command surfaces are aligned with SESSION_PROTOCOL.md');
  }
  console.log('');
}
