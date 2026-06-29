#!/usr/bin/env node
// propagate-hooks.mjs — Add .claude/settings.json to all Studio OS repos that don't have it
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const reg = JSON.parse(readFileSync(join(ROOT, 'portfolio/PROJECT_REGISTRY.json'), 'utf8'));
const template = readFileSync(join(ROOT, 'docs/templates/project-system/CLAUDE_SETTINGS.template.json'), 'utf8');

const projects = reg.projects.filter(p =>
  p.studioOsApplied && p.status !== 'archived' && p.localPath && p.slug !== 'studio-ops'
);

let updated = 0, skipped = 0, notFound = 0;

for (const p of projects) {
  const localPath = p.localPath.replace(/\\/g, '/');
  if (!existsSync(localPath)) { console.log('  SKIP (not found):', p.name); notFound++; continue; }

  const claudeDir = join(localPath, '.claude');
  const settingsFile = join(claudeDir, 'settings.json');

  if (existsSync(settingsFile)) { skipped++; continue; }

  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(settingsFile, template);

  try {
    execSync('git add .claude/settings.json', { cwd: localPath, stdio: 'pipe' });
    execSync('git commit -m "studio-os: add .claude/settings.json — Stop + JSON validator hooks"', { cwd: localPath, stdio: 'pipe' });
    console.log('  ✓', p.name);
  } catch {
    console.log('  ✓ (written)', p.name);
  }
  updated++;
}

console.log(`\nUpdated: ${updated} | Already had settings.json: ${skipped} | Not found: ${notFound}`);
