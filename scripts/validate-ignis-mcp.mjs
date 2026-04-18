#!/usr/bin/env node

import path from 'path';
import { spawnSync } from 'child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const ignisSrc = path.join(root, 'ignis', 'src');
const validator = path.join(root, 'ignis', 'src', 'validate-mcp.ts');

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npx, ['tsx', validator, root], {
  cwd: ignisSrc,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
