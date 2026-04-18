#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { inferManifest, readJson } from './lib/runtime-pack.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
const OUT_JSON = path.join(ROOT, 'portfolio', 'compiled', 'CAPACITY_PLAN.json');
const OUT_MD = path.join(ROOT, 'docs', 'CAPACITY_PLANNER.md');
const jsonMode = process.argv.includes('--json');

function exists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function providerFor(project, status, manifest) {
  const host = String(manifest.hosting?.hostingProvider || project.stagingType || status.stagingType || 'unknown').toLowerCase();
  const live = String(project.runtimeUrl || status.liveUrl || manifest.hosting?.liveUrl || '').toLowerCase();
  if (host.includes('hetzner') || live.includes('.staging.vaultsparkstudios.com')) return 'hetzner';
  if (host.includes('vercel') || live.includes('vercel.app')) return 'vercel';
  if (host.includes('render') || live.includes('railway.app')) return 'railway-render';
  if (host.includes('github-pages') || live.includes('github.io')) return 'github-pages';
  if (host.includes('platform-preview')) return 'platform-preview';
  if (host.includes('cloud') && String(project.supabaseHost || '').includes('supabase.co')) return 'supabase-cloud';
  if (host.includes('local')) return 'local';
  if (host.includes('none')) return 'none';
  return host || 'unknown';
}

function pressureFor(provider, count) {
  if (provider === 'hetzner') return count >= 6 ? 'high' : count >= 3 ? 'medium' : 'low';
  if (provider === 'vercel') return count >= 6 ? 'medium' : 'low';
  if (provider === 'platform-preview') return count >= 4 ? 'medium' : 'low';
  if (provider === 'unknown') return count >= 3 ? 'high' : 'medium';
  return count >= 8 ? 'medium' : 'low';
}

function recommendation(project, provider, manifest) {
  const notes = [];
  if (provider === 'unknown') notes.push('add explicit capacity block in STUDIO_MANIFEST');
  if (provider === 'hetzner') notes.push('validate shared-server headroom before adding persistent services');
  if (provider === 'platform-preview') notes.push('promote to explicit provider before production launch');
  if ((manifest.capacity?.freePlanCeilings || []).length === 0) notes.push('document free-tier ceilings and fallback runtime');
  return notes.join(' · ') || 'capacity metadata looks usable';
}

const registry = readJson(REGISTRY, { projects: [] });
const rows = [];
const byProvider = new Map();

for (const project of registry.projects || []) {
  if (!project.localPath || project.status === 'archived') continue;
  const projectRoot = path.resolve(project.localPath);
  const status = readJson(path.join(projectRoot, 'context', 'PROJECT_STATUS.json'), {});
  const manifest = exists(path.join(projectRoot, 'context', 'STUDIO_MANIFEST.json'))
    ? readJson(path.join(projectRoot, 'context', 'STUDIO_MANIFEST.json'), null)
    : null;
  const effectiveManifest = manifest || inferManifest(project, status);
  const provider = providerFor(project, status, effectiveManifest);
  const entry = {
    slug: project.slug,
    name: project.name,
    provider,
    audience: project.audience || status.audience || effectiveManifest.identity?.audience || 'unknown',
    lifecycle: project.lifecycle || status.lifecycle || effectiveManifest.identity?.lifecycle || 'unknown',
    currentPlanTier: effectiveManifest.capacity?.currentPlanTier || 'unknown',
    preferredRuntime: effectiveManifest.capacity?.preferredRuntime || provider,
    fallbackRuntime: effectiveManifest.capacity?.fallbackRuntime || 'hetzner',
    freePlanCeilings: effectiveManifest.capacity?.freePlanCeilings || [],
    recommendation: recommendation(project, provider, effectiveManifest),
  };
  rows.push(entry);
  byProvider.set(provider, [...(byProvider.get(provider) || []), entry]);
}

const providers = [...byProvider.entries()]
  .map(([provider, entries]) => ({
    provider,
    projects: entries.length,
    pressure: pressureFor(provider, entries.length),
    names: entries.map((entry) => entry.slug),
  }))
  .sort((a, b) => b.projects - a.projects);

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'render-capacity-planner.mjs',
  providers,
  projects: rows,
  studioRecommendation: providers
    .filter((provider) => provider.pressure !== 'low')
    .map((provider) => `${provider.provider}: ${provider.pressure} pressure (${provider.projects} projects)`),
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

writeJson(OUT_JSON, payload);

const lines = [
  '# Capacity Planner',
  '',
  `> Generated: ${payload.generatedAt.slice(0, 10)} · Providers tracked: ${providers.length}`,
  '',
  '## Provider Pressure',
  '',
  '| Provider | Projects | Pressure | Notes |',
  '|---|---:|---|---|',
  ...providers.map((provider) => `| ${provider.provider} | ${provider.projects} | ${provider.pressure.toUpperCase()} | ${provider.names.join(', ')} |`),
  '',
  '## Project Routing',
  '',
  '| Project | Provider | Plan tier | Preferred | Fallback | Recommendation |',
  '|---|---|---|---|---|---|',
  ...rows.map((entry) => `| ${entry.name} | ${entry.provider} | ${entry.currentPlanTier} | ${entry.preferredRuntime} | ${entry.fallbackRuntime} | ${entry.recommendation} |`),
  '',
];

if (payload.studioRecommendation.length > 0) {
  lines.push('## Studio Recommendation', '', ...payload.studioRecommendation.map((entry) => `- ${entry}`), '');
}

writeText(OUT_MD, lines.join('\n'));
console.log(`✓ Capacity planner → ${path.relative(ROOT, OUT_MD).replace(/\\/g, '/')} (${rows.length} projects)`);
