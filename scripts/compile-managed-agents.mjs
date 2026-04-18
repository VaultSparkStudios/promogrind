#!/usr/bin/env node
/**
 * scripts/compile-managed-agents.mjs — DNA → Anthropic Managed Agent YAML
 *
 * For every agents/dna/*.json with runtime=claude-managed, emit a ready-to-sync
 * YAML spec at agents/managed/<call_sign>.agent.yaml. Spec shape matches the
 * `ant beta:agents update` input format.
 *
 * The system prompt is synthesized from DNA fields: identity + role + personality
 * + guardrails + tool access. Trust tier is encoded in both the prompt AND the
 * tool allowlist (since MCP-layer enforcement is the real gate).
 *
 * Usage:
 *   node scripts/compile-managed-agents.mjs
 *   node scripts/compile-managed-agents.mjs --agent sentinel
 *
 * Output is deterministic — idempotent compile is safe to run in CI.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODELS } from './lib/model-router.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DNA_DIR = path.join(REPO_ROOT, 'agents', 'dna');
const OUT_DIR = path.join(REPO_ROOT, 'agents', 'managed');

// Model selection routes through the studio-wide chokepoint (scripts/lib/model-router.mjs).
// Anthropic's Managed Agent spec stores the model as a config field — not an inference
// call — but sourcing the ID from the router keeps studio-wide model upgrades in one place.
const MODEL_BY_TIER = {
  observer: MODELS.haiku,
  proposer: MODELS.sonnet,
  executor: MODELS.sonnet,
  autopilot: MODELS.opus,
};

function buildSystemPrompt(dna) {
  const p = dna.personality;
  const g = dna.guardrails;
  const lines = [
    `You are ${dna.identity.name} — call-sign \`${dna.identity.call_sign}\`.`,
    `Role: ${dna.role.title}.`,
    `Mission: ${dna.role.mission_one_line}`,
    '',
    `# Voice & personality`,
    `- Tone: ${p.tone}`,
    `- Humor level: ${p.humor_level}/5`,
    `- Verbosity: ${p.verbosity}/5`,
    ...(p.voice_examples?.length ? [`- Voice examples:`, ...p.voice_examples.map(v => `    • ${v}`)] : []),
    ...(p.decision_bias?.length ? [`- Decision bias: ${p.decision_bias.join(' · ')}`] : []),
    ...(p.never_say?.length ? [`- Never say: ${p.never_say.map(s => `"${s}"`).join(', ')}`] : []),
    ...(p.always_say?.length ? [`- Always: ${p.always_say.join(' · ')}`] : []),
    '',
    `# Scope`,
    dna.role.scope_statement || '(scope inherited from role)',
    '',
    `# Hard rules — enforced at MCP layer`,
    `- Trust tier: ${dna.trust_tier}. Attempting out-of-tier actions will be rejected by the MCP gateway.`,
    `- Scope cap per run: ${g.scope_cap_per_run} tool calls. Plan accordingly.`,
    `- Budget ceiling: $${g.budget_ceiling_usd_per_day}/day. Budget Warden will pause you at 150%.`,
    ...(g.no_commit_scopes?.length ? [`- Never commit to: ${g.no_commit_scopes.join(', ')}`] : []),
    ...(g.confirmation_required?.length ? [`- Require explicit founder confirmation for: ${g.confirmation_required.join(', ')}`] : []),
    '',
    `# Output`,
    `- Be ${p.verbosity <= 1 ? 'extremely concise' : p.verbosity <= 2 ? 'concise' : 'thorough but focused'}.`,
    `- Lead with the signal, not the process.`,
    `- When you have no action to take, say so and stop.`,
  ];
  return lines.join('\n');
}

function toYaml(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string') {
    if (obj.includes('\n')) {
      return `|\n${obj.split('\n').map(l => `${pad}  ${l}`).join('\n')}`;
    }
    if (/[:#&*!|>'"%@`]/.test(obj)) return JSON.stringify(obj);
    // Quote strings that would re-parse as boolean/null/number
    if (/^(true|false|null|yes|no|on|off|~)$/i.test(obj) || /^-?\d+(\.\d+)?$/.test(obj) || obj === '') {
      return JSON.stringify(obj);
    }
    return obj;
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return '\n' + obj.map(item => {
      if (typeof item === 'object' && item !== null) {
        const nested = toYaml(item, indent + 1);
        return `${pad}- ${nested.trimStart()}`;
      }
      return `${pad}- ${toYaml(item, indent + 1)}`;
    }).join('\n');
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';
    const body = entries.map(([k, v]) => {
      const val = toYaml(v, indent + 1);
      if (val.startsWith('\n')) return `${pad}${k}:${val}`;
      if (val.startsWith('|\n')) return `${pad}${k}: ${val}`;
      return `${pad}${k}: ${val}`;
    }).join('\n');
    return indent > 0 ? '\n' + body : body;
  }
  return String(obj);
}

function compileOne(dna) {
  const model = MODEL_BY_TIER[dna.trust_tier];
  // MCP tool access is attached after the public studio-ops-mcp endpoint
  // deploys (TASK_BOARD #133). Until then, agents register with the default
  // toolset only, and the per-agent tool allowlist lives in metadata so an
  // update call can reattach them as mcp_servers[] entries later.
  const spec = {
    name: dna.identity.name,
    description: dna.role.mission_one_line,
    model,
    system: buildSystemPrompt(dna),
    tools: [
      { type: 'agent_toolset_20260401' },
    ],
    // Anthropic metadata values must all be strings (max 512 chars each).
    metadata: {
      call_sign: String(dna.identity.call_sign),
      trust_tier: String(dna.trust_tier),
      category: String(dna.role.category || 'other'),
      dna_source: `agents/dna/${dna.identity.call_sign}.json`,
      vorn_public: dna.vorn_public === true ? 'true' : 'false',
      mcp_tools_pending: (dna.tools || []).join(',') || 'none',
    },
  };
  return spec;
}

function main() {
  const argv = process.argv.slice(2);
  const filter = argv.includes('--agent') ? argv[argv.indexOf('--agent') + 1] : null;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const dnaFiles = fs.readdirSync(DNA_DIR).filter(f => f.endsWith('.json'));
  let compiled = 0;
  let skipped = 0;

  for (const f of dnaFiles) {
    const dna = JSON.parse(fs.readFileSync(path.join(DNA_DIR, f), 'utf8'));
    if (dna.runtime !== 'claude-managed') { skipped++; continue; }
    if (filter && dna.identity.call_sign !== filter) { skipped++; continue; }

    const spec = compileOne(dna);
    const outFile = path.join(OUT_DIR, `${dna.identity.call_sign}.agent.yaml`);
    const header = [
      `# Compiled from agents/dna/${dna.identity.call_sign}.json — do not edit by hand.`,
      `# Regenerate: node scripts/compile-managed-agents.mjs --agent ${dna.identity.call_sign}`,
      `# Sync:      ant beta:agents update --agent-id <id> < ${path.relative(REPO_ROOT, outFile).replace(/\\/g, '/')}`,
      '',
    ].join('\n');
    fs.writeFileSync(outFile, header + toYaml(spec) + '\n');
    compiled++;
    console.log(`  ✓ ${path.relative(REPO_ROOT, outFile)}  (${dna.trust_tier} · ${spec.model})`);
  }
  console.log(`\n✓ compile-managed-agents · ${compiled} compiled · ${skipped} skipped (non-managed or filtered)`);
}

main();
