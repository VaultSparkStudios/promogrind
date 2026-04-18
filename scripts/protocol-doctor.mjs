#!/usr/bin/env node
/**
 * protocol-doctor.mjs
 *
 * One compact gate for founder-scale protocol activation. It avoids nested
 * process spawning so it works inside restricted agent sandboxes.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const HOME = os.homedir();
const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const fixSafe = [];
const needsApproval = [];
const ownerOnly = [];
const ok = [];

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}
function read(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}
function listDirs(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch {
    return [];
  }
}
function fileHashText(p) {
  return read(p).replace(/\r\n/g, '\n');
}
function readJson(p, fallback) {
  try { return JSON.parse(read(p)); } catch { return fallback; }
}

// Skill parity.
const claudeSkillsRoot = path.join(HOME, '.claude', 'skills');
const codexSkillsRoot = path.join(HOME, '.agents', 'skills');
const claudeSkills = listDirs(claudeSkillsRoot);
const codexSkills = listDirs(codexSkillsRoot);
const missingCodex = claudeSkills.filter((name) => !codexSkills.includes(name));
const drift = claudeSkills.filter((name) => {
  if (missingCodex.includes(name)) return false;
  return fileHashText(path.join(claudeSkillsRoot, name, 'SKILL.md')) !== fileHashText(path.join(codexSkillsRoot, name, 'SKILL.md'));
});
if (!claudeSkills.length) fixSafe.push('Claude skills root missing or empty');
else if (missingCodex.length || drift.length) needsApproval.push(`Codex skill mirror needs apply (${missingCodex.length} missing, ${drift.length} drift): node scripts/sync-agent-skills.mjs --apply`);
else ok.push('Claude↔Codex skills in sync');

// MCP registration.
const claudeMcp = path.join(HOME, '.claude', 'mcp.json');
const codexConfig = path.join(HOME, '.codex', 'config.toml');
const mcpNeed = [];
if (!read(claudeMcp).includes('studio-ops')) mcpNeed.push('Claude MCP');
if (!read(codexConfig).includes('studio-ops')) mcpNeed.push('Codex MCP');
if (mcpNeed.length) needsApproval.push(`Register Studio Ops MCP for ${mcpNeed.join(' + ')} (home-directory write)`);
else ok.push('Studio Ops MCP registered in Claude and Codex configs');

// Model-router chokepoint.
const routerFindings = scanModelRouterViolations();
if (routerFindings.length) fixSafe.push(`${routerFindings.length} direct Anthropic model/API reference(s) outside scripts/lib/model-router.mjs`);
else ok.push('Model-router chokepoint adhered');

// Brief and validator presence.
const brief = read(path.join(ROOT, 'docs', 'STARTUP_BRIEF.md'));
const requiredBriefBlocks = ['SCORE', 'SIGNALS', 'GENIUS HIT LIST'];
const missingBlocks = requiredBriefBlocks.filter((block) => !brief.includes(block));
if (missingBlocks.length) fixSafe.push(`Startup brief missing canonical block(s): ${missingBlocks.join(', ')}`);
else ok.push('Startup brief has core canonical blocks');
if (!exists(path.join(ROOT, 'scripts', 'validate-brief-format.mjs'))) fixSafe.push('Startup brief validator missing');
else ok.push('Startup brief validator present');
if (!exists(path.join(ROOT, 'scripts', 'validate-closeout-board-format.mjs'))) fixSafe.push('Closeout board validator missing');
else ok.push('Closeout board validator present');

// Session identity.
const identity = scanSessionLocks();
if (identity.unknown.length) fixSafe.push(`${identity.unknown.length} active session lock(s) missing agent identity: ${identity.unknown.join(', ')}`);
else ok.push('All active session locks have agent identity');
if (identity.stale.length) needsApproval.push(`${identity.stale.length} stale session lock(s) need review: ${identity.stale.join(', ')}`);

// Canon / known blockers.
if (!exists(path.join(ROOT, 'scripts', 'check-model-router-adherence.mjs'))) fixSafe.push('Model-router adherence script missing');
else ok.push('Model-router adherence script present');
const brandingRegistry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
const nonCompliantBranding = (brandingRegistry.projects ?? [])
  .filter((project) => project.brandingRequired === true && project.brandingCompliant !== true)
  .map((project) => project.slug || project.name);
if (nonCompliantBranding.length) {
  ownerOnly.push(`CANON-006 branding remains open for: ${nonCompliantBranding.join(', ')}`);
} else {
  ok.push('CANON-006 branding registry is compliant');
}

if (!exists(path.join(ROOT, 'scripts', 'render-fast-start.mjs'))) fixSafe.push('Fast Start helper missing');
else ok.push('Fast Start helper present');

const report = {
  generatedAt: new Date().toISOString(),
  ok,
  fixSafe,
  needsApproval,
  ownerOnly,
  summary: {
    ok: ok.length,
    fixSafe: fixSafe.length,
    needsApproval: needsApproval.length,
    ownerOnly: ownerOnly.length,
  },
};

if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log('Protocol Doctor');
  console.log(`  OK: ${ok.length} · Fix-safe: ${fixSafe.length} · Needs approval: ${needsApproval.length} · Owner-only: ${ownerOnly.length}`);
  printSection('OK', ok);
  printSection('FIX-SAFE', fixSafe);
  printSection('NEEDS APPROVAL', needsApproval);
  printSection('OWNER-ONLY', ownerOnly);
}

process.exit(fixSafe.length || needsApproval.length || ownerOnly.length ? 1 : 0);

function printSection(title, items) {
  if (!items.length) return;
  console.log(`\n${title}`);
  for (const item of items) console.log(`- ${item}`);
}

function scanModelRouterViolations() {
  const scriptsDir = path.join(ROOT, 'scripts');
  const allowed = path.normalize(path.join(scriptsDir, 'lib', 'model-router.mjs'));
  const patterns = [/api\.anthropic\.com/, /@anthropic-ai\/sdk/, /claude-(?:opus|sonnet|haiku|3|4)[A-Za-z0-9._-]*/];
  const findings = [];
  const skipDirs = new Set(['.git', 'node_modules', '.cache', 'dist', 'build']);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skipDirs.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(?:mjs|js|ts|cjs)$/.test(entry.name)) continue;
      if (path.normalize(full) === allowed) continue;
      const text = read(full);
      if (patterns.some((regex) => regex.test(text))) findings.push(path.relative(ROOT, full));
    }
  };
  walk(scriptsDir);
  return findings;
}

function scanSessionLocks() {
  const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
  const projects = registry.projects || registry;
  const now = Date.now();
  const unknown = [];
  const stale = [];
  for (const project of projects) {
    if (!project.localPath) continue;
    const lockPath = path.join(project.localPath, 'context', '.session-lock');
    if (!exists(lockPath)) continue;
    const lock = read(lockPath);
    if (!/^agent:\s*\S+/m.test(lock)) unknown.push(project.slug);
    const start = lock.match(/^session_start:\s*(\S+)/m)?.[1];
    if (start && (now - new Date(start).getTime()) / 3_600_000 > 48) stale.push(project.slug);
  }
  return { unknown, stale };
}
