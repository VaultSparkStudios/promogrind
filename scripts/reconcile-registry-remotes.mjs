#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);

const rows = registry.projects
  .filter((project) => project.status !== 'archived' && project.repoExists !== false)
  .map((project) => {
    const localPath = project.localPath ?? null;
    const localExists = !!localPath && fs.existsSync(localPath);
    const remoteUrl = localExists ? git(localPath, ['remote', 'get-url', 'origin'], true).trim() : '';
    const expectedRemote = project.repo ? `https://github.com/${project.repo}` : '';
    const normalizedRemote = normalizeRemote(remoteUrl);
    const normalizedExpected = normalizeRemote(expectedRemote);
    const repoMatch = !normalizedExpected || !normalizedRemote ? false : normalizedExpected === normalizedRemote;
    return {
      name: project.name,
      slug: project.slug,
      localPath: localPath ?? '—',
      localExists,
      registryRepo: project.repo ?? '—',
      remoteUrl: remoteUrl || '—',
      status: !localExists ? 'missing-local-path' : repoMatch ? 'aligned' : 'repo-drift',
    };
  })
  .sort((a, b) => (a.status === 'aligned') - (b.status === 'aligned') || a.name.localeCompare(b.name));

const lines = [
  '# Registry Remote Reconciler',
  '',
  `Generated: ${today}`,
  '',
  '| Project | Status | Registry repo | Local path | Origin remote |',
  '|---|---|---|---|---|',
  ...rows.map((row) => `| ${row.name} | ${row.status} | ${row.registryRepo} | ${row.localPath} | ${row.remoteUrl} |`),
];

fs.writeFileSync(path.join(root, 'portfolio', 'REGISTRY_REMOTE_AUDIT.md'), `${lines.join('\n')}\n`);

function git(workdir, args, allowFailure = false) {
  try {
    return execFileSync('git', ['-c', `safe.directory=${workdir.replace(/\\/g, '/')}`, '-C', workdir, ...args], { encoding: 'utf8' });
  } catch (error) {
    if (allowFailure) return '';
    throw error;
  }
}

function normalizeRemote(url) {
  if (!url) return '';
  return url
    .trim()
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git$/, '')
    .toLowerCase();
}
