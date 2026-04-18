#!/usr/bin/env node
// check-launch-ready.mjs — Portfolio-wide launch readiness reporter.
// Checks vaultStatus, branding, staging, launchStatus, liveUrl, and Stripe readiness.
//
// Usage:
//   node scripts/check-launch-ready.mjs              # all projects
//   node scripts/check-launch-ready.mjs --sparked    # SPARKED only
//   node scripts/check-launch-ready.mjs --project <slug>
//   node scripts/check-launch-ready.mjs --json       # machine-readable output

import fs from 'fs';
import path from 'path';
import { validateSlug } from './lib/validate.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));

const SPARKED_ONLY = process.argv.includes('--sparked');
const JSON_OUT     = process.argv.includes('--json');
const TARGET       = validateSlug('project', (() => { const i = process.argv.indexOf('--project'); return i >= 0 ? process.argv[i + 1] : null; })());

const CHECKS = {
  vaultStatus:      { label: 'Vault status set',        weight: 1 },
  liveUrl:          { label: 'liveUrl present',          weight: 2 },
  brandingCompliant:{ label: 'CANON-006 branding',      weight: 3 },
  staging:          { label: 'Staging env (CANON-007)',  weight: 2 },
  launchStatus:     { label: 'launchStatus set',         weight: 1 },
  stripeReady:      { label: 'Stripe ready',             weight: 2 },
};

const results = [];

for (const project of registry.projects) {
  if (project.status === 'archived') continue;
  if (TARGET && project.slug !== TARGET) continue;
  if (SPARKED_ONLY && project.vaultStatus !== 'SPARKED') continue;
  if (project.audience === 'internal') continue;

  const checks = {};
  const blockers = [];

  // Vault status
  checks.vaultStatus = !!project.vaultStatus;
  if (!checks.vaultStatus) blockers.push('vaultStatus missing');

  // Live URL (required for SPARKED)
  checks.liveUrl = !!project.liveUrl;
  if (!checks.liveUrl && project.vaultStatus === 'SPARKED') blockers.push('liveUrl missing (SPARKED — required)');

  // CANON-006 branding
  if (project.brandingRequired === false || project.audience === 'internal') {
    checks.brandingCompliant = true; // exempt
  } else {
    checks.brandingCompliant = project.brandingCompliant === true;
    if (!checks.brandingCompliant) blockers.push('CANON-006 branding not compliant');
  }

  // CANON-007 staging (required for SPARKED public)
  const needsStaging = project.vaultStatus === 'SPARKED' && project.audience !== 'internal';
  if (!needsStaging || project.stagingType === 'none' || !project.stagingType) {
    checks.staging = !needsStaging; // FORGE/VAULTED — not required
  } else {
    checks.staging = !!project.stagingUrl;
    if (!checks.staging) blockers.push('CANON-007 staging missing (SPARKED — required)');
  }

  // launchStatus
  checks.launchStatus = !!project.launchStatus;
  if (!checks.launchStatus) blockers.push('launchStatus field missing');

  // Stripe readiness (only relevant if revenueModel is not 'none')
  if (!project.revenueModel || project.revenueModel === 'none') {
    checks.stripeReady = true; // not applicable
  } else {
    checks.stripeReady = project.stripeReady === true;
    if (!checks.stripeReady) blockers.push('Stripe not ready (revenue model set)');
  }

  // Score
  const passed = Object.entries(checks).filter(([, v]) => v).length;
  const total  = Object.keys(checks).length;
  const score  = Math.round((passed / total) * 100);

  // Go/No-Go
  const criticalBlockers = blockers.filter(b => b.includes('SPARKED'));
  const goNoGo = project.vaultStatus === 'SPARKED'
    ? (criticalBlockers.length === 0 ? '✓ GO' : '⛔ NO-GO')
    : (score >= 80 ? '✓ READY' : score >= 50 ? '⚠ PARTIAL' : '○ NOT READY');

  results.push({ slug: project.slug, name: project.name, vaultStatus: project.vaultStatus, score, checks, blockers, goNoGo });
}

// Sort: SPARKED first, then by score desc
results.sort((a, b) => {
  if (a.vaultStatus === 'SPARKED' && b.vaultStatus !== 'SPARKED') return -1;
  if (b.vaultStatus === 'SPARKED' && a.vaultStatus !== 'SPARKED') return 1;
  return b.score - a.score;
});

if (JSON_OUT) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

// ── Human-readable report ─────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║  LAUNCH READINESS REPORT                             ║');
console.log(`╚══════════════════════════════════════════════════════╝  ${today}\n`);

// Summary line
const goCount    = results.filter(r => r.goNoGo.startsWith('✓')).length;
const noGoCount  = results.filter(r => r.goNoGo.startsWith('⛔')).length;
const warnCount  = results.filter(r => r.goNoGo.startsWith('⚠')).length;
console.log(`  ✓ Ready/GO: ${goCount}  ⚠ Partial: ${warnCount}  ⛔ Blocked: ${noGoCount}  (${results.length} public projects)\n`);

const STATUS_ICON = { SPARKED: '⚡', FORGE: '🔨', VAULTED: '📦' };

for (const r of results) {
  const icon = STATUS_ICON[r.vaultStatus] || '○';
  const bar  = '█'.repeat(Math.round(r.score / 10)) + '░'.repeat(10 - Math.round(r.score / 10));
  console.log(`  ${icon} ${r.name.padEnd(28)} ${bar} ${String(r.score).padStart(3)}%  ${r.goNoGo}`);
  if (r.blockers.length) {
    for (const b of r.blockers) console.log(`       ↳ ${b}`);
  }
}

// Highlight SPARKED projects needing immediate action
const sparkedBlocked = results.filter(r => r.vaultStatus === 'SPARKED' && r.goNoGo.startsWith('⛔'));
if (sparkedBlocked.length) {
  console.log('\n  ⛔ SPARKED PROJECTS WITH BLOCKERS — action required:');
  for (const r of sparkedBlocked) {
    console.log(`     ${r.name}: ${r.blockers.join(' · ')}`);
  }
}

// Identify FORGE projects closest to launch readiness
const nearReady = results.filter(r => r.vaultStatus === 'FORGE' && r.score >= 70).sort((a, b) => b.score - a.score);
if (nearReady.length) {
  console.log(`\n  🔨 FORGE projects near launch-ready (≥70%): ${nearReady.map(r => r.name).join(', ')}`);
}

console.log('');
