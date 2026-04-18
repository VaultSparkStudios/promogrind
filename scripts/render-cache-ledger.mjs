#!/usr/bin/env node
/**
 * render-cache-ledger.mjs
 *
 * Rolling 7-day cache-hit + cost-savings ledger for Studio Ops Claude calls.
 *
 * Reads NDJSON entries written by `logMetrics()` in scripts/lib/model-router.mjs
 * and renders `docs/CACHE_LEDGER.md` with per-script breakdown, totals, and
 * estimated token savings (cache reads would have cost ~10× without caching).
 *
 * Usage:
 *   node scripts/render-cache-ledger.mjs            → writes docs/CACHE_LEDGER.md
 *   node scripts/render-cache-ledger.mjs --json     → JSON summary to stdout
 *   node scripts/render-cache-ledger.mjs --days N   → override window (default 7)
 *   node scripts/render-cache-ledger.mjs --snapshot → compact one-line summary
 *   node scripts/ops.mjs cache-ledger
 *
 * Pricing reference (per 1M tokens, approximate, as of 2026-04):
 *   model     input   cache_write  cache_read  output
 *   opus      $15.00  $18.75       $1.50       $75.00
 *   sonnet    $3.00   $3.75        $0.30       $15.00
 *   haiku     $1.00   $1.25        $0.10       $5.00
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PRICING_PER_MTOK, FALLBACK_PRICE, shortModelName } from './lib/model-router.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const LEDGER    = process.env.OPS_CACHE_LEDGER || path.join(ROOT, 'docs', 'cache-ledger.ndjson');
const OUT_PATH  = path.join(ROOT, 'docs', 'CACHE_LEDGER.md');

const JSON_MODE     = process.argv.includes('--json');
const SNAPSHOT_MODE = process.argv.includes('--snapshot');
const daysIdx       = process.argv.indexOf('--days');
const WINDOW_DAYS   = daysIdx !== -1 ? Math.max(1, parseInt(process.argv[daysIdx + 1], 10) || 7) : 7;

// ── Read + filter entries ─────────────────────────────────────────────────────

function readEntries() {
  if (!fs.existsSync(LEDGER)) return [];
  const content = fs.readFileSync(LEDGER, 'utf8');
  return content
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(entry => entry && entry.ts);
}

function filterWindow(entries, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter(e => new Date(e.ts).getTime() >= cutoff);
}

// ── Aggregation ───────────────────────────────────────────────────────────────

function aggregate(entries) {
  const byScript = new Map();
  let totals = { calls: 0, input: 0, output: 0, cache_read: 0, cache_create: 0, costActual: 0, costNaive: 0 };

  for (const e of entries) {
    const price = PRICING_PER_MTOK[e.model] || FALLBACK_PRICE;
    const actual =
      (e.input        / 1e6) * price.input +
      (e.cache_create / 1e6) * price.cacheWrite +
      (e.cache_read   / 1e6) * price.cacheRead +
      (e.output       / 1e6) * price.output;
    // Naive cost: what we would have paid with no caching (all as fresh input).
    const naive =
      ((e.input + e.cache_create + e.cache_read) / 1e6) * price.input +
      (e.output / 1e6) * price.output;

    const key = e.script + (e.mode ? `:${e.mode}` : '');
    if (!byScript.has(key)) {
      byScript.set(key, { script: e.script, mode: e.mode, calls: 0, input: 0, output: 0, cache_read: 0, cache_create: 0, costActual: 0, costNaive: 0, models: new Set() });
    }
    const row = byScript.get(key);
    row.calls        += 1;
    row.input        += e.input;
    row.output       += e.output;
    row.cache_read   += e.cache_read;
    row.cache_create += e.cache_create;
    row.costActual   += actual;
    row.costNaive    += naive;
    row.models.add(shortModelName(e.model));

    totals.calls        += 1;
    totals.input        += e.input;
    totals.output       += e.output;
    totals.cache_read   += e.cache_read;
    totals.cache_create += e.cache_create;
    totals.costActual   += actual;
    totals.costNaive    += naive;
  }

  const rows = [...byScript.values()]
    .map(r => ({ ...r, models: [...r.models].sort().join(','), savings: r.costNaive - r.costActual }))
    .sort((a, b) => b.costActual - a.costActual);

  totals.savings = totals.costNaive - totals.costActual;
  totals.hitRate = totals.cache_read + totals.input > 0
    ? totals.cache_read / (totals.cache_read + totals.input + totals.cache_create)
    : 0;

  return { rows, totals };
}

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtTok(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}
function fmtUSD(n) { return `$${n.toFixed(4)}`; }
function fmtPct(n) { return `${(n * 100).toFixed(1)}%`; }
function sparkline(values) {
  if (!values.length) return '—';
  const chars = '▁▂▃▄▅▆▇█';
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return values.map(() => chars[3]).join('');
  return values.map((value) => {
    const idx = Math.round(((value - min) / (max - min)) * (chars.length - 1));
    return chars[idx];
  }).join('');
}

function aggregateByDay(entries) {
  const map = new Map();
  for (const entry of entries) {
    const day = entry.ts.slice(0, 10);
    const price = PRICING_PER_MTOK[entry.model] || FALLBACK_PRICE;
    const actual =
      (entry.input        / 1e6) * price.input +
      (entry.cache_create / 1e6) * price.cacheWrite +
      (entry.cache_read   / 1e6) * price.cacheRead +
      (entry.output       / 1e6) * price.output;
    const naive =
      ((entry.input + entry.cache_create + entry.cache_read) / 1e6) * price.input +
      (entry.output / 1e6) * price.output;

    if (!map.has(day)) {
      map.set(day, { day, calls: 0, cache_read: 0, costActual: 0, savings: 0 });
    }
    const row = map.get(day);
    row.calls += 1;
    row.cache_read += entry.cache_read;
    row.costActual += actual;
    row.savings += (naive - actual);
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function renderSnapshot(summary) {
  const { totals } = summary;
  if (totals.calls === 0) return `No Claude calls in last ${WINDOW_DAYS}d`;
  return `${totals.calls} calls · ${fmtTok(totals.cache_read)} cached-read · ${fmtPct(totals.hitRate)} hit rate · ~${fmtUSD(totals.savings)} saved (${WINDOW_DAYS}d)`;
}

function renderMarkdown(summary, entries, windowDays) {
  const { rows, totals } = summary;
  const generatedAt = new Date().toISOString().slice(0, 19) + 'Z';
  const firstTs     = entries.length ? entries[0].ts.slice(0, 10) : '—';
  const lastTs      = entries.length ? entries[entries.length - 1].ts.slice(0, 10) : '—';
  const byDay       = aggregateByDay(entries);
  const savingsSpark = sparkline(byDay.map(row => row.savings));

  const lines = [
    '# Cache Ledger',
    '',
    '<!-- generated-by: scripts/render-cache-ledger.mjs -->',
    `<!-- generated-at: ${generatedAt} -->`,
    '',
    `Rolling **${windowDays}-day** cost + cache-hit snapshot for all Studio Ops Claude API calls`,
    'routed through \`scripts/lib/model-router.mjs\` → \`logMetrics()\`.',
    '',
    '---',
    '',
    '## Summary',
    '',
    `- **Window:** last ${windowDays} days (data range ${firstTs} → ${lastTs})`,
    `- **Calls:** ${totals.calls}`,
    `- **Cache hit rate:** ${fmtPct(totals.hitRate)}  *(of read+fresh+create input tokens)*`,
    `- **Tokens read from cache:** ${fmtTok(totals.cache_read)}`,
    `- **Tokens written to cache:** ${fmtTok(totals.cache_create)}`,
    `- **Fresh input tokens:** ${fmtTok(totals.input)}`,
    `- **Output tokens:** ${fmtTok(totals.output)}`,
    `- **Actual est. spend:** ${fmtUSD(totals.costActual)}`,
    `- **Naive est. spend (no caching):** ${fmtUSD(totals.costNaive)}`,
    `- **Estimated savings:** ${fmtUSD(totals.savings)}  *(≈${totals.costNaive > 0 ? fmtPct(totals.savings / totals.costNaive) : '0%'} vs naive)*`,
    '',
    '## By script',
    '',
    '| Script | Models | Calls | Cache read | Fresh in | Out | Actual | Saved |',
    '|---|---|---:|---:|---:|---:|---:|---:|',
    ...rows.map(r => {
      const label = r.mode ? `${r.script} --${r.mode}` : r.script;
      return `| ${label} | ${r.models} | ${r.calls} | ${fmtTok(r.cache_read)} | ${fmtTok(r.input)} | ${fmtTok(r.output)} | ${fmtUSD(r.costActual)} | ${fmtUSD(r.savings)} |`;
    }),
    '',
    '## Daily breakdown',
    '',
    `Savings sparkline: ${savingsSpark}`,
    '',
    '| Day | Calls | Cache read | Actual | Saved |',
    '|---|---:|---:|---:|---:|',
    ...byDay.map(row =>
      `| ${row.day} | ${row.calls} | ${fmtTok(row.cache_read)} | ${fmtUSD(row.costActual)} | ${fmtUSD(row.savings)} |`
    ),
    ...(byDay.length === 0 ? ['| — | 0 | 0 | $0.0000 | $0.0000 |'] : []),
    '',
    '## Pricing assumptions',
    '',
    '| Model | Input | Cache write | Cache read | Output |',
    '|---|---:|---:|---:|---:|',
    ...Object.entries(PRICING_PER_MTOK).map(([m, p]) =>
      `| ${shortModelName(m)} | $${p.input.toFixed(2)} | $${p.cacheWrite.toFixed(2)} | $${p.cacheRead.toFixed(2)} | $${p.output.toFixed(2)} |`
    ),
    '',
    '*Prices per 1M tokens. "Saved" = what the equivalent token volume would have cost without prompt caching (all cached tokens charged as fresh input).*',
    '',
    '---',
    '',
    `*Source: \`docs/cache-ledger.ndjson\` (${entries.length} raw entries). Run \`node scripts/ops.mjs cache-ledger\` to refresh.*`,
    '',
  ];
  return lines.join('\n');
}

export { aggregate, filterWindow, readEntries, renderSnapshot, renderMarkdown };

// ── Main (only when invoked directly) ─────────────────────────────────────────

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const thisPath    = fileURLToPath(import.meta.url);
if (invokedPath === thisPath) {
  const allEntries    = readEntries();
  const windowEntries = filterWindow(allEntries, WINDOW_DAYS);
  const summary       = aggregate(windowEntries);

  if (SNAPSHOT_MODE) {
    process.stdout.write(renderSnapshot(summary) + '\n');
    process.exit(0);
  }

  if (JSON_MODE) {
    console.log(JSON.stringify({
      windowDays:    WINDOW_DAYS,
      totalEntries:  allEntries.length,
      windowEntries: windowEntries.length,
      totals:        summary.totals,
      rows:          summary.rows,
    }, null, 2));
    process.exit(0);
  }

  const md = renderMarkdown(summary, windowEntries, WINDOW_DAYS);
  fs.writeFileSync(OUT_PATH, md, 'utf8');
  console.log(`✓ Cache ledger → docs/CACHE_LEDGER.md  (${windowEntries.length} entries, ${WINDOW_DAYS}d window)`);
  console.log(`  ${renderSnapshot(summary)}`);
}
