#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const manifestPath = path.join(ROOT, 'context', 'STUDIO_MANIFEST.json');
const statusPath = path.join(ROOT, 'context', 'PROJECT_STATUS.json');
const outDir = path.join(ROOT, 'context', 'contracts');
const jsonOut = process.argv.includes('--json');

function readJson(filePath, fallback = null) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

const manifest = readJson(manifestPath, null);
const status = readJson(statusPath, {});

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

const payloads = {
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
      truthAuditStatus: status.truthAuditStatus || 'unknown',
      ignisScore: status.ignisScore ?? null,
      ignisGrade: status.ignisGrade ?? null,
      silScore: status.silScore ?? null,
      silAvg3: status.silAvg3 ?? null
    },
    liveSurfaces: status.testingSurfaces || [],
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
