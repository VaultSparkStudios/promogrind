#!/usr/bin/env node
/**
 * ingest-engagement-event.mjs — website / product engagement feed (S79)
 *
 * Append a structured engagement event to portfolio/ENGAGEMENT_EVENTS.ndjson.
 * Feeds IGNIS engagement scoring + SPARKED user-growth priority signals.
 *
 * Accepted event types:
 *   page-view · waitlist-signup · cta-click · trial-start · purchase
 *   feedback-submit · discord-join · newsletter-signup · star · fork
 *
 * Usage:
 *   # CLI (manual capture)
 *   node scripts/ingest-engagement-event.mjs \
 *     --project velaxis --type waitlist-signup --source website
 *
 *   # Stdin (webhook receiver)
 *   echo '{"type":"purchase","project":"call-of-doodie","amount":4.99}' | \
 *     node scripts/ingest-engagement-event.mjs --stdin
 *
 *   # Batch (from a dump file)
 *   node scripts/ingest-engagement-event.mjs --file events.ndjson
 *
 *   # Summary (last 7d per project)
 *   node scripts/ingest-engagement-event.mjs --summary
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EVENTS_PATH = path.join(ROOT, 'portfolio', 'ENGAGEMENT_EVENTS.ndjson');

const VALID_TYPES = new Set([
  'page-view', 'waitlist-signup', 'cta-click', 'trial-start', 'purchase',
  'feedback-submit', 'discord-join', 'newsletter-signup', 'star', 'fork',
]);

const args = process.argv.slice(2);

function arg(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
}

function appendEvent(ev) {
  if (!ev.project || !ev.type) throw new Error('event missing project or type');
  if (!VALID_TYPES.has(ev.type)) throw new Error(`unknown event type: ${ev.type}`);
  const enriched = {
    ts: ev.ts || new Date().toISOString(),
    project: ev.project,
    type: ev.type,
    source: ev.source || 'unknown',
    amount: ev.amount ?? null,
    currency: ev.currency || null,
    meta: ev.meta || {},
  };
  fs.mkdirSync(path.dirname(EVENTS_PATH), { recursive: true });
  fs.appendFileSync(EVENTS_PATH, JSON.stringify(enriched) + '\n');
  return enriched;
}

function readEvents() {
  if (!fs.existsSync(EVENTS_PATH)) return [];
  return fs.readFileSync(EVENTS_PATH, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function summary(windowDays = 7) {
  const cutoff = Date.now() - windowDays * 86400 * 1000;
  const events = readEvents().filter(e => Date.parse(e.ts) >= cutoff);

  const byProject = new Map();
  for (const e of events) {
    if (!byProject.has(e.project)) byProject.set(e.project, { total: 0, byType: {} });
    const agg = byProject.get(e.project);
    agg.total++;
    agg.byType[e.type] = (agg.byType[e.type] || 0) + 1;
  }

  return {
    windowDays,
    eventCount: events.length,
    uniqueProjects: byProject.size,
    perProject: Object.fromEntries([...byProject].sort((a, b) => b[1].total - a[1].total)),
  };
}

if (args.includes('--summary')) {
  const windowIdx = args.indexOf('--window');
  const w = windowIdx >= 0 ? parseInt(args[windowIdx + 1], 10) : 7;
  process.stdout.write(JSON.stringify(summary(w), null, 2) + '\n');
  process.exit(0);
}

if (args.includes('--stdin')) {
  let buf = '';
  process.stdin.on('data', c => { buf += c; });
  process.stdin.on('end', () => {
    try {
      const ev = JSON.parse(buf);
      const written = appendEvent(ev);
      process.stdout.write(`✓ Ingested ${written.type} for ${written.project}\n`);
    } catch (err) {
      process.stderr.write(`ingest error: ${err.message}\n`);
      process.exit(1);
    }
  });
} else if (args.includes('--file')) {
  const file = arg('file');
  if (!file || !fs.existsSync(file)) { process.stderr.write('--file path missing or not found\n'); process.exit(1); }
  let n = 0;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { appendEvent(JSON.parse(line)); n++; } catch {}
  }
  process.stdout.write(`✓ Ingested ${n} events\n`);
} else {
  const project = arg('project');
  const type = arg('type');
  const source = arg('source') || 'cli';
  const amount = arg('amount') ? Number(arg('amount')) : null;
  if (!project || !type) {
    process.stderr.write('Usage: --project <slug> --type <type> [--source <s>] [--amount <n>]\n');
    process.stderr.write(`Valid types: ${[...VALID_TYPES].join(', ')}\n`);
    process.exit(1);
  }
  const ev = appendEvent({ project, type, source, amount });
  process.stdout.write(`✓ Ingested ${ev.type} for ${ev.project} at ${ev.ts}\n`);
}
