#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildRuntimePack,
  readText,
  relativeTo,
  resolveProjectBundle,
  writeJson,
  writeText
} from './lib/runtime-pack.mjs';
import { appendEvent } from './lib/studio-events.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const writeMode = args.includes('--write') || args.includes('--bootstrap') || args.includes('--adopt') || args.includes('--repair');
const repairMode = args.includes('--repair');
const projectIndex = args.indexOf('--project');
const slugIndex = args.indexOf('--slug');
const projectArg = projectIndex !== -1 ? args[projectIndex + 1] : slugIndex !== -1 ? args[slugIndex + 1] : null;
const targetPathIndex = args.indexOf('--target-path');
const targetPathOverride = targetPathIndex !== -1 ? args[targetPathIndex + 1] : null;
const bundleOptions = targetPathOverride ? { targetRootOverride: targetPathOverride } : {};

const pack = buildRuntimePack(ROOT, projectArg, bundleOptions);
const bundle = resolveProjectBundle(ROOT, projectArg, bundleOptions);
const today = new Date().toISOString().slice(0, 10);

function ensureUnlocked(targetRoot) {
  if (path.resolve(targetRoot) === ROOT) return;
  const lockFile = path.join(targetRoot, 'context', '.session-lock');
  if (fs.existsSync(lockFile)) {
    throw new Error(`Cross-repo write blocked: active session lock at ${lockFile}`);
  }
}

function readJson(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function copyIfMissing(sourcePath, destPath) {
  if (fs.existsSync(destPath)) return false;
  writeText(destPath, readText(sourcePath));
  return true;
}

function renderTemplate(template, vars) {
  return String(template)
    .replaceAll('__SLUG__', vars.slug)
    .replaceAll('__PROJECT_NAME__', vars.name)
    .replaceAll('__TYPE__', vars.type)
    .replaceAll('__OWNER__', vars.owner)
    .replaceAll('__PROJECT_DIR__', vars.dirName)
    .replaceAll('__REPO__', vars.repoName);
}

function installSkills(targetRoot) {
  const skillsRoot = path.join(ROOT, '.claude', 'skills');
  const targetSkillsRoot = path.join(targetRoot, '.claude', 'skills');
  if (!fs.existsSync(skillsRoot)) return [];

  const installed = [];
  for (const skillName of fs.readdirSync(skillsRoot)) {
    const sourceDir = path.join(skillsRoot, skillName);
    const destDir = path.join(targetSkillsRoot, skillName);
    if (!fs.statSync(sourceDir).isDirectory() || fs.existsSync(destDir)) continue;
    fs.mkdirSync(destDir, { recursive: true });
    for (const entry of fs.readdirSync(sourceDir)) {
      const sourcePath = path.join(sourceDir, entry);
      const destPath = path.join(destDir, entry);
      if (fs.statSync(sourcePath).isFile()) {
        writeText(destPath, readText(sourcePath));
      }
    }
    installed.push(skillName);
  }

  return installed;
}

function installHooks(targetRoot) {
  const hooksSourceDir = path.join(ROOT, 'scripts', 'git-hooks');
  const gitHooksDir = path.join(targetRoot, '.git', 'hooks');
  if (!fs.existsSync(path.join(targetRoot, '.git')) || !fs.existsSync(hooksSourceDir)) return [];
  fs.mkdirSync(gitHooksDir, { recursive: true });

  const installed = [];
  for (const hookName of fs.readdirSync(hooksSourceDir).filter((name) => !name.startsWith('.'))) {
    const sourcePath = path.join(hooksSourceDir, hookName);
    const destPath = path.join(gitHooksDir, hookName);
    fs.copyFileSync(sourcePath, destPath);
    fs.chmodSync(destPath, 0o755);
    installed.push(hookName);
  }
  return installed;
}

function buildVars() {
  const repoName = String(pack.project.repo || `VaultSparkStudios/${pack.project.slug}`).split('/').pop();
  return {
    slug: pack.project.slug,
    name: pack.project.name,
    type: pack.project.medium || pack.project.type || 'app',
    owner: pack.project.owner || 'VaultSpark Studios',
    dirName: path.basename(bundle.targetRoot),
    repoName,
  };
}

function ensureTemplateFile(relativeTemplatePath, relativeDestPath, vars, result) {
  const sourcePath = path.join(ROOT, 'docs', 'templates', 'project-system', relativeTemplatePath);
  const destPath = path.join(bundle.targetRoot, relativeDestPath);
  if (fs.existsSync(destPath) && !repairMode) return;
  const template = readText(sourcePath);
  if (!template) return;
  writeText(destPath, renderTemplate(template, vars));
  result.wrote.push(relativeTo(bundle.targetRoot, destPath));
}

function ensureProjectStatus(vars, result) {
  const templatePath = path.join(ROOT, 'docs', 'templates', 'project-system', 'PROJECT_STATUS.template.json');
  const targetPath = path.join(bundle.targetRoot, 'context', 'PROJECT_STATUS.json');
  if (fs.existsSync(targetPath) && !repairMode) return;

  const rendered = renderTemplate(readText(templatePath), vars)
    .replace('"YYYY-MM-DD"', JSON.stringify(today))
    .replace('"forge"', JSON.stringify(String(pack.project.vaultStatus || 'FORGE').toLowerCase()))
    .replace('"active"', JSON.stringify(pack.project.status || 'active'))
    .replace('"__PROJECT_NAME__"', JSON.stringify(vars.name));

  writeText(targetPath, `${rendered.trim()}\n`);
  result.wrote.push('context/PROJECT_STATUS.json');
}

function ensureManifest(result) {
  writeJson(bundle.manifestPath, bundle.effectiveManifest);
  result.repaired.push(relativeTo(bundle.targetRoot, bundle.manifestPath));
}

function buildContractPayloads(manifest, status) {
  const generatedAt = new Date().toISOString();
  const identity = manifest.identity ?? {};
  const listing = manifest.listingMetadata ?? {};
  const surfaces = manifest.surfaces ?? {};
  const hosting = manifest.hosting ?? {};
  const integrations = manifest.integrations ?? {};
  const publicMetadata = manifest.publicMetadata ?? {};

  return {
    hub: {
      generatedAt,
      contract: 'hub',
      identity,
      listingMetadata: {
        title: identity.name,
        summary: listing.hubDescription || listing.canonicalSummary || '',
        tagline: listing.tagline || '',
        tags: listing.tags || [],
        categories: listing.categories || []
      },
      status: {
        health: status.health || 'unknown',
        currentFocus: status.currentFocus || '',
        nextMilestone: status.nextMilestone || '',
      },
      liveSurfaces: status.testingSurfaces || surfaces.testing || [],
      integration: integrations.studioHub || { enabled: false }
    },
    'website-public': {
      generatedAt,
      contract: 'website-public',
      identity,
      listingMetadata: {
        title: identity.name,
        summary: listing.websiteDescription || listing.canonicalSummary || '',
        tagline: listing.tagline || '',
        tags: listing.tags || [],
        categories: listing.categories || []
      },
      publicMetadata: {
        privateByDefault: publicMetadata.privateByDefault ?? true,
        publicReady: publicMetadata.publicReady ?? false,
        brandingRequired: publicMetadata.brandingRequired ?? false,
        brandingCompliant: publicMetadata.brandingCompliant ?? null,
        footerAttribution: publicMetadata.footerAttribution || 'VaultSpark Studios',
        websiteListingRequired: publicMetadata.websiteListingRequired ?? true
      },
      surfaces: {
        liveUrl: hosting.liveUrl || status.liveUrl || null,
        stagingUrl: hosting.stagingUrl || status.stagingUrl || null
      },
      integration: integrations.website || { enabled: false }
    },
    'social-dashboard': {
      generatedAt,
      contract: 'social-dashboard',
      identity,
      listingMetadata: {
        title: identity.name,
        summary: listing.socialDescription || listing.canonicalSummary || '',
        tags: listing.tags || []
      },
      growth: {
        launchStatus: status.lastDeployStatus || 'unknown',
        liveUrl: hosting.liveUrl || status.liveUrl || null,
        stagingUrl: hosting.stagingUrl || status.stagingUrl || null
      },
      integration: integrations.socialDashboard || { enabled: false }
    },
    sparkfunnel: {
      generatedAt,
      contract: 'sparkfunnel',
      identity,
      listingMetadata: {
        title: identity.name,
        summary: listing.websiteDescription || listing.canonicalSummary || '',
        tagline: listing.tagline || '',
        tags: listing.tags || []
      },
      funnel: {
        liveUrl: hosting.liveUrl || status.liveUrl || null,
        ctaLabel: publicMetadata.publicReady ? 'Try it now' : 'Notify me when it sparks',
        websiteListingRequired: publicMetadata.websiteListingRequired ?? true
      },
      integration: integrations.sparkFunnel || { enabled: false }
    },
    ignis: {
      generatedAt,
      contract: 'ignis',
      identity,
      metrics: {
        ignisScore: status.ignisScore ?? null,
        ignisGrade: status.ignisGrade ?? null,
        truthAuditStatus: status.truthAuditStatus ?? 'unknown',
      },
      capabilities: manifest.capabilities || {},
      integration: integrations.ignis || { enabled: false }
    }
  };
}

function ensureContracts(result) {
  const manifest = readJson(bundle.manifestPath, bundle.effectiveManifest) || bundle.effectiveManifest;
  const status = readJson(path.join(bundle.targetRoot, 'context', 'PROJECT_STATUS.json'), {});
  const payloads = buildContractPayloads(manifest, status);
  const contractDir = path.join(bundle.targetRoot, 'context', 'contracts');
  for (const [name, payload] of Object.entries(payloads)) {
    writeJson(path.join(contractDir, `${name}.json`), payload);
    result.wrote.push(relativeTo(bundle.targetRoot, path.join(contractDir, `${name}.json`)));
  }
}

function ensureBootstrapFiles(result) {
  const vars = buildVars();
  const starterFiles = [
    ['PROJECT_BRIEF.template.md', 'context/PROJECT_BRIEF.md'],
    ['SOUL.template.md', 'context/SOUL.md'],
    ['BRAIN.template.md', 'context/BRAIN.md'],
    ['CURRENT_STATE.template.md', 'context/CURRENT_STATE.md'],
    ['DECISIONS.template.md', 'context/DECISIONS.md'],
    ['LATEST_HANDOFF.template.md', 'context/LATEST_HANDOFF.md'],
    ['TASK_BOARD.template.md', 'context/TASK_BOARD.md'],
    ['SELF_IMPROVEMENT_LOOP.template.md', 'context/SELF_IMPROVEMENT_LOOP.md'],
    ['TRUTH_AUDIT.template.md', 'context/TRUTH_AUDIT.md'],
    ['CREATIVE_DIRECTION_RECORD.template.md', 'docs/CREATIVE_DIRECTION_RECORD.md'],
    ['WORK_LOG.template.md', 'logs/WORK_LOG.md'],
    ['RIGHTS_PROVENANCE.template.md', 'docs/RIGHTS_PROVENANCE.md'],
    ['SKILL_MAP.template.md', 'docs/SKILL_MAP.md'],
  ];

  for (const [template, dest] of starterFiles) {
    ensureTemplateFile(template, dest, vars, result);
  }

  ensureProjectStatus(vars, result);
  ensureTemplateFile('STUDIO_MANIFEST.template.json', 'context/STUDIO_MANIFEST.json', vars, result);

  const startTemplate = path.join(ROOT, 'docs', 'templates', 'project-system', 'START_PROMPT.template.md');
  const closeoutTemplate = path.join(ROOT, 'docs', 'templates', 'project-system', 'CLOSEOUT_PROMPT.template.md');
  const settingsTemplate = path.join(ROOT, 'docs', 'templates', 'project-system', 'CLAUDE_SETTINGS.template.json');
  const agentsTemplate = path.join(ROOT, 'docs', 'templates', 'project-system', 'AGENTS_PROJECT.template.md');

  if (copyIfMissing(startTemplate, path.join(bundle.targetRoot, 'prompts', 'start.md'))) result.wrote.push('prompts/start.md');
  if (copyIfMissing(closeoutTemplate, path.join(bundle.targetRoot, 'prompts', 'closeout.md'))) result.wrote.push('prompts/closeout.md');
  if (copyIfMissing(settingsTemplate, path.join(bundle.targetRoot, '.claude', 'settings.local.json'))) result.wrote.push('.claude/settings.local.json');
  if (copyIfMissing(agentsTemplate, path.join(bundle.targetRoot, 'CLAUDE.md'))) result.wrote.push('CLAUDE.md');

  const taskBoardPath = path.join(bundle.targetRoot, 'context', 'TASK_BOARD.md');
  if (fs.existsSync(taskBoardPath) && repairMode) {
    const content = readText(taskBoardPath);
    if (!content.includes('Bootstrap')) {
      writeText(taskBoardPath, `${content.trim()}\n\n- bootstrap item: render contracts and runtime pack\n`);
    }
  }

  const handoffPath = path.join(bundle.targetRoot, 'context', 'LATEST_HANDOFF.md');
  if (fs.existsSync(handoffPath) && repairMode) {
    const handoff = readText(handoffPath);
    if (!handoff.includes('What to do next')) {
      writeText(handoffPath, `${handoff.trim()}\n\n## What to do next\n1. Render runtime pack\n2. Review contracts\n`);
    }
  }
}

const result = {
  project: pack.project,
  wrote: [],
  installedSkills: [],
  installedHooks: [],
  repaired: [],
  scorecard: pack.scorecard
};

if (writeMode) {
  ensureUnlocked(bundle.targetRoot);

  const runtimePackDir = path.join(bundle.targetRoot, 'context', 'runtime-pack');
  writeJson(path.join(runtimePackDir, 'RUNTIME_PACK.json'), pack);
  result.wrote.push(relativeTo(bundle.targetRoot, path.join(runtimePackDir, 'RUNTIME_PACK.json')));

  ensureBootstrapFiles(result);
  ensureManifest(result);
  ensureContracts(result);

  result.installedSkills = installSkills(bundle.targetRoot);
  result.installedHooks = installHooks(bundle.targetRoot);

  appendEvent(ROOT, {
    type: 'onboard-applied',
    slug: pack.project.slug,
    source: 'ops-onboard',
    signal: `${pack.project.slug}: initiate-v3 onboarding applied`,
    action: 'review runtime pack + contracts + handoff',
    severity: 'medium',
    automationStatus: 'completed',
    attemptable: true,
    note: `Wrote ${result.wrote.length} assets; repaired ${result.repaired.length}.`
  });
}

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`✓ ops onboard → ${pack.project.slug}`);
  console.log(`  Target: ${pack.project.localPath}`);
  console.log(`  Required files: ${pack.scorecard.requiredFilesPresent}/${pack.scorecard.requiredFilesTotal}`);
  console.log(`  Manifest: ${pack.scorecard.hasManifest ? 'present' : 'synthesized/generated'}`);
  if (result.wrote.length > 0) console.log(`  Wrote: ${result.wrote.join(', ')}`);
  if (result.repaired.length > 0) console.log(`  Repaired: ${result.repaired.join(', ')}`);
  if (result.installedSkills.length > 0) console.log(`  Skills: ${result.installedSkills.join(', ')}`);
  if (result.installedHooks.length > 0) console.log(`  Hooks: ${result.installedHooks.join(', ')}`);
}
