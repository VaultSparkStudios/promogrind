#!/usr/bin/env node
// check-stripe-readiness.mjs — Report Stripe integration status across all projects
// Usage: node scripts/check-stripe-readiness.mjs

import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = join(__dirname, '../portfolio/PROJECT_REGISTRY.json');
const statusPath = join(__dirname, '../context/PROJECT_STATUS.json');

function readProjects() {
  if (existsSync(registryPath)) {
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    return {
      schemaVersion: registry.schemaVersion,
      source: 'portfolio/PROJECT_REGISTRY.json',
      projects: registry.projects.filter(p => p.status !== 'archived'),
    };
  }

  if (existsSync(statusPath)) {
    const status = JSON.parse(readFileSync(statusPath, 'utf8'));
    return {
      schemaVersion: status.schemaVersion ?? 'project-status',
      source: 'context/PROJECT_STATUS.json',
      projects: [status].filter(p => p.status !== 'archived'),
    };
  }

  throw new Error('Missing portfolio/PROJECT_REGISTRY.json and context/PROJECT_STATUS.json');
}

const registry = readProjects();
const projects = registry.projects;

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

console.log(`\n${BOLD}Stripe Readiness Report — VaultSpark Studios${RESET}`);
console.log(`Source: ${registry.source} · v${registry.schemaVersion} · ${projects.length} active projects\n`);

let readyCount = 0, configuredCount = 0, revenueCount = 0;

const rows = projects.map(p => {
  const hasRevenue = p.revenueModel && p.revenueModel !== 'none';
  const ready = p.stripeReady === true;
  const configured = p.stripeLiveKeyConfigured === true;
  const priceCount = (p.stripeProductionPriceIds || []).length;

  if (hasRevenue) revenueCount++;
  if (ready) readyCount++;
  if (configured) configuredCount++;

  let status;
  if (configured && ready) status = `${GREEN}✓ LIVE${RESET}`;
  else if (ready && !configured) status = `${YELLOW}⚠ READY — needs keys${RESET}`;
  else if (hasRevenue && !ready) status = `${YELLOW}→ HAS REVENUE MODEL — not yet wired${RESET}`;
  else status = `${DIM}— no revenue${RESET}`;

  const vaultStatus = String(p.vaultStatus || p.status || 'unknown');
  const audience = String(p.audience || '');
  const sparked = vaultStatus.toLowerCase() === 'sparked' && audience.includes('public');
  const flag = sparked && ready && !configured ? `${RED}⛔ SPARKED+PUBLIC — missing live keys${RESET}` : '';

  return { name: p.name, vaultStatus, revenueModel: p.revenueModel || 'none', status, priceCount, flag };
});

// Print table
const nameW = Math.max(...rows.map(r => r.name.length), 10);
console.log(`${'Project'.padEnd(nameW)}  ${'Status'.padEnd(8)}  ${'Revenue Model'.padEnd(14)}  Prices  Flag`);
console.log('─'.repeat(nameW + 55));
for (const r of rows) {
  const flag = r.flag ? `  ${r.flag}` : '';
  console.log(`${r.name.padEnd(nameW)}  ${r.vaultStatus.padEnd(8)}  ${r.revenueModel.padEnd(14)}  ${String(r.priceCount).padEnd(6)}  ${r.status}${flag}`);
}

console.log(`\n${BOLD}Summary${RESET}`);
console.log(`  Projects with revenue model : ${revenueCount}`);
console.log(`  Stripe-ready (wired)        : ${readyCount}`);
console.log(`  Live keys configured        : ${configuredCount}`);

const blockers = rows.filter(r => r.flag);
if (blockers.length > 0) {
  console.log(`\n${RED}${BOLD}BLOCKERS (SPARKED+PUBLIC without live keys):${RESET}`);
  blockers.forEach(b => console.log(`  ${b.name}`));
  process.exit(1);
}

console.log(`\n${GREEN}No Stripe blockers detected.${RESET}\n`);
