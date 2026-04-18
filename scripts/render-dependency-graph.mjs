#!/usr/bin/env node
/**
 * render-dependency-graph.mjs
 *
 * Cross-project service dependency graph.
 * Reads PROJECT_REGISTRY.json and infers which external services each project
 * depends on (Stripe, Supabase, Railway, Cloudflare R2, Resend, etc.).
 * Renders docs/DEPENDENCY_GRAPH.md with a table + Mermaid diagram.
 *
 * Usage:
 *   node scripts/render-dependency-graph.mjs
 *   node scripts/render-dependency-graph.mjs --json
 *   node scripts/ops.mjs dep-graph
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const argv     = process.argv.slice(2);
const jsonMode = argv.includes('--json');
const OUT      = path.join(ROOT, 'docs', 'DEPENDENCY_GRAPH.md');
const today    = new Date().toISOString().slice(0, 10);

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function readText(p)     { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
const projects = (registry.projects ?? []).filter(p => p.status !== 'archived');

// ── Service detection rules ────────────────────────────────────────────────────
// Each service: { id, label, emoji, detect(project, contextText) → bool }
const SERVICES = [
  {
    id: 'stripe',
    label: 'Stripe',
    emoji: '💳',
    detect: (p, txt) => p.stripeReady || p.revenueModel === 'stripe' ||
      /stripe/i.test(txt) || (p.stripeProductionPriceIds ?? []).length > 0,
  },
  {
    id: 'supabase',
    label: 'Supabase',
    emoji: '🐘',
    detect: (p) => !!(p.supabaseHost) && p.supabaseHost !== 'none',
  },
  {
    id: 'railway',
    label: 'Railway',
    emoji: '🚂',
    detect: (p, txt) => /railway/i.test(txt) || /railway/i.test(p.liveUrl ?? ''),
  },
  {
    id: 'vercel',
    label: 'Vercel',
    emoji: '▲',
    detect: (p, txt) => /vercel/i.test(txt) || /vercel\.app/i.test(p.liveUrl ?? '') || p.stagingType === 'vercel-preview',
  },
  {
    id: 'hetzner',
    label: 'Hetzner',
    emoji: '🖥',
    detect: (p) => p.stagingType === 'hetzner' || /hetzner|178\.156/i.test(p.stagingUrl ?? ''),
  },
  {
    id: 'cloudflare-r2',
    label: 'Cloudflare R2',
    emoji: '☁',
    detect: (_p, txt) => /cloudflare.*r2|r2.*backup|pg_dump/i.test(txt),
  },
  {
    id: 'cloudflare-dns',
    label: 'Cloudflare DNS',
    emoji: '🌐',
    detect: (_p, txt) => /cloudflare|dns.*wildcard|\*\.staging/i.test(txt),
  },
  {
    id: 'resend',
    label: 'Resend (email)',
    emoji: '📧',
    detect: (_p, txt) => /resend|smtp/i.test(txt),
  },
  {
    id: 'anthropic',
    label: 'Anthropic API',
    emoji: '🤖',
    detect: (_p, txt) => /anthropic|claude.*api|ANTHROPIC_API_KEY/i.test(txt),
  },
  {
    id: 'discord',
    label: 'Discord',
    emoji: '🎮',
    detect: (_p, txt) => /discord/i.test(txt),
  },
  {
    id: 'github-actions',
    label: 'GitHub Actions',
    emoji: '⚙',
    detect: (p) => !!(p.studioOsApplied),
  },
];

// ── Load context text per project for richer detection ────────────────────────
function loadProjectContext(p) {
  if (!p.localPath) return '';
  const base = p.localPath.replace(/\\/g, '/');
  const files = [
    path.join(base, 'context', 'CURRENT_STATE.md'),
    path.join(base, 'context', 'TASK_BOARD.md'),
    path.join(base, 'context', 'DECISIONS.md'),
  ];
  return files.map(f => readText(f)).join(' ').slice(0, 8000);
}

// ── Build dependency map ───────────────────────────────────────────────────────
const depMap = []; // { project, slug, status, vaultStatus, services[] }

for (const p of projects) {
  const ctx = loadProjectContext(p);
  const services = SERVICES.filter(s => s.detect(p, ctx)).map(s => s.id);
  if (services.length > 0) {
    depMap.push({
      name: p.name ?? p.slug,
      slug: p.slug,
      status: p.status ?? 'unknown',
      vaultStatus: p.vaultStatus ?? 'FORGE',
      services,
    });
  }
}

// ── Service → projects reverse map ────────────────────────────────────────────
const serviceMap = {}; // serviceId → project names[]
for (const { slug, services } of depMap) {
  for (const svc of services) {
    if (!serviceMap[svc]) serviceMap[svc] = [];
    serviceMap[svc].push(slug);
  }
}

// Find services used by 3+ projects (high blast radius)
const highBlast = SERVICES.filter(s => (serviceMap[s.id] ?? []).length >= 3);

if (jsonMode) {
  console.log(JSON.stringify({ generated: today, projects: depMap, serviceMap, highBlastServices: highBlast.map(s => s.id) }, null, 2));
  process.exit(0);
}

// ── Render markdown ───────────────────────────────────────────────────────────
const lines = [
  `<!-- generated-by: scripts/render-dependency-graph.mjs -->`,
  `<!-- generated-at: ${today} -->`,
  ``,
  `# Cross-Project Dependency Graph`,
  ``,
  `> Auto-generated ${today} · ${depMap.length} projects · ${SERVICES.length} services tracked`,
  ``,
  `## High Blast-Radius Services (≥3 projects)`,
  ``,
  `| Service | Projects | Impact |`,
  `|---|---|---|`,
];

for (const svc of SERVICES) {
  const affected = serviceMap[svc.id] ?? [];
  if (affected.length >= 3) {
    const impact = affected.length >= 5 ? '🔴 Critical' : affected.length >= 3 ? '🟠 High' : '🟡 Medium';
    lines.push(`| ${svc.emoji} ${svc.label} | ${affected.join(', ')} | ${impact} |`);
  }
}

lines.push(``, `## Full Dependency Table`, ``);
lines.push(`| Project | Vault Status | ${SERVICES.map(s => s.emoji).join(' | ')} |`);
lines.push(`|---|---|${SERVICES.map(() => '---').join('|')}|`);

for (const { name, vaultStatus, services } of depMap) {
  const cells = SERVICES.map(s => services.includes(s.id) ? '✓' : '·');
  lines.push(`| **${name}** | ${vaultStatus} | ${cells.join(' | ')} |`);
}

// Add service legend
lines.push(``, `### Legend`, ``);
for (const s of SERVICES) {
  lines.push(`- ${s.emoji} **${s.label}** (id: \`${s.id}\`)`);
}

// Mermaid diagram
lines.push(``, `## Mermaid Dependency Graph`, ``, `\`\`\`mermaid`, `graph LR`);
lines.push(`  subgraph Services`);
for (const s of SERVICES) {
  if ((serviceMap[s.id] ?? []).length > 0) {
    lines.push(`    ${s.id}["${s.emoji} ${s.label}"]`);
  }
}
lines.push(`  end`);

for (const { name, slug, vaultStatus, services } of depMap) {
  const vsStyle = vaultStatus === 'SPARKED' ? ':::sparked' : vaultStatus === 'VAULTED' ? ':::vaulted' : '';
  lines.push(`  ${slug}["${name}"]${vsStyle}`);
  for (const svc of services) {
    lines.push(`  ${slug} --> ${svc}`);
  }
}

lines.push(
  `  classDef sparked fill:#7ae7c7,color:#000`,
  `  classDef vaulted fill:#64748b,color:#fff`,
  `\`\`\``,
  ``,
  `## Credential Outage Impact`,
  ``,
  `If a credential is revoked or a service goes down, these projects are affected:`,
  ``,
  `| Service | Affected Projects | Action |`,
  `|---|---|---|`,
);

for (const svc of SERVICES) {
  const affected = serviceMap[svc.id] ?? [];
  if (affected.length > 0) {
    const action = affected.length >= 3
      ? `⛔ Immediate — ${affected.length} projects impacted`
      : `⚠ Check ${affected.join(', ')}`;
    lines.push(`| ${svc.emoji} ${svc.label} | ${affected.join(', ')} | ${action} |`);
  }
}

lines.push(``, `---`, ``, `*Re-generate: \`node scripts/ops.mjs dep-graph\`*`);

fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`✓ Dependency graph → docs/DEPENDENCY_GRAPH.md  (${depMap.length} projects, ${SERVICES.length} services)`);
if (highBlast.length > 0) {
  console.log(`  ⚠  High blast-radius: ${highBlast.map(s => s.label).join(', ')}`);
}
