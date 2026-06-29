import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from './lib/safe-spawn.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');

const args = [path.join(__dirname, 'compile-automation-queue.mjs'), ...(jsonMode ? ['--json'] : [])];
const result = spawnSync(process.execPath, args, {
  cwd: ROOT,
  stdio: 'inherit'
});

process.exit(result.status ?? 0);
