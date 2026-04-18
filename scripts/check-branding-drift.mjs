#!/usr/bin/env node
/**
 * check-branding-drift.mjs
 *
 * Audits whether `brandingRequired` in PROJECT_REGISTRY matches the audience /
 * lifecycle-driven expectation from CANON-006.
 *
 * Canonical expectation:
 *   - required for public-facing audiences: public-live, public-unlaunched, public-traction
 *   - not required for internal, private-beta, internal-customer, archived, and studio website
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const SUMMARY_ONLY = args.includes('--summary');

const PUBLIC_AUDIENCES = new Set(['public-live', 'public-unlaunched', 'public-traction']);
const EXEMPT_SLUGS = new Set(['vaultsparkstudios-website']);

function shouldRequireBranding(project) {
  const audience = String(project.audience || '');
  const lifecycle = String(project.lifecycle || '');
  if (EXEMPT_SLUGS.has(project.slug)) return false;
  if (lifecycle === 'archived' || project.status === 'archived') return false;
  return PUBLIC_AUDIENCES.has(audience);
}

function recommendation(project, expected) {
  if (expected && project.brandingRequired !== true) {
    return 'Set brandingRequired=true and implement branding before release.';
  }
  if (!expected && project.brandingRequired === true) {
    return 'Set brandingRequired=false or reclassify the audience if this project is actually public-facing.';
  }
  return 'No action.';
}

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const rows = (registry.projects || []).map((project) => {
  const expected = shouldRequireBranding(project);
  const actual = project.brandingRequired === true;
  return {
    slug: project.slug,
    name: project.name,
    audience: project.audience || 'unknown',
    lifecycle: project.lifecycle || 'unknown',
    vaultStatus: project.vaultStatus || 'unknown',
    brandingRequired: project.brandingRequired ?? null,
    brandingCompliant: project.brandingCompliant ?? null,
    shouldBeRequired: expected,
    drift: actual !== expected,
    recommendation: recommendation(project, expected),
  };
});

const drifted = rows.filter((row) => row.drift);

if (JSON_MODE) {
  process.stdout.write(JSON.stringify({
    ok: drifted.length === 0,
    total: rows.length,
    drifted: drifted.length,
    rows,
  }, null, 2) + '\n');
  process.exit(drifted.length === 0 ? 0 : 1);
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  VaultSpark Studios — Branding Requirement Drift Audit');
console.log(`  Registry v${registry.schemaVersion} · ${rows.length} projects`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

if (drifted.length === 0) {
  console.log('  ✓ No branding-requirement drift detected.');
  console.log('');
  process.exit(0);
}

console.log(`  ⚠ ${drifted.length} project(s) have brandingRequired drift.`);
console.log('');

for (const row of drifted) {
  console.log(`  ✗ ${row.name}`);
  console.log(`      slug:              ${row.slug}`);
  console.log(`      audience/lifecycle ${row.audience} / ${row.lifecycle}`);
  console.log(`      vaultStatus:       ${row.vaultStatus}`);
  console.log(`      brandingRequired:  ${row.brandingRequired}`);
  console.log(`      shouldBeRequired:  ${row.shouldBeRequired}`);
  if (!SUMMARY_ONLY) {
    console.log(`      brandingCompliant: ${row.brandingCompliant}`);
    console.log(`      recommendation:    ${row.recommendation}`);
  }
  console.log('');
}

process.exit(1);
