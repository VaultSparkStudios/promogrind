#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { buildSecurityPolicy, markdownTable, writeJson, writeText } from './lib/portfolio-surfaces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');
const payload = buildSecurityPolicy(ROOT);

writeJson(path.join(ROOT, 'portfolio', 'compiled', 'SECURITY_POLICY_ENGINE.json'), payload);

const tiers = markdownTable(
  ['Tier', 'Risk', 'Policy'],
  payload.trustTiers.map((tier) => [tier.tier, tier.risk, tier.approvalPolicy]),
);
const freshness = markdownTable(
  ['Capability', 'Freshness', 'Ready', 'Age Days'],
  payload.credentialFreshness.map((item) => [
    item.capability,
    item.freshness,
    String(item.ready),
    String(item.ageDays ?? 'n/a'),
  ]),
);

writeText(
  path.join(ROOT, 'docs', 'SECURITY_POLICY_ENGINE.md'),
  [
    '# Security Policy Engine',
    '',
    `> Generated: ${payload.generatedAt.slice(0, 10)}`,
    '',
    '## Trust Tiers',
    '',
    tiers,
    '',
    '## Credential Freshness',
    '',
    freshness,
    '',
  ].join('\n'),
);

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else console.log('✓ Security policy engine → docs/SECURITY_POLICY_ENGINE.md');
