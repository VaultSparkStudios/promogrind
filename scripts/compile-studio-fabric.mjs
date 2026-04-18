#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
const OUT_DIR = path.join(ROOT, 'portfolio', 'compiled');
const jsonOut = process.argv.includes('--json');

function readJson(filePath, fallback = null) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function exists(filePath) {
  try { return fs.existsSync(filePath); } catch { return false; }
}

function normalizeVaultStatus(value) {
  return String(value ?? '').toUpperCase();
}

function inferManifest(project, status) {
  const runtimeUrl = project.runtimeUrl || status.liveUrl || null;
  const stagingUrl = project.stagingUrl ?? status.stagingUrl ?? null;
  const githubUrl = project.repo ? `https://github.com/${project.repo}` : status.github || null;
  const testing = status.testingSurfaces || [];

  return {
    schemaVersion: '1.0',
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
    listingMetadata: {
      canonicalSummary: project.summary || status.currentFocus || `${project.name} project in the VaultSpark ecosystem.`,
      tagline: project.summary || project.currentFocus || '',
      tags: [project.medium, project.status, project.lifecycle].filter(Boolean),
      categories: [project.medium, project.audience].filter(Boolean),
      hubDescription: project.currentFocus || status.currentFocus || '',
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
      testing: testing.map(surface => ({
        label: surface.type,
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
      website: { enabled: project.audience?.includes('public') || Boolean(runtimeUrl), mode: 'public-safe' },
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
      testInstructions: testing.map(surface => surface.command || surface.url).filter(Boolean)
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
      safeActions: [],
      guardedActions: [],
      blockedActions: []
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

function pickTestSurfaces(status, manifest) {
  const surfaces = status.testingSurfaces || [];
  if (surfaces.length) return surfaces;
  return [
    ...(manifest.hosting.liveUrl ? [{ type: 'production', url: manifest.hosting.liveUrl, status: 'unknown' }] : []),
    ...(manifest.hosting.stagingUrl ? [{ type: 'staging', url: manifest.hosting.stagingUrl, status: 'unknown' }] : []),
    ...((manifest.surfaces.github || []).map(item => ({ type: 'github', url: item.url, status: 'green' })))
  ];
}

const registry = readJson(REGISTRY, { projects: [] });
const today = new Date().toISOString().slice(0, 10);
const projects = [];

for (const project of registry.projects || []) {
  if (project.status === 'archived') continue;

  const projectRoot = project.localPath || '';
  const statusPath = path.join(projectRoot, 'context', 'PROJECT_STATUS.json');
  const manifestPath = path.join(projectRoot, 'context', 'STUDIO_MANIFEST.json');
  const status = exists(statusPath) ? readJson(statusPath, {}) : {};
  const manifest = exists(manifestPath) ? readJson(manifestPath, null) : null;
  const effectiveManifest = manifest || inferManifest(project, status);
  const testingSurfaces = pickTestSurfaces(status, effectiveManifest);
  const lifecycle = effectiveManifest.identity?.lifecycle || project.lifecycle || status.lifecycle || 'unknown';
  const audience = effectiveManifest.identity?.audience || project.audience || status.audience || 'unknown';
  const integrationTargets = ['studioHub', 'website', 'socialDashboard', 'sparkFunnel', 'ignis', 'founderQueue'];
  const enabledIntegrations = integrationTargets.filter(key => effectiveManifest.integrations?.[key]?.enabled);

  projects.push({
    slug: project.slug,
    name: project.name,
    repo: effectiveManifest.identity?.repo || project.repo || null,
    hasManifest: Boolean(manifest),
    manifestPath: manifest ? path.relative(ROOT, manifestPath).replace(/\\/g, '/') : null,
    listingMetadata: effectiveManifest.listingMetadata,
    capabilities: effectiveManifest.capabilities,
    integrations: effectiveManifest.integrations,
    hosting: effectiveManifest.hosting,
    publicMetadata: effectiveManifest.publicMetadata,
    truth: {
      truthAuditStatus: status.truthAuditStatus || 'unknown',
      truthAuditLastRun: status.truthAuditLastRun || null,
      truthGenome: status.truthGenome || null,
      sourceHierarchy: ['PROJECT_STATUS.json', 'STUDIO_MANIFEST.json', 'TRUTH_AUDIT.md', 'Derived surfaces'],
      driftClass: manifest ? 'manifest-backed' : 'synthesized-manifest'
    },
    liveSurface: {
      slug: project.slug,
      name: project.name,
      vaultStatus: effectiveManifest.identity?.vaultStatus || normalizeVaultStatus(project.vaultStatus || status.vaultStatus),
      lifecycle,
      audience,
      liveUrl: effectiveManifest.hosting?.liveUrl || status.liveUrl || project.runtimeUrl || null,
      stagingUrl: effectiveManifest.hosting?.stagingUrl || status.stagingUrl || project.stagingUrl || null,
      privatePreviewUrl: effectiveManifest.hosting?.privatePreviewUrl || null,
      localPath: project.localPath || status.localPath || null,
      testingSurfaces,
      testInstructions: effectiveManifest.hosting?.testInstructions || testingSurfaces.map(surface => surface.command || surface.url).filter(Boolean)
    },
    integrationCompleteness: {
      enabled: enabledIntegrations,
      completeness: Math.round((enabledIntegrations.length / integrationTargets.length) * 100),
      missingManifest: !manifest,
      websiteListingRequired: effectiveManifest.publicMetadata?.websiteListingRequired ?? true
    }
  });
}

const outputs = {
  projectCapabilities: {
    generatedAt: today,
    source: 'compile-studio-fabric.mjs',
    projects: projects.map(project => ({
      slug: project.slug,
      name: project.name,
      hasManifest: project.hasManifest,
      capabilities: project.capabilities,
      listingMetadata: project.listingMetadata,
      hosting: project.hosting
    }))
  },
  integrationStatus: {
    generatedAt: today,
    source: 'compile-studio-fabric.mjs',
    projects: projects.map(project => ({
      slug: project.slug,
      name: project.name,
      enabledIntegrations: project.integrationCompleteness.enabled,
      completeness: project.integrationCompleteness.completeness,
      websiteListingRequired: project.integrationCompleteness.websiteListingRequired,
      missingManifest: project.integrationCompleteness.missingManifest
    }))
  },
  truthGraph: {
    generatedAt: today,
    source: 'compile-studio-fabric.mjs',
    sourcePrecedence: ['PROJECT_STATUS.json', 'STUDIO_MANIFEST.json', 'TRUTH_AUDIT.md', 'Derived founder-facing surfaces'],
    projects: projects.map(project => ({
      slug: project.slug,
      name: project.name,
      truthAuditStatus: project.truth.truthAuditStatus,
      truthAuditLastRun: project.truth.truthAuditLastRun,
      truthGenome: project.truth.truthGenome,
      driftClass: project.truth.driftClass,
      hasManifest: project.hasManifest
    }))
  },
  liveSurfaces: {
    generatedAt: today,
    source: 'compile-studio-fabric.mjs',
    projects: projects.map(project => project.liveSurface)
  },
  publicSurfaces: {
    generatedAt: today,
    source: 'compile-studio-fabric.mjs',
    projects: projects.map(project => ({
      slug: project.slug,
      name: project.name,
      summary: project.listingMetadata?.websiteDescription || project.listingMetadata?.canonicalSummary || '',
      tags: project.listingMetadata?.tags || [],
      vaultStatus: project.liveSurface.vaultStatus,
      liveUrl: project.liveSurface.liveUrl,
      publicReady: project.publicMetadata?.publicReady ?? false,
      brandingRequired: project.publicMetadata?.brandingRequired ?? false,
      brandingCompliant: project.publicMetadata?.brandingCompliant ?? null,
      websiteListingRequired: project.publicMetadata?.websiteListingRequired ?? true
    }))
  },
  listingMetadata: {
    generatedAt: today,
    source: 'compile-studio-fabric.mjs',
    projects: projects.map(project => ({
      slug: project.slug,
      name: project.name,
      vaultStatus: project.liveSurface.vaultStatus,
      canonical: {
        summary: project.listingMetadata?.canonicalSummary || '',
        tagline: project.listingMetadata?.tagline || '',
        tags: project.listingMetadata?.tags || [],
        categories: project.listingMetadata?.categories || []
      },
      consumers: {
        hub: project.listingMetadata?.hubDescription || project.listingMetadata?.canonicalSummary || '',
        website: project.listingMetadata?.websiteDescription || project.listingMetadata?.canonicalSummary || '',
        socialDashboard: project.listingMetadata?.socialDescription || project.listingMetadata?.canonicalSummary || '',
        sparkFunnel: project.listingMetadata?.websiteDescription || project.listingMetadata?.canonicalSummary || '',
        founderQueue: project.listingMetadata?.hubDescription || project.listingMetadata?.canonicalSummary || ''
      },
      links: {
        repo: project.repo ? `https://github.com/${project.repo}` : null,
        liveUrl: project.liveSurface.liveUrl,
        stagingUrl: project.liveSurface.stagingUrl
      }
    }))
  }
};

if (jsonOut) {
  console.log(JSON.stringify(outputs, null, 2));
  process.exit(0);
}

writeJson(path.join(OUT_DIR, 'PROJECT_CAPABILITIES.json'), outputs.projectCapabilities);
writeJson(path.join(OUT_DIR, 'INTEGRATION_STATUS.json'), outputs.integrationStatus);
writeJson(path.join(OUT_DIR, 'TRUTH_GRAPH.json'), outputs.truthGraph);
writeJson(path.join(OUT_DIR, 'LIVE_SURFACES.json'), outputs.liveSurfaces);
writeJson(path.join(OUT_DIR, 'PUBLIC_SURFACES.json'), outputs.publicSurfaces);
writeJson(path.join(OUT_DIR, 'LISTING_METADATA.json'), outputs.listingMetadata);

console.log(`✓ Studio fabric compiled → ${path.relative(ROOT, OUT_DIR).replace(/\\/g, '/')} (${projects.length} projects)`);
