#!/usr/bin/env node
/**
 * studio-ops-mcp-bootstrap.mjs
 *
 * Bootstraps the Studio Ops MCP server with a local IGNIS live-rank sidecar.
 * This gives Claude-native MCP sessions a stable `IGNIS_MCP_URL` without
 * requiring deploy credentials or per-invocation env exports.
 *
 * Modes:
 *   node scripts/studio-ops-mcp-bootstrap.mjs
 *     - ensure ignis-rank-server is healthy on localhost:4123
 *     - launch studio-ops-mcp/server.mjs with IGNIS_MCP_URL exported
 *
 *   node scripts/studio-ops-mcp-bootstrap.mjs --check [--json]
 *     - health check only; starts the sidecar if needed, then exits
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const JSON_MODE = args.includes('--json');

const PORT = Number(process.env.IGNIS_MCP_PORT || 4123);
const HOST = process.env.IGNIS_MCP_HOST || '127.0.0.1';
const IGNIS_URL = process.env.IGNIS_MCP_URL || `http://${HOST}:${PORT}`;
const HEALTH_URL = `${IGNIS_URL.replace(/\/$/, '')}/health`;

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function isHealthy() {
  try {
    const res = await fetch(HEALTH_URL, { headers: { accept: 'application/json' } });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureIgnisServer() {
  if (await isHealthy()) {
    return { started: false, healthy: true, url: IGNIS_URL, child: null };
  }

  const child = spawn(
    process.execPath,
    [path.join(ROOT, 'scripts', 'ignis-rank-server.mjs'), '--port', String(PORT)],
    {
      cwd: ROOT,
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, PORT: String(PORT) },
    },
  );

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await wait(250);
    if (await isHealthy()) {
      return { started: true, healthy: true, url: IGNIS_URL, child };
    }
  }

  return { started: true, healthy: false, url: IGNIS_URL, child };
}

function printStatus(result) {
  if (JSON_MODE) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  const verb = result.started ? 'started' : 'reused';
  const state = result.healthy ? 'healthy' : 'unreachable';
  process.stdout.write(`studio-ops-mcp-bootstrap: ${verb} IGNIS sidecar · ${state} · ${result.url}\n`);
}

async function main() {
  const result = await ensureIgnisServer();

  if (CHECK_ONLY) {
    printStatus(result);
    if (result.child) {
      result.child.kill('SIGTERM');
    }
    process.exit(result.healthy ? 0 : 1);
  }

  if (!result.healthy) {
    process.stderr.write(`studio-ops-mcp-bootstrap: failed to start IGNIS sidecar at ${result.url}\n`);
    process.exit(1);
  }

  const mcp = spawn(process.execPath, [path.join(ROOT, 'studio-ops-mcp', 'server.mjs')], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, IGNIS_MCP_URL: result.url },
  });

  const shutdown = () => {
    if (result.child && !result.child.killed) {
      result.child.kill('SIGTERM');
    }
    if (!mcp.killed) {
      mcp.kill('SIGTERM');
    }
  };

  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, shutdown);
  }

  mcp.on('exit', (code, signal) => {
    if (result.child && !result.child.killed) {
      result.child.kill('SIGTERM');
    }
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

await main();
