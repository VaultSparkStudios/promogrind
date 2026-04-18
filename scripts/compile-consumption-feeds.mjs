#!/usr/bin/env node
/**
 * compile-consumption-feeds.mjs — S79 Consumption Bridge
 *
 * Writes three consumer-ready JSON snapshots that the Studio Hub, Social
 * Dashboard, and vaultsparkstudios.com website can pull via GitHub raw.
 * This closes the S76–S78 recurring top gap: control-plane outputs exist
 * but downstream surfaces don't consume them.
 *
 * Feeds written:
 *   portfolio/compiled/HUB_FEED.json              — Studio Hub cockpit
 *   portfolio/compiled/SOCIAL_DASHBOARD_FEED.json — per-project growth cards
 *   portfolio/compiled/WEBSITE_FEED.json          — vaultsparkstudios.com public surfaces
 *
 * Consumers read raw via:
 *   https://raw.githubusercontent.com/VaultSparkStudios/vaultspark-studio-ops/main/portfolio/compiled/<FEED>.json
 *
 * Schema versioned — consumers should gate on `_schema` field.
 *
 * Usage:
 *   node scripts/compile-consumption-feeds.mjs            # all feeds
 *   node scripts/compile-consumption-feeds.mjs --hub      # single feed
 *   node scripts/compile-consumption-feeds.mjs --json     # stdout, do not write
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'portfolio', 'compiled');

const args = new Set(process.argv.slice(2));
const STDOUT_ONLY = args.has('--json');
const ONLY_HUB = args.has('--hub');
const ONLY_SOCIAL = args.has('--social');
const ONLY_WEBSITE = args.has('--website');
const runAll = !ONLY_HUB && !ONLY_SOCIAL && !ONLY_WEBSITE;

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function readText(p)    { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

const now = new Date().toISOString();

// ── Source snapshots ────────────────────────────────────────────────────────
const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
const activeSessions = readJson(path.join(ROOT, 'portfolio', 'ACTIVE_SESSIONS.json'), null);
const launchMomentum = readText(path.join(ROOT, 'portfolio', 'LAUNCH_MOMENTUM.md'));
const contentPipeline = readText(path.join(ROOT, 'portfolio', 'CONTENT_PIPELINE.md'));
const revenueSignals = readText(path.join(ROOT, 'portfolio', 'REVENUE_SIGNALS.md'));
const revenueData = readJson(path.join(ROOT, 'portfolio', 'REVENUE_DATA.json'), { entries: [] });
const ignisCore = readText(path.join(ROOT, 'portfolio', 'IGNIS_CORE.md'));
const studioBrain = readText(path.join(ROOT, 'portfolio', 'STUDIO_BRAIN.md'));
const liveSurfaces = readJson(path.join(ROOT, 'portfolio', 'compiled', 'LIVE_SURFACES.json'), null);
const listingMetadata = readJson(path.join(ROOT, 'portfolio', 'compiled', 'LISTING_METADATA.json'), null);
const releaseGates = readJson(path.join(ROOT, 'portfolio', 'compiled', 'RELEASE_GATES.json'), null);
const rolloutScoreboard = readJson(path.join(ROOT, 'portfolio', 'compiled', 'ROLLOUT_SCOREBOARD.json'), null);
const feedbackDashboard = readJson(path.join(ROOT, 'portfolio', 'compiled', 'FEEDBACK_LOOP_DASHBOARD.json'), null);
const studioIdentityContracts = readJson(path.join(ROOT, 'portfolio', 'compiled', 'STUDIO_IDENTITY_CONTRACTS.json'), null);
const projectMesh = readJson(path.join(ROOT, 'portfolio', 'compiled', 'PROJECT_MESH.json'), null);
const founderControlTower = readJson(path.join(ROOT, 'portfolio', 'compiled', 'FOUNDER_CONTROL_TOWER.json'), null);
const repoReadiness = readJson(path.join(ROOT, 'portfolio', 'compiled', 'REPO_READINESS.json'), null);
const launchMesh = readJson(path.join(ROOT, 'portfolio', 'compiled', 'LAUNCH_MESH.json'), null);
const founderDigest5 = readJson(path.join(ROOT, 'portfolio', 'compiled', 'FOUNDER_DIGEST_5.json'), null);
const studioOpsStatus = readJson(path.join(ROOT, 'context', 'PROJECT_STATUS.json'), {});

// ── Hub feed ────────────────────────────────────────────────────────────────
function buildHubFeed() {
  const projects = (registry.projects || []).map(p => ({
    slug: p.slug,
    name: p.name,
    vaultStatus: p.vaultStatus,
    status: p.status,
    medium: p.medium,
    audience: p.audience,
    health: p.health,
    priority: p.priority,
    currentFocus: p.currentFocus,
    nextMilestone: p.nextMilestone,
    repo: p.repo,
    runtimeUrl: p.runtimeUrl,
    stagingUrl: p.stagingUrl,
    launchStatus: p.launchStatus,
    brandingCompliant: p.brandingCompliant,
  }));

  return {
    _schema: '1.1',
    _generatedAt: now,
    _consumer: 'studio-hub',
    _notes: 'Studio Hub cockpit feed. Projects ordered by priority × health.',
    portfolio: {
      totalProjects: projects.length,
      active: projects.filter(p => p.status === 'active' || p.status === 'live').length,
      sparked: projects.filter(p => p.vaultStatus === 'sparked').length,
      forge:   projects.filter(p => p.vaultStatus === 'forge').length,
      vaulted: projects.filter(p => p.vaultStatus === 'vaulted').length,
    },
    activeSessions: activeSessions ? {
      count: activeSessions.portfolio?.activeCount ?? 0,
      stale: activeSessions.portfolio?.staleLockCount ?? 0,
      conflicts: activeSessions.portfolio?.conflictCount ?? 0,
      recommendedNext: activeSessions.recommendedNextRepo?.slug ?? null,
      sessions: (activeSessions.activeSessions ?? []).map(s => ({
        slug: s.slug, ageHuman: s.ageHuman, agent: s.agent,
      })),
    } : null,
    liveSurfaces: liveSurfaces?.projects ?? null,
    listingMetadata: listingMetadata?.projects ?? null,
    releaseGates: releaseGates?.projects ?? null,
    rolloutScoreboard: rolloutScoreboard ?? null,
    feedbackLoop: feedbackDashboard?.studioSummary ?? null,
    studioIdentityContracts: studioIdentityContracts?.projects ?? null,
    projectMesh: projectMesh?.projects ?? null,
    founderControlTower: founderControlTower ?? null,
    repoReadiness: repoReadiness?.ranked ?? null,
    launchMesh: launchMesh?.projects ?? null,
    founderDigest: founderDigest5 ?? null,
    projects,
  };
}

// ── Social Dashboard feed ───────────────────────────────────────────────────
function buildSocialFeed() {
  // Parse LAUNCH_MOMENTUM.md for per-project draft status
  const momentumPerProject = {};
  const lm = launchMomentum.split(/^## /m).slice(1);
  for (const section of lm) {
    const firstLine = section.split('\n')[0].trim();
    const slug = firstLine.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) continue;
    const draftAgeMatch = section.match(/draft age[:\s]+(\d+)\s*d/i);
    const announcementMatch = section.match(/announcement[:\s]+([^\n·]+)/i);
    const audienceMatch = section.match(/audience[:\s]+([^\n·]+)/i);
    momentumPerProject[slug] = {
      draftAgeDays: draftAgeMatch ? parseInt(draftAgeMatch[1], 10) : null,
      announcementStatus: announcementMatch ? announcementMatch[1].trim() : null,
      audiencePrep: audienceMatch ? audienceMatch[1].trim() : null,
    };
  }

  // Cards per project
  const cards = (registry.projects || [])
    .filter(p => p.audience === 'public-live' || p.status === 'live' || p.launchStatus === 'announced' || p.launchStatus === 'deployed-unannounced')
    .map(p => {
      const m = momentumPerProject[p.slug] || {};
      return {
        slug: p.slug,
        name: p.name,
        medium: p.medium,
        vaultStatus: p.vaultStatus,
        launchStatus: p.launchStatus,
        runtimeUrl: p.runtimeUrl,
        repo: p.repo,
        announcementStatus: m.announcementStatus,
        draftAgeDays: m.draftAgeDays,
        urgencyTier: p.launchStatus === 'deployed-unannounced' ? 'high'
                   : p.launchStatus === 'announced' ? 'medium'
                   : 'low',
      };
    });

  // Growth-focus-of-day: pick the most urgent deployed-unannounced project with oldest draft
  const growthFocus = cards
    .filter(c => c.launchStatus === 'deployed-unannounced')
    .sort((a, b) => (b.draftAgeDays || 0) - (a.draftAgeDays || 0))[0] || null;

  return {
    _schema: '1.1',
    _generatedAt: now,
    _consumer: 'social-dashboard',
    _notes: 'Per-project growth cards + daily growth focus. Updated every 15 min.',
    growthFocusOfDay: growthFocus,
    cardCount: cards.length,
    cards,
    deployedUnannouncedCount: cards.filter(c => c.launchStatus === 'deployed-unannounced').length,
    projectMesh: projectMesh?.projects ?? null,
    launchMesh: launchMesh?.projects ?? null,
    repoReadiness: repoReadiness?.ranked ?? null,
    founderDigest: founderDigest5?.mustKnow ?? null,
  };
}

// ── Website feed ────────────────────────────────────────────────────────────
function buildWebsiteFeed() {
  const publicProjects = (registry.projects || [])
    .filter(p => p.audience === 'public-live' && p.status !== 'archived' && p.vaultStatus !== 'vaulted');

  const whatWeAreBuilding = publicProjects.map(p => ({
    slug: p.slug,
    name: p.name,
    medium: p.medium,
    vaultStatus: p.vaultStatus,
    runtimeUrl: p.runtimeUrl,
    oneLiner: p.summary || p.currentFocus,
    status: p.launchStatus,
  }));

  // Transparency surface: last 5 decisions + latest SIL average across portfolio
  const portfolioSilAvg = (() => {
    const scores = publicProjects
      .map(p => p.silScore)
      .filter(s => typeof s === 'number');
    if (!scores.length) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  })();

  return {
    _schema: '1.1',
    _generatedAt: now,
    _consumer: 'vaultsparkstudios.com',
    _notes: 'Public-safe feed. Sanitized — no internal strategy or CDR content.',
    brand: {
      name: 'VaultSpark Studios',
      canonicalUrl: 'https://vaultsparkstudios.com/',
      anchorText: 'VaultSpark Studios',
    },
    studioPulse: {
      activeProjects: publicProjects.length,
      portfolioSilAvg,
      lastUpdated: now,
    },
    whatWeAreBuilding,
    transparency: {
      brandingCompliantCount: publicProjects.filter(p => p.brandingCompliant).length,
      totalPublic: publicProjects.length,
    },
    publicLaunchFrontier: (launchMesh?.projects || [])
      .filter((item) => ['public-live', 'public-unlaunched', 'public-traction'].includes(item.audience))
      .slice(0, 8),
    leadMagnets: {
      _notes: 'Populated by SparkFunnel when lead magnets are generated.',
      active: [],
    },
  };
}

function buildConsumerAdoptionPack(hubFeed, socialFeed, websiteFeed) {
  return {
    _schema: '1.0',
    _generatedAt: now,
    _notes: 'Cross-consumer integration payload for downstream repos adopting S84 compiled Studio Ops surfaces.',
    surfaces: {
      studioIdentityContracts: 'portfolio/compiled/STUDIO_IDENTITY_CONTRACTS.json',
      projectMesh: 'portfolio/compiled/PROJECT_MESH.json',
      founderControlTower: 'portfolio/compiled/FOUNDER_CONTROL_TOWER.json',
      repoReadiness: 'portfolio/compiled/REPO_READINESS.json',
      launchMesh: 'portfolio/compiled/LAUNCH_MESH.json',
      founderDigest5: 'portfolio/compiled/FOUNDER_DIGEST_5.json',
    },
    consumers: {
      'studio-hub': {
        required: ['studioIdentityContracts', 'projectMesh', 'founderControlTower', 'repoReadiness', 'launchMesh', 'founderDigest5'],
        feed: hubFeed,
      },
      'social-dashboard': {
        required: ['projectMesh', 'repoReadiness', 'launchMesh', 'founderDigest5'],
        feed: socialFeed,
      },
      website: {
        required: ['studioIdentityContracts', 'launchMesh'],
        feed: websiteFeed,
      },
    },
  };
}

// ── Dispatch ───────────────────────────────────────────────────────────────
const feeds = {
  'HUB_FEED.json':               { build: buildHubFeed, flag: ONLY_HUB || runAll },
  'SOCIAL_DASHBOARD_FEED.json':  { build: buildSocialFeed, flag: ONLY_SOCIAL || runAll },
  'WEBSITE_FEED.json':           { build: buildWebsiteFeed, flag: ONLY_WEBSITE || runAll },
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const written = [];
const output = {};

for (const [file, cfg] of Object.entries(feeds)) {
  if (!cfg.flag) continue;
  const data = cfg.build();
  output[file] = data;

  if (!STDOUT_ONLY) {
    const target = path.join(OUT_DIR, file);
    fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
    written.push(target);
  }
}

if (runAll) {
  const adoptionPack = buildConsumerAdoptionPack(
    output['HUB_FEED.json'] || buildHubFeed(),
    output['SOCIAL_DASHBOARD_FEED.json'] || buildSocialFeed(),
    output['WEBSITE_FEED.json'] || buildWebsiteFeed(),
  );
  output['CONSUMER_ADOPTION_PACK.json'] = adoptionPack;

  if (!STDOUT_ONLY) {
    const target = path.join(OUT_DIR, 'CONSUMER_ADOPTION_PACK.json');
    fs.writeFileSync(target, JSON.stringify(adoptionPack, null, 2) + '\n');
    written.push(target);
  }
}

if (STDOUT_ONLY) {
  process.stdout.write(JSON.stringify(output, null, 2));
  process.exit(0);
}

for (const w of written) process.stdout.write(`✓ Wrote ${path.relative(ROOT, w)}\n`);
