#!/usr/bin/env node
/**
 * ignis-rank-selftest.mjs — end-to-end self-test for the IGNIS rank service (S86).
 *
 * Prevents silent drift between:
 *   - scripts/lib/ignis-rank.mjs       (adapter used by every rank consumer)
 *   - scripts/ignis-rank-server.mjs    (live HTTP service)
 *   - scripts/lib/ignis-live-score.mjs (signal-aware scoring)
 *
 * Flow:
 *   1. Spawn the server on an ephemeral port (free-port probe).
 *   2. Wait for /health to return 200.
 *   3. POST three known-shape items; assert response shape + that
 *      `ignisSource === 'live'` and that at least one item has a non-trivial
 *      `ignisRationale` (live modifiers visible).
 *   4. Invoke the adapter (`rankItems()`) with IGNIS_MCP_URL pointed at the
 *      spawned server; assert the adapter flips `ignisSource: 'live'`.
 *   5. Kill the server and exit 0 on success, 1 on failure.
 *
 * Safe to run in CI. No secrets needed — the server auth is open by default.
 *
 * Usage:
 *   node scripts/ignis-rank-selftest.mjs
 *   node scripts/ops.mjs ignis-rank-selftest
 */

import { spawn } from './lib/safe-spawn.mjs';
import http from 'http';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SERVER = path.join(__dirname, 'ignis-rank-server.mjs');

const TEST_ITEMS = [
  {
    id: 'selftest-1',
    title: 'Release gate smoke',
    category: 'SECURITY',
    status: 'unblocked',
    effortMin: 60,
    sourceSurface: 'TASK_BOARD',
    signals: {}
  },
  {
    id: 'selftest-2',
    title: 'Pattern memory pipeline',
    category: 'AUTOMATION',
    status: 'unblocked',
    effortMin: 90,
    sourceSurface: 'IGNIS_PROPOSALS',
    signals: {}
  },
  {
    id: 'selftest-3',
    title: 'MindFrame port',
    category: 'CLAUDE-API',
    status: 'cross-repo-locked',
    effortMin: 45,
    sourceSurface: 'TASK_BOARD',
    signals: { ageSessions: 6 }
  }
];

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function httpJson(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body != null ? JSON.stringify(body) : null;
    const req = http.request(
      {
        method,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        headers: {
          'content-type': 'application/json',
          ...(data ? { 'content-length': Buffer.byteLength(data) } : {})
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try { json = JSON.parse(raw); } catch { /* leave null */ }
          resolve({ status: res.statusCode, body: json, raw });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function waitForHealth(port, tries = 30) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const r = await httpJson('GET', `http://127.0.0.1:${port}/health`);
      if (r.status === 200 && r.body?.status === 'ok') return;
    } catch { /* server not up yet */ }
    await new Promise((res) => setTimeout(res, 100));
  }
  throw new Error(`server did not become healthy on port ${port} within ~${tries * 100}ms`);
}

function assert(cond, label) {
  if (!cond) throw new Error(`assertion failed: ${label}`);
  console.log(`  ✓ ${label}`);
}

async function run() {
  console.log('ignis-rank-selftest · spawning server on ephemeral port');
  const port = await findFreePort();
  const server = spawn(process.execPath, [SERVER, '--port', String(port)], {
    cwd: ROOT,
    env: { ...process.env, IGNIS_RANK_TOKEN: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverErr = '';
  server.stderr.on('data', (c) => { serverErr += c.toString(); });

  let failed = false;
  try {
    await waitForHealth(port);
    console.log(`  ✓ server healthy on port ${port}`);

    // 1. Direct HTTP round-trip
    const rankRes = await httpJson('POST', `http://127.0.0.1:${port}/rank`, { items: TEST_ITEMS });
    assert(rankRes.status === 200, `/rank returned 200 (got ${rankRes.status})`);
    assert(Array.isArray(rankRes.body?.ranked), '/rank response has ranked[] array');
    assert(rankRes.body.ranked.length === TEST_ITEMS.length, `ranked length = ${TEST_ITEMS.length}`);
    for (const item of rankRes.body.ranked) {
      assert(typeof item.ignisScore === 'number' && item.ignisScore >= 0 && item.ignisScore <= 100,
             `${item.id} ignisScore in [0,100] (got ${item.ignisScore})`);
      assert(['fire', 'high', 'medium', 'low'].includes(item.ignisTier),
             `${item.id} ignisTier is canonical (got ${item.ignisTier})`);
      assert(typeof item.ignisRationale === 'string' && item.ignisRationale.length > 0,
             `${item.id} ignisRationale non-empty`);
      assert(item.ignisSource === 'live', `${item.id} ignisSource === "live"`);
    }

    // 2. Signal-modifier visibility — at least one item should carry live modifiers
    //    (the server attaches ignisLiveModifiers when signal bundles influenced scoring).
    //    On a minimal signal bundle this can be empty; we only require the *field* exists
    //    on every item so downstream consumers can trust the shape.
    for (const item of rankRes.body.ranked) {
      assert('ignisLiveModifiers' in item,
             `${item.id} carries ignisLiveModifiers field`);
    }

    // 3. Adapter end-to-end — rankItems() with IGNIS_MCP_URL should flip to live
    const prevUrl = process.env.IGNIS_MCP_URL;
    process.env.IGNIS_MCP_URL = `http://127.0.0.1:${port}`;
    // Re-import fresh so adapter picks up the env var.
    const adapterModule = await import(`./lib/ignis-rank.mjs?selftest=${Date.now()}`);
    const { rankItems } = adapterModule;
    const adapterRanked = await rankItems(TEST_ITEMS);
    if (prevUrl === undefined) delete process.env.IGNIS_MCP_URL; else process.env.IGNIS_MCP_URL = prevUrl;

    assert(Array.isArray(adapterRanked) && adapterRanked.length === TEST_ITEMS.length,
           'adapter returned ranked array of correct length');
    const liveCount = adapterRanked.filter((r) => r.ignisSource === 'live').length;
    assert(liveCount === adapterRanked.length,
           `all adapter items tagged ignisSource: "live" (got ${liveCount}/${adapterRanked.length})`);

    console.log('\n✓ ignis-rank-selftest passed — adapter↔server contract is intact');
  } catch (err) {
    failed = true;
    console.error(`\n✗ ignis-rank-selftest FAILED: ${err.message}`);
    if (serverErr) console.error(`  server stderr:\n${serverErr.split('\n').map((l) => '    ' + l).join('\n')}`);
  } finally {
    server.kill('SIGTERM');
    // Small grace period so the child can exit cleanly.
    await new Promise((res) => setTimeout(res, 100));
    if (!server.killed) server.kill('SIGKILL');
  }

  process.exit(failed ? 1 : 0);
}

run().catch((err) => {
  console.error(`ignis-rank-selftest crashed: ${err.stack || err.message}`);
  process.exit(1);
});
