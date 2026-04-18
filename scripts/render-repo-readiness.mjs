#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { buildRepoReadiness, markdownTable, writeJson, writeText } from './lib/portfolio-surfaces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');
const payload = buildRepoReadiness(ROOT);

writeJson(path.join(ROOT, 'portfolio', 'compiled', 'REPO_READINESS.json'), payload);
writeText(
  path.join(ROOT, 'docs', 'REPO_READINESS.md'),
  [
    '# Repo Readiness',
    '',
    `> Generated: ${payload.generatedAt.slice(0, 10)}`,
    '',
    markdownTable(
      ['Rank', 'Slug', 'Score', 'Lane', 'Manifest', 'Runtime Pack'],
      payload.ranked.map((item) => [
        String(item.rank),
        item.slug,
        String(item.score),
        item.lane,
        String(item.manifest),
        String(item.runtimePack),
      ]),
    ),
    '',
  ].join('\n'),
);

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else console.log('✓ Repo readiness → docs/REPO_READINESS.md');
