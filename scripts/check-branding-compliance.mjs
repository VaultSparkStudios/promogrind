#!/usr/bin/env node
/**
 * check-branding-compliance.mjs
 * Reports which public-facing VaultSpark Studios projects are missing branding compliance.
 * Reads portfolio/PROJECT_REGISTRY.json — no network calls, no file system writes.
 *
 * Usage:
 *   node scripts/check-branding-compliance.mjs
 *   node scripts/check-branding-compliance.mjs --summary
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = resolve(__dirname, '../portfolio/PROJECT_REGISTRY.json');

const summaryOnly = process.argv.includes('--summary');

let registry;
try {
  registry = JSON.parse(readFileSync(registryPath, 'utf8'));
} catch (err) {
  console.error(`Error reading PROJECT_REGISTRY.json: ${err.message}`);
  process.exit(1);
}

const projects = registry.projects ?? [];

const required   = projects.filter(p => p.brandingRequired === true);
const compliant  = required.filter(p => p.brandingCompliant === true);
const nonCompliant = required.filter(p => p.brandingCompliant !== true);
const exempt     = projects.filter(p => p.brandingRequired === false || p.brandingRequired === undefined);

const total = projects.length;
const pct   = required.length > 0
  ? Math.round((compliant.length / required.length) * 100)
  : 100;

// ─── Output ───────────────────────────────────────────────────────────────────

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  VaultSpark Studios — Branding Compliance Check');
console.log(`  Registry v${registry.schemaVersion} · ${total} projects · ${new Date().toISOString().slice(0,10)}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log(`  Required:     ${required.length}`);
console.log(`  Compliant:    ${compliant.length}  (${pct}%)`);
console.log(`  Non-compliant: ${nonCompliant.length}`);
console.log(`  Exempt:       ${exempt.length}`);
console.log('');

if (nonCompliant.length === 0) {
  console.log('  ✓ All public-facing projects are branding compliant.');
  console.log('');
  process.exit(0);
}

if (summaryOnly) {
  console.log(`  ⚠ ${nonCompliant.length} project(s) need branding: ${nonCompliant.map(p => p.name).join(', ')}`);
  console.log('');
  process.exit(1);
}

console.log('  ⚠ NON-COMPLIANT — branding not yet implemented:');
console.log('');

for (const p of nonCompliant) {
  const url = p.runtimeUrl || '(no runtimeUrl yet)';
  console.log(`  ✗ ${p.name}`);
  console.log(`      slug:     ${p.slug}`);
  console.log(`      medium:   ${p.medium}`);
  console.log(`      audience: ${p.audience}`);
  console.log(`      url:      ${url}`);
  console.log(`      repo:     ${p.repo}`);
  console.log('');
}

if (compliant.length > 0) {
  console.log('  ✓ COMPLIANT:');
  for (const p of compliant) {
    console.log(`    ✓ ${p.name}`);
  }
  console.log('');
}

console.log('  HOW TO FIX:');
console.log('  See docs/BRANDING_PROTOCOL.md for implementation guidance.');
console.log('  Add "Powered by VaultSpark Studios" + link to https://vaultsparkstudios.com/');
console.log('  Then set brandingCompliant: true in portfolio/PROJECT_REGISTRY.json.');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

process.exit(nonCompliant.length > 0 ? 1 : 0);
