#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { buildCredentialAging, markdownTable, writeJson, writeText } from './lib/portfolio-surfaces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');
const payload = buildCredentialAging(ROOT);

writeJson(path.join(ROOT, 'portfolio', 'compiled', 'CREDENTIAL_AGING_DASHBOARD.json'), payload);
writeText(
  path.join(ROOT, 'docs', 'CREDENTIAL_AGING_DASHBOARD.md'),
  [
    '# Credential Aging Dashboard',
    '',
    `> Generated: ${payload.generatedAt.slice(0, 10)}`,
    '',
    markdownTable(
      ['Capability', 'Ready', 'Freshness', 'Age Days', 'Missing'],
      payload.capabilities.map((item) => [
        item.capability,
        String(item.ready),
        item.freshness,
        String(item.ageDays ?? 'n/a'),
        item.missingEnv.join(', ') || 'none',
      ]),
    ),
    '',
  ].join('\n'),
);

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else console.log('✓ Credential aging dashboard → docs/CREDENTIAL_AGING_DASHBOARD.md');
