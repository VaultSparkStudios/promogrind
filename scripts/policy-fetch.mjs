#!/usr/bin/env node
/**
 * policy-fetch.mjs — skill-based auto-propagation (S79)
 *
 * Replaces scripts/propagate-templates.sh with a pull-model: child repos
 * fetch current canon + schemas + prompts pointers from studio-ops via
 * GitHub raw at session start. Changes propagate instantly across all
 * 27 repos without file copying.
 *
 * Cached under .ops-cache/policy/ for 15 min to avoid API spam during
 * high-frequency session work.
 *
 * Usage:
 *   node scripts/policy-fetch.mjs                        # refresh all
 *   node scripts/policy-fetch.mjs --policy canon          # single policy
 *   node scripts/policy-fetch.mjs --force                 # bust cache
 *   node scripts/policy-fetch.mjs --offline               # use cache only
 *
 * Policies fetched:
 *   canon          → docs/STUDIO_CANON.md
 *   schema-status  → context/PROJECT_STATUS.schema.json
 *   schema-registry → portfolio/PROJECT_REGISTRY.schema.json
 *   prompts-version → prompts-version.txt (the current v3.x)
 *   agents-rules   → docs/templates/project-system/AGENTS_PROJECT.template.md
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT, '.ops-cache', 'policy');
const CACHE_TTL_MS = 15 * 60 * 1000;

const BASE_URL = 'https://raw.githubusercontent.com/VaultSparkStudios/vaultspark-studio-ops/main';

const POLICIES = {
  canon:             { path: 'docs/STUDIO_CANON.md',                                   dest: 'docs/STUDIO_CANON.md' },
  'schema-status':   { path: 'context/PROJECT_STATUS.schema.json',                     dest: 'context/PROJECT_STATUS.schema.json' },
  'schema-registry': { path: 'portfolio/PROJECT_REGISTRY.schema.json',                 dest: 'portfolio/PROJECT_REGISTRY.schema.json' },
  'prompts-version': { path: 'prompts-version.txt',                                    dest: '.ops-cache/prompts-version.txt' },
  'agents-rules':    { path: 'docs/templates/project-system/AGENTS_PROJECT.template.md',dest: '.ops-cache/AGENTS_PROJECT.template.md' },
  'canon-badges':    { path: 'docs/BRANDING_PROTOCOL.md',                              dest: '.ops-cache/BRANDING_PROTOCOL.md' },
  'staging-rules':   { path: 'docs/STAGING_PROTOCOL.md',                               dest: '.ops-cache/STAGING_PROTOCOL.md' },
};

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const OFFLINE = args.includes('--offline');
const policyIdx = args.indexOf('--policy');
const ONLY_POLICY = policyIdx >= 0 ? args[policyIdx + 1] : null;
const JSON_MODE = args.includes('--json');

function cachePath(name) {
  return path.join(CACHE_DIR, `${name}.cache`);
}

function isCacheFresh(p) {
  try {
    const stat = fs.statSync(p);
    return (Date.now() - stat.mtimeMs) < CACHE_TTL_MS;
  } catch { return false; }
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => { data += c; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function fetchPolicy(name) {
  const cfg = POLICIES[name];
  if (!cfg) throw new Error(`unknown policy: ${name}`);
  const cp = cachePath(name);

  if (!FORCE && isCacheFresh(cp)) {
    return { name, source: 'cache', content: fs.readFileSync(cp, 'utf8') };
  }

  if (OFFLINE) {
    if (fs.existsSync(cp)) return { name, source: 'cache-offline', content: fs.readFileSync(cp, 'utf8') };
    throw new Error(`policy ${name} not cached and --offline specified`);
  }

  const content = await fetchUrl(`${BASE_URL}/${cfg.path}`);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cp, content);
  return { name, source: 'remote', content };
}

async function main() {
  const policyNames = ONLY_POLICY ? [ONLY_POLICY] : Object.keys(POLICIES);
  const results = [];

  for (const name of policyNames) {
    try {
      const r = await fetchPolicy(name);
      results.push({ name, source: r.source, bytes: r.content.length, ok: true });

      // Skip writing to working tree if we're *in* the studio-ops repo itself
      // (these files are the source of truth here)
      const isStudioOpsSelf = fs.existsSync(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json')) &&
                              fs.existsSync(path.join(ROOT, 'prompts', 'start.md'));
      if (!isStudioOpsSelf) {
        const dest = path.join(ROOT, POLICIES[name].dest);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, r.content);
      }
    } catch (err) {
      results.push({ name, ok: false, error: err.message });
    }
  }

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({ results }, null, 2) + '\n');
    process.exit(results.every(r => r.ok) ? 0 : 1);
  }

  for (const r of results) {
    if (r.ok) process.stdout.write(`✓ ${r.name.padEnd(22)} ${r.source.padEnd(15)} ${r.bytes} bytes\n`);
    else      process.stdout.write(`✗ ${r.name.padEnd(22)} FAILED: ${r.error}\n`);
  }

  process.exit(results.every(r => r.ok) ? 0 : 1);
}

main().catch(err => { process.stderr.write(`policy-fetch error: ${err.message}\n`); process.exit(2); });
