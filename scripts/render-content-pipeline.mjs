#!/usr/bin/env node
/**
 * render-content-pipeline.mjs
 *
 * Seeds portfolio/CONTENT_PIPELINE.md with per-project content-readiness
 * signals from PROJECT_REGISTRY.json. Generates a prioritized table of
 * content opportunities: unannounced projects, branding gaps, launch momentum.
 *
 * Preserves any manually appended entries below the generated header section.
 *
 * Usage:
 *   node scripts/render-content-pipeline.mjs
 *   node scripts/ops.mjs content-pipeline
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const today = new Date().toISOString().slice(0, 10);

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function readText(p)     { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
const projects = registry.projects ?? [];

// ── Content readiness scoring ─────────────────────────────────────────────────
function scoreProject(p) {
  let score = 0;
  let priority = 'LOW';
  const reasons = [];

  const status = (p.vaultStatus ?? '').toLowerCase();
  const launch = p.launchStatus ?? 'not-applicable';
  const branding = p.brandingCompliant;
  const live = !!p.liveUrl || !!p.runtimeUrl;

  // Unannounced deployed projects are the highest-value content opportunity
  if (launch === 'deployed-unannounced') {
    score += 50;
    reasons.push('deployed & silent');
  }

  // SPARKED projects with live presence
  if (status === 'sparked') {
    score += 20;
    if (launch === 'announced') reasons.push('SPARKED+announced');
    if (!live) reasons.push('no live URL found');
  }

  // Pre-deploy SPARKED — needs launch prep
  if (status === 'sparked' && launch === 'pre-deploy') {
    score += 15;
    reasons.push('pre-deploy SPARKED');
  }

  // FORGE with active dev — content prep opportunity
  if (status === 'forge') {
    score += 5;
    reasons.push('FORGE — prep');
  }

  // Branding gap
  if (p.brandingRequired && branding === false) {
    score += 10;
    reasons.push('branding needed');
  }

  // Public audience multiplier
  if ((p.audience ?? '').startsWith('public')) {
    score += 10;
  }

  // Derive priority
  if (score >= 60) priority = 'HIGH';
  else if (score >= 25) priority = 'MEDIUM';
  else priority = 'LOW';

  return { score, priority, reasons };
}

// ── Build per-project rows ────────────────────────────────────────────────────
const rows = projects
  .filter(p => {
    // Skip internal infrastructure, VAULTED, not-applicable
    if ((p.audience ?? '') === 'internal') return false;
    if ((p.vaultStatus ?? '').toLowerCase() === 'vaulted') return false;
    return true;
  })
  .map(p => {
    const { score, priority, reasons } = scoreProject(p);
    return { p, score, priority, reasons };
  })
  .sort((a, b) => b.score - a.score);

const highRows   = rows.filter(r => r.priority === 'HIGH');
const medRows    = rows.filter(r => r.priority === 'MEDIUM');
const lowRows    = rows.filter(r => r.priority === 'LOW');

function vaultBadge(s) {
  const v = (s ?? '').toLowerCase();
  return v === 'sparked' ? 'SPARKED' : v === 'forge' ? 'FORGE' : v === 'vaulted' ? 'VAULTED' : v.toUpperCase();
}

function launchBadge(l) {
  if (l === 'deployed-unannounced') return '⚠ unannounced';
  if (l === 'announced')            return '✓ announced';
  if (l === 'pre-deploy')           return '○ pre-deploy';
  return '—';
}

function brandingBadge(req, comp) {
  if (!req) return '—';
  if (comp === true) return '✓';
  if (comp === false) return '⚠';
  return '?';
}

function tableRow(r) {
  const { p, priority, reasons } = r;
  const name     = (p.name ?? p.slug ?? '').slice(0, 28);
  const vault    = vaultBadge(p.vaultStatus);
  const launch   = launchBadge(p.launchStatus);
  const brand    = brandingBadge(p.brandingRequired, p.brandingCompliant);
  const liveUrl  = p.liveUrl || p.runtimeUrl ? '✓' : '—';
  const action   = reasons.length > 0 ? reasons.join(' · ') : '—';
  return `| ${name.padEnd(28)} | ${priority.padEnd(6)} | ${vault.padEnd(7)} | ${launch.padEnd(14)} | ${brand.padEnd(8)} | ${liveUrl.padEnd(5)} | ${action} |`;
}

const tableHeader = [
  '| Project                       | Prior | Status  | Launch         | Branding | Live  | Action signal |',
  '|-------------------------------|-------|---------|----------------|----------|-------|----------------|',
];

const highSection   = highRows.length > 0   ? ['', '### HIGH Priority', '', ...tableHeader, ...highRows.map(tableRow)]   : [];
const medSection    = medRows.length > 0    ? ['', '### MEDIUM Priority', '', ...tableHeader, ...medRows.map(tableRow)]   : [];
const lowSection    = lowRows.length > 0    ? ['', '### LOW Priority', '', ...tableHeader, ...lowRows.map(tableRow)]     : [];

// ── Find manually-appended entries (below the GENERATED SECTION marker) ───────
const GENERATED_END = '<!-- /generated-content-readiness -->';
const existingContent = readText(path.join(ROOT, 'portfolio', 'CONTENT_PIPELINE.md'));
const manualIdx = existingContent.indexOf(GENERATED_END);
const manualAppendix = manualIdx !== -1 ? existingContent.slice(manualIdx + GENERATED_END.length).trimStart() : '';

// ── Build output ──────────────────────────────────────────────────────────────
const lines = [
  '# Content Pipeline',
  '',
  'Studio-wide content calendar maintained by the Social Content Pipeline Agent.',
  'Append only — entries accumulate over time.',
  '',
  '---',
  '',
  '<!-- generated-content-readiness -->',
  `> Generated: ${today} · ${rows.length} projects evaluated · ${highRows.length} HIGH / ${medRows.length} MEDIUM / ${lowRows.length} LOW priority`,
  '',
  '## Content Readiness Matrix',
  '',
  `Projects scored on: launch status, vault status, branding compliance, public presence.`,
  `HIGH = act now (unannounced deployed projects). MEDIUM = upcoming. LOW = prep phase.`,
  '',
  ...highSection,
  ...medSection,
  ...lowSection,
  '',
  '---',
  '',
  `*Run \`node scripts/ops.mjs content-pipeline\` to refresh.*`,
  '',
  GENERATED_END,
];

if (manualAppendix) {
  lines.push('', '---', '', '## Pipeline Entries (manually appended)', '', manualAppendix.trim());
}

const outputPath = path.join(ROOT, 'portfolio', 'CONTENT_PIPELINE.md');
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');

console.log(`✓ Content pipeline → portfolio/CONTENT_PIPELINE.md`);
console.log(`  ${rows.length} projects evaluated · ${highRows.length} HIGH / ${medRows.length} MEDIUM / ${lowRows.length} LOW`);
if (highRows.length > 0) {
  console.log(`  HIGH priority:`);
  highRows.forEach(r => console.log(`    - ${r.p.name}: ${r.reasons.join(' · ')}`));
}
