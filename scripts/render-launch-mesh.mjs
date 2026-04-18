#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { buildLaunchMesh, markdownTable, writeJson, writeText } from './lib/portfolio-surfaces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');
const payload = buildLaunchMesh(ROOT);

writeJson(path.join(ROOT, 'portfolio', 'compiled', 'LAUNCH_MESH.json'), payload);
writeText(
  path.join(ROOT, 'docs', 'LAUNCH_MESH.md'),
  [
    '# Launch Mesh',
    '',
    `> Generated: ${payload.generatedAt.slice(0, 10)}`,
    '',
    markdownTable(
      ['Slug', 'Status', 'Action', 'Urgency', 'Branding', 'Staging'],
      payload.projects.map((item) => [
        item.slug,
        item.launchStatus,
        item.action,
        String(item.urgency),
        String(item.brandingCompliant),
        item.stagingType,
      ]),
    ),
    '',
  ].join('\n'),
);

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else console.log('✓ Launch mesh → docs/LAUNCH_MESH.md');
