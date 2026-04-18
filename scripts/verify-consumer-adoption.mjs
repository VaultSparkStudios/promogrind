#!/usr/bin/env node
/**
 * verify-consumer-adoption.mjs
 *
 * Checks whether downstream Studio consumers reference the current compiled
 * Studio Ops feeds/adoption pack. Drift here means Studio Ops is publishing
 * useful truth that sibling tools are not yet consuming.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const registry = readJson('portfolio/PROJECT_REGISTRY.json', { projects: [] });
const projects = registry.projects || registry;
const consumers = [
  { slug: 'vaultspark-studio-hub', label: 'Studio Hub', required: ['HUB_FEED.json', 'CONSUMER_ADOPTION_PACK.json', 'SESSION_ORCHESTRATOR.json'] },
  { slug: 'vaultspark-studios-social-dashboard', label: 'Social Dashboard', required: ['SOCIAL_DASHBOARD_FEED.json', 'CONSUMER_ADOPTION_PACK.json'] },
  { slug: 'vaultsparkstudios-website', label: 'Website', required: ['WEBSITE_FEED.json', 'CONSUMER_ADOPTION_PACK.json'] },
  { slug: 'sparkfunnel', label: 'SparkFunnel', required: ['CONSUMER_ADOPTION_PACK.json', 'launchMesh', 'repoReadiness'] },
];

const results = consumers.map(checkConsumer);
const summary = {
  total: results.length,
  adopted: results.filter((r) => r.status === 'adopted').length,
  partial: results.filter((r) => r.status === 'partial').length,
  missing: results.filter((r) => r.status === 'missing').length,
  unavailable: results.filter((r) => r.status === 'unavailable').length,
};
const report = {
  generatedAt: new Date().toISOString(),
  adoptionPackSchema: readJson('portfolio/compiled/CONSUMER_ADOPTION_PACK.json', {})?._schema || 'unknown',
  summary,
  consumers: results,
};

if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`consumer-adoption: ${summary.adopted}/${summary.total} adopted · ${summary.partial} partial · ${summary.missing} missing · ${summary.unavailable} unavailable`);
  for (const r of results) {
    console.log(`  ${r.status.padEnd(11)} ${r.label}: ${r.found.length}/${r.required.length} refs`);
    for (const miss of r.missingRefs) console.log(`    - missing ${miss}`);
  }
}

process.exit(summary.missing > 0 ? 1 : 0);

function checkConsumer(consumer) {
  const project = projects.find((p) => p.slug === consumer.slug);
  const localPath = project?.localPath || null;
  if (!localPath || !fs.existsSync(localPath)) {
    return { ...consumer, localPath, status: 'unavailable', found: [], missingRefs: consumer.required };
  }
  const haystack = collectText(localPath);
  const found = consumer.required.filter((needle) => haystack.includes(needle));
  const missingRefs = consumer.required.filter((needle) => !found.includes(needle));
  const status = missingRefs.length === 0 ? 'adopted' : found.length ? 'partial' : 'missing';
  return { ...consumer, localPath, status, found, missingRefs };
}

function collectText(root) {
  const skip = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '.cache', 'coverage']);
  const chunks = [];
  const walk = (dir, depth = 0) => {
    if (depth > 5) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      if (!/\.(?:js|ts|tsx|jsx|mjs|json|md|html|css|yml|yaml)$/.test(entry.name)) continue;
      try {
        const stat = fs.statSync(full);
        if (stat.size > 500_000) continue;
        chunks.push(fs.readFileSync(full, 'utf8'));
      } catch { /* ignore */ }
    }
  };
  walk(root);
  return chunks.join('\n');
}

function readJson(rel, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch { return fallback; }
}

