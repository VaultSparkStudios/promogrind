#!/usr/bin/env node
/**
 * check-meaningful-diff.mjs
 *
 * Compares one or more generated files against HEAD after stripping known
 * timestamp-only churn. Exit codes:
 *   0  meaningful diff detected
 *   10 no meaningful diff detected
 *   2  usage or runtime error
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  aggregateHash,
  hashFileContent,
  readHeadFile,
  readSidecarHash,
  writeSidecarHash,
} from './lib/meaningful-diff.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');

function takeFlag(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  const value = args[idx + 1] ?? null;
  args.splice(idx, 2);
  return value;
}

const profileName = takeFlag('--profile') || 'default';
const sidecarRel = takeFlag('--write-sidecar');
const fileArgs = args.filter((arg) => !arg.startsWith('--'));

if (!fileArgs.length) {
  const message = 'usage: node scripts/check-meaningful-diff.mjs [--profile <name>] [--write-sidecar <path>] <file> [<file> ...]';
  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({ ok: false, error: message }, null, 2) + '\n');
  } else {
    console.error(message);
  }
  process.exit(2);
}

try {
  const comparisons = fileArgs.map((fileArg) => {
    const absPath = path.resolve(ROOT, fileArg);
    const relPath = path.relative(ROOT, absPath).replace(/\\/g, '/');
    const current = fs.readFileSync(absPath, 'utf8');
    const currentHash = hashFileContent(relPath, current, profileName);
    const head = readHeadFile(ROOT, relPath);
    const headHash = head == null ? null : hashFileContent(relPath, head, profileName);
    return {
      filePath: relPath,
      currentHash,
      headHash,
      changed: headHash == null || headHash !== currentHash,
    };
  });

  const currentAggregate = aggregateHash(comparisons.map(({ filePath, currentHash: hash }) => ({ filePath, hash })));
  const headAggregate = comparisons.every((item) => item.headHash != null)
    ? aggregateHash(comparisons.map(({ filePath, headHash: hash }) => ({ filePath, hash })))
    : null;
  const sidecarPath = sidecarRel ? path.resolve(ROOT, sidecarRel) : null;
  const previousSidecarHash = sidecarPath ? readSidecarHash(sidecarPath) : null;
  const meaningfulChange = headAggregate == null || currentAggregate !== headAggregate;

  if (sidecarPath) {
    writeSidecarHash(sidecarPath, currentAggregate);
  }

  const payload = {
    ok: meaningfulChange,
    profile: profileName,
    files: comparisons,
    aggregate: {
      current: currentAggregate,
      head: headAggregate,
      previousSidecar: previousSidecarHash,
    },
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  } else {
    console.log(`check-meaningful-diff · profile=${profileName}`);
    console.log('─'.repeat(56));
    for (const item of comparisons) {
      console.log(`  ${item.changed ? '✓' : '·'} ${item.filePath}`);
    }
    console.log(`  current hash: ${currentAggregate}`);
    if (headAggregate) console.log(`  head hash:    ${headAggregate}`);
    if (previousSidecarHash) console.log(`  sidecar hash: ${previousSidecarHash}`);
    console.log(`  result: ${meaningfulChange ? 'meaningful change detected' : 'timestamp-only / no meaningful change'}`);
  }

  process.exit(meaningfulChange ? 0 : 10);
} catch (error) {
  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({ ok: false, error: error.message }, null, 2) + '\n');
  } else {
    console.error(`✗ ${error.message}`);
  }
  process.exit(2);
}
