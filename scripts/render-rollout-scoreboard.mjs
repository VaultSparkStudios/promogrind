#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REQUIRED_STUDIO_FILES, inferManifest, readJson } from './lib/runtime-pack.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
const OUT_JSON = path.join(ROOT, 'portfolio', 'compiled', 'ROLLOUT_SCOREBOARD.json');
const OUT_MD = path.join(ROOT, 'docs', 'ROLLOUT_SCOREBOARD.md');
const jsonMode = process.argv.includes('--json');
const PILOTS = new Set(['vaultspark-studio-hub', 'vaultspark-studios-social-dashboard', 'vaultsparkstudios-website', 'spark-funnel', 'mindframe']);

function exists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function readVersion(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').match(/template-version:\s*([\d.]+)/)?.[1] || null;
  } catch {
    return null;
  }
}

const canonicalStart = readVersion(path.join(ROOT, 'prompts', 'start.md'));
const canonicalCloseout = readVersion(path.join(ROOT, 'prompts', 'closeout.md'));
const registry = readJson(REGISTRY, { projects: [] });
const rows = [];

for (const project of registry.projects || []) {
  if (!project.localPath || project.status === 'archived') continue;
  const projectRoot = path.resolve(project.localPath);
  const status = readJson(path.join(projectRoot, 'context', 'PROJECT_STATUS.json'), {});
  const manifest = exists(path.join(projectRoot, 'context', 'STUDIO_MANIFEST.json'))
    ? readJson(path.join(projectRoot, 'context', 'STUDIO_MANIFEST.json'), null)
    : null;
  const effectiveManifest = manifest || inferManifest(project, status);
  const requiredFilesPresent = REQUIRED_STUDIO_FILES.filter((file) => exists(path.join(projectRoot, file))).length;
  const requiredFileScore = Math.round((requiredFilesPresent / REQUIRED_STUDIO_FILES.length) * 100);
  const contractsDir = path.join(projectRoot, 'context', 'contracts');
  const contractCount = ['hub.json', 'website-public.json', 'social-dashboard.json', 'sparkfunnel.json', 'ignis.json']
    .filter((file) => exists(path.join(contractsDir, file))).length;
  const skillsInstalled = ['studio-start', 'studio-closeout', 'studio-genius-refresh']
    .filter((skill) => exists(path.join(projectRoot, '.claude', 'skills', skill))).length;
  const hooksInstalled = ['pre-push'].filter((hook) => exists(path.join(projectRoot, '.git', 'hooks', hook))).length;
  const runtimePackPresent = exists(path.join(projectRoot, 'context', 'runtime-pack', 'RUNTIME_PACK.json'));
  const startVersion = readVersion(path.join(projectRoot, 'prompts', 'start.md'));
  const closeoutVersion = readVersion(path.join(projectRoot, 'prompts', 'closeout.md'));
  const promptAligned = startVersion === canonicalStart && closeoutVersion === canonicalCloseout;
  const score =
    (manifest ? 20 : 0) +
    (runtimePackPresent ? 15 : 0) +
    Math.round(requiredFileScore * 0.2) +
    (promptAligned ? 10 : 0) +
    Math.round((skillsInstalled / 3) * 10) +
    Math.round((hooksInstalled / 1) * 5) +
    Math.round((contractCount / 5) * 10) +
    (status.truthAuditStatus === 'green' ? 10 : status.truthAuditStatus === 'yellow' ? 5 : 0);

  rows.push({
    slug: project.slug,
    name: project.name,
    pilot: PILOTS.has(project.slug),
    manifestPresent: Boolean(manifest),
    runtimePackPresent,
    promptAligned,
    requiredFileScore,
    skillsInstalled,
    hooksInstalled,
    contractCount,
    truth: status.truthAuditStatus || 'unknown',
    score,
    nextStep: !manifest
      ? 'generate real STUDIO_MANIFEST.json'
      : !runtimePackPresent
        ? 'run ops runtime-pack --write'
        : !promptAligned
          ? 'propagate v3.2 prompts'
          : contractCount < 5
            ? 'generate contract payloads'
            : 'consumer adoption / downstream integration',
  });
}

rows.sort((a, b) => {
  if (Number(b.pilot) !== Number(a.pilot)) return Number(b.pilot) - Number(a.pilot);
  return b.score - a.score;
});

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'render-rollout-scoreboard.mjs',
  summary: {
    totalProjects: rows.length,
    manifests: rows.filter((entry) => entry.manifestPresent).length,
    runtimePacks: rows.filter((entry) => entry.runtimePackPresent).length,
    promptAligned: rows.filter((entry) => entry.promptAligned).length,
    fullyReady: rows.filter((entry) => entry.score >= 85).length,
  },
  pilots: rows.filter((entry) => entry.pilot),
  projects: rows,
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

writeJson(OUT_JSON, payload);

const lines = [
  '# Rollout Scoreboard',
  '',
  `> Generated: ${payload.generatedAt.slice(0, 10)} · Manifests: ${payload.summary.manifests}/${payload.summary.totalProjects} · Runtime packs: ${payload.summary.runtimePacks}/${payload.summary.totalProjects} · Prompt aligned: ${payload.summary.promptAligned}/${payload.summary.totalProjects}`,
  '',
  '## Pilot Repos',
  '',
  '| Project | Score | Manifest | Pack | Prompts | Contracts | Next step |',
  '|---|---:|---|---|---|---:|---|',
  ...payload.pilots.map((entry) => `| ${entry.name} | ${entry.score} | ${entry.manifestPresent ? 'yes' : 'no'} | ${entry.runtimePackPresent ? 'yes' : 'no'} | ${entry.promptAligned ? 'yes' : 'no'} | ${entry.contractCount}/5 | ${entry.nextStep} |`),
  '',
  '## Portfolio',
  '',
  '| Project | Pilot | Score | Required files | Skills | Hooks | Truth | Next step |',
  '|---|---|---:|---:|---:|---:|---|---|',
  ...rows.map((entry) => `| ${entry.name} | ${entry.pilot ? 'yes' : 'no'} | ${entry.score} | ${entry.requiredFileScore}% | ${entry.skillsInstalled}/3 | ${entry.hooksInstalled}/1 | ${entry.truth} | ${entry.nextStep} |`),
  '',
];

writeText(OUT_MD, lines.join('\n'));
console.log(`✓ Rollout scoreboard → ${path.relative(ROOT, OUT_MD).replace(/\\/g, '/')} (${rows.length} projects)`);
