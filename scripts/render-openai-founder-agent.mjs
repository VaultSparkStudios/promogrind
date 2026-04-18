#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_MD = path.join(ROOT, 'docs', 'OPENAI_FOUNDER_AGENT.md');
const OUT_JSON = path.join(ROOT, 'portfolio', 'compiled', 'OPENAI_FOUNDER_AGENT.json');
const jsonMode = process.argv.includes('--json');

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

const founderControl = readJson(path.join(ROOT, 'portfolio', 'compiled', 'FOUNDER_CONTROL.json'), {});
const runtimeProfiles = readJson(path.join(ROOT, 'portfolio', 'compiled', 'RUNTIME_PROFILES.json'), { profiles: [] });
const codexLane = readJson(path.join(ROOT, 'portfolio', 'compiled', 'CODEX_WORKER_LANE.json'), {});

const systemPrompt = [
  'You are the Founder Control Agent for VaultSpark Studio OS.',
  'Your job is to turn portfolio truth into one compact ranked action board for the founder.',
  'Never invent project state. Prefer Studio Ops MCP tools and compiled Studio Ops artifacts over freeform reasoning.',
  'Return four lanes only: do_now, delegate_to_codex, owner_only, auto_run.',
  'Delegate to Codex only for bounded implementation, repair, review, or contract-refresh work.',
  'Do not classify Claude-native skill ownership as Codex work.',
  'Escalate owner-only work only when the blocker is genuinely founder-side after preflight.',
  'Keep output terse, ranked, and structured.',
].join(' ');

const outputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    do_now: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      title: { type: 'string' }, why: { type: 'string' }, action: { type: 'string' }
    }, required: ['title', 'why', 'action'] } },
    delegate_to_codex: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      title: { type: 'string' }, why: { type: 'string' }, action: { type: 'string' }
    }, required: ['title', 'why', 'action'] } },
    owner_only: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      title: { type: 'string' }, why: { type: 'string' }, action: { type: 'string' }
    }, required: ['title', 'why', 'action'] } },
    auto_run: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      title: { type: 'string' }, why: { type: 'string' }, action: { type: 'string' }
    }, required: ['title', 'why', 'action'] } },
  },
  required: ['summary', 'do_now', 'delegate_to_codex', 'owner_only', 'auto_run'],
};

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'render-openai-founder-agent.mjs',
  purpose: 'OpenAI Founder Control Agent scaffold for Responses API or Agents SDK',
  recommendedRuntime: {
    primary: 'Responses API',
    secondary: 'Agents SDK',
    notes: 'Use MCP tools for studio truth. Use structured outputs. Keep Codex as bounded worker lane.',
  },
  modelPolicy: {
    defaultModelEnv: 'OPENAI_FOUNDER_MODEL',
    recommendedReasoning: 'medium',
    fallback: 'set model at runtime rather than hardcoding in repo truth',
  },
  inputs: {
    founderControlArtifact: founderControl,
    runtimeProfilesArtifact: runtimeProfiles,
    codexWorkerLaneArtifact: codexLane,
  },
  toolContract: [
    { name: 'studio_founder_control', required: true, format: 'json' },
    { name: 'studio_runtime_profiles', required: true, format: 'json' },
    { name: 'studio_codex_worker_lane', required: true, format: 'json' },
    { name: 'studio_portfolio_summary', required: false, format: 'text' },
    { name: 'ignis_rank', required: false, format: 'json', note: 'future live IGNIS MCP binding' },
  ],
  systemPrompt,
  outputSchema,
  responsesApiScaffold: {
    api: 'responses.create',
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate the current founder action board from Studio Ops MCP and return structured output.' },
    ],
    tools: [
      { type: 'mcp', server_label: 'studio-ops', tool_name: 'studio_founder_control' },
      { type: 'mcp', server_label: 'studio-ops', tool_name: 'studio_runtime_profiles' },
      { type: 'mcp', server_label: 'studio-ops', tool_name: 'studio_codex_worker_lane' },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'founder_control_board',
        schema: outputSchema,
      },
    },
  },
  agentsSdkScaffold: {
    agentName: 'founder-control-agent',
    role: 'founder control plane orchestrator',
    handoffPolicy: [
      'delegate implementation/review/repair work to Codex lane only',
      'keep founder-only blockers in owner_only',
      'prefer auto_run for deterministic refreshes',
    ],
  },
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const lines = [
  '# OpenAI Founder Control Agent',
  '',
  `> Generated: ${payload.generatedAt.slice(0, 10)}`,
  '',
  '## Purpose',
  '',
  payload.purpose,
  '',
  '## Runtime',
  '',
  `- Primary: ${payload.recommendedRuntime.primary}`,
  `- Secondary: ${payload.recommendedRuntime.secondary}`,
  `- Notes: ${payload.recommendedRuntime.notes}`,
  '',
  '## Tool Contract',
  '',
  ...payload.toolContract.map((tool) => `- **${tool.name}** — ${tool.required ? 'required' : 'optional'} · format ${tool.format}${tool.note ? ` · ${tool.note}` : ''}`),
  '',
  '## System Prompt',
  '',
  payload.systemPrompt,
  '',
  '## Output Lanes',
  '',
  '- `do_now`',
  '- `delegate_to_codex`',
  '- `owner_only`',
  '- `auto_run`',
  '',
  '## Responses API Scaffold',
  '',
  'Use `portfolio/compiled/OPENAI_FOUNDER_AGENT.json` as the machine-readable source for prompt, tool contract, and output schema.',
  '',
];

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + '\n');
fs.writeFileSync(OUT_MD, lines.join('\n'));
console.log('✓ OpenAI Founder Agent → docs/OPENAI_FOUNDER_AGENT.md');
