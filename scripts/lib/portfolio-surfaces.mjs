import fs from 'fs';
import path from 'path';
import { parseUnifiedItems, parseHumanItems } from './task-board.mjs';
import { readEvents } from './studio-events.mjs';
import { classifyBlocker } from './blocker-rules.mjs';
import { resolveCapability } from './secrets.mjs';
import { rankItems, isLiveRankingAvailable } from './ignis-rank.mjs';

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

export function exists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

export function slugToTitle(slug) {
  return String(slug || '')
    .split(/[-_]/g)
    .filter(Boolean)
    .map((token) => token[0]?.toUpperCase() + token.slice(1))
    .join(' ');
}

export function normalizeRuntime(runtime) {
  const source = String(runtime || '').toLowerCase();
  if (source.includes('codex')) return 'codex';
  if (source.includes('claude')) return 'claude';
  if (source.includes('chatgpt') || source.includes('openai')) return 'chatgpt';
  if (source.includes('human')) return 'human';
  if (source.includes('auto')) return 'automation';
  return runtime || 'unknown';
}

function scoreReadiness(project) {
  let score = 100;
  const reasons = [];

  if (!project.localPathExists) {
    score -= 35;
    reasons.push('local path unavailable');
  }
  if (!project.studioOsApplied) {
    score -= 20;
    reasons.push('studio os not applied');
  }
  if (!project.hasManifest) {
    score -= 18;
    reasons.push('manifest missing');
  }
  if (!project.hasRuntimePack) {
    score -= 12;
    reasons.push('runtime-pack missing');
  }
  if (project.truthAuditStatus === 'yellow') {
    score -= 7;
    reasons.push('truth audit yellow');
  }
  if (!project.truthAuditStatus || project.truthAuditStatus === 'red' || project.truthAuditStatus === 'unknown') {
    score -= 15;
    reasons.push('truth audit unresolved');
  }
  if (project.brandingRequired && project.brandingCompliant === false) {
    score -= 10;
    reasons.push('branding incomplete');
  }
  if (project.vaultStatus === 'SPARKED' && project.audience !== 'internal' && project.stagingType === 'none') {
    score -= 10;
    reasons.push('staging missing for sparked project');
  }
  if (project.activeSession?.stale) {
    score -= 10;
    reasons.push('stale session lock');
  }
  if ((project.blockers || []).length >= 5) {
    score -= 8;
    reasons.push('blocker load elevated');
  }
  if ((project.openTaskCount || 0) >= 8) {
    score -= 6;
    reasons.push('task load high');
  }

  const clamped = Math.max(0, Math.min(100, score));
  const lane = clamped >= 85 ? 'safe' : clamped >= 65 ? 'caution' : 'risky';
  return { score: clamped, lane, reasons };
}

function classifyLaunch(project) {
  const status = String(project.launchStatus || 'not-applicable');
  let urgency = 0;
  let action = 'monitor';
  if (status === 'deployed-unannounced') {
    urgency = 95;
    action = 'announce';
  } else if (status === 'pre-deploy') {
    urgency = 75;
    action = 'ship';
  } else if (status === 'announced') {
    urgency = 40;
    action = 'support';
  } else if (status === 'live-internal') {
    urgency = 35;
    action = 'internalize';
  }

  if (project.brandingRequired && project.brandingCompliant === false) urgency += 5;
  if (project.vaultStatus === 'SPARKED' && project.stagingType === 'none' && project.audience !== 'internal') urgency += 5;

  return {
    status,
    action,
    urgency: Math.min(100, urgency),
  };
}

function inferTaskRuntime(text) {
  const source = String(text || '').toLowerCase();
  if (/(dns|legal|billing|affiliate|owner|approval|dashboard-only)/.test(source)) return 'human';
  if (/(refresh|render|compile|generate|rebuild|dashboard|digest|mesh)/.test(source)) return 'automation';
  if (/(protocol|cross-repo|portfolio|founder|orchestrator|control tower|runtime assignment)/.test(source)) return 'claude';
  return 'codex';
}

function extractHumanBlockers(taskBoardText) {
  return parseHumanItems(taskBoardText).map((item) => {
    const blocker = classifyBlocker(item.description);
    return {
      title: item.title,
      description: item.description,
      ageSessions: item.ageSessions,
      attemptable: blocker.attemptable,
      category: blocker.category,
      capabilities: blocker.capabilities,
      humanAction: blocker.humanAction,
      probeCommands: blocker.probeCommands,
    };
  });
}

function candidateSourceFiles(sourceFileField) {
  return String(sourceFileField || '')
    .split(/\s+\+\s+|\s+or\s+/i)
    .map((part) => part.trim())
    .flatMap((part) => part.match(/[\w.-]+\.(env|txt)/g) || [])
    .map((name) => name.trim());
}

function freshnessBucket(days) {
  if (days == null) return 'unknown';
  if (days <= 7) return 'fresh';
  if (days <= 30) return 'aging';
  return 'stale';
}

function daysSince(dateLike) {
  if (!dateLike) return null;
  const ms = Date.now() - new Date(dateLike).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
}

function buildCapabilityDashboard(root) {
  const secretsDir = path.join(root, 'secrets');
  const capMap = readJson(path.join(secretsDir, 'CAPABILITY_MAP.json'), { capabilities: {} });
  return Object.entries(capMap.capabilities || {}).map(([cap, meta]) => {
    const resolution = resolveCapability(cap);
    const sourceFiles = candidateSourceFiles(resolution.sourceFile);
    const timestamps = sourceFiles
      .map((name) => path.join(secretsDir, name))
      .filter((filePath) => exists(filePath))
      .map((filePath) => fs.statSync(filePath).mtime.toISOString());
    const latestSourceAt = timestamps.sort().at(-1) || null;
    const ageDays = daysSince(latestSourceAt);
    const status = resolution.ok ? freshnessBucket(ageDays) : 'missing';
    return {
      capability: cap,
      description: meta.description || resolution.description,
      requiredEnv: resolution.required,
      missingEnv: resolution.missing,
      ready: resolution.ok,
      sourceFile: meta.sourceFile || resolution.sourceFile,
      latestSourceAt,
      ageDays,
      freshness: status,
    };
  }).sort((a, b) => {
    if (a.ready !== b.ready) return a.ready ? 1 : -1;
    return (b.ageDays ?? -1) - (a.ageDays ?? -1);
  });
}

export function loadPortfolio(root) {
  const registry = readJson(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
  const activeSessions = readJson(path.join(root, 'portfolio', 'ACTIVE_SESSIONS.json'), {
    activeSessions: [],
    conflicts: [],
    portfolio: {},
  });
  const events = readEvents(root);
  const taskBoardText = readText(path.join(root, 'context', 'TASK_BOARD.md'));
  const localTasks = parseUnifiedItems(taskBoardText);
  const humanBlockers = extractHumanBlockers(taskBoardText);
  const capabilityDashboard = buildCapabilityDashboard(root);
  const capabilityByName = Object.fromEntries(capabilityDashboard.map((item) => [item.capability, item]));
  const sessionBySlug = Object.fromEntries((activeSessions.activeSessions || []).map((item) => [item.slug, item]));
  const conflictIndex = new Map();

  for (const conflict of activeSessions.conflicts || []) {
    const key = `${conflict.sourceSlug}:${conflict.targetSlug}`;
    conflictIndex.set(key, conflict);
  }

  const projects = (registry.projects || []).map((project) => {
    const localPath = project.localPath || null;
    const localPathExists = localPath ? exists(localPath) : false;
    const statusPath = localPath ? path.join(localPath, 'context', 'PROJECT_STATUS.json') : null;
    const manifestPath = localPath ? path.join(localPath, 'context', 'STUDIO_MANIFEST.json') : null;
    const runtimePackPath = localPath ? path.join(localPath, 'context', 'runtime-pack', 'RUNTIME_PACK.json') : null;
    const status = statusPath ? readJson(statusPath, {}) : {};
    const manifest = manifestPath ? readJson(manifestPath, null) : null;
    const activeSession = sessionBySlug[project.slug] || null;
    const eventRows = events.filter((event) => event.slug === project.slug);
    const launch = classifyLaunch({
      launchStatus: project.launchStatus,
      brandingRequired: project.brandingRequired,
      brandingCompliant: project.brandingCompliant,
      vaultStatus: String(project.vaultStatus || status.vaultStatus || 'FORGE').toUpperCase(),
      stagingType: project.stagingType || status.stagingType || 'none',
      audience: project.audience || status.audience || 'internal',
    });
    const openTaskCount = localPathExists
      ? parseUnifiedItems(readText(path.join(localPath, 'context', 'TASK_BOARD.md'))).filter((item) => item.status === 'unblocked').length
      : 0;

    const record = {
      slug: project.slug,
      name: project.name || slugToTitle(project.slug),
      repo: project.repo || status.github?.replace('https://github.com/', '') || null,
      medium: project.medium || status.type || manifest?.identity?.type || 'unknown',
      status: project.status || status.status || 'unknown',
      lifecycle: project.lifecycle || status.lifecycle || manifest?.identity?.lifecycle || 'unknown',
      audience: project.audience || status.audience || manifest?.identity?.audience || 'unknown',
      vaultStatus: String(project.vaultStatus || status.vaultStatus || manifest?.identity?.vaultStatus || 'FORGE').toUpperCase(),
      developmentPhase: project.developmentPhase || status.developmentPhase || 'unknown',
      priority: project.priority || 'medium',
      health: project.health || status.health || 'unknown',
      owner: project.owner || status.owner || manifest?.identity?.owner || 'VaultSpark Studios',
      summary: project.summary || status.currentFocus || manifest?.listingMetadata?.canonicalSummary || '',
      currentFocus: project.currentFocus || status.currentFocus || '',
      nextMilestone: project.nextMilestone || status.nextMilestone || '',
      localPath,
      localPathExists,
      studioOsApplied: Boolean(project.studioOsApplied),
      hasManifest: Boolean(manifest),
      hasRuntimePack: Boolean(runtimePackPath && exists(runtimePackPath)),
      stagingUrl: project.stagingUrl ?? status.stagingUrl ?? manifest?.hosting?.stagingUrl ?? null,
      stagingType: project.stagingType || status.stagingType || 'none',
      liveUrl: project.runtimeUrl || status.liveUrl || manifest?.hosting?.liveUrl || null,
      launchStatus: project.launchStatus || status.lastDeployStatus || 'not-applicable',
      brandingRequired: project.brandingRequired ?? manifest?.publicMetadata?.brandingRequired ?? false,
      brandingCompliant: project.brandingCompliant ?? manifest?.publicMetadata?.brandingCompliant ?? null,
      truthAuditStatus: status.truthAuditStatus || 'unknown',
      blockers: status.blockers || [],
      testingSurfaces: status.testingSurfaces || manifest?.surfaces?.testing || [],
      secretsCapabilities: manifest?.secretsCapabilities || [],
      manifest,
      statusJson: status,
      activeSession,
      eventCount30d: eventRows.length,
      recentEvents: eventRows.slice(-5),
      openTaskCount,
      launch,
    };

    record.readiness = scoreReadiness(record);
    record.secretsReady = record.secretsCapabilities.every((cap) => capabilityByName[cap]?.ready !== false);
    record.identityContract = {
      slug: record.slug,
      name: record.name,
      repo: record.repo,
      owner: record.owner,
      medium: record.medium,
      lifecycle: record.lifecycle,
      audience: record.audience,
      vaultStatus: record.vaultStatus,
      status: record.status,
      health: record.health,
      urls: {
        live: record.liveUrl,
        staging: record.stagingUrl,
        github: record.repo ? `https://github.com/${record.repo}` : null,
      },
      brand: {
        required: record.brandingRequired,
        compliant: record.brandingCompliant,
      },
      contracts: manifest?.contracts || {},
      testingSurfaces: record.testingSurfaces,
      secretsCapabilities: record.secretsCapabilities,
      readiness: record.readiness,
      launch: record.launch,
    };

    return record;
  });

  return {
    generatedAt: new Date().toISOString(),
    registry,
    activeSessions,
    events,
    localTasks,
    humanBlockers,
    capabilities: capabilityDashboard,
    projects,
    conflicts: activeSessions.conflicts || [],
    sessionBySlug,
    conflictIndex,
  };
}

export function buildIdentityContracts(root) {
  const state = loadPortfolio(root);
  return {
    generatedAt: state.generatedAt,
    source: 'portfolio-surfaces',
    schemaVersion: '1.0',
    consumers: ['studio-hub', 'website', 'social-dashboard', 'sparkfunnel', 'ignis'],
    projects: state.projects.map((project) => project.identityContract),
  };
}

export function buildProjectMesh(root) {
  const state = loadPortfolio(root);
  return {
    generatedAt: state.generatedAt,
    schemaVersion: '1.0',
    schema: {
      requiredFields: ['slug', 'timestamp', 'signals', 'launch', 'readiness', 'session'],
      signalKeys: ['blockers', 'tests', 'deploy', 'engagement', 'security', 'events'],
    },
    projects: state.projects.map((project) => ({
      slug: project.slug,
      timestamp: state.generatedAt,
      signals: {
        blockers: project.blockers.length,
        tests: project.testingSurfaces.map((item) => ({
          type: item.type || item.label || 'surface',
          status: item.status || 'unknown',
        })),
        deploy: {
          liveUrl: project.liveUrl,
          stagingUrl: project.stagingUrl,
          launchStatus: project.launchStatus,
        },
        engagement: {
          audience: project.audience,
          recentEventCount: project.eventCount30d,
        },
        security: {
          brandingCompliant: project.brandingCompliant,
          secretsReady: project.secretsReady,
          truthAuditStatus: project.truthAuditStatus,
        },
        events: project.recentEvents,
      },
      launch: project.launch,
      readiness: project.readiness,
      session: project.activeSession
        ? {
            active: true,
            agent: normalizeRuntime(project.activeSession.agent),
            stale: Boolean(project.activeSession.stale),
          }
        : { active: false },
    })),
  };
}

export function buildRepoReadiness(root) {
  const state = loadPortfolio(root);
  const ranked = [...state.projects]
    .sort((a, b) => b.readiness.score - a.readiness.score)
    .map((project, index) => ({
      rank: index + 1,
      slug: project.slug,
      name: project.name,
      score: project.readiness.score,
      lane: project.readiness.lane,
      reasons: project.readiness.reasons,
      openTaskCount: project.openTaskCount,
      blockerCount: project.blockers.length,
      manifest: project.hasManifest,
      runtimePack: project.hasRuntimePack,
      activeSession: Boolean(project.activeSession),
    }));

  return {
    generatedAt: state.generatedAt,
    schemaVersion: '1.0',
    ranked,
  };
}

export function buildLaunchMesh(root) {
  const state = loadPortfolio(root);
  const projects = [...state.projects]
    .sort((a, b) => b.launch.urgency - a.launch.urgency)
    .map((project) => ({
      slug: project.slug,
      name: project.name,
      launchStatus: project.launch.status,
      action: project.launch.action,
      urgency: project.launch.urgency,
      audience: project.audience,
      vaultStatus: project.vaultStatus,
      brandingCompliant: project.brandingCompliant,
      stagingType: project.stagingType,
      liveUrl: project.liveUrl,
      blockers: project.blockers.slice(0, 3),
    }));

  return {
    generatedAt: state.generatedAt,
    schemaVersion: '1.0',
    projects,
  };
}

export function buildRuntimeAssignment(root) {
  const state = loadPortfolio(root);
  const topLocal = state.localTasks
    .filter((item) => item.status === 'unblocked')
    .slice(0, 8)
    .map((item) => ({
      title: item.title,
      runtime: inferTaskRuntime(item.title),
      category: item.category,
      reason:
        inferTaskRuntime(item.title) === 'claude'
          ? 'cross-project or founder-facing synthesis'
          : inferTaskRuntime(item.title) === 'automation'
            ? 'deterministic generated surface or repeatable refresh'
            : inferTaskRuntime(item.title) === 'human'
              ? 'owner-only approval or credential path'
              : 'bounded implementation and verification',
    }));

  return {
    generatedAt: state.generatedAt,
    schemaVersion: '1.0',
    policies: {
      claude: 'Use for cross-project synthesis, command design, founder-facing routing, and schema/policy decisions.',
      codex: 'Use for bounded implementation, file edits, tests, bugfixes, and deterministic verification loops.',
      codexCloud: 'Use for independent sidecar implementation or long-running batch work that does not block the current local step.',
      chatgpt: 'Use for connected founder operations, MCP-backed dashboards, and orchestration across tools/data planes.',
      automation: 'Use for generators, compilers, scoreboards, event feeds, and refresh-only commands.',
      human: 'Use only for legal, billing, DNS/account ownership, explicit approval, or missing external credentials.',
    },
    assignments: topLocal,
  };
}

export function buildSecurityPolicy(root) {
  const state = loadPortfolio(root);
  const externalCaps = state.capabilities.filter((item) =>
    /cloudflare|resend|social|stripe|supabase|github|hetzner|render|railway|vercel|seamline/i.test(item.capability)
  );

  return {
    generatedAt: state.generatedAt,
    schemaVersion: '1.0',
    trustTiers: [
      {
        tier: 'tier-0-local',
        risk: 'low',
        examples: ['local generated artifacts', 'read-only markdown parsing', 'repo-local validation'],
        approvalPolicy: 'allow',
      },
      {
        tier: 'tier-1-guarded',
        risk: 'medium',
        examples: ['secret reads through gateway', 'cross-repo scans', 'local git writes'],
        approvalPolicy: 'allow with protocol logging',
      },
      {
        tier: 'tier-2-networked',
        risk: 'high',
        examples: ['external MCP connectors', 'deployment APIs', 'social posting flows', 'credential-backed writes'],
        approvalPolicy: 'require secrets discovery and action-class review',
      },
      {
        tier: 'tier-3-owner',
        risk: 'critical',
        examples: ['billing/ownership changes', 'public visibility flips', 'legal/licensing changes'],
        approvalPolicy: 'owner-only',
      },
    ],
    actionClasses: [
      { action: 'read-local', policy: 'allow' },
      { action: 'write-local-generated', policy: 'allow' },
      { action: 'write-cross-repo', policy: 'require lock check' },
      { action: 'read-secret', policy: 'gateway only' },
      { action: 'external-admin-write', policy: 'check-secrets + blocker-preflight' },
      { action: 'canon-or-license-change', policy: 'escalate' },
    ],
    credentialFreshness: externalCaps.map((item) => ({
      capability: item.capability,
      freshness: item.freshness,
      ready: item.ready,
      ageDays: item.ageDays,
    })),
    externalRiskSignals: [
      'Prompt injection risk increases when MCP tools can fetch or execute remote content.',
      'Connector write actions must be classified before automatic execution.',
      'Capability freshness should gate autonomous deploy and announcement flows.',
    ],
  };
}

export function buildCredentialAging(root) {
  const state = loadPortfolio(root);
  return {
    generatedAt: state.generatedAt,
    schemaVersion: '1.0',
    capabilities: state.capabilities,
    summary: {
      ready: state.capabilities.filter((item) => item.ready).length,
      missing: state.capabilities.filter((item) => !item.ready).length,
      stale: state.capabilities.filter((item) => item.freshness === 'stale').length,
    },
  };
}

export function buildCrossRepoPlan(root) {
  const state = loadPortfolio(root);
  const readiness = buildRepoReadiness(root).ranked;
  const unlocked = readiness.filter((item) => !item.activeSession);
  const hotConflicts = state.conflicts.slice(0, 8).map((conflict) => ({
    sourceSlug: conflict.sourceSlug,
    targetSlug: conflict.targetSlug,
    resolution: `Finish or release ${conflict.sourceSlug}, then enter ${conflict.targetSlug} only after the active lock clears.`,
  }));

  return {
    generatedAt: state.generatedAt,
    schemaVersion: '1.0',
    conflicts: hotConflicts,
    recommendedWriteOrder: unlocked.slice(0, 8).map((item, index) => ({
      step: index + 1,
      slug: item.slug,
      score: item.score,
      lane: item.lane,
      why: item.reasons[0] || 'highest safe unlocked repo',
    })),
  };
}

export function buildControlTower(root) {
  const state = loadPortfolio(root);
  const readiness = buildRepoReadiness(root).ranked;
  const launch = buildLaunchMesh(root).projects;
  const human = state.humanBlockers
    .sort((a, b) => (b.ageSessions || 0) - (a.ageSessions || 0))
    .slice(0, 5);
  const active = (state.activeSessions.activeSessions || []).map((session) => ({
    slug: session.slug,
    agent: normalizeRuntime(session.agent),
    ageHuman: session.ageHuman,
    stale: session.stale,
    lease: session.lease || null,
  }));

  const bestFounderAction =
    human[0]
      ? `Resolve owner blocker: ${human[0].title}`
      : state.conflicts[0]
        ? `Unblock cross-repo conflict: ${state.conflicts[0].sourceSlug} → ${state.conflicts[0].targetSlug}`
        : launch[0]
          ? `Advance launch lane: ${launch[0].name}`
          : 'Continue highest-value local unblocked item';

  const bestAgentAction =
    readiness.find((item) => item.lane === 'safe' && !item.activeSession)
      ? `Open ${readiness.find((item) => item.lane === 'safe' && !item.activeSession).slug} for bounded implementation`
      : 'Finish current repo tranche';

  return {
    generatedAt: state.generatedAt,
    schemaVersion: '1.0',
    summary: {
      activeSessions: state.activeSessions.portfolio?.activeCount || 0,
      staleLocks: state.activeSessions.portfolio?.staleLockCount || 0,
      conflicts: state.conflicts.length,
      ownerOnlyPressure: human.length,
    },
    activeSessions: active,
    topOwnerItems: human,
    topReadiness: readiness.slice(0, 5),
    launchFrontier: launch.slice(0, 5),
    bestNextFounderAction: bestFounderAction,
    bestNextAgentAction: bestAgentAction,
  };
}

export function buildFounderDigest(root) {
  const state = loadPortfolio(root);
  const readiness = buildRepoReadiness(root).ranked;
  const launch = buildLaunchMesh(root).projects;
  const items = [];

  const topConflict = state.conflicts[0];
  if (topConflict) {
    items.push({
      kind: 'conflict',
      title: `${topConflict.sourceSlug} vs ${topConflict.targetSlug}`,
      action: 'clear cross-repo write risk',
    });
  }

  for (const project of launch.slice(0, 2)) {
    items.push({
      kind: 'launch',
      title: `${project.name} → ${project.launchStatus}`,
      action: project.action,
    });
  }

  for (const repo of readiness.slice(0, 2)) {
    items.push({
      kind: 'readiness',
      title: `${repo.name} readiness ${repo.score}`,
      action: repo.lane === 'safe' ? 'delegate' : 'stabilize',
    });
  }

  const human = state.humanBlockers[0];
  if (human) {
    items.push({
      kind: 'owner',
      title: human.title,
      action: human.humanAction,
    });
  }

  return {
    generatedAt: state.generatedAt,
    schemaVersion: '1.0',
    mustKnow: items.slice(0, 5),
    actions: items.slice(0, 3).map((item) => item.action),
    strategicBet:
      launch.find((item) => item.action === 'announce')?.name ||
      readiness.find((item) => item.lane === 'safe')?.name ||
      'Finish founder-scale protocol rollout',
  };
}

export function buildOmnilist(root) {
  const state = loadPortfolio(root);
  const readiness = buildRepoReadiness(root).ranked;
  const launch = buildLaunchMesh(root).projects;
  const items = [];

  for (const task of state.localTasks.filter((item) => item.status === 'unblocked').slice(0, 8)) {
    items.push({
      type: 'task',
      title: task.title,
      category: task.category,
      effortMin: task.effortMin ?? null,
      status: task.status || 'unblocked',
      score: 70 - Number(task.rankNumber || 0),
      action: inferTaskRuntime(task.title),
    });
  }

  for (const project of launch.slice(0, 5)) {
    items.push({
      type: 'launch',
      title: `${project.name} — ${project.launchStatus}`,
      category: 'launch',
      effortMin: null,
      status: 'unblocked',
      score: project.urgency,
      action: project.action,
    });
  }

  for (const repo of readiness.filter((item) => item.score < 70).slice(0, 5)) {
    items.push({
      type: 'readiness',
      title: `${repo.name} readiness ${repo.score}`,
      category: 'governance',
      effortMin: null,
      status: 'unblocked',
      score: 100 - repo.score,
      action: repo.reasons[0] || 'stabilize',
    });
  }

  return {
    generatedAt: state.generatedAt,
    schemaVersion: '1.0',
    rankingMode: 'deterministic-fallback',
    items: items.sort((a, b) => b.score - a.score).slice(0, 15),
  };
}

/**
 * Async wrapper that attaches live IGNIS scoring when `IGNIS_MCP_URL` is
 * configured. Preserves the PORTFOLIO_OMNILIST contract — items[] shape is
 * identical; `score` is replaced with the live IGNIS score, and three extra
 * fields (`ignisTier`, `ignisRationale`, `ignisSource`) are added when the
 * live path succeeds. Any failure falls through to the deterministic result,
 * so the contract is never broken.
 */
export async function buildOmnilistRanked(root) {
  const base = buildOmnilist(root);

  if (!isLiveRankingAvailable()) {
    return { ...base, rankingMode: 'deterministic-fallback' };
  }

  try {
    const toRank = base.items.map((it, idx) => ({
      id: `${it.type}-${idx}`,
      title: it.title,
      category: String(it.category || '').toUpperCase(),
      status: it.status || 'unblocked',
      effortMin: it.effortMin ?? null,
      sourceSurface: 'OMNILIST',
      signals: { originalScore: it.score }
    }));

    const ranked = await rankItems(toRank);
    const byId = new Map(ranked.map((r) => [r.id, r]));

    const merged = base.items
      .map((it, idx) => {
        const r = byId.get(`${it.type}-${idx}`);
        if (!r) return { ...it, ignisSource: 'unranked' };
        return {
          ...it,
          score: r.ignisScore,
          ignisTier: r.ignisTier ?? null,
          ignisRationale: r.ignisRationale ?? null,
          ignisSource: r.ignisSource ?? 'fallback'
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    const isLive = merged.some((it) => it.ignisSource === 'live');

    return {
      ...base,
      items: merged,
      rankingMode: isLive ? 'live-ignis' : 'deterministic-fallback'
    };
  } catch (err) {
    process.stderr.write(`[omnilist] live rank failed, falling back: ${err.message}\n`);
    return { ...base, rankingMode: 'deterministic-fallback' };
  }
}

export function markdownTable(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const rule = `|${headers.map(() => '---').join('|')}|`;
  const body = rows.map((row) => `| ${row.join(' | ')} |`);
  return [head, rule, ...body].join('\n');
}
