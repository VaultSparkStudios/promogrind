#!/usr/bin/env node
// rescore-project.mjs — compute the canonical 0-100 project health score.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const writeMode = args.includes('--write');
const slug = valueAfter('--project') ?? args.find(a => !a.startsWith('--')) ?? 'studio-ops';

function valueAfter(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
}

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
const project = registry.projects.find(p => p.slug === slug || p.name === slug);
if (!project) {
  console.error(`rescore-project: project not found: ${slug}`);
  process.exit(1);
}

const statusPath = path.join(project.localPath || ROOT, 'context', 'PROJECT_STATUS.json');
const status = readJson(statusPath, {});
const releaseGates = readJson(path.join(ROOT, 'portfolio', 'compiled', 'RELEASE_GATES.json'), { projects: [] });
const rollout = readJson(path.join(ROOT, 'portfolio', 'compiled', 'ROLLOUT_SCOREBOARD.json'), { projects: [] });
const liveSurfaces = readJson(path.join(ROOT, 'portfolio', 'compiled', 'LIVE_SURFACES.json'), { projects: [] });
const gate = releaseGates.projects?.find(p => p.slug === project.slug);
const roll = rollout.projects?.find(p => p.slug === project.slug) || rollout.pilots?.find(p => p.slug === project.slug);
const live = liveSurfaces.projects?.find(p => p.slug === project.slug);

const ignisNormalized = status.ignisScore ? Math.min(100, status.ignisScore / 1000) : 50;
const doctor = status.doctorScore?.score ?? (status.health === 'green' ? 85 : status.health === 'yellow' ? 65 : 40);
const rolloutScore = roll?.score ?? (project.studioOsApplied ? 75 : 35);
const releaseScore = gate ? (gate.decision === 'ready' ? 100 : gate.decision === 'conditional' ? 70 : 35) : 80;
const liveScore = live?.surfaces?.length ? 85 : project.audience === 'internal' ? 80 : 55;
const blockerPenalty = Math.min(30, (status.blockers?.length ?? 0) * 4);
const brandingPenalty = project.brandingRequired && project.brandingCompliant !== true ? 10 : 0;

const projectHealthScore = clamp(
  ignisNormalized * 0.30 +
  doctor * 0.20 +
  rolloutScore * 0.15 +
  releaseScore * 0.15 +
  liveScore * 0.10 +
  (100 - blockerPenalty - brandingPenalty) * 0.10
);

const payload = {
  slug: project.slug,
  name: project.name,
  generatedAt: new Date().toISOString(),
  projectHealthScore,
  components: {
    ignisNormalized: +ignisNormalized.toFixed(1),
    doctor,
    rolloutScore,
    releaseScore,
    liveScore,
    blockerPenalty,
    brandingPenalty,
  },
  recommendation: projectHealthScore >= 85 ? 'green' : projectHealthScore >= 65 ? 'yellow' : 'red',
};

if (writeMode) {
  status.projectHealthScore = projectHealthScore;
  status.projectHealthLastComputed = payload.generatedAt.slice(0, 10);
  status.projectHealthComponents = payload.components;
  writeJson(statusPath, status);
}

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else {
  console.log(`project-health: ${project.name} (${project.slug})`);
  console.log(`  score: ${projectHealthScore}/100 · ${payload.recommendation}`);
  for (const [k, v] of Object.entries(payload.components)) console.log(`  ${k}: ${v}`);
  if (writeMode) console.log(`  wrote: ${path.relative(ROOT, statusPath)}`);
}
