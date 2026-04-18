#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_MD = path.join(ROOT, 'docs', 'CODEX_WORKER_LANE.md');
const OUT_JSON = path.join(ROOT, 'portfolio', 'compiled', 'CODEX_WORKER_LANE.json');
const jsonMode = process.argv.includes('--json');

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'render-codex-worker-lane.mjs',
  principle: 'Codex is a bounded execution and review worker under Studio OS, not a separate protocol authority.',
  preferredWork: [
    'bounded refactors',
    'rollout repair',
    'PR review sweeps',
    'contract refreshes',
    'test failure triage',
    'implementation spikes with clear write scope',
  ],
  avoidAsPrimaryOwner: [
    'protocol authority',
    'source-of-truth decisions without write-back',
    'founder-only blocker classification without MCP/context',
    'Claude-native skill ownership',
  ],
  runbook: [
    { step: 1, title: 'Load shared truth', command: 'read AGENTS.md + docs/SESSION_PROTOCOL.md + context/AGENT_STATE.json' },
    { step: 2, title: 'Take one bounded lane', command: 'bounded repair / review / implementation only' },
    { step: 3, title: 'Write back to repo truth', command: 'update TASK_BOARD / CURRENT_STATE / LATEST_HANDOFF when work changes truth' },
    { step: 4, title: 'Do not fork protocol behavior', command: 'treat slash-prefixed commands as text; shared protocol stays canonical' },
  ],
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const lines = [
  '# Codex Worker Lane',
  '',
  `> Generated: ${payload.generatedAt.slice(0, 10)}`,
  '',
  payload.principle,
  '',
  '## Preferred Work',
  '',
  ...payload.preferredWork.map((item) => `- ${item}`),
  '',
  '## Avoid As Primary Owner',
  '',
  ...payload.avoidAsPrimaryOwner.map((item) => `- ${item}`),
  '',
  '## Runbook',
  '',
  ...payload.runbook.map((item) => `- **${item.step}. ${item.title}** — \`${item.command}\``),
  '',
];

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + '\n');
fs.writeFileSync(OUT_MD, lines.join('\n'));
console.log('✓ Codex worker lane → docs/CODEX_WORKER_LANE.md');
