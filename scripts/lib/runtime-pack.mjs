import fs from 'fs';
import path from 'path';

export const REQUIRED_STUDIO_FILES = [
  'AGENTS.md',
  'context/PROJECT_BRIEF.md',
  'context/SOUL.md',
  'context/BRAIN.md',
  'context/CURRENT_STATE.md',
  'context/TRUTH_AUDIT.md',
  'context/TASK_BOARD.md',
  'context/LATEST_HANDOFF.md',
  'context/DECISIONS.md',
  'context/SELF_IMPROVEMENT_LOOP.md',
  'context/PROJECT_STATUS.json',
  'docs/CREATIVE_DIRECTION_RECORD.md',
  'prompts/start.md',
  'prompts/closeout.md',
  'logs/WORK_LOG.md'
];

export function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

export function readText(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return fallback;
  }
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

export function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

export function normalizeVaultStatus(value) {
  return String(value ?? 'FORGE').toUpperCase();
}

export function relativeTo(basePath, targetPath) {
  return path.relative(basePath, targetPath).replace(/\\/g, '/');
}

export function detectProjectByRoot(root, registry) {
  const normalizedRoot = path.resolve(root).toLowerCase();
  return (registry.projects || []).find((project) => String(project.localPath || '').toLowerCase() === normalizedRoot) || null;
}

export function inferManifest(project, status) {
  const runtimeUrl = project.runtimeUrl || status.liveUrl || null;
  const stagingUrl = project.stagingUrl ?? status.stagingUrl ?? null;
  const githubUrl = project.repo ? `https://github.com/${project.repo}` : status.github || null;
  const testing = status.testingSurfaces || [];

  return {
    schemaVersion: '1.0',
    generatedFrom: 'ops runtime-pack synthesized manifest',
    synthesized: true,
    identity: {
      slug: project.slug,
      name: project.name,
      repo: project.repo || status.github?.replace('https://github.com/', '') || null,
      owner: project.owner || status.owner || 'VaultSpark Studios',
      type: project.medium || status.type || 'unknown',
      lifecycle: project.lifecycle || status.lifecycle || 'unknown',
      audience: project.audience || status.audience || 'unknown',
      vaultStatus: normalizeVaultStatus(project.vaultStatus || status.vaultStatus || 'FORGE')
    },
    studioOs: {
      applied: Boolean(project.studioOsApplied),
      templateVersion: '3.2',
      complianceVersion: '1.5',
      sessionModeDefault: 'builder',
      requiredFilesPresent: false
    },
    listingMetadata: {
      canonicalSummary: project.summary || status.currentFocus || `${project.name} in the VaultSpark ecosystem.`,
      tagline: project.currentFocus || status.currentFocus || '',
      tags: [project.medium, project.status, project.lifecycle].filter(Boolean),
      categories: [project.medium, project.audience].filter(Boolean),
      hubDescription: project.currentFocus || status.currentFocus || project.summary || '',
      websiteDescription: project.summary || '',
      socialDescription: project.summary || '',
      brandingLabel: project.medium === 'website' ? 'A VaultSpark Studios Network' : 'Powered by VaultSpark Studios'
    },
    surfaces: {
      local: project.localPath ? [{ label: 'workspace', path: project.localPath }] : [],
      staging: stagingUrl ? [{ label: 'staging', url: stagingUrl }] : [],
      production: runtimeUrl ? [{ label: 'live', url: runtimeUrl }] : [],
      preview: [],
      admin: [],
      api: [],
      docs: [],
      github: githubUrl ? [{ label: 'repo', url: githubUrl }] : [],
      testing: testing.map((surface) => ({
        label: surface.label || surface.type || 'surface',
        command: surface.command ?? null,
        url: surface.url ?? null
      }))
    },
    capabilities: {
      auth: false,
      payments: Boolean(project.stripeReady || status.stripeReady),
      analytics: false,
      email: false,
      ai: false,
      publishing: false,
      community: false,
      storage: false,
      cron: false
    },
    integrations: {
      studioHub: { enabled: true, mode: 'private' },
      website: { enabled: Boolean(project.audience?.includes('public') || runtimeUrl), mode: 'public-safe' },
      socialDashboard: { enabled: Boolean(project.audience?.includes('public')), mode: 'private' },
      sparkFunnel: { enabled: Boolean(project.launchStatus && project.launchStatus !== 'not-applicable'), mode: 'growth' },
      ignis: { enabled: true, mode: 'portfolio-intelligence' },
      founderQueue: { enabled: true, mode: 'private' }
    },
    secretsCapabilities: [],
    hosting: {
      hostingProvider: project.stagingType || status.stagingType || 'none',
      liveUrl: runtimeUrl,
      stagingUrl,
      privatePreviewUrl: null,
      localDevUrl: null,
      deployStatus: project.launchStatus || status.lastDeployStatus || 'unknown',
      testInstructions: testing.map((surface) => surface.command || surface.url).filter(Boolean)
    },
    capacity: {
      currentPlanTier: 'unknown',
      freePlanCeilings: [],
      fitsCurrentCapacity: true,
      preferredRuntime: project.stagingType || 'unknown',
      fallbackRuntime: 'hetzner',
      notes: ''
    },
    publicMetadata: {
      privateByDefault: true,
      publicReady: Boolean(project.audience?.includes('public') && project.launchStatus === 'announced'),
      publicRepoSanitized: false,
      brandingRequired: project.brandingRequired ?? false,
      brandingCompliant: project.brandingCompliant ?? null,
      footerAttribution: project.medium === 'game' ? 'A VaultSpark Studios Game' : 'Powered by VaultSpark Studios',
      websiteListingRequired: true
    },
    automation: {
      safeActions: ['refresh-generated-surfaces'],
      guardedActions: ['propagate-templates'],
      blockedActions: ['change-canon', 'flip-repo-public', 'alter-licensing']
    },
    contracts: {
      hub: 'context/contracts/hub.json',
      websitePublic: 'context/contracts/website-public.json',
      socialDashboard: 'context/contracts/social-dashboard.json',
      sparkFunnel: 'context/contracts/sparkfunnel.json',
      ignis: 'context/contracts/ignis.json'
    }
  };
}

export function resolveProjectBundle(root, projectArg = null, options = {}) {
  const registryPath = path.join(root, 'portfolio', 'PROJECT_REGISTRY.json');
  const registry = readJson(registryPath, { projects: [] });
  const currentProject = detectProjectByRoot(root, registry);
  const project = projectArg
    ? (registry.projects || []).find((entry) => entry.slug === projectArg || entry.name === projectArg || entry.repo === projectArg)
    : currentProject;

  if (!project) {
    throw new Error(`Unknown project${projectArg ? `: ${projectArg}` : ''}`);
  }

  const targetRoot = options.targetRootOverride
    ? path.resolve(options.targetRootOverride)
    : path.resolve(project.localPath || root);
  const statusPath = path.join(targetRoot, 'context', 'PROJECT_STATUS.json');
  const manifestPath = path.join(targetRoot, 'context', 'STUDIO_MANIFEST.json');
  const status = readJson(statusPath, {});
  const manifest = readJson(manifestPath, null);
  const effectiveManifest = manifest || inferManifest(project, status);

  return {
    registry,
    project,
    targetRoot,
    statusPath,
    manifestPath,
    status,
    manifest,
    effectiveManifest
  };
}

export function getRequiredFileStatus(targetRoot) {
  return REQUIRED_STUDIO_FILES.map((file) => ({
    file,
    exists: fs.existsSync(path.join(targetRoot, file))
  }));
}

export function listStudioSkills(root) {
  const skillsDir = path.join(root, '.claude', 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      source: path.join(skillsDir, entry.name)
    }));
}

export function listHookFiles(root) {
  const hooksDir = path.join(root, 'scripts', 'git-hooks');
  if (!fs.existsSync(hooksDir)) return [];
  return fs.readdirSync(hooksDir)
    .filter((name) => !name.startsWith('.'))
    .map((name) => ({
      name,
      source: path.join(hooksDir, name)
    }));
}

export function buildIntegrationChecklist(bundle) {
  const integrations = bundle.effectiveManifest.integrations || {};
  const publicMetadata = bundle.effectiveManifest.publicMetadata || {};
  return [
    {
      key: 'studioHub',
      enabled: integrations.studioHub?.enabled ?? false,
      status: fs.existsSync(bundle.statusPath) ? 'ready' : 'missing-project-status',
      requirement: 'Hub requires PROJECT_STATUS.json and baseline Studio OS files.'
    },
    {
      key: 'website',
      enabled: integrations.website?.enabled ?? false,
      status: publicMetadata.websiteListingRequired === false ? 'not-required' : 'ready',
      requirement: 'Website listing should read manifest-backed listing metadata and public surfaces.'
    },
    {
      key: 'socialDashboard',
      enabled: integrations.socialDashboard?.enabled ?? false,
      status: bundle.effectiveManifest.contracts?.socialDashboard ? 'ready' : 'missing-contract',
      requirement: 'Social Dashboard should consume manifest-backed listing and growth metadata.'
    },
    {
      key: 'sparkFunnel',
      enabled: integrations.sparkFunnel?.enabled ?? false,
      status: bundle.effectiveManifest.contracts?.sparkFunnel ? 'ready' : 'missing-contract',
      requirement: 'SparkFunnel should consume canonical summary, CTA, and funnel metadata.'
    },
    {
      key: 'ignis',
      enabled: integrations.ignis?.enabled ?? false,
      status: bundle.effectiveManifest.contracts?.ignis ? 'ready' : 'missing-contract',
      requirement: 'IGNIS should read contract-backed project metrics and capabilities.'
    }
  ];
}

export function buildEfficiencyPlaybook(bundle) {
  const capabilities = bundle.effectiveManifest.capabilities || {};
  const lines = [
    'Use scripts/lib/model-router.mjs as the single Claude/Anthropic chokepoint.',
    'Prefer Haiku-first escalation, long-cache blocks, and semantic cache helpers before direct model calls.',
    'Reuse generated contracts and compiled fabric outputs instead of scraping multiple Markdown sources.',
    'Use ops-level commands before inventing repo-local variants when Studio Ops already owns the workflow.'
  ];

  if (capabilities.ai) {
    lines.push('This project declares AI capability: install the Anthropic wrapper template before adding any new AI entrypoint.');
  }
  if (capabilities.storage || capabilities.analytics) {
    lines.push('Treat generated telemetry, cache ledgers, and event files as append-only operational data, not ad hoc scratch files.');
  }

  return lines;
}

export function buildRepairActions(bundle, requiredFiles) {
  const repairs = [];
  const missingRequired = requiredFiles.filter((item) => !item.exists).map((item) => item.file);

  if (!bundle.manifest) repairs.push('Create context/STUDIO_MANIFEST.json from synthesized manifest.');
  if (missingRequired.length > 0) repairs.push(`Restore missing Studio OS files: ${missingRequired.join(', ')}`);
  if (!fs.existsSync(path.join(bundle.targetRoot, '.claude', 'settings.local.json'))) {
    repairs.push('Seed .claude/settings.local.json from the CLAUDE settings template.');
  }
  if (!fs.existsSync(path.join(bundle.targetRoot, 'prompts', 'start.md'))) {
    repairs.push('Create prompts/start.md from the canonical template.');
  }
  if (!fs.existsSync(path.join(bundle.targetRoot, 'prompts', 'closeout.md'))) {
    repairs.push('Create prompts/closeout.md from the canonical template.');
  }
  if (!fs.existsSync(path.join(bundle.targetRoot, '.git', 'hooks'))) {
    repairs.push('Install Studio Ops git hooks once the target repo has a .git directory.');
  }

  return repairs;
}

export function buildRuntimePack(root, projectArg = null, options = {}) {
  const bundle = resolveProjectBundle(root, projectArg, options);
  const requiredFiles = getRequiredFileStatus(bundle.targetRoot);
  const missingRequired = requiredFiles.filter((item) => !item.exists).map((item) => item.file);
  const skills = listStudioSkills(root);
  const hooks = listHookFiles(root);
  const integrations = buildIntegrationChecklist(bundle);
  const efficiencyPlaybook = buildEfficiencyPlaybook(bundle);
  const repairActions = buildRepairActions(bundle, requiredFiles);

  return {
    generatedAt: new Date().toISOString(),
    packVersion: '1.0',
    project: {
      slug: bundle.project.slug,
      name: bundle.project.name,
      repo: bundle.project.repo || bundle.effectiveManifest.identity?.repo || null,
      localPath: bundle.targetRoot
    },
    sourceTemplates: {
      agents: 'docs/templates/project-system/AGENTS_PROJECT.template.md',
      startPrompt: 'docs/templates/project-system/START_PROMPT.template.md',
      closeoutPrompt: 'docs/templates/project-system/CLOSEOUT_PROMPT.template.md',
      manifest: 'docs/templates/project-system/STUDIO_MANIFEST.template.json',
      projectStatus: 'docs/templates/project-system/PROJECT_STATUS.template.json',
      claudeSettings: 'docs/templates/project-system/CLAUDE_SETTINGS.template.json'
    },
    scorecard: {
      requiredFilesPresent: requiredFiles.length - missingRequired.length,
      requiredFilesTotal: requiredFiles.length,
      missingRequired,
      hasManifest: Boolean(bundle.manifest),
      hasProjectStatus: fs.existsSync(bundle.statusPath),
      studioOsApplied: bundle.project.studioOsApplied ?? false,
      hubReady: missingRequired.length === 0 && fs.existsSync(bundle.statusPath),
      templateVersion: bundle.effectiveManifest.studioOs?.templateVersion || '3.2'
    },
    requiredFiles,
    runtimeAssets: {
      prompts: ['prompts/start.md', 'prompts/closeout.md'],
      skills: skills.map((skill) => skill.name),
      hooks: hooks.map((hook) => hook.name),
      mcpConfigTemplate: '.claude/settings.local.json'
    },
    listingMetadata: bundle.effectiveManifest.listingMetadata || {},
    manifest: bundle.effectiveManifest,
    integrations,
    efficiencyPlaybook,
    capacity: bundle.effectiveManifest.capacity || {},
    repairActions
  };
}

export function runtimePackMarkdown(pack) {
  const lines = [
    '# Runtime Pack',
    '',
    `- Project: ${pack.project.name} (\`${pack.project.slug}\`)`,
    `- Generated: ${pack.generatedAt}`,
    `- Required files: ${pack.scorecard.requiredFilesPresent}/${pack.scorecard.requiredFilesTotal}`,
    `- Manifest: ${pack.scorecard.hasManifest ? 'present' : 'synthesized fallback'}`,
    `- Hub-ready baseline: ${pack.scorecard.hubReady ? 'yes' : 'not yet'}`,
    '',
    '## Runtime Assets',
    '',
    `- Prompts: ${pack.runtimeAssets.prompts.join(', ')}`,
    `- Skills: ${pack.runtimeAssets.skills.join(', ') || 'none'}`,
    `- Hooks: ${pack.runtimeAssets.hooks.join(', ') || 'none'}`,
    `- MCP/local settings template: ${pack.runtimeAssets.mcpConfigTemplate}`,
    '',
    '## Repair Actions',
    ''
  ];

  if (pack.repairActions.length === 0) {
    lines.push('- No immediate repair actions detected.');
  } else {
    for (const action of pack.repairActions) lines.push(`- ${action}`);
  }

  lines.push('', '## Efficiency Playbook', '');
  for (const item of pack.efficiencyPlaybook) lines.push(`- ${item}`);
  lines.push('', '## Integrations', '');
  for (const integration of pack.integrations) {
    lines.push(`- ${integration.key}: ${integration.enabled ? 'enabled' : 'disabled'} · ${integration.status} · ${integration.requirement}`);
  }

  return lines.join('\n') + '\n';
}

export function scorecardMarkdown(pack) {
  const lines = [
    '# Onboarding Scorecard',
    '',
    `- Project: ${pack.project.name} (\`${pack.project.slug}\`)`,
    `- Studio OS files: ${pack.scorecard.requiredFilesPresent}/${pack.scorecard.requiredFilesTotal}`,
    `- Manifest present: ${pack.scorecard.hasManifest ? 'yes' : 'no'}`,
    `- PROJECT_STATUS present: ${pack.scorecard.hasProjectStatus ? 'yes' : 'no'}`,
    `- Hub-ready baseline: ${pack.scorecard.hubReady ? 'yes' : 'no'}`,
    '',
    '## Missing Required Files',
    ''
  ];

  if (pack.scorecard.missingRequired.length === 0) {
    lines.push('- None');
  } else {
    for (const item of pack.scorecard.missingRequired) lines.push(`- ${item}`);
  }

  return lines.join('\n') + '\n';
}

export function integrationChecklistMarkdown(pack) {
  const lines = [
    '# Integration Checklist',
    '',
    `- Project: ${pack.project.name} (\`${pack.project.slug}\`)`,
    '',
    '| Integration | Enabled | Status | Requirement |',
    '|---|---|---|---|'
  ];

  for (const item of pack.integrations) {
    lines.push(`| ${item.key} | ${item.enabled ? 'yes' : 'no'} | ${item.status} | ${item.requirement} |`);
  }

  return lines.join('\n') + '\n';
}

export function efficiencyPlaybookMarkdown(pack) {
  const lines = [
    '# Efficiency Playbook',
    '',
    `- Project: ${pack.project.name} (\`${pack.project.slug}\`)`,
    '',
    '## Defaults',
    ''
  ];

  for (const item of pack.efficiencyPlaybook) lines.push(`- ${item}`);
  return lines.join('\n') + '\n';
}
