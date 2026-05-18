#!/usr/bin/env node

import path from 'path';
import { spawnSync } from 'child_process';
import fs from 'fs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const studioOpsRoot = resolveStudioOpsRoot();
const ignisSrc = path.join(studioOpsRoot, 'ignis', 'src');
const validator = path.join(ignisSrc, 'validate-mcp.ts');

if (!fs.existsSync(validator)) {
  console.error(`validate-ignis-mcp: validator not found at ${validator}`);
  console.error('Set STUDIO_OPS_ROOT to the private Studio Ops checkout, or place it beside this repo as ../vaultspark-studio-ops.');
  process.exit(1);
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npx, ['tsx', validator, root], {
  cwd: ignisSrc,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    // The validator may inspect git metadata in the target repo. In Codex's
    // Windows sandbox the repo owner is the host user, so Git emits noisy
    // dubious-ownership errors unless this one invocation marks it safe.
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'safe.directory',
    GIT_CONFIG_VALUE_0: root,
  },
});

if (result.error) {
  console.error(`validate-ignis-mcp: failed to launch validator: ${result.error.message}`);
}

process.exit(result.status ?? 1);

function resolveStudioOpsRoot() {
  const candidates = [
    process.env.STUDIO_OPS_ROOT,
    path.resolve(root, '..', 'vaultspark-studio-ops'),
    root,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = path.resolve(candidate);
    if (fs.existsSync(path.join(normalized, 'ignis', 'src', 'validate-mcp.ts'))) {
      return normalized;
    }
  }

  return path.resolve(candidates[0]);
}
