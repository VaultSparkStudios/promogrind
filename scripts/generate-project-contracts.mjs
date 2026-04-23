#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readProjectJson } from './lib/context-parsing.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const outDir = path.join(ROOT, 'context', 'contracts');
const jsonOut = process.argv.includes('--json');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

const manifest = readProjectJson(ROOT, 'context/STUDIO_MANIFEST.json', null);
const status = readProjectJson(ROOT, 'context/PROJECT_STATUS.json', {});

if (!manifest) {
  console.error('STUDIO_MANIFEST.json missing or unreadable.');
  process.exit(1);
}

const generatedAt = new Date().toISOString();
const identity = manifest.identity ?? {};
const listing = manifest.listingMetadata ?? {};
const surfaces = manifest.surfaces ?? {};
const hosting = manifest.hosting ?? {};
const integrations = manifest.integrations ?? {};
const publicMetadata = manifest.publicMetadata ?? {};

function buildStatusSummary(primary, fallback = '') {
  const cleanPrimary = String(primary || '').trim();
  if (cleanPrimary) return cleanPrimary;
  return String(fallback || '').trim();
}

function buildLiveSurfaces() {
  const groups = [
    ...(surfaces.production || []).map((surface) => ({ scope: 'production', ...surface })),
    ...(surfaces.testing || []).map((surface) => ({ scope: 'testing', ...surface })),
    ...(surfaces.github || []).map((surface) => ({ scope: 'github', ...surface })),
    ...(surfaces.local || []).map((surface) => ({ scope: 'local', ...surface })),
  ];
  return groups.map((surface) => ({
    label: surface.label || surface.scope,
    scope: surface.scope,
    url: surface.url || null,
    path: surface.path || null,
  }));
}

const liveSurfaces = buildLiveSurfaces();
const hubSummary = buildStatusSummary(status.currentFocus, listing.hubDescription || listing.canonicalSummary || '');
const websiteSummary = buildStatusSummary(listing.websiteDescription, listing.canonicalSummary || hubSummary);
const socialSummary = buildStatusSummary(status.currentFocus, listing.socialDescription || listing.canonicalSummary || '');
const sparkfunnelSummary = buildStatusSummary(status.currentFocus, listing.websiteDescription || listing.canonicalSummary || '');
const nextMilestone = String(status.nextMilestone || '').trim();

const payloads = {
  hub: {
    generatedAt,
    contract: 'hub',
    identity,
    listingMetadata: {
      title: identity.name,
      summary: hubSummary,
      tagline: nextMilestone || listing.tagline || '',
      tags: listing.tags || [],
      categories: listing.categories || []
    },
    status: {
      health: status.health || 'unknown',
      currentFocus: status.currentFocus || '',
      nextMilestone: status.nextMilestone || '',
      truthAuditStatus: status.truthAuditStatus || 'unknown',
      ignisScore: status.ignisScore ?? null,
      ignisGrade: status.ignisGrade ?? null,
      silScore: status.silScore ?? null,
      silAvg3: status.silAvg3 ?? null
    },
    liveSurfaces,
    integration: integrations.studioHub || { enabled: false }
  },
  'website-public': {
    generatedAt,
    contract: 'website-public',
    identity,
    listingMetadata: {
      title: identity.name,
      summary: websiteSummary,
      tagline: nextMilestone || listing.tagline || '',
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
      summary: socialSummary,
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
      summary: sparkfunnelSummary,
      tagline: nextMilestone || listing.tagline || '',
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
      ignisLastComputed: status.ignisLastComputed ?? null,
      truthAuditStatus: status.truthAuditStatus ?? 'unknown',
      truthGenome: status.truthGenome ?? null
    },
    capabilities: manifest.capabilities || {},
    integration: integrations.ignis || { enabled: false }
  }
};

if (jsonOut) {
  console.log(JSON.stringify(payloads, null, 2));
  process.exit(0);
}

for (const [name, payload] of Object.entries(payloads)) {
  writeJson(path.join(outDir, `${name}.json`), payload);
}

console.log(`✓ Project contracts generated → ${path.relative(ROOT, outDir).replace(/\\/g, '/')}`);
