#!/usr/bin/env node
/**
 * scripts/render-agent-roster.mjs — roster cockpit renderer
 *
 * Reads agents/dna/*.json + optional portfolio/AGENT_COSTS.json telemetry.
 * Writes portfolio/AGENT_ROSTER.md with personality cards + status + cost.
 *
 * Also emits portfolio/compiled/AGENT_ROSTER.json for Hub consumption.
 *
 * Usage:
 *   node scripts/render-agent-roster.mjs
 *   node scripts/render-agent-roster.mjs --json-only
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DNA_DIR = path.join(REPO_ROOT, 'agents', 'dna');
const COST_FILE = path.join(REPO_ROOT, 'portfolio', 'AGENT_COSTS.json');
const ROSTER_MD = path.join(REPO_ROOT, 'portfolio', 'AGENT_ROSTER.md');
const ROSTER_JSON = path.join(REPO_ROOT, 'portfolio', 'compiled', 'AGENT_ROSTER.json');

const TIER_ORDER = { observer: 0, proposer: 1, executor: 2, autopilot: 3 };
const TIER_ICON = { observer: '👁', proposer: '✍', executor: '⚙', autopilot: '🚀' };
const STATUS_ICON = { draft: '○', staged: '◐', live: '●', paused: '⏸', retired: '✕' };

function loadDnas() {
  if (!fs.existsSync(DNA_DIR)) return [];
  return fs.readdirSync(DNA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(DNA_DIR, f), 'utf8')));
}

function loadCosts() {
  if (!fs.existsSync(COST_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(COST_FILE, 'utf8')).agents || {}; }
  catch { return {}; }
}

function renderCard(dna, costs) {
  const c = dna.identity.call_sign;
  const cost = costs[c] || {};
  const spendToday = cost.cost_today_usd ?? 0;
  const cap = dna.guardrails.budget_ceiling_usd_per_day;
  const spendPct = cap > 0 ? Math.round((spendToday / cap) * 100) : 0;
  const budgetBar = renderBar(spendPct, 10);
  const pubFlag = dna.vorn_public ? ` · 🌐 [@${dna.vorn_profile?.handle}](${dna.vorn_profile?.profile_url})` : ' · 🔒 internal';
  const cadence = dna.cadence?.trigger === 'cron' ? `cron \`${dna.cadence.schedule}\`` : (dna.cadence?.trigger || 'manual');

  return [
    `### ${STATUS_ICON[dna.status || 'draft']} ${dna.identity.name}  \`${c}\``,
    '',
    `> ${dna.identity.voice_sample || dna.role.mission_one_line}`,
    '',
    `| | |`,
    `|---|---|`,
    `| **Role** | ${dna.role.title} |`,
    `| **Mission** | ${dna.role.mission_one_line} |`,
    `| **Trust** | ${TIER_ICON[dna.trust_tier]} ${dna.trust_tier} |`,
    `| **Runtime** | \`${dna.runtime}\` |`,
    `| **Cadence** | ${cadence} |`,
    `| **Tone** | ${dna.personality.tone} · humor ${dna.personality.humor_level}/5 · verbosity ${dna.personality.verbosity}/5 |`,
    `| **Budget** | $${spendToday.toFixed(2)} / $${cap.toFixed(2)}/day  ${budgetBar} ${spendPct}% |`,
    `| **Visibility** | ${dna.status || 'draft'}${pubFlag} |`,
    '',
  ].join('\n');
}

function renderBar(pct, width) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  const warn = clamped > 100 ? '⚠' : clamped > 80 ? '!' : '';
  return `\`${'█'.repeat(filled)}${'░'.repeat(width - filled)}\` ${warn}`;
}

function main() {
  const dnas = loadDnas();
  const costs = loadCosts();
  const jsonOnly = process.argv.includes('--json-only');

  dnas.sort((a, b) => {
    const ta = TIER_ORDER[a.trust_tier] ?? 99;
    const tb = TIER_ORDER[b.trust_tier] ?? 99;
    if (ta !== tb) return ta - tb;
    return a.identity.name.localeCompare(b.identity.name);
  });

  // Write JSON cockpit
  fs.mkdirSync(path.dirname(ROSTER_JSON), { recursive: true });
  const compiled = {
    _generatedAt: new Date().toISOString(),
    _schemaVersion: '1.0',
    agents: dnas.map(d => ({
      call_sign: d.identity.call_sign,
      name: d.identity.name,
      title: d.role.title,
      category: d.role.category,
      trust_tier: d.trust_tier,
      runtime: d.runtime,
      status: d.status || 'draft',
      cadence: d.cadence,
      vorn_public: d.vorn_public === true,
      vorn_handle: d.vorn_profile?.handle || null,
      budget_ceiling_usd_per_day: d.guardrails.budget_ceiling_usd_per_day,
      cost_today_usd: costs[d.identity.call_sign]?.cost_today_usd ?? 0,
      last_run_iso: costs[d.identity.call_sign]?.last_run_iso || null,
    })),
    totals: {
      agents: dnas.length,
      live: dnas.filter(d => d.status === 'live').length,
      public: dnas.filter(d => d.vorn_public).length,
      budget_ceiling_total_usd: dnas.reduce((a, d) => a + d.guardrails.budget_ceiling_usd_per_day, 0),
      cost_today_total_usd: Object.values(costs).reduce((a, c) => a + (c.cost_today_usd || 0), 0),
    },
  };
  fs.writeFileSync(ROSTER_JSON, JSON.stringify(compiled, null, 2) + '\n');

  if (jsonOnly) {
    console.log(`✓ ${path.relative(REPO_ROOT, ROSTER_JSON)}`);
    return;
  }

  // Write Markdown roster
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    '<!-- generated-by: scripts/render-agent-roster.mjs -->',
    `<!-- generated-at: ${today} -->`,
    '',
    '# VaultSpark Studios — Agent Roster',
    '',
    `> ${dnas.length} agents · ${compiled.totals.live} live · ${compiled.totals.public} public on Vorn · daily budget ceiling $${compiled.totals.budget_ceiling_total_usd.toFixed(2)}`,
    '',
    '**Trust tiers:** 👁 observer (read-only) · ✍ proposer (drafts) · ⚙ executor (writes in scope) · 🚀 autopilot (full writes)',
    '',
    '---',
    '',
  ];

  const categories = {};
  for (const d of dnas) {
    const cat = d.role.category || 'other';
    (categories[cat] ||= []).push(d);
  }

  const catOrder = ['ops', 'intelligence', 'governance', 'launch', 'creative', 'security', 'finance', 'other'];
  for (const cat of catOrder) {
    if (!categories[cat]) continue;
    lines.push(`## ${cat.toUpperCase()}`);
    lines.push('');
    for (const d of categories[cat]) lines.push(renderCard(d, costs));
  }

  lines.push('---');
  lines.push('');
  lines.push('*Generated by `scripts/render-agent-roster.mjs`. DNA source of truth: `agents/dna/*.json`.*');

  fs.writeFileSync(ROSTER_MD, lines.join('\n'));
  console.log(`✓ ${path.relative(REPO_ROOT, ROSTER_MD)}`);
  console.log(`✓ ${path.relative(REPO_ROOT, ROSTER_JSON)}`);
  console.log(`  ${dnas.length} agents · ${compiled.totals.public} public · $${compiled.totals.budget_ceiling_total_usd.toFixed(2)}/day ceiling`);
}

main();
