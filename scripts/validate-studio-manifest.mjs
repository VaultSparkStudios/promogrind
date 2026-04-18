#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonOut = process.argv.includes('--json');
const targetPathArg = process.argv.includes('--path') ? process.argv[process.argv.indexOf('--path') + 1] : null;
const target = targetPathArg ? path.resolve(ROOT, targetPathArg) : path.join(ROOT, 'context', 'STUDIO_MANIFEST.json');

function readJson(filePath, fallback = null) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

const manifest = readJson(target);
const issues = [];

if (!manifest) {
  issues.push('STUDIO_MANIFEST.json unreadable or missing');
} else {
  if (manifest.schemaVersion !== '1.0') issues.push(`schemaVersion must be 1.0 (found ${manifest.schemaVersion ?? 'missing'})`);
  for (const key of ['identity', 'studioOs', 'listingMetadata', 'surfaces', 'capabilities', 'integrations', 'hosting', 'capacity', 'publicMetadata', 'automation', 'contracts']) {
    if (!(key in manifest)) issues.push(`missing top-level key: ${key}`);
  }

  const identity = manifest.identity ?? {};
  for (const key of ['slug', 'name', 'repo', 'owner', 'type', 'lifecycle', 'audience', 'vaultStatus']) {
    if (!identity[key]) issues.push(`identity.${key} missing`);
  }

  const listing = manifest.listingMetadata ?? {};
  if (!listing.canonicalSummary) issues.push('listingMetadata.canonicalSummary missing');
  if (!Array.isArray(listing.tags)) issues.push('listingMetadata.tags must be an array');
  if (!Array.isArray(listing.categories)) issues.push('listingMetadata.categories must be an array');

  const hosting = manifest.hosting ?? {};
  if (!('liveUrl' in hosting)) issues.push('hosting.liveUrl missing');
  if (!('stagingUrl' in hosting)) issues.push('hosting.stagingUrl missing');
  if (!Array.isArray(hosting.testInstructions)) issues.push('hosting.testInstructions must be an array');

  const publicMetadata = manifest.publicMetadata ?? {};
  for (const key of ['privateByDefault', 'publicReady', 'publicRepoSanitized', 'brandingRequired', 'websiteListingRequired']) {
    if (!(key in publicMetadata)) issues.push(`publicMetadata.${key} missing`);
  }

  const contracts = manifest.contracts ?? {};
  for (const key of ['hub', 'websitePublic', 'socialDashboard', 'sparkFunnel', 'ignis']) {
    if (!contracts[key]) issues.push(`contracts.${key} missing`);
  }
}

if (jsonOut) {
  console.log(JSON.stringify({
    manifestPath: path.relative(ROOT, target).replace(/\\/g, '/'),
    valid: issues.length === 0,
    issues,
  }, null, 2));
  process.exit(issues.length === 0 ? 0 : 1);
}

if (issues.length === 0) {
  console.log(`✓ STUDIO_MANIFEST valid · ${path.relative(ROOT, target).replace(/\\/g, '/')}`);
  process.exit(0);
}

console.error(`✗ STUDIO_MANIFEST invalid · ${path.relative(ROOT, target).replace(/\\/g, '/')}`);
for (const issue of issues) console.error(`  - ${issue}`);
process.exit(1);
