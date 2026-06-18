#!/usr/bin/env node
/**
 * scan-npm-supply-chain.mjs
 *
 * Lockfile-only npm supply-chain scan. This is intentionally dependency-free so
 * it can run after lockfile edits and before pushes without installing tools.
 *
 * Usage:
 *   node scripts/scan-npm-supply-chain.mjs
 *   node scripts/scan-npm-supply-chain.mjs --json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODE_JSON = process.argv.includes('--json');
const LOCKFILE = path.join(ROOT, 'package-lock.json');
const REGISTRY_PREFIX = 'https://registry.npmjs.org/';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function packageNameFromNode(nodePath) {
  return nodePath.replace(/^node_modules\//, '').replace(/\/node_modules\//g, ' > ');
}

function packageScope(entry) {
  if (entry.optional) return 'optional';
  if (entry.dev) return 'dev';
  if (entry.peer) return 'peer';
  return 'runtime';
}

function scanLockfile(lock) {
  const packages = lock.packages && typeof lock.packages === 'object' ? lock.packages : {};
  const findings = [];
  const totals = {
    packages: 0,
    runtime: 0,
    dev: 0,
    optional: 0,
    peer: 0,
    installScripts: 0,
    nonRegistryResolved: 0,
    missingIntegrity: 0,
    missingLicense: 0,
  };

  for (const [nodePath, entry] of Object.entries(packages)) {
    if (!nodePath || !nodePath.startsWith('node_modules/')) continue;

    totals.packages += 1;
    const scope = packageScope(entry);
    totals[scope] += 1;
    const name = packageNameFromNode(nodePath);
    const version = entry.version || 'unknown';

    if (entry.hasInstallScript) {
      totals.installScripts += 1;
      findings.push({
        severity: 'review',
        code: 'install-script',
        package: name,
        version,
        message: 'package has an install lifecycle script',
      });
    }

    if (entry.resolved && !entry.resolved.startsWith(REGISTRY_PREFIX)) {
      totals.nonRegistryResolved += 1;
      findings.push({
        severity: 'block',
        code: 'non-registry-resolved',
        package: name,
        version,
        message: `resolved URL is outside npm registry: ${entry.resolved}`,
      });
    }

    if (entry.resolved?.startsWith(REGISTRY_PREFIX) && !entry.integrity) {
      totals.missingIntegrity += 1;
      findings.push({
        severity: 'block',
        code: 'missing-integrity',
        package: name,
        version,
        message: 'registry tarball is missing integrity metadata',
      });
    }

    if (!entry.license) {
      totals.missingLicense += 1;
      findings.push({
        severity: 'review',
        code: 'missing-license',
        package: name,
        version,
        message: 'lockfile entry is missing license metadata',
      });
    }
  }

  return { totals, findings };
}

function summarize(findings) {
  return {
    block: findings.filter((item) => item.severity === 'block').length,
    review: findings.filter((item) => item.severity === 'review').length,
  };
}

function printHuman(result) {
  const summary = summarize(result.findings);
  process.stdout.write('NPM supply-chain scan\n');
  process.stdout.write(`packages: ${result.totals.packages}\n`);
  process.stdout.write(`blocks: ${summary.block}\n`);
  process.stdout.write(`reviews: ${summary.review}\n`);
  process.stdout.write(`install scripts: ${result.totals.installScripts}\n`);
  process.stdout.write(`non-registry resolved: ${result.totals.nonRegistryResolved}\n`);
  process.stdout.write(`missing integrity: ${result.totals.missingIntegrity}\n`);

  const notable = result.findings
    .filter((item) => item.severity === 'block' || item.code === 'install-script')
    .slice(0, 25);

  for (const item of notable) {
    process.stdout.write(`${item.severity.toUpperCase()} ${item.package}@${item.version}: ${item.message}\n`);
  }
}

try {
  if (!fs.existsSync(LOCKFILE)) {
    throw new Error('package-lock.json is missing');
  }

  const lock = readJson(LOCKFILE);
  const result = scanLockfile(lock);
  const summary = summarize(result.findings);

  if (MODE_JSON) {
    process.stdout.write(`${JSON.stringify({ ...result, summary }, null, 2)}\n`);
  } else {
    printHuman(result);
  }

  process.exit(summary.block ? 1 : 0);
} catch (error) {
  if (MODE_JSON) {
    process.stdout.write(`${JSON.stringify({ error: error.message }, null, 2)}\n`);
  } else {
    process.stderr.write(`scan-npm-supply-chain error: ${error.message}\n`);
  }
  process.exit(2);
}
