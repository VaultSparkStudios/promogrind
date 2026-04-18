#!/usr/bin/env node
/**
 * build-memory-graph.mjs — Studio Memory Graph (S79)
 *
 * Promotes per-project DECISIONS.md + CDR + SIL entries + TASK_BOARD
 * commitments across all 27 VaultSpark repos into a typed graph at
 * portfolio/STUDIO_MEMORY.json. Powers cross-project semantic queries
 * (Ask skill, dedupe detection, pattern scanning).
 *
 * Node types:
 *   decision   — DECISIONS.md entry (project-scoped)
 *   direction  — CDR entry
 *   commitment — TASK_BOARD [SIL] item
 *   learning   — SIL top-win / top-gap
 *   canon      — STUDIO_CANON.md item
 *   signal     — TRUTH_AUDIT flag
 *
 * Edge types:
 *   relates-to        — semantic overlap (shared keywords)
 *   supersedes        — later decision replaces earlier
 *   evidences         — learning supports decision
 *   violates          — behavior contradicts non-negotiable
 *   requires          — dependency
 *
 * Usage:
 *   node scripts/build-memory-graph.mjs                  # write full graph
 *   node scripts/build-memory-graph.mjs --project <slug> # single-project refresh
 *   node scripts/build-memory-graph.mjs --query "resend" # search graph
 *   node scripts/build-memory-graph.mjs --stats          # summary only
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'portfolio', 'STUDIO_MEMORY.json');

const args = process.argv.slice(2);
const STATS_ONLY = args.includes('--stats');
const projectIdx = args.indexOf('--project');
const ONLY_PROJECT = projectIdx >= 0 ? args[projectIdx + 1] : null;
const queryIdx = args.indexOf('--query');
const QUERY = queryIdx >= 0 ? args[queryIdx + 1] : null;

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function readText(p)    { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function exists(p)      { try { fs.statSync(p); return true; } catch { return false; } }
function hash(s)        { return crypto.createHash('sha256').update(s).digest('hex').slice(0, 12); }

// ── Tokenizer for semantic overlap ──────────────────────────────────────────
const STOPWORDS = new Set(`a an and are as at be by for from has have he her him his i if in is it its of on or our she so than that the their them then there these they this to we were which will with would you your`.split(/\s+/));

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOPWORDS.has(t));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// ── Parsers ────────────────────────────────────────────────────────────────
function parseDecisions(text, slug) {
  if (!text) return [];
  const nodes = [];
  const sections = text.split(/^## /m).slice(1);
  for (const s of sections) {
    const firstLine = s.split('\n')[0].trim();
    const dateMatch = firstLine.match(/(\d{4}-\d{2}-\d{2})/);
    const title = firstLine.replace(/^\d{4}-\d{2}-\d{2}\s*[·—-]?\s*/, '').trim();
    const body = s.split('\n').slice(1).join('\n').trim();
    if (!title) continue;
    nodes.push({
      id: `dec:${slug}:${hash(title + (dateMatch?.[1] || ''))}`,
      type: 'decision',
      project: slug,
      title,
      date: dateMatch?.[1] || null,
      body: body.slice(0, 600),
      tokens: Array.from(new Set(tokenize(title + ' ' + body))),
    });
  }
  return nodes;
}

function parseCdr(text, slug) {
  if (!text) return [];
  const nodes = [];
  const sections = text.split(/^## /m).slice(1);
  for (const s of sections) {
    const firstLine = s.split('\n')[0].trim();
    const dateMatch = firstLine.match(/(\d{4}-\d{2}-\d{2})/);
    const title = firstLine.replace(/^\d{4}-\d{2}-\d{2}\s*[·—-]?\s*/, '').trim();
    const body = s.split('\n').slice(1).join('\n').trim();
    if (!title || /^refinement log|^append dated/i.test(title)) continue;
    nodes.push({
      id: `cdr:${slug}:${hash(title + (dateMatch?.[1] || ''))}`,
      type: 'direction',
      project: slug,
      title,
      date: dateMatch?.[1] || null,
      body: body.slice(0, 500),
      tokens: Array.from(new Set(tokenize(title + ' ' + body))),
    });
  }
  return nodes;
}

function parseSil(text, slug) {
  if (!text) return [];
  const nodes = [];
  const sections = text.split(/^## /m).slice(1);
  for (const s of sections) {
    const firstLine = s.split('\n')[0];
    if (!/\d{4}-\d{2}-\d{2}/.test(firstLine)) continue;
    const dateMatch = firstLine.match(/(\d{4}-\d{2}-\d{2})/);
    const sessionMatch = firstLine.match(/Session\s+(\d+)/);
    const totalMatch = firstLine.match(/Total:\s*(\d+)/);

    const winMatch = s.match(/\*\*Top win:\*\*\s*(.+?)(?=\n\n|\n\*\*|$)/s);
    const gapMatch = s.match(/\*\*Top gap:\*\*\s*(.+?)(?=\n\n|\n\*\*|$)/s);

    if (winMatch) {
      nodes.push({
        id: `learn:${slug}:${dateMatch[1]}:win`,
        type: 'learning',
        project: slug,
        date: dateMatch[1],
        session: sessionMatch ? parseInt(sessionMatch[1], 10) : null,
        scoreTotal: totalMatch ? parseInt(totalMatch[1], 10) : null,
        title: `win: ${winMatch[1].trim().slice(0, 100)}`,
        body: winMatch[1].trim(),
        kind: 'win',
        tokens: Array.from(new Set(tokenize(winMatch[1]))),
      });
    }
    if (gapMatch) {
      nodes.push({
        id: `learn:${slug}:${dateMatch[1]}:gap`,
        type: 'learning',
        project: slug,
        date: dateMatch[1],
        session: sessionMatch ? parseInt(sessionMatch[1], 10) : null,
        scoreTotal: totalMatch ? parseInt(totalMatch[1], 10) : null,
        title: `gap: ${gapMatch[1].trim().slice(0, 100)}`,
        body: gapMatch[1].trim(),
        kind: 'gap',
        tokens: Array.from(new Set(tokenize(gapMatch[1]))),
      });
    }
  }
  return nodes;
}

// ── Edge inference ─────────────────────────────────────────────────────────
function inferEdges(nodes) {
  const edges = [];
  const tokenSets = new Map(nodes.map(n => [n.id, new Set(n.tokens)]));

  // Cross-project relates-to (only between different projects — intra-project
  // overlap is too noisy)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      if (a.project === b.project) continue;
      const sim = jaccard(tokenSets.get(a.id), tokenSets.get(b.id));
      if (sim >= 0.35) {
        edges.push({
          from: a.id, to: b.id, type: 'relates-to', weight: Math.round(sim * 100) / 100,
        });
      }
    }
  }

  // Supersedes: decisions with same normalized title, different dates
  const byTitle = new Map();
  for (const n of nodes) {
    if (n.type !== 'decision') continue;
    const key = `${n.project}::${n.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(n);
  }
  for (const group of byTitle.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    for (let i = 0; i < group.length - 1; i++) {
      edges.push({ from: group[i + 1].id, to: group[i].id, type: 'supersedes', weight: 1 });
    }
  }

  return edges;
}

// ── Main ──────────────────────────────────────────────────────────────────
const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
const projects = (registry.projects || []).filter(p => !ONLY_PROJECT || p.slug === ONLY_PROJECT);

const allNodes = [];
const skipped = [];

for (const proj of projects) {
  const slug = proj.slug;
  const localPath = (proj.localPath || '').replace(/\\/g, '/');
  if (!localPath || !exists(localPath)) {
    skipped.push({ slug, reason: 'no-local-path' });
    continue;
  }

  const decisions = readText(path.join(localPath, 'context', 'DECISIONS.md'));
  const cdr = readText(path.join(localPath, 'docs', 'CREATIVE_DIRECTION_RECORD.md'));
  const sil = readText(path.join(localPath, 'context', 'SELF_IMPROVEMENT_LOOP.md'));

  allNodes.push(...parseDecisions(decisions, slug));
  allNodes.push(...parseCdr(cdr, slug));
  allNodes.push(...parseSil(sil, slug));
}

// Studio-level canon
const canonText = readText(path.join(ROOT, 'docs', 'STUDIO_CANON.md'));
if (canonText) {
  const sections = canonText.split(/^## /m).slice(1);
  for (const s of sections) {
    const firstLine = s.split('\n')[0].trim();
    if (!firstLine) continue;
    allNodes.push({
      id: `canon:${hash(firstLine)}`,
      type: 'canon',
      project: 'studio',
      title: firstLine,
      body: s.slice(0, 400),
      tokens: Array.from(new Set(tokenize(firstLine + ' ' + s.slice(0, 400)))),
    });
  }
}

const edges = inferEdges(allNodes);

const output = {
  _schema: '1.0',
  _generatedAt: new Date().toISOString(),
  _generatedBy: 'build-memory-graph.mjs',
  stats: {
    nodeCount: allNodes.length,
    edgeCount: edges.length,
    projectCount: projects.length,
    nodesByType: Object.fromEntries(
      ['decision', 'direction', 'learning', 'canon'].map(t => [t, allNodes.filter(n => n.type === t).length])
    ),
    edgesByType: Object.fromEntries(
      ['relates-to', 'supersedes'].map(t => [t, edges.filter(e => e.type === t).length])
    ),
    skipped,
  },
  nodes: allNodes,
  edges,
};

// ── Query mode ────────────────────────────────────────────────────────────
if (QUERY) {
  const qTokens = new Set(tokenize(QUERY));
  const matches = allNodes
    .map(n => ({ node: n, sim: jaccard(new Set(n.tokens), qTokens) }))
    .filter(m => m.sim > 0)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 15);

  process.stdout.write(`Query: "${QUERY}"  —  ${matches.length} matches\n\n`);
  for (const { node, sim } of matches) {
    process.stdout.write(`  [${node.type}] ${node.project}  ·  sim ${sim.toFixed(2)}\n`);
    process.stdout.write(`    ${node.title}\n`);
    if (node.date) process.stdout.write(`    ${node.date}\n`);
    process.stdout.write('\n');
  }
  process.exit(matches.length ? 0 : 1);
}

if (STATS_ONLY) {
  process.stdout.write(JSON.stringify(output.stats, null, 2) + '\n');
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n');

process.stdout.write(`✓ Wrote ${path.relative(ROOT, OUT_PATH)}\n`);
process.stdout.write(`  ${output.stats.nodeCount} nodes · ${output.stats.edgeCount} edges · ${output.stats.projectCount} projects\n`);
if (skipped.length) process.stdout.write(`  ${skipped.length} project(s) skipped (no local path)\n`);
