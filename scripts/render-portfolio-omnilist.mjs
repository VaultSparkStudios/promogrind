#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { buildOmnilistRanked, markdownTable, writeJson, writeText } from './lib/portfolio-surfaces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');
const payload = await buildOmnilistRanked(ROOT);

writeJson(path.join(ROOT, 'portfolio', 'compiled', 'PORTFOLIO_OMNILIST.json'), payload);
writeText(
  path.join(ROOT, 'docs', 'PORTFOLIO_OMNILIST.md'),
  [
    '# Portfolio Omnilist',
    '',
    `> Generated: ${payload.generatedAt.slice(0, 10)} · ranking mode: ${payload.rankingMode}`,
    '',
    markdownTable(
      ['Type', 'Category', 'Item', 'Score', 'Action'],
      payload.items.map((item) => [item.type, item.category, item.title, String(item.score), item.action]),
    ),
    '',
  ].join('\n'),
);

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else console.log(`✓ Portfolio Omnilist → docs/PORTFOLIO_OMNILIST.md  (ranking: ${payload.rankingMode})`);
