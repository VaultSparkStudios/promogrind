#!/usr/bin/env node
/**
 * rank-with-ignis.mjs — IGNIS-powered Unified Genius List ranking (S79)
 *
 * Collects items from every genius-list source surface into a unified stream
 * and ranks them via scripts/lib/ignis-rank.mjs. Produces the canonical
 * ranked list consumed by the startup brief, founder queue, and Hub feed.
 *
 * Source surfaces (in order):
 *   1. context/TASK_BOARD.md — tagged items (tier, status, category, effort)
 *   2. context/HUMAN_ACTION_PRESSURE.md — aged human blockers with fan-out
 *   3. context/ACTION_QUEUE.md — execution planner output
 *   4. context/SESSION_INTENT_PLAN.md — current session focus
 *   5. context/FOUNDER_QUEUE.md — Studio Owner attention items
 *   6. portfolio/IGNIS_PROPOSALS.md — IGNIS Forge proposals
 *
 * Output:
 *   context/GENIUS_LIST.md   — human-readable ranked list
 *   context/GENIUS_LIST.json — machine-readable (consumed by renderer + Hub feed)
 *
 * Usage:
 *   node scripts/rank-with-ignis.mjs           # write both files
 *   node scripts/rank-with-ignis.mjs --json    # stdout only
 *   node scripts/rank-with-ignis.mjs --top 10  # limit output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rankItems, isLiveRankingAvailable } from './lib/ignis-rank.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const topIdx = args.indexOf('--top');
const TOP = topIdx >= 0 ? parseInt(args[topIdx + 1], 10) : 15;

function readText(p)    { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }

// ── Parse TASK_BOARD unified table ──────────────────────────────────────────
function parseTaskBoard() {
  const text = readText(path.join(ROOT, 'context', 'TASK_BOARD.md'));
  if (!text) return [];

  const items = [];
  const seen = new Set();

  // Unified table rows: | # | Tier | Cat | Status | Effort | Item |
  const rowRx = /^\|\s*(\d+(?:\.\d+)?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|$/gm;

  let m;
  while ((m = rowRx.exec(text)) !== null) {
    const [, id, tierRaw, cat, status, effort, titleRaw] = m;
    if (seen.has(id)) continue;
    seen.add(id);

    // Extract title between ** **
    const titleMatch = titleRaw.match(/\*\*\[?[^*]*?\]?\s*([^*]+?)\*\*/) || titleRaw.match(/\*\*(.+?)\*\*/);
    const title = (titleMatch ? titleMatch[1] : titleRaw).trim().replace(/^\[[^\]]+\]\s*/, '');
    if (!title || title.length < 3) continue;

    // Skip done items
    const statusNormalized = status.trim().toLowerCase();
    if (statusNormalized === 'done') continue;

    const effortMin = (() => {
      const e = effort.trim();
      if (/^\d+\s*m/i.test(e)) return parseInt(e, 10);
      if (/^\d+\s*h/i.test(e)) return parseInt(e, 10) * 60;
      if (/^(\d+)\s*[-–]\s*(\d+)\s*h/i.test(e)) {
        const [, lo, hi] = e.match(/^(\d+)\s*[-–]\s*(\d+)\s*h/i);
        return Math.round((parseInt(lo) + parseInt(hi)) / 2) * 60;
      }
      return null;
    })();

    items.push({
      id: `tb:${id}`,
      title,
      category: cat.trim().toUpperCase(),
      status: statusNormalized,
      effortMin,
      sourceSurface: 'TASK_BOARD',
      signals: { tier: tierRaw.trim() },
    });
  }

  return items;
}

// ── Parse HUMAN_ACTION_PRESSURE ─────────────────────────────────────────────
function parseHumanPressure() {
  const compiled = readJson(path.join(ROOT, 'portfolio', 'compiled', 'HUMAN_ACTION_PRESSURE.json'), null);
  if (!compiled || !Array.isArray(compiled.items)) return [];
  return compiled.items.map((it, i) => ({
    id: `hap:${i}`,
    title: it.title || it.label || 'human action',
    category: 'SECURITY',
    status: 'human-blocked',
    effortMin: it.effortMin || null,
    sourceSurface: 'HUMAN_ACTION_PRESSURE',
    signals: {
      ageSessions: it.ageSessions ?? it.age ?? 0,
      fanOut: it.fanOut ?? 0,
      impact: it.impact || 'medium',
    },
  }));
}

// ── Parse ACTION_QUEUE.md ───────────────────────────────────────────────────
function parseActionQueue() {
  const text = readText(path.join(ROOT, 'context', 'ACTION_QUEUE.md'));
  if (!text) return [];
  const items = [];
  const rx = /^\s*(\d+)\.\s+\[([^\]]+)\]\s*(.+?)(?:\s*\(([^)]+)\))?$/gm;
  let m;
  while ((m = rx.exec(text)) !== null) {
    const [, rank, status, title, detail] = m;
    const s = status.toLowerCase().trim();
    if (s === 'done') continue;
    items.push({
      id: `aq:${rank}`,
      title: title.trim(),
      category: 'AUTOMATION',
      status: s.includes('blocked') ? 'human-blocked' : 'unblocked',
      effortMin: null,
      sourceSurface: 'ACTION_QUEUE',
      signals: { rank: parseInt(rank, 10), detail: detail || null },
    });
  }
  return items;
}

// ── Parse IGNIS proposals ──────────────────────────────────────────────────
function parseIgnisProposals() {
  const text = readText(path.join(ROOT, 'portfolio', 'IGNIS_PROPOSALS.md'));
  if (!text) return [];
  const items = [];
  const sections = text.split(/^## /m).slice(1);
  for (const s of sections) {
    const firstLine = s.split('\n')[0].trim();
    const title = firstLine.replace(/^\d+\.\s*/, '').trim();
    if (!title) continue;
    const confidenceMatch = s.match(/confidence[:\s]+(high|medium|low)/i);
    const statusMatch = s.match(/status[:\s]+([^\n]+)/i);
    const statusRaw = (statusMatch?.[1] || 'pending').toLowerCase();
    if (statusRaw.includes('shipped') || statusRaw.includes('done')) continue;
    items.push({
      id: `ip:${title.slice(0, 40)}`,
      title,
      category: 'INTELLIGENCE',
      status: 'unblocked',
      effortMin: null,
      sourceSurface: 'IGNIS_PROPOSALS',
      signals: { confidence: confidenceMatch?.[1]?.toLowerCase() || 'medium' },
    });
  }
  return items;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const items = [
    ...parseTaskBoard(),
    ...parseHumanPressure(),
    ...parseActionQueue(),
    ...parseIgnisProposals(),
  ];

  // De-dup by normalized title
  const seen = new Map();
  for (const it of items) {
    const key = it.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
    if (!seen.has(key)) seen.set(key, it);
    else {
      // Prefer the source with richer signals: IGNIS_PROPOSALS > HUMAN_ACTION_PRESSURE > TASK_BOARD > ACTION_QUEUE
      const priority = { IGNIS_PROPOSALS: 4, HUMAN_ACTION_PRESSURE: 3, TASK_BOARD: 2, ACTION_QUEUE: 1 };
      const existing = seen.get(key);
      if ((priority[it.sourceSurface] || 0) > (priority[existing.sourceSurface] || 0)) {
        seen.set(key, it);
      }
    }
  }
  const unique = [...seen.values()];

  const ranked = await rankItems(unique);
  const top = ranked.slice(0, TOP);

  const output = {
    _schema: '1.0',
    _generatedAt: new Date().toISOString(),
    _rankSource: ranked[0]?.ignisSource || 'fallback',
    _rankLiveAvailable: isLiveRankingAvailable(),
    counts: {
      total: unique.length,
      ranked: ranked.length,
      shown: top.length,
      byTier: {
        fire:   ranked.filter(r => r.ignisTier === 'fire').length,
        high:   ranked.filter(r => r.ignisTier === 'high').length,
        medium: ranked.filter(r => r.ignisTier === 'medium').length,
        low:    ranked.filter(r => r.ignisTier === 'low').length,
      },
    },
    items: top,
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(output, null, 2));
    process.exit(0);
  }

  // Write JSON
  const jsonPath = path.join(ROOT, 'context', 'GENIUS_LIST.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2) + '\n');

  // Write Markdown
  const mdLines = [
    '# Unified Genius List',
    '',
    `**Generated:** ${output._generatedAt}  ·  **Rank source:** ${output._rankSource}${isLiveRankingAvailable() ? '' : '  ·  IGNIS live rank: `IGNIS_MCP_URL` unset (fallback scoring)'}`,
    `**Total items:** ${output.counts.total}  ·  **Tiers:** 🔥 ${output.counts.byTier.fire} · ⚡ ${output.counts.byTier.high} · 💡 ${output.counts.byTier.medium} · 🔧 ${output.counts.byTier.low}`,
    '',
    '| # | Tier | Score | Cat | Status | Source | Item |',
    '|---:|:---:|---:|---|---|---|---|',
  ];

  const tierEmoji = { fire: '🔥', high: '⚡', medium: '💡', low: '🔧' };

  top.forEach((it, i) => {
    mdLines.push([
      '',
      (i + 1),
      tierEmoji[it.ignisTier] || '🔧',
      it.ignisScore,
      it.category,
      it.status,
      it.sourceSurface,
      it.title.length > 80 ? it.title.slice(0, 80) + '…' : it.title,
    ].join(' | ') + ' |');
  });

  mdLines.push('', '## Rationale', '');
  top.forEach((it, i) => {
    mdLines.push(`${i + 1}. **${it.title}** — \`${it.ignisRationale}\``);
  });

  mdLines.push('', '---', '', '*This list is generated by `scripts/rank-with-ignis.mjs`. Downstream consumers: startup brief, founder queue, Hub feed, Social Dashboard. When IGNIS Phase 3 ships, set `IGNIS_MCP_URL` to switch from deterministic fallback to live rank.*');

  const mdPath = path.join(ROOT, 'context', 'GENIUS_LIST.md');
  fs.writeFileSync(mdPath, mdLines.join('\n') + '\n');

  process.stdout.write(`✓ Wrote ${path.relative(ROOT, jsonPath)}\n`);
  process.stdout.write(`✓ Wrote ${path.relative(ROOT, mdPath)}\n`);
  process.stdout.write(`  ${output.counts.total} unified items  ·  ${output.counts.shown} shown  ·  source: ${output._rankSource}\n`);
}

main().catch(err => { process.stderr.write(`rank-with-ignis error: ${err.message}\n`); process.exit(1); });
