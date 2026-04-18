#!/usr/bin/env node
/**
 * scripts/register-managed-agents.mjs — create/update Managed Agents on Anthropic
 *
 * For each agents/managed/*.agent.yaml:
 *   - If portfolio/MANAGED_AGENT_IDS.json already has an ID for this call_sign,
 *     call `ant beta:agents update --agent-id <id>` (optimistic-lock via version)
 *   - Otherwise call `ant beta:agents create` and record the new ID
 *
 * Writes portfolio/MANAGED_AGENT_IDS.json (one map: call_sign → agent_id).
 *
 * Requires: `ant` on PATH, ANTHROPIC_API_KEY in env.
 * Dry-run default; pass --apply to actually POST.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const MANAGED_DIR = path.join(REPO_ROOT, 'agents', 'managed');
const IDS_FILE = path.join(REPO_ROOT, 'portfolio', 'MANAGED_AGENT_IDS.json');

function loadIds() {
  if (!fs.existsSync(IDS_FILE)) return { _schemaVersion: '1.0', agents: {} };
  try { return JSON.parse(fs.readFileSync(IDS_FILE, 'utf8')); }
  catch { return { _schemaVersion: '1.0', agents: {} }; }
}

function saveIds(ids) {
  fs.mkdirSync(path.dirname(IDS_FILE), { recursive: true });
  ids._updatedAt = new Date().toISOString();
  fs.writeFileSync(IDS_FILE, JSON.stringify(ids, null, 2) + '\n');
}

function runAnt(args, stdin) {
  const r = spawnSync('ant', args, {
    input: stdin,
    encoding: 'utf8',
    env: { ...process.env },
    maxBuffer: 8 * 1024 * 1024,
  });
  return { stdout: r.stdout || '', stderr: r.stderr || '', status: r.status ?? -1 };
}

function extractCallSign(yamlText) {
  // Minimal scan — metadata.call_sign
  const m = yamlText.match(/^\s*call_sign:\s*(\S+)/m);
  return m ? m[1] : null;
}

function main() {
  const apply = process.argv.includes('--apply');
  const only = (process.argv.find(a => a.startsWith('--only='))?.split('=')[1] || '').split(',').filter(Boolean);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set. Source it into env before running.');
    process.exit(2);
  }

  if (!fs.existsSync(MANAGED_DIR)) {
    console.error(`No managed-agents dir at ${MANAGED_DIR} — run compile-managed-agents first.`);
    process.exit(2);
  }

  const yamls = fs.readdirSync(MANAGED_DIR)
    .filter(f => f.endsWith('.agent.yaml'))
    .map(f => path.join(MANAGED_DIR, f));

  const idsDoc = loadIds();
  const ids = idsDoc.agents;
  const results = [];

  for (const yamlPath of yamls) {
    const yamlText = fs.readFileSync(yamlPath, 'utf8');
    const callSign = extractCallSign(yamlText);
    if (!callSign) { results.push({ file: path.basename(yamlPath), ok: false, error: 'no call_sign in metadata' }); continue; }
    if (only.length && !only.includes(callSign)) continue;

    const existingId = ids[callSign];
    const op = existingId ? 'update' : 'create';
    if (!apply) {
      results.push({ call_sign: callSign, op, existingId, action: 'DRY-RUN' });
      continue;
    }

    let args;
    if (op === 'create') {
      args = ['beta:agents', 'create', '--format', 'json'];
    } else {
      // Read current version for optimistic lock
      const r0 = runAnt(['beta:agents', 'retrieve', '--agent-id', existingId, '--format', 'json']);
      let version = 1;
      try { version = JSON.parse(r0.stdout).version || 1; } catch {}
      args = ['beta:agents', 'update', '--agent-id', existingId, '--version', String(version), '--format', 'json'];
    }

    const r = runAnt(args, yamlText);
    if (r.status !== 0) {
      results.push({ call_sign: callSign, op, ok: false, error: r.stderr || r.stdout });
      continue;
    }
    try {
      const body = JSON.parse(r.stdout);
      ids[callSign] = body.id || existingId;
      results.push({ call_sign: callSign, op, ok: true, agent_id: body.id, version: body.version });
    } catch (e) {
      results.push({ call_sign: callSign, op, ok: false, error: `parse: ${e.message}` });
    }
  }

  if (apply) saveIds(idsDoc);

  const failed = results.filter(r => r.ok === false).length;
  console.log(`register-managed-agents · apply=${apply} · ${results.length} agent(s)`);
  for (const r of results) {
    if (r.action === 'DRY-RUN') {
      console.log(`  ⊙ ${r.call_sign.padEnd(18)} ${r.op}${r.existingId ? ` (existing ${r.existingId.slice(0, 20)}…)` : ''}  DRY-RUN`);
    } else if (r.ok) {
      console.log(`  ✓ ${r.call_sign.padEnd(18)} ${r.op}  ${r.agent_id}  v${r.version}`);
    } else {
      console.log(`  ✗ ${r.call_sign.padEnd(18)} ${r.op}  ${r.error?.slice(0, 160) || 'unknown error'}`);
    }
  }
  if (apply) console.log(`\n  IDs → ${path.relative(REPO_ROOT, IDS_FILE)}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
