#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { buildProjectMesh, markdownTable, writeJson, writeText } from './lib/portfolio-surfaces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');
const payload = buildProjectMesh(ROOT);

writeJson(path.join(ROOT, 'portfolio', 'compiled', 'PROJECT_MESH.json'), payload);

const rows = payload.projects.slice(0, 20).map((project) => [
  project.slug,
  String(project.signals.blockers),
  String(project.signals.engagement.recentEventCount),
  String(project.readiness.score),
  project.launch.status,
  project.session.active ? 'active' : 'idle',
]);

writeText(
  path.join(ROOT, 'docs', 'PROJECT_MESH.md'),
  [
    '# Project Mesh',
    '',
    `> Generated: ${payload.generatedAt.slice(0, 10)}`,
    '',
    markdownTable(['Slug', 'Blockers', 'Events', 'Readiness', 'Launch', 'Session'], rows),
    '',
  ].join('\n'),
);

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else console.log('✓ Project mesh → docs/PROJECT_MESH.md');
