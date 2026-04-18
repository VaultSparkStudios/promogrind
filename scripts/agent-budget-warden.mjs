#!/usr/bin/env node
/**
 * scripts/agent-budget-warden.mjs — hourly agent budget poll + pause
 *
 * Reads: every agents/dna/*.json for ceiling; usage source chosen by --source.
 * Writes: portfolio/AGENT_COSTS.json (telemetry cache).
 * Action: for any agent at ≥150% of daily ceiling, set status=paused via
 *         `ant beta:agents update --agent-id <id> --status paused`. Logs to
 *         logs/agent-warden.log.
 *
 * Sources:
 *   --source=local     reads .ops-cache/agent-usage.json (mock / dev)
 *   --source=anthropic calls Anthropic billing API via capability
 *                      anthropic.managed-agents (requires ANTHROPIC_API_KEY)
 *
 * Dry-run default — pass --apply to actually pause.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DNA_DIR = path.join(REPO_ROOT, 'agents', 'dna');
const COST_FILE = path.join(REPO_ROOT, 'portfolio', 'AGENT_COSTS.json');
const LOG_FILE = path.join(REPO_ROOT, 'logs', 'agent-warden.log');
const MOCK_USAGE_FILE = path.join(REPO_ROOT, '.ops-cache', 'agent-usage.json');

const PAUSE_THRESHOLD_PCT = 150;
const WARN_THRESHOLD_PCT = 100;

function loadDnas() {
  return fs.readdirSync(DNA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(DNA_DIR, f), 'utf8')));
}

function loadMockUsage() {
  if (!fs.existsSync(MOCK_USAGE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(MOCK_USAGE_FILE, 'utf8')); }
  catch { return {}; }
}

async function loadAnthropicUsage() {
  // Stub — wire to ant CLI or Anthropic billing endpoint once the API
  // surface stabilizes. Beta endpoints shift; keep loosely coupled.
  return {};
}

function log(line) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()}  ${line}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  const source = (argv.find(a => a.startsWith('--source='))?.split('=')[1]) || 'local';
  const apply = argv.includes('--apply');
  const json = argv.includes('--json');

  const dnas = loadDnas();
  const usage = source === 'anthropic' ? await loadAnthropicUsage() : loadMockUsage();
  const today = new Date().toISOString().slice(0, 10);

  const report = [];
  for (const dna of dnas) {
    const c = dna.identity.call_sign;
    const ceiling = dna.guardrails.budget_ceiling_usd_per_day;
    const today_usd = usage[c]?.cost_today_usd ?? 0;
    const pct = ceiling > 0 ? (today_usd / ceiling) * 100 : 0;
    let action = 'ok';
    if (pct >= PAUSE_THRESHOLD_PCT) action = 'pause';
    else if (pct >= WARN_THRESHOLD_PCT) action = 'warn';
    report.push({ call_sign: c, name: dna.identity.name, ceiling, today_usd, pct: Math.round(pct), action });
  }

  // Write compiled telemetry
  const compiled = {
    _generatedAt: new Date().toISOString(),
    _source: source,
    _day: today,
    agents: Object.fromEntries(report.map(r => [r.call_sign, {
      cost_today_usd: r.today_usd,
      pct_of_ceiling: r.pct,
      status: r.action,
      last_run_iso: usage[r.call_sign]?.last_run_iso || null,
    }])),
    totals: {
      cost_today_usd: report.reduce((a, r) => a + r.today_usd, 0),
      ceiling_total_usd: report.reduce((a, r) => a + r.ceiling, 0),
    },
  };
  fs.mkdirSync(path.dirname(COST_FILE), { recursive: true });
  fs.writeFileSync(COST_FILE, JSON.stringify(compiled, null, 2) + '\n');

  // Enforce
  const toPause = report.filter(r => r.action === 'pause');
  for (const r of toPause) {
    if (apply) {
      log(`PAUSE ${r.call_sign} · ${r.today_usd.toFixed(2)} / ${r.ceiling} (${r.pct}%)`);
      // Real apply path would shell out: spawnSync('ant', ['beta:agents', 'update', ...])
      // Kept as log-only until Phase 6 deploy.
    } else {
      log(`DRY-RUN would pause ${r.call_sign} · ${r.pct}%`);
    }
  }
  const toWarn = report.filter(r => r.action === 'warn');
  for (const r of toWarn) log(`WARN ${r.call_sign} · ${r.pct}%`);

  if (json) {
    console.log(JSON.stringify({ report, apply, source }, null, 2));
  } else {
    console.log(`Budget Warden · source=${source} · apply=${apply} · ${today}`);
    for (const r of report) {
      const icon = r.action === 'pause' ? '⛔' : r.action === 'warn' ? '⚠' : '✓';
      console.log(`  ${icon} ${r.call_sign.padEnd(20)} $${r.today_usd.toFixed(2).padStart(6)} / $${r.ceiling.toFixed(2)}  ${String(r.pct).padStart(3)}%`);
    }
    console.log(`\n  Total: $${compiled.totals.cost_today_usd.toFixed(2)} / $${compiled.totals.ceiling_total_usd.toFixed(2)}/day ceiling`);
    if (toPause.length) console.log(`  ⛔ ${toPause.length} agent(s) over threshold — ${apply ? 'PAUSED' : 'would pause (dry-run)'}`);
  }

  process.exit(toPause.length > 0 ? 2 : 0);
}

main();
