#!/usr/bin/env node
/**
 * package-trust.mjs
 *
 * Repo-local fallback for the Studio package trust gate. This script performs
 * lightweight npm metadata checks before adding or updating dependencies.
 *
 * Usage:
 *   node scripts/package-trust.mjs --package vite@6.4.3
 *   node scripts/package-trust.mjs --package @scope/name@1.2.3 --json
 *   node scripts/package-trust.mjs --download-url https://example.com/file.zip
 */

import { spawnSync } from 'child_process';

const args = process.argv.slice(2);
const MODE_JSON = args.includes('--json');
const LIFECYCLE_SCRIPTS = new Set(['preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'postpack']);
const SHORTENER_HOSTS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly']);
const NPM_BIN = process.platform === 'win32' ? 'cmd.exe' : 'npm';

function npmArgs(parts) {
  if (process.platform !== 'win32') return parts;
  return ['/d', '/s', '/c', 'npm', ...parts];
}

function valuesForFlag(flag) {
  const values = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === flag && args[i + 1]) {
      values.push(args[i + 1]);
      i += 1;
    }
  }
  return values;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/package-trust.mjs --package <name[@version]> [--json]',
    '  node scripts/package-trust.mjs --download-url <url> [--json]',
  ].join('\n');
}

function parsePackageSpec(spec) {
  if (!spec || spec.startsWith('-')) return null;
  if (spec.startsWith('@')) {
    const slash = spec.indexOf('/');
    if (slash === -1) return null;
    const versionAt = spec.indexOf('@', slash + 1);
    if (versionAt === -1) return { name: spec, requestedVersion: null, npmSpec: spec };
    return {
      name: spec.slice(0, versionAt),
      requestedVersion: spec.slice(versionAt + 1),
      npmSpec: spec,
    };
  }

  const versionAt = spec.lastIndexOf('@');
  if (versionAt <= 0) return { name: spec, requestedVersion: null, npmSpec: spec };
  return {
    name: spec.slice(0, versionAt),
    requestedVersion: spec.slice(versionAt + 1),
    npmSpec: spec,
  };
}

function npmView(spec) {
  const fields = [
    'name',
    'version',
    'license',
    'dist',
    'repository',
    'homepage',
    'bugs',
    'maintainers',
    'scripts',
    'deprecated',
    'dependencies',
  ];
  const result = spawnSync(NPM_BIN, npmArgs(['view', spec, ...fields, '--json']), {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    shell: false,
  });

  if (result.status !== 0) {
    return {
      ok: false,
      error: (result.error?.message || result.stderr || result.stdout || 'npm view failed').trim(),
    };
  }

  try {
    return { ok: true, meta: JSON.parse(result.stdout) };
  } catch (error) {
    return { ok: false, error: `npm view returned invalid JSON: ${error.message}` };
  }
}

function daysSince(iso) {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.floor((Date.now() - time) / 86400000);
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function evaluatePackage(spec) {
  const parsed = parsePackageSpec(spec);
  if (!parsed) {
    return { type: 'package', input: spec, decision: 'BLOCK', reasons: ['invalid package spec'] };
  }

  const view = npmView(parsed.npmSpec);
  if (!view.ok) {
    return { type: 'package', input: spec, name: parsed.name, decision: 'BLOCK', reasons: [view.error] };
  }

  const meta = Array.isArray(view.meta) ? view.meta.at(-1) : view.meta;
  const scripts = meta.scripts && typeof meta.scripts === 'object' ? meta.scripts : {};
  const lifecycleScripts = Object.keys(scripts).filter((name) => LIFECYCLE_SCRIPTS.has(name));
  const tarball = meta.dist?.tarball || '';
  const tarballHost = hostFromUrl(tarball);
  const versionAgeDays = null;
  const maintainers = Array.isArray(meta.maintainers) ? meta.maintainers.length : null;
  const dependencyCount = meta.dependencies && typeof meta.dependencies === 'object'
    ? Object.keys(meta.dependencies).length
    : 0;

  const blocks = [];
  const reviews = [];

  if (!meta.name || !meta.version) blocks.push('missing package name/version metadata');
  if (tarball && tarballHost !== 'registry.npmjs.org') blocks.push(`tarball host is ${tarballHost || 'invalid'}`);
  if (!meta.dist?.integrity) reviews.push('missing dist integrity metadata');
  if (!meta.license) reviews.push('missing license metadata');
  if (!meta.repository && !meta.homepage) reviews.push('missing repository/homepage metadata');
  if (maintainers === 0) reviews.push('no listed npm maintainers');
  if (lifecycleScripts.length) reviews.push(`lifecycle scripts present: ${lifecycleScripts.join(', ')}`);
  if (meta.deprecated) reviews.push(`deprecated: ${String(meta.deprecated).slice(0, 160)}`);
  if (meta.dist?.unpackedSize > 25 * 1024 * 1024) reviews.push(`large unpacked size: ${Math.round(meta.dist.unpackedSize / 1024 / 1024)} MB`);

  return {
    type: 'package',
    input: spec,
    name: meta.name || parsed.name,
    version: meta.version || parsed.requestedVersion,
    decision: blocks.length ? 'BLOCK' : reviews.length ? 'REVIEW' : 'APPROVE',
    reasons: blocks.length ? blocks : reviews,
    metadata: {
      license: meta.license || null,
      maintainers,
      dependencyCount,
      lifecycleScripts,
      tarball,
      integrity: meta.dist?.integrity || null,
      versionAgeDays,
    },
  };
}

function evaluateDownloadUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return { type: 'download-url', input, decision: 'BLOCK', reasons: ['invalid URL'] };
  }

  const host = url.hostname.toLowerCase();
  const blocks = [];
  const reviews = [];

  if (url.protocol !== 'https:') blocks.push('download URL is not HTTPS');
  if (SHORTENER_HOSTS.has(host)) blocks.push(`shortened URL host: ${host}`);
  if (/github\.com$/.test(host) && /\/(archive|releases\/download)\//.test(url.pathname)) {
    reviews.push('GitHub archive/release download requires provenance review');
  }
  if (!host.endsWith('npmjs.org') && !host.endsWith('github.com')) {
    reviews.push(`non-standard download host: ${host}`);
  }

  return {
    type: 'download-url',
    input,
    decision: blocks.length ? 'BLOCK' : reviews.length ? 'REVIEW' : 'APPROVE',
    reasons: blocks.length ? blocks : reviews,
    metadata: { host },
  };
}

function exitCode(results) {
  if (results.some((item) => item.decision === 'BLOCK')) return 2;
  if (results.some((item) => item.decision === 'REVIEW')) return 1;
  return 0;
}

function printHuman(results) {
  for (const item of results) {
    const label = item.type === 'package'
      ? `${item.name || item.input}${item.version ? `@${item.version}` : ''}`
      : item.input;
    process.stdout.write(`${item.decision} ${label}\n`);
    for (const reason of item.reasons || []) {
      process.stdout.write(`  - ${reason}\n`);
    }
  }
}

const packageSpecs = valuesForFlag('--package');
const downloadUrls = valuesForFlag('--download-url');

if (!packageSpecs.length && !downloadUrls.length) {
  process.stderr.write(`${usage()}\n`);
  process.exit(2);
}

const results = [
  ...packageSpecs.map(evaluatePackage),
  ...downloadUrls.map(evaluateDownloadUrl),
];

if (MODE_JSON) {
  process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
} else {
  printHuman(results);
}

process.exit(exitCode(results));
