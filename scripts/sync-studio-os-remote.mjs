#!/usr/bin/env node
/**
 * sync-studio-os-remote.mjs — Clone each registry repo via GitHub + ORG_PAT
 * and sync the canonical Studio OS doc set. Supersedes sync-skill-map-remote.mjs.
 *
 * Files synced per repo (relative to repo root):
 *   - docs/SKILL_MAP.md                        ← docs/templates/project-system/SKILL_MAP.template.md
 *   - docs/SESSION_PROTOCOL.md                 ← docs/SESSION_PROTOCOL.md  (from studio-ops itself)
 *   - scripts/validate-brief-format.mjs        ← scripts/validate-brief-format.mjs  (S87)
 *   - scripts/validate-closeout-board-format.mjs ← scripts/validate-closeout-board-format.mjs  (S88)
 *   - .github/workflows/brief-format-check.yml ← .github/workflows/brief-format-check.yml (S87)
 *   - docs/templates/project-system/agent-dna.schema.json ← same path in studio-ops (S89)
 *   - scripts/validate-agent-dna.mjs           ← scripts/validate-agent-dna.mjs (S89)
 *   - prompts/start.md                         ← docs/templates/project-system/START_PROMPT.template.md (S91)
 *   - prompts/closeout.md                      ← docs/templates/project-system/CLOSEOUT_PROMPT.template.md (S91)
 *
 * Also injects a Session Protocol pointer into each repo's AGENTS.md if missing.
 * AGENTS.md is NOT wholesale copied — it has repo-specific bits. We do a
 * minimal surgical insert so Codex and other non-Claude agents can find the
 * canonical protocol.
 *
 * Usage:
 *   GH_TOKEN=$ORG_PAT node scripts/sync-studio-os-remote.mjs [--dry-run] [--only=slug1,slug2]
 *
 * Exit 0 if all ops succeeded (including no-op), non-zero if any failed.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const onlyFlag = args.find(a => a.startsWith('--only='));
const ONLY = onlyFlag ? new Set(onlyFlag.split('=')[1].split(',').map(s => s.trim()).filter(Boolean)) : null;

const TOKEN = process.env.GH_TOKEN || process.env.ORG_PAT || '';
if (!TOKEN && !DRY) {
  console.error('⛔ GH_TOKEN (or ORG_PAT) not set. Refusing to run without a PAT.');
  process.exit(2);
}

const AUTHOR = process.env.GIT_AUTHOR || 'Studio OS Template Bot <ops@vaultsparkstudios.com>';
const AUTHOR_NAME = AUTHOR.match(/^(.+?)\s*<.*>$/)?.[1] ?? 'Studio OS Template Bot';
const AUTHOR_EMAIL = AUTHOR.match(/<(.+?)>/)?.[1] ?? 'ops@vaultsparkstudios.com';

const COMMIT_MSG = 'docs: sync Studio OS canonical assets (SESSION_PROTOCOL + SKILL_MAP + brief validators + CI + AGENTS pointer + AgentDNA schema/validator + prompts)';

// ── Assets to sync ──────────────────────────────────────────────────────────
const SKILL_MAP_SRC        = path.join(ROOT, 'docs', 'templates', 'project-system', 'SKILL_MAP.template.md');
const PROTOCOL_SRC         = path.join(ROOT, 'docs', 'SESSION_PROTOCOL.md');
const VALIDATOR_SRC        = path.join(ROOT, 'scripts', 'validate-brief-format.mjs');
const CLOSEOUT_VALIDATOR_SRC = path.join(ROOT, 'scripts', 'validate-closeout-board-format.mjs');
const BRIEF_CI_WORKFLOW_SRC = path.join(ROOT, '.github', 'workflows', 'brief-format-check.yml');
const AGENT_DNA_SCHEMA_SRC  = path.join(ROOT, 'docs', 'templates', 'project-system', 'agent-dna.schema.json');
const AGENT_DNA_VALIDATOR_SRC = path.join(ROOT, 'scripts', 'validate-agent-dna.mjs');
const START_PROMPT_SRC     = path.join(ROOT, 'docs', 'templates', 'project-system', 'START_PROMPT.template.md');
const CLOSEOUT_PROMPT_SRC  = path.join(ROOT, 'docs', 'templates', 'project-system', 'CLOSEOUT_PROMPT.template.md');

const REQUIRED_SOURCES = [
  { name: 'SKILL_MAP_SRC', path: SKILL_MAP_SRC },
  { name: 'PROTOCOL_SRC', path: PROTOCOL_SRC },
  { name: 'VALIDATOR_SRC', path: VALIDATOR_SRC },
  { name: 'CLOSEOUT_VALIDATOR_SRC', path: CLOSEOUT_VALIDATOR_SRC },
  { name: 'BRIEF_CI_WORKFLOW_SRC', path: BRIEF_CI_WORKFLOW_SRC },
  { name: 'AGENT_DNA_SCHEMA_SRC', path: AGENT_DNA_SCHEMA_SRC },
  { name: 'AGENT_DNA_VALIDATOR_SRC', path: AGENT_DNA_VALIDATOR_SRC },
  { name: 'START_PROMPT_SRC', path: START_PROMPT_SRC },
  { name: 'CLOSEOUT_PROMPT_SRC', path: CLOSEOUT_PROMPT_SRC },
];
const missingSources = REQUIRED_SOURCES.filter((s) => !fs.existsSync(s.path));
if (missingSources.length > 0) {
  console.error('⛔ missing source asset(s):');
  for (const s of missingSources) console.error(`  ${s.name}: ${s.path} MISSING`);
  process.exit(2);
}

const skillMapContent  = fs.readFileSync(SKILL_MAP_SRC, 'utf8');
const protocolContent  = fs.readFileSync(PROTOCOL_SRC, 'utf8');
const validatorContent = fs.readFileSync(VALIDATOR_SRC, 'utf8');
const closeoutValidatorContent = fs.readFileSync(CLOSEOUT_VALIDATOR_SRC, 'utf8');
const briefCiWorkflowContent = fs.readFileSync(BRIEF_CI_WORKFLOW_SRC, 'utf8');
const agentDnaSchemaContent = fs.readFileSync(AGENT_DNA_SCHEMA_SRC, 'utf8');
const agentDnaValidatorContent = fs.readFileSync(AGENT_DNA_VALIDATOR_SRC, 'utf8');
const startPromptContent = fs.readFileSync(START_PROMPT_SRC, 'utf8');
const closeoutPromptContent = fs.readFileSync(CLOSEOUT_PROMPT_SRC, 'utf8');

// AGENTS.md pointer — the section we inject if not already present.
const AGENTS_POINTER = `
## Session Protocol (agent-neutral — applies to Claude Code, Codex, any agent)

The canonical execution protocol for every Studio OS session lives in **\`docs/SESSION_PROTOCOL.md\`** in this repo (propagated from studio-ops).

It covers the 3-command rhythm (\`/start\` → \`/go\` → \`/closeout\`), full protocol for 15 commands, and agent-specific notes for Claude Code + Codex. Both agents execute the same instructions; per-agent branching is flagged explicitly with \`IF agent = claude-code:\` / \`IF agent = codex:\`.

See \`docs/SKILL_MAP.md\` for the one-page command cheatsheet.
`.trimStart();

const POINTER_MARKER = '## Session Protocol (agent-neutral';

// ── Registry ───────────────────────────────────────────────────────────────
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));

function sh(cmd, argv, opts = {}) {
  return spawnSync(cmd, argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function parseRepoFromProject(project) {
  const url = project.github || project.githubUrl || project.repoUrl || null;
  if (url) {
    const m = url.match(/github\.com[/:]([^/]+\/[^/.]+)/);
    if (m) return m[1];
  }
  if (project.repo && /^[^/]+\/[^/]+$/.test(project.repo)) return project.repo;
  return null;
}

function injectAgentsPointer(existingAgents) {
  if (!existingAgents) {
    return `# Project Agent Guide\n${AGENTS_POINTER}`;
  }
  if (existingAgents.includes(POINTER_MARKER)) return existingAgents;

  // Insert after the first top-level heading. Avoid injecting mid-file.
  const firstH1 = existingAgents.match(/^# [^\n]+\n/);
  if (!firstH1) return `${existingAgents.trimEnd()}\n\n${AGENTS_POINTER}`;
  const insertAt = (firstH1.index ?? 0) + firstH1[0].length;
  return existingAgents.slice(0, insertAt) + '\n' + AGENTS_POINTER + existingAgents.slice(insertAt);
}

// ── Main ────────────────────────────────────────────────────────────────────
const results = [];
const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-os-sync-'));
console.log(`Workspace: ${tmpBase}`);
console.log(`Mode: ${DRY ? 'DRY RUN' : 'APPLY'}`);
console.log('');

try {
  for (const project of registry.projects ?? []) {
    const slug = project.slug;
    if (ONLY && !ONLY.has(slug)) continue;
    if (project.status === 'archived') { results.push({ slug, status: 'skipped-archived' }); continue; }

    const repoSlug = parseRepoFromProject(project);
    if (!repoSlug) { results.push({ slug, status: 'skipped-no-repo' }); continue; }

    if (DRY) { results.push({ slug, repo: repoSlug, status: 'would-sync' }); continue; }

    const workDir = path.join(tmpBase, slug.replace(/[^\w.-]/g, '_'));
    const cloneUrl = `https://x-access-token:${TOKEN}@github.com/${repoSlug}.git`;

    const clone = sh('git', ['clone', '--depth', '1', '--quiet', cloneUrl, workDir]);
    if (clone.status !== 0) {
      results.push({ slug, repo: repoSlug, status: 'clone-failed', err: (clone.stderr || '').slice(0, 200) });
      continue;
    }

    sh('git', ['config', 'user.name', AUTHOR_NAME], { cwd: workDir });
    sh('git', ['config', 'user.email', AUTHOR_EMAIL], { cwd: workDir });

    const docsDir = path.join(workDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });

    const changes = [];

    // 1. docs/SKILL_MAP.md
    const skillMapTarget = path.join(docsDir, 'SKILL_MAP.md');
    let skillMapCur = '';
    try { skillMapCur = fs.readFileSync(skillMapTarget, 'utf8'); } catch {}
    if (skillMapCur !== skillMapContent) {
      fs.writeFileSync(skillMapTarget, skillMapContent, 'utf8');
      changes.push('docs/SKILL_MAP.md');
    }

    // 2. docs/SESSION_PROTOCOL.md
    const protocolTarget = path.join(docsDir, 'SESSION_PROTOCOL.md');
    let protocolCur = '';
    try { protocolCur = fs.readFileSync(protocolTarget, 'utf8'); } catch {}
    if (protocolCur !== protocolContent) {
      fs.writeFileSync(protocolTarget, protocolContent, 'utf8');
      changes.push('docs/SESSION_PROTOCOL.md');
    }

    // 3. scripts/validate-brief-format.mjs (S87 — canonical-format gate)
    const scriptsDir = path.join(workDir, 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    const validatorTarget = path.join(scriptsDir, 'validate-brief-format.mjs');
    let validatorCur = '';
    try { validatorCur = fs.readFileSync(validatorTarget, 'utf8'); } catch {}
    if (validatorCur !== validatorContent) {
      fs.writeFileSync(validatorTarget, validatorContent, 'utf8');
      changes.push('scripts/validate-brief-format.mjs');
    }

    // 4. scripts/validate-closeout-board-format.mjs (S88 — closeout-format gate)
    const closeoutValidatorTarget = path.join(scriptsDir, 'validate-closeout-board-format.mjs');
    let closeoutValidatorCur = '';
    try { closeoutValidatorCur = fs.readFileSync(closeoutValidatorTarget, 'utf8'); } catch {}
    if (closeoutValidatorCur !== closeoutValidatorContent) {
      fs.writeFileSync(closeoutValidatorTarget, closeoutValidatorContent, 'utf8');
      changes.push('scripts/validate-closeout-board-format.mjs');
    }

    // 5. .github/workflows/brief-format-check.yml (S87 — CI enforcement)
    const workflowsDir = path.join(workDir, '.github', 'workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });
    const briefCiTarget = path.join(workflowsDir, 'brief-format-check.yml');
    let briefCiCur = '';
    try { briefCiCur = fs.readFileSync(briefCiTarget, 'utf8'); } catch {}
    if (briefCiCur !== briefCiWorkflowContent) {
      fs.writeFileSync(briefCiTarget, briefCiWorkflowContent, 'utf8');
      changes.push('.github/workflows/brief-format-check.yml');
    }

    // 6. docs/templates/project-system/agent-dna.schema.json (S89 — AgentDNA contract)
    const agentTemplatesDir = path.join(docsDir, 'templates', 'project-system');
    fs.mkdirSync(agentTemplatesDir, { recursive: true });
    const agentDnaSchemaTarget = path.join(agentTemplatesDir, 'agent-dna.schema.json');
    let agentDnaSchemaCur = '';
    try { agentDnaSchemaCur = fs.readFileSync(agentDnaSchemaTarget, 'utf8'); } catch {}
    if (agentDnaSchemaCur !== agentDnaSchemaContent) {
      fs.writeFileSync(agentDnaSchemaTarget, agentDnaSchemaContent, 'utf8');
      changes.push('docs/templates/project-system/agent-dna.schema.json');
    }

    // 7. scripts/validate-agent-dna.mjs (S89 — AgentDNA validator)
    const agentDnaValidatorTarget = path.join(scriptsDir, 'validate-agent-dna.mjs');
    let agentDnaValidatorCur = '';
    try { agentDnaValidatorCur = fs.readFileSync(agentDnaValidatorTarget, 'utf8'); } catch {}
    if (agentDnaValidatorCur !== agentDnaValidatorContent) {
      fs.writeFileSync(agentDnaValidatorTarget, agentDnaValidatorContent, 'utf8');
      changes.push('scripts/validate-agent-dna.mjs');
    }

    // 8. prompts/start.md + prompts/closeout.md (S91 — legacy pointer files,
    //    still version-checked by validate-compliance.mjs. Propagating the
    //    v3.2 templates here is what flips the 22-repo compliance collapse.)
    const promptsDir = path.join(workDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    const startPromptTarget = path.join(promptsDir, 'start.md');
    let startPromptCur = '';
    try { startPromptCur = fs.readFileSync(startPromptTarget, 'utf8'); } catch {}
    if (startPromptCur !== startPromptContent) {
      fs.writeFileSync(startPromptTarget, startPromptContent, 'utf8');
      changes.push('prompts/start.md');
    }
    const closeoutPromptTarget = path.join(promptsDir, 'closeout.md');
    let closeoutPromptCur = '';
    try { closeoutPromptCur = fs.readFileSync(closeoutPromptTarget, 'utf8'); } catch {}
    if (closeoutPromptCur !== closeoutPromptContent) {
      fs.writeFileSync(closeoutPromptTarget, closeoutPromptContent, 'utf8');
      changes.push('prompts/closeout.md');
    }

    // 9. AGENTS.md — surgical insert of Session Protocol pointer
    const agentsTarget = path.join(workDir, 'AGENTS.md');
    let agentsCur = '';
    try { agentsCur = fs.readFileSync(agentsTarget, 'utf8'); } catch {}
    const newAgents = injectAgentsPointer(agentsCur);
    if (newAgents !== agentsCur) {
      fs.writeFileSync(agentsTarget, newAgents, 'utf8');
      changes.push('AGENTS.md');
    }

    if (changes.length === 0) {
      results.push({ slug, repo: repoSlug, status: 'unchanged' });
      continue;
    }

    // Commit the changed paths only
    for (const file of changes) {
      sh('git', ['add', file], { cwd: workDir });
    }

    const commit = sh('git', ['commit', '-m', COMMIT_MSG], { cwd: workDir });
    if (commit.status !== 0) {
      results.push({ slug, repo: repoSlug, status: 'commit-failed', err: (commit.stderr || commit.stdout || '').slice(0, 200) });
      continue;
    }

    const push = sh('git', ['push', 'origin', 'HEAD'], { cwd: workDir });
    if (push.status !== 0) {
      results.push({ slug, repo: repoSlug, status: 'push-failed', err: (push.stderr || push.stdout || '').slice(0, 200) });
      continue;
    }

    results.push({ slug, repo: repoSlug, status: 'synced', files: changes });
  }
} finally {
  try { fs.rmSync(tmpBase, { recursive: true, force: true }); } catch {}
}

// Report
console.log('\nStudio OS remote sync · results');
console.log('─'.repeat(64));
for (const r of results) {
  const icon = {
    synced: '✓', unchanged: '=', 'would-sync': '+',
    'skipped-archived': '·', 'skipped-no-repo': '·',
    'clone-failed': '✗', 'commit-failed': '✗', 'push-failed': '✗',
  }[r.status] ?? '?';
  const detail = r.files ? ` [${r.files.join(', ')}]` : (r.err ? ` err=${r.err}` : '');
  console.log(`  ${icon} ${r.slug.padEnd(36)} ${r.status}${detail}`);
}
console.log('─'.repeat(64));
const count = (s) => results.filter(r => r.status === s).length;
console.log(`  synced: ${count('synced')}  ·  unchanged: ${count('unchanged')}  ·  would-sync: ${count('would-sync')}`);
console.log(`  skipped: archived=${count('skipped-archived')}  no-repo=${count('skipped-no-repo')}`);
const failed = count('clone-failed') + count('commit-failed') + count('push-failed');
if (failed) console.log(`  ⛔ failed: ${failed}`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
