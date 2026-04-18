#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { buildIdentityContracts, markdownTable, writeJson, writeText } from './lib/portfolio-surfaces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');
const payload = buildIdentityContracts(ROOT);

writeJson(path.join(ROOT, 'portfolio', 'compiled', 'STUDIO_IDENTITY_CONTRACTS.json'), payload);

const rows = payload.projects.map((project) => [
  project.slug,
  project.vaultStatus,
  project.audience,
  String(project.readiness.score),
  project.urls.live || 'none',
  project.brand.required ? String(project.brand.compliant) : 'n/a',
]);

const md = [
  '# Studio Identity Contracts',
  '',
  `> Generated: ${payload.generatedAt.slice(0, 10)} · consumers: ${payload.consumers.join(', ')}`,
  '',
  markdownTable(['Slug', 'Vault', 'Audience', 'Readiness', 'Live URL', 'Branding'], rows),
  '',
].join('\n');

writeText(path.join(ROOT, 'docs', 'STUDIO_IDENTITY_CONTRACTS.md'), md);

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log('✓ Studio identity contracts → docs/STUDIO_IDENTITY_CONTRACTS.md');
}
