#!/usr/bin/env node
/**
 * render-testability.mjs — Testability matrix (v3.1)
 *
 * Reads `testingSurfaces` from every project's PROJECT_STATUS.json (via
 * PROJECT_REGISTRY localPath) and writes a portfolio-wide testability matrix
 * to `portfolio/TESTABILITY.md`. With --probe, performs HEAD requests against
 * URL surfaces and updates the `status` field in each project's status JSON.
 *
 * Feeds Hub Testability Matrix tab + Test-It-Now brief block.
 *
 * Usage:
 *   node scripts/render-testability.mjs
 *   node scripts/render-testability.mjs --probe    # live probe URLs
 *   node scripts/render-testability.mjs --json
 */

import fs from 'fs';
import https from 'https';
import http  from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
const OUT      = path.join(ROOT, 'portfolio', 'TESTABILITY.md');

const probe = process.argv.includes('--probe');
const jsonMode = process.argv.includes('--json');

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function writeJson(p, v) { fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); }

async function probeUrl(url) {
  return new Promise(resolve => {
    try {
      const u = new URL(url);
      const mod = u.protocol === 'https:' ? https : http;
      const req = mod.request({
        hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search, method: 'HEAD', timeout: 8000,
      }, (res) => { resolve(res.statusCode >= 200 && res.statusCode < 400 ? 'green' : 'red'); });
      req.on('error', () => resolve('red'));
      req.on('timeout', () => { req.destroy(); resolve('red'); });
      req.end();
    } catch { resolve('red'); }
  });
}

const registry = readJson(REGISTRY, { projects: [] });
const projects = registry.projects || [];
const rows = [];

for (const p of projects) {
  const localStatus = p.localPath ? path.join(p.localPath, 'context', 'PROJECT_STATUS.json') : null;
  const status = localStatus && fs.existsSync(localStatus) ? readJson(localStatus, {}) : {};
  const surfaces = status.testingSurfaces || inferSurfaces(p);

  // Optional live probing of URL surfaces
  if (probe) {
    for (const s of surfaces) {
      if (s.url) s.status = await probeUrl(s.url);
      if (s.command && !s.status) s.status = 'unknown';
      s.lastChecked = new Date().toISOString().slice(0, 10);
    }
    if (localStatus && fs.existsSync(localStatus)) {
      status.testingSurfaces = surfaces;
      try { writeJson(localStatus, status); } catch {}
    }
  }

  rows.push({
    slug: p.slug,
    name: p.name,
    vaultStatus: p.vaultStatus,
    surfaces,
  });
}

if (jsonMode) {
  console.log(JSON.stringify({ rows }, null, 2));
  process.exit(0);
}

function inferSurfaces(p) {
  const out = [];
  if (p.liveUrl)    out.push({ type: 'production', url: p.liveUrl,    status: 'unknown' });
  if (p.stagingUrl) out.push({ type: 'staging',    url: p.stagingUrl, status: 'unknown' });
  if (p.github)     out.push({ type: 'github',     url: p.github,     status: 'green' });
  return out;
}

// ── Render MD ────────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const md = [
  `<!-- generated-by: scripts/render-testability.mjs v3.1 -->`,
  `<!-- generated-at: ${today} -->`,
  ``,
  `# Testability Matrix`,
  ``,
  `> Where every VaultSpark project can be tested **right now**. One row per project; columns are surface types. Run \`ops testability --probe\` to live-probe URLs.`,
  ``,
  `**${rows.length} projects** · ${probe ? 'live-probed' : 'static view'} · ${today}`,
  ``,
  `| Project | Vault | Local | Staging | Production | Preview | Supabase | GitHub | Tests / Doctor |`,
  `|---|---|---|---|---|---|---|---|---|`,
];

const icon = { green: '✓', yellow: '⚠', red: '⛔', unknown: '·' };
function cell(surfaces, type) {
  const s = surfaces.find(x => x.type === type);
  if (!s) return '—';
  const target = s.url || s.command || '';
  const ic = icon[s.status || 'unknown'] || '·';
  const short = target.replace(/^https?:\/\//, '').slice(0, 30);
  return `${ic} [${short}](${target})`;
}

for (const r of rows.sort((a, b) => (a.name || a.slug).localeCompare(b.name || b.slug))) {
  const local = r.surfaces.find(s => s.type === 'local');
  const tests = r.surfaces.find(s => s.type === 'tests') || r.surfaces.find(s => s.type === 'doctor');
  md.push(
    `| ${r.name || r.slug} | ${r.vaultStatus || '—'} ` +
    `| ${local ? (local.command || local.url) : '—'} ` +
    `| ${cell(r.surfaces, 'staging')} ` +
    `| ${cell(r.surfaces, 'production')} ` +
    `| ${cell(r.surfaces, 'preview')} ` +
    `| ${cell(r.surfaces, 'supabase')} ` +
    `| ${cell(r.surfaces, 'github')} ` +
    `| ${tests ? `\`${(tests.command || tests.url || '').slice(0, 36)}\`` : '—'} |`
  );
}

md.push('', '---', '', `*Generated by \`scripts/render-testability.mjs\`. Per-project surfaces live in \`context/PROJECT_STATUS.json\` → \`testingSurfaces\`.*`);

fs.writeFileSync(OUT, md.join('\n') + '\n');
console.log(`✓ Testability matrix → portfolio/TESTABILITY.md  (${rows.length} projects)`);
