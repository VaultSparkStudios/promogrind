#!/usr/bin/env node
/**
 * render-decision-graph.mjs
 *
 * Causal Decision Graph — generates docs/DECISION_GRAPH.md
 * Parses DECISIONS.md and renders a Mermaid flowchart DAG showing causal
 * relationships between decisions: explicit "implements/extends/supersedes"
 * references and keyword-inferred implicit edges.
 *
 * Usage:
 *   node scripts/render-decision-graph.mjs [--project <localPath>] [--no-implicit]
 *   node scripts/ops.mjs decision-graph
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const projectIdx  = process.argv.indexOf('--project');
const targetPath  = projectIdx !== -1 ? path.resolve(process.argv[projectIdx + 1]) : ROOT;
const noImplicit  = process.argv.includes('--no-implicit');

// ── Helpers ───────────────────────────────────────────────────────────────────
function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}
function readJson(p, fb = {}) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; }
}

// ── Load ──────────────────────────────────────────────────────────────────────
const ctx          = (f) => path.join(targetPath, 'context', f);
const status       = readJson(ctx('PROJECT_STATUS.json'));
const decisionsText = readText(ctx('DECISIONS.md'));

if (!decisionsText.trim()) {
  console.error('DECISIONS.md not found or empty.');
  process.exit(1);
}

// ── Parse decisions ───────────────────────────────────────────────────────────
// Each block starts with: ## YYYY-MM-DD [— Session N] — Title
const BLOCK_RE = /^## (\d{4}-\d{2}-\d{2})[^\n]*?— (.+?)$/gm;
const blocks   = decisionsText.split(/(?=^## \d{4}-\d{2}-\d{2})/m).filter(b => /^## \d{4}/.test(b));

const decisions = [];
let idx = 0;
for (const block of blocks) {
  const headMatch = block.match(/^## (\d{4}-\d{2}-\d{2})[^\n]*?— ([^\n]+)/);
  if (!headMatch) continue;
  const date    = headMatch[1];
  const title   = headMatch[2].trim();
  const body    = block.slice(block.indexOf('\n') + 1).trim();
  const id      = `D${String(idx + 1).padStart(3, '0')}`;
  const session = block.match(/Session (\d+)/)?.[1] ? parseInt(block.match(/Session (\d+)/)[1]) : null;

  // Category detection
  let category = 'general';
  if (/\bSIL\b|\bself.improv/i.test(title + body))          category = 'sil';
  else if (/\bcanon\b|\bCANON/i.test(title + body))         category = 'canon';
  else if (/\bIGNIS\b/i.test(title + body))                 category = 'ignis';
  else if (/\bformat\b|\bschema\b|\btemplate\b/i.test(title + body)) category = 'schema';
  else if (/\bprotocol\b|\bprompt\b|\bcloseout\b/i.test(title + body)) category = 'protocol';
  else if (/\bsecurity\b|\bsanitiz/i.test(title + body))    category = 'security';
  else if (/\bregistr\b|\bhub\b|\bportfolio\b/i.test(title + body)) category = 'registry';

  decisions.push({ id, date, session, title, body, category });
  idx++;
}

// ── Explicit relationship extraction ─────────────────────────────────────────
// Looks for phrases like: "implements PROPOSAL-004", "supersedes Session 8 decision",
// "extends D015", "see also: D012", "see: 2026-03-27"
const EXPLICIT_PATTERNS = [
  { re: /\bimplements?\s+([A-Z]+-\d+|D\d{3}|PROPOSAL-\d+)/gi, type: 'implements' },
  { re: /\bsupersedes?\s+([^\s,.\n]{3,40})/gi,                 type: 'supersedes' },
  { re: /\bextends?\s+([^\s,.\n]{3,40})/gi,                    type: 'extends' },
  { re: /\bsee also:?\s+([^\s,.\n]{3,40})/gi,                  type: 'related' },
  { re: /\bsource:\s+([A-Z]+-\d+|D\d{3}|PROPOSAL-\d+)/gi,     type: 'source' },
  { re: /\bapplication:\s+([^\n]{3,60})/gi,                    type: 'application' },
];

// ── Implicit relationship detection by keyword overlap ────────────────────────
function significantKeywords(text) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has',
    'this', 'that', 'it', 'its', 'not', 'from', 'by', 'as', 'into',
    'when', 'than', 'then', 'will', 'would', 'should', 'could', 'can',
  ]);
  return new Set(
    text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 5 && !stopWords.has(w))
  );
}

const keywordMap = decisions.map(d => ({
  id: d.id,
  kw: significantKeywords(d.title + ' ' + d.body),
}));

function implicitEdges(minOverlap = 3) {
  const edges = [];
  for (let i = 0; i < keywordMap.length; i++) {
    for (let j = i + 1; j < keywordMap.length; j++) {
      const overlap = [...keywordMap[i].kw].filter(k => keywordMap[j].kw.has(k));
      if (overlap.length >= minOverlap) {
        // Earlier decision → later decision (temporal causality)
        edges.push({
          from: keywordMap[i].id,
          to:   keywordMap[j].id,
          type: 'implicit',
          overlap: overlap.length,
          shared: overlap.slice(0, 3).join(', '),
        });
      }
    }
  }
  return edges;
}

const implEdges  = noImplicit ? [] : implicitEdges(3);

// ── Node label cleanup ────────────────────────────────────────────────────────
function nodeLabel(d) {
  // Truncate to 45 chars, escape Mermaid special chars
  const label = d.title.slice(0, 45).replace(/"/g, "'").replace(/[{}[\]()]/g, '');
  const sess  = d.session ? ` S${d.session}` : ` ${d.date.slice(5)}`;
  return `"${d.id}${sess}: ${label}"`;
}

// ── Category → Mermaid style ──────────────────────────────────────────────────
const CATEGORY_STYLES = {
  canon:    'fill:#7ae7c7,color:#000',
  ignis:    'fill:#f59e0b,color:#000',
  sil:      'fill:#818cf8,color:#fff',
  schema:   'fill:#38bdf8,color:#000',
  protocol: 'fill:#a78bfa,color:#fff',
  security: 'fill:#f87171,color:#fff',
  registry: 'fill:#34d399,color:#000',
  general:  'fill:#e5e7eb,color:#000',
};

// ── Build Mermaid ─────────────────────────────────────────────────────────────
const mermaid = ['graph LR'];

// Nodes
for (const d of decisions) {
  mermaid.push(`  ${d.id}[${nodeLabel(d)}]`);
}

// Explicit edges (none parsed yet — placeholder for future manual annotation)
// For now we encode implicit edges only, limiting to top 40 by overlap count
const topImplicit = implEdges
  .sort((a, b) => b.overlap - a.overlap)
  .slice(0, 40);

for (const e of topImplicit) {
  const style = e.type === 'implicit' ? ' -.->|related|' : ' -->|extends|';
  mermaid.push(`  ${e.from}${style}${e.to}`);
}

// Style classes
const categoryGroups = {};
for (const d of decisions) {
  (categoryGroups[d.category] ??= []).push(d.id);
}
for (const [cat, ids] of Object.entries(categoryGroups)) {
  if (ids.length === 0) continue;
  mermaid.push(`  classDef ${cat} ${CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.general}`);
  mermaid.push(`  class ${ids.join(',')} ${cat}`);
}

// ── Build markdown ────────────────────────────────────────────────────────────
const today    = new Date().toISOString().slice(0, 10);
const projName = status.name ?? path.basename(targetPath);

const lines = [
  `<!-- generated-by: scripts/render-decision-graph.mjs -->`,
  `<!-- generated-at: ${today} -->`,
  ``,
  `# Decision Graph — ${projName}`,
  ``,
  `> Visualises causal relationships between logged decisions.`,
  `> Dashed arrows = keyword-inferred relationship (≥3 shared terms).`,
  `> Regenerate with: \`node scripts/ops.mjs decision-graph\``,
  ``,
  `---`,
  ``,
  `## At a Glance`,
  ``,
  `| Metric | Value |`,
  `|---|---|`,
  `| Total decisions | ${decisions.length} |`,
  `| Implicit edges | ${topImplicit.length} (top by overlap) |`,
  `| Categories | ${Object.keys(categoryGroups).join(', ')} |`,
  ``,
  `**Legend:**`,
  `- 🟢 \`canon\` — Studio canon decisions`,
  `- 🟡 \`ignis\` — IGNIS scoring / proposals`,
  `- 🟣 \`sil\` — Self-improvement loop`,
  `- 🔵 \`schema\` — Data schema / templates`,
  `- 💜 \`protocol\` — Session protocol`,
  `- 🔴 \`security\` — Security / sanitization`,
  `- 🟩 \`registry\` — Project registry / hub`,
  ``,
  `---`,
  ``,
  `## Graph`,
  ``,
  '```mermaid',
  ...mermaid,
  '```',
  ``,
  `---`,
  ``,
  `## Decision Index`,
  ``,
  `| ID | Date | Session | Category | Title |`,
  `|---|---|---|---|---|`,
  ...decisions.map(d =>
    `| ${d.id} | ${d.date} | ${d.session ? `S${d.session}` : '—'} | ${d.category} | ${d.title.slice(0, 60)} |`
  ),
  ``,
  `---`,
  ``,
];

if (topImplicit.length > 0) {
  lines.push(`## Top Keyword Relationships`, ``);
  lines.push(`| From | To | Shared keywords | Overlap |`);
  lines.push(`|---|---|---|---:|`);
  for (const e of topImplicit.slice(0, 20)) {
    lines.push(`| ${e.from} | ${e.to} | ${e.shared} | ${e.overlap} |`);
  }
  lines.push(``);
  lines.push(`---`, ``);
}

lines.push(`*Generated by \`scripts/render-decision-graph.mjs\` · ${today}*`, ``);

// ── Write output ──────────────────────────────────────────────────────────────
const outPath = path.join(targetPath, 'docs', 'DECISION_GRAPH.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

const rel = path.relative(ROOT, outPath);
console.log(`✓ Decision graph → ${rel}`);
console.log(`  ${decisions.length} decisions · ${topImplicit.length} implicit edges · ${Object.keys(categoryGroups).length} categories`);
