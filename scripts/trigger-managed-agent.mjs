#!/usr/bin/env node
/**
 * scripts/trigger-managed-agent.mjs — fire a session event at a Managed Agent
 *
 * Cadence driver for every `runtime: claude-managed` agent in agents/dna/.
 * Wrapped by .github/workflows/agent-cron-sentinel.yml (daily 08:00 UTC) and
 * by PR/webhook receivers as they come online. Budget Warden gates cost.
 *
 * Flow (per call):
 *   1. Resolve call_sign → Anthropic agent ID via portfolio/MANAGED_AGENT_IDS.json.
 *   2. Refuse if DNA status ∈ {draft, paused}.
 *   3. Refuse if Budget Warden marked this call_sign `pause` in AGENT_COSTS.json.
 *   4. `ant beta:sessions create --agent-id <id>` → sessionId.
 *   5. `ant beta:sessions:events send --session-id <id> --event-type user_message --content <payload>`.
 *   6. Append run log to logs/agent-triggers.log.
 *
 * Dry-run by default. Pass --apply to actually spawn ant.
 *
 * Usage:
 *   node scripts/trigger-managed-agent.mjs --agent sentinel
 *   node scripts/trigger-managed-agent.mjs --agent sentinel --apply
 *   node scripts/trigger-managed-agent.mjs --agent sentinel --event "morning-watch" --apply
 *   node scripts/trigger-managed-agent.mjs --all --cadence cron --apply
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DNA_DIR = path.join(REPO_ROOT, 'agents', 'dna');
const IDS_FILE = path.join(REPO_ROOT, 'portfolio', 'MANAGED_AGENT_IDS.json');
const COSTS_FILE = path.join(REPO_ROOT, 'portfolio', 'AGENT_COSTS.json');
const LOG_FILE = path.join(REPO_ROOT, 'logs', 'agent-triggers.log');

function parseArgs(argv) {
  const out = { agent: null, all: false, cadence: null, event: null, apply: false, json: false, dryRun: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--agent') out.agent = argv[++i];
    else if (a === '--all') out.all = true;
    else if (a === '--cadence') out.cadence = argv[++i];
    else if (a === '--event') out.event = argv[++i];
    else if (a === '--apply') { out.apply = true; out.dryRun = false; }
    else if (a === '--json') out.json = true;
    else if (a.startsWith('--agent=')) out.agent = a.slice(8);
    else if (a.startsWith('--cadence=')) out.cadence = a.slice(10);
    else if (a.startsWith('--event=')) out.event = a.slice(8);
  }
  return out;
}

function readJson(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}

function loadDnas() {
  return fs.readdirSync(DNA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(DNA_DIR, f), 'utf8')));
}

function selectTargets(dnas, opts) {
  if (opts.agent) {
    const dna = dnas.find(d => d.identity.call_sign === opts.agent);
    return dna ? [dna] : [];
  }
  if (opts.all) {
    return dnas.filter(d => {
      if (d.runtime !== 'claude-managed') return false;
      if (opts.cadence && d.cadence?.trigger !== opts.cadence) return false;
      return true;
    });
  }
  return [];
}

function log(line) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()}  ${line}\n`);
}

function runAnt(args, apply) {
  if (!apply) return { stdout: '', stderr: '', status: 0, dryRun: true };
  const r = spawnSync('ant', args, { encoding: 'utf8' });
  return { stdout: r.stdout || '', stderr: r.stderr || '', status: r.status ?? -1, dryRun: false };
}

function defaultEventPayload(dna) {
  const cadence = dna.cadence?.schedule ? `on schedule ${dna.cadence.schedule}` : 'on-demand';
  return `Triggered ${cadence}. Run your standard scope per guardrails.scope_cap_per_run=${dna.guardrails.scope_cap_per_run}. Respond with one summary per your personality.voice.`;
}

async function triggerOne(dna, ids, costs, opts) {
  const c = dna.identity.call_sign;
  const result = { call_sign: c, name: dna.identity.name, status: 'pending', sessionId: null, error: null };

  if (dna.status === 'draft' || dna.status === 'paused') {
    result.status = 'skipped-' + dna.status;
    return result;
  }

  const agentId = ids?.agents?.[c];
  if (!agentId) {
    result.status = 'skipped-no-id';
    result.error = `no Anthropic agent ID in ${path.relative(REPO_ROOT, IDS_FILE)}`;
    return result;
  }

  const costStatus = costs?.agents?.[c]?.status;
  if (costStatus === 'pause') {
    result.status = 'skipped-budget';
    result.error = `Budget Warden flagged ${c} at ${costs.agents[c].pct_of_ceiling}% of ceiling`;
    return result;
  }

  const create = runAnt(['beta:sessions', 'create', '--agent-id', agentId, '--output', 'json'], opts.apply);
  if (create.status !== 0) {
    result.status = 'session-create-failed';
    result.error = (create.stderr || create.stdout || 'unknown').slice(0, 240);
    log(`FAIL ${c} session-create ${result.error}`);
    return result;
  }

  let sessionId = null;
  if (!opts.apply) {
    sessionId = `dry-run-session-${c}`;
  } else {
    try { sessionId = JSON.parse(create.stdout).id || JSON.parse(create.stdout).session_id; }
    catch { sessionId = null; }
    if (!sessionId) {
      result.status = 'session-id-missing';
      result.error = `ant returned no id: ${create.stdout.slice(0, 200)}`;
      log(`FAIL ${c} session-id-missing`);
      return result;
    }
  }
  result.sessionId = sessionId;

  const content = opts.event || defaultEventPayload(dna);
  const send = runAnt(
    ['beta:sessions:events', 'send', '--session-id', sessionId, '--event-type', 'user_message', '--content', content],
    opts.apply
  );
  if (send.status !== 0) {
    result.status = 'event-send-failed';
    result.error = (send.stderr || send.stdout || 'unknown').slice(0, 240);
    log(`FAIL ${c} event-send ${result.error}`);
    return result;
  }

  result.status = opts.apply ? 'triggered' : 'dry-run-triggered';
  log(`${opts.apply ? 'TRIGGER' : 'DRY-RUN'} ${c} session=${sessionId}`);
  return result;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.agent && !opts.all) {
    console.error('Usage: --agent <call_sign> | --all [--cadence cron]  [--apply]');
    process.exit(2);
  }

  const dnas = loadDnas();
  const targets = selectTargets(dnas, opts);
  if (targets.length === 0) {
    console.error('No targets matched.');
    process.exit(opts.all ? 0 : 2);
  }

  const ids = readJson(IDS_FILE);
  const costs = readJson(COSTS_FILE);

  const results = [];
  for (const dna of targets) {
    results.push(await triggerOne(dna, ids, costs, opts));
  }

  if (opts.json) {
    console.log(JSON.stringify({ apply: opts.apply, results }, null, 2));
  } else {
    console.log(`Trigger Managed Agent · apply=${opts.apply} · targets=${targets.length}`);
    for (const r of results) {
      const icon = r.status === 'triggered' || r.status === 'dry-run-triggered' ? '✓'
                 : r.status.startsWith('skipped') ? '·' : '✗';
      const detail = r.sessionId ? ` session=${r.sessionId}` : (r.error ? ` err=${r.error}` : '');
      console.log(`  ${icon} ${r.call_sign.padEnd(20)} ${r.status}${detail}`);
    }
  }

  const failed = results.filter(r => r.status.endsWith('-failed') || r.status === 'session-id-missing');
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
