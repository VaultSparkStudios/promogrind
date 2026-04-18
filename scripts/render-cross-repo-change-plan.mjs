#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { buildCrossRepoPlan, markdownTable, writeJson, writeText } from './lib/portfolio-surfaces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');
const payload = buildCrossRepoPlan(ROOT);

writeJson(path.join(ROOT, 'portfolio', 'compiled', 'CROSS_REPO_CHANGE_PLAN.json'), payload);
writeText(
  path.join(ROOT, 'docs', 'CROSS_REPO_CHANGE_PLAN.md'),
  [
    '# Cross Repo Change Plan',
    '',
    `> Generated: ${payload.generatedAt.slice(0, 10)}`,
    '',
    '## Recommended Write Order',
    '',
    markdownTable(
      ['Step', 'Slug', 'Score', 'Lane', 'Why'],
      payload.recommendedWriteOrder.map((item) => [
        String(item.step),
        item.slug,
        String(item.score),
        item.lane,
        item.why,
      ]),
    ),
    '',
  ].join('\n'),
);

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else console.log('✓ Cross-repo change plan → docs/CROSS_REPO_CHANGE_PLAN.md');
