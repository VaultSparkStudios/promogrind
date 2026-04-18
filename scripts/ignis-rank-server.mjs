#!/usr/bin/env node
/**
 * ignis-rank-server.mjs — Live IGNIS rank service (S85).
 *
 * Stands up an HTTP server exposing:
 *   POST /rank      — score + rank items submitted by the Unified Genius List
 *   GET  /health    — liveness probe
 *   GET  /signals   — debug snapshot of current Studio Ops signal bundle
 *   GET  /tools     — MCP-flavored tool descriptor (for any MCP-aware client)
 *
 * Drop-in consumer for `scripts/lib/ignis-rank.mjs`:
 *   IGNIS_MCP_URL=http://localhost:4123 node scripts/ops.mjs genius-list
 * will flip the ignis-rank adapter from deterministic fallback to live
 * ranking without changing any downstream code.
 *
 * Usage:
 *   node scripts/ops.mjs ignis-rank-server
 *   node scripts/ops.mjs ignis-rank-server --port 4123
 *   node scripts/ignis-rank-server.mjs --probe          # one-shot local /rank against itself
 *
 * Environment:
 *   PORT               — override port (default 4123)
 *   IGNIS_RANK_TOKEN   — if set, requests must include matching bearer
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadSignals, scoreItem } from './lib/ignis-live-score.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

const portIdx = args.indexOf('--port');
const PORT = Number(portIdx !== -1 ? args[portIdx + 1] : process.env.PORT || 4123);
const TOKEN = process.env.IGNIS_RANK_TOKEN || null;
const SERVER_NAME = 'ignis-rank-server';
const SERVER_VERSION = '1.0.0';

const RANK_TOOL_DESCRIPTOR = {
  name: 'ignis_rank',
  description:
    'Rank Studio Ops Unified Genius List items using live IGNIS-equivalent signal scoring (release gates, rollout scoreboard, feedback loop, live-surface coverage, genome trajectory). Returns items tagged with ignisScore, ignisTier, ignisRationale.',
  inputSchema: {
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'title', 'category', 'status'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            category: { type: 'string' },
            status: { type: 'string' },
            effortMin: { type: ['number', 'null'] },
            sourceSurface: { type: 'string' },
            signals: { type: 'object' }
          }
        }
      }
    }
  }
};

function writeJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'x-server': `${SERVER_NAME}/${SERVER_VERSION}`
  });
  res.end(body);
}

function writeError(res, status, message) {
  writeJson(res, status, { error: message });
}

function authOk(req) {
  if (!TOKEN) return true;
  const header = req.headers['authorization'] || '';
  return header === `Bearer ${TOKEN}`;
}

function rankItems(rawItems) {
  if (!Array.isArray(rawItems)) {
    return { error: 'items must be an array' };
  }

  const signals = loadSignals(ROOT);

  const ranked = rawItems
    .filter((it) => it && typeof it === 'object' && it.status !== 'done')
    .map((it) => {
      const { score, tier, rationale, liveModifiers } = scoreItem(it, signals);
      return {
        ...it,
        ignisScore: score,
        ignisTier: tier,
        ignisRationale: rationale,
        ignisLiveModifiers: liveModifiers,
        ignisSource: 'live'
      };
    })
    .sort((a, b) => b.ignisScore - a.ignisScore);

  return { ranked, signals };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    const limit = 1 * 1024 * 1024; // 1 MB ceiling
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limit) {
        reject(new Error('payload exceeds 1MB'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handle(req, res) {
  if (!authOk(req)) {
    writeError(res, 401, 'unauthorized');
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    writeJson(res, 200, {
      status: 'ok',
      service: SERVER_NAME,
      version: SERVER_VERSION,
      root: ROOT
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/signals') {
    const signals = loadSignals(ROOT);
    writeJson(res, 200, signals);
    return;
  }

  if (req.method === 'GET' && req.url === '/tools') {
    writeJson(res, 200, {
      protocolVersion: '2024-11-05',
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      tools: [RANK_TOOL_DESCRIPTOR]
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/rank') {
    let raw;
    try {
      raw = await readBody(req);
    } catch (err) {
      writeError(res, 413, err.message);
      return;
    }
    let payload;
    try {
      payload = JSON.parse(raw || '{}');
    } catch {
      writeError(res, 400, 'invalid JSON');
      return;
    }
    const result = rankItems(payload.items);
    if (result.error) {
      writeError(res, 400, result.error);
      return;
    }
    writeJson(res, 200, { ranked: result.ranked, signals: result.signals });
    return;
  }

  writeError(res, 404, `no route for ${req.method} ${req.url}`);
}

async function probe() {
  const testItems = [
    {
      id: 't-1',
      title: 'Release gate smoke',
      category: 'SECURITY',
      status: 'unblocked',
      effortMin: 60,
      sourceSurface: 'TASK_BOARD'
    },
    {
      id: 't-2',
      title: 'Pattern memory pipeline',
      category: 'AUTOMATION',
      status: 'unblocked',
      effortMin: 90,
      sourceSurface: 'IGNIS_PROPOSALS'
    },
    {
      id: 't-3',
      title: 'MindFrame port',
      category: 'CLAUDE-API',
      status: 'cross-repo-locked',
      effortMin: 45,
      sourceSurface: 'TASK_BOARD'
    }
  ];
  const out = rankItems(testItems);
  console.log(JSON.stringify(out, null, 2));
}

if (args.includes('--probe')) {
  probe();
  process.exit(0);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    writeError(res, 500, err.message || 'internal error');
  });
});

server.listen(PORT, () => {
  const tokenLabel = TOKEN ? '[auth: bearer]' : '[auth: open]';
  console.log(`${SERVER_NAME} v${SERVER_VERSION} listening on http://localhost:${PORT} ${tokenLabel}`);
  console.log(`  POST /rank      — rank Unified Genius List items`);
  console.log(`  GET  /health    — liveness`);
  console.log(`  GET  /signals   — current signal bundle`);
  console.log(`  GET  /tools     — MCP-flavored tool descriptor`);
  console.log('');
  console.log(`Flip the adapter: IGNIS_MCP_URL=http://localhost:${PORT} node scripts/ops.mjs genius-list`);
});

server.on('error', (err) => {
  console.error(`${SERVER_NAME} error: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n${sig} — shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 3000).unref();
  });
}
