#!/usr/bin/env node
/**
 * run-loop-c.mjs
 *
 * Loop C — Semantic Decision Pattern Detector
 * Scans local DECISIONS.md files across all studioOsApplied repos to find
 * semantic n-gram patterns that recur across 2+ projects. Unlike Loop B
 * (which fetches from GitHub API), Loop C reads the filesystem directly —
 * instant, private, and works offline.
 *
 * Patterns are ranked by frequency + semantic density. Results are written
 * to docs/LOOP_C_PATTERNS.md and optionally flagged as canon candidates.
 *
 * Usage:
 *   node scripts/run-loop-c.mjs [--threshold N] [--json] [--min-words N]
 *   node scripts/ops.mjs loop-c
 *
 * Options:
 *   --threshold N    Min projects for a pattern to be flagged (default: 2)
 *   --min-words N    Min n-gram size (default: 4)
 *   --json           Machine-readable output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const threshIdx = process.argv.indexOf('--threshold');
const THRESHOLD = threshIdx !== -1 ? parseInt(process.argv[threshIdx + 1]) : 2;
const minWIdx   = process.argv.indexOf('--min-words');
const MIN_WORDS = minWIdx !== -1 ? parseInt(process.argv[minWIdx + 1]) : 4;
const jsonOut   = process.argv.includes('--json');

// ── Helpers ───────────────────────────────────────────────────────────────────
function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}
function readJson(p, fb = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; }
}

// ── Load registry ─────────────────────────────────────────────────────────────
const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'));
if (!registry?.projects) {
  console.error('Could not load portfolio/PROJECT_REGISTRY.json');
  process.exit(1);
}

const applyProjects = registry.projects.filter(p =>
  p.studioOsApplied && p.status !== 'archived' && p.localPath
);

// ── Read DECISIONS.md from each project ───────────────────────────────────────
const projectDecisions = {};
const projectPaths     = {};

for (const proj of applyProjects) {
  const localPath = proj.localPath;
  const decPath   = path.join(localPath, 'context', 'DECISIONS.md');
  const text      = readText(decPath);
  if (text.trim()) {
    projectDecisions[proj.slug] = text;
    projectPaths[proj.slug] = decPath;
  }
}

const scannedProjects = Object.keys(projectDecisions);
console.log(`Scanning ${scannedProjects.length} / ${applyProjects.length} projects (${applyProjects.length - scannedProjects.length} unreadable)`);

// ── Structural ignore list (Studio OS boilerplate) ────────────────────────────
const IGNORE_LIST = [
  'session lock written', 'session lock cleared', 'studio os applied',
  'studio os compliance', 'append only never delete', 'close out write back',
  'closeout write back', 'self improvement loop', 'rolling status auto updated',
  'latest handoff authoritative', 'canon decision accepted', 'truth audit last run',
  'beacon configured', 'sil entry appended', 'task board updated', 'decision accepted',
  'alternatives considered', 'rationale', 'implementation', 'source',
];

function shouldIgnore(phrase) {
  return IGNORE_LIST.some(ig => phrase.includes(ig) || ig.includes(phrase));
}

// ── Extract meaningful decision lines ─────────────────────────────────────────
function extractDecisionLines(content) {
  return content.split('\n')
    .filter(l => /^#{2,3}\s/.test(l) || /^-\s.{20,}/.test(l) || /^\*\*.{10,}/.test(l))
    .map(l => l.replace(/^#{2,3}\s/, '').replace(/^[-*]+\s/, '').replace(/\*\*/g, '').trim())
    .filter(l => l.length > 20 && !/^#+\s*(History|Log|Record|Decisions|CANON|Backlog)/i.test(l));
}

// ── Semantic scoring: penalise generic terms ──────────────────────────────────
const GENERIC_TERMS = new Set([
  'project', 'session', 'studio', 'used', 'based', 'using', 'added',
  'updated', 'changed', 'created', 'moved', 'removed', 'instead',
  'decision', 'accepted', 'approved', 'approach',
]);

function semanticDensity(phrase) {
  const words = phrase.split(' ');
  const meaningful = words.filter(w => !GENERIC_TERMS.has(w) && w.length >= 5);
  return meaningful.length / Math.max(1, words.length);
}

// ── N-gram extraction ─────────────────────────────────────────────────────────
function extractNgrams(text, minLen, maxLen) {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4);
  const ngrams = new Set();
  for (let len = minLen; len <= maxLen; len++) {
    for (let i = 0; i <= words.length - len; i++) {
      ngrams.add(words.slice(i, i + len).join(' '));
    }
  }
  return ngrams;
}

// ── Cross-project pattern analysis ───────────────────────────────────────────
const phraseProjects = {};

for (const [slug, content] of Object.entries(projectDecisions)) {
  const lines  = extractDecisionLines(content);
  const joined = lines.join(' ');
  const ngrams = extractNgrams(joined, MIN_WORDS, MIN_WORDS + 3);

  for (const phrase of ngrams) {
    if (shouldIgnore(phrase)) continue;
    if (!phraseProjects[phrase]) phraseProjects[phrase] = new Set();
    phraseProjects[phrase].add(slug);
  }
}

// ── Filter, score, and rank ───────────────────────────────────────────────────
const candidates = Object.entries(phraseProjects)
  .filter(([, projects]) => projects.size >= THRESHOLD)
  .map(([phrase, projects]) => ({
    phrase,
    count: projects.size,
    projects: [...projects],
    density: semanticDensity(phrase),
    score: projects.size * 10 + semanticDensity(phrase) * 5,
  }))
  .sort((a, b) => b.score - a.score);

// Deduplicate: remove phrases that are substrings of longer higher-scoring phrases
const deduped = candidates.filter(({ phrase, score }) =>
  !candidates.some(
    (other) => other.phrase !== phrase &&
      other.phrase.includes(phrase) &&
      other.score >= score
  )
).slice(0, 30);

// ── JSON mode ─────────────────────────────────────────────────────────────────
if (jsonOut) {
  console.log(JSON.stringify({
    date: new Date().toISOString().slice(0, 10),
    threshold: THRESHOLD,
    scannedProjects: scannedProjects.length,
    patterns: deduped,
  }, null, 2));
  process.exit(0);
}

// ── Build markdown ─────────────────────────────────────────────────────────────
const today    = new Date().toISOString().slice(0, 10);
const lines    = [
  `<!-- generated-by: scripts/run-loop-c.mjs -->`,
  `<!-- generated-at: ${today} -->`,
  ``,
  `# Loop C — Semantic Decision Patterns`,
  ``,
  `> Cross-project semantic n-gram analysis of DECISIONS.md files across all studioOsApplied repos.`,
  `> Patterns recurring in ≥${THRESHOLD} projects may be canon candidates.`,
  `> Run with: \`node scripts/ops.mjs loop-c\``,
  ``,
  `---`,
  ``,
  `## Summary`,
  ``,
  `\`\`\``,
  `Scanned projects: ${scannedProjects.length}`,
  `Threshold:        ${THRESHOLD} projects`,
  `Patterns found:   ${deduped.length}`,
  `Date:             ${today}`,
  `\`\`\``,
  ``,
  `---`,
  ``,
];

if (deduped.length === 0) {
  lines.push(`## No Patterns Found`, ``);
  lines.push(`No decision patterns recurring across ≥${THRESHOLD} projects were detected.`);
  lines.push(`Try lowering --threshold to 2, or check that projects are readable locally.`, ``);
} else {
  lines.push(`## Patterns (ranked by frequency × density)`, ``);
  lines.push(`| # | Pattern | Projects | Density | Projects |`);
  lines.push(`|---|---|---:|---:|---|`);
  deduped.forEach((p, i) => {
    lines.push(`| ${i + 1} | \`${p.phrase}\` | ${p.count} | ${p.density.toFixed(2)} | ${p.projects.join(', ')} |`);
  });
  lines.push(``);
  lines.push(`---`, ``);

  // Canon candidate callout
  const canonCandidates = deduped.filter(p => p.count >= Math.max(3, THRESHOLD + 1) && p.density >= 0.5);
  if (canonCandidates.length > 0) {
    lines.push(`## ⬆ Canon Candidates (high frequency + density)`, ``);
    lines.push(`These patterns appear in ${Math.max(3, THRESHOLD + 1)}+ projects with high semantic density:`);
    lines.push(``);
    for (const p of canonCandidates) {
      lines.push(`- **"${p.phrase}"** — ${p.count} projects: ${p.projects.join(', ')}`);
    }
    lines.push(``);
    lines.push(`To promote to canon: add entry to \`docs/STUDIO_CANON.md\` and log decision in \`context/DECISIONS.md\`.`, ``);
    lines.push(`---`, ``);
  }

  // Project coverage
  lines.push(`## Project Coverage`, ``);
  lines.push(`| Project | DECISIONS.md | Lines extracted |`);
  lines.push(`|---|---|---:|`);
  for (const slug of scannedProjects) {
    const lines2 = extractDecisionLines(projectDecisions[slug]).length;
    lines.push(`| ${slug} | ✓ | ${lines2} |`);
  }
  for (const proj of applyProjects.filter(p => !scannedProjects.includes(p.slug))) {
    lines.push(`| ${proj.slug} | ✗ not found | — |`);
  }
  lines.push(``);
  lines.push(`---`, ``);
}

lines.push(`*Generated by \`scripts/run-loop-c.mjs\` · ${today}*`, ``);

// ── Write output ──────────────────────────────────────────────────────────────
const outPath = path.join(ROOT, 'docs', 'LOOP_C_PATTERNS.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log(`✓ Loop C patterns → docs/LOOP_C_PATTERNS.md`);
console.log(`  Scanned ${scannedProjects.length} projects · found ${deduped.length} patterns (threshold: ≥${THRESHOLD} projects)`);
