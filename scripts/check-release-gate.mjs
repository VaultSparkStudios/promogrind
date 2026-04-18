#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REQUIRED_STUDIO_FILES, inferManifest, readJson } from './lib/runtime-pack.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
const SUMMARY = path.join(ROOT, 'audits', 'sanitization', 'latest', '_summary.json');
const OUT_JSON = path.join(ROOT, 'portfolio', 'compiled', 'RELEASE_GATES.json');
const OUT_MD = path.join(ROOT, 'docs', 'RELEASE_GATES.md');

const jsonMode = process.argv.includes('--json');
const projectIndex = process.argv.indexOf('--project');
const projectArg = projectIndex !== -1 ? process.argv[projectIndex + 1] : null;

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

function isPublicAudience(value) {
  return String(value || '').startsWith('public');
}

function isPublicFacing(project, status, manifest) {
  return isPublicAudience(project.audience) || isPublicAudience(status.audience) || isPublicAudience(manifest.identity?.audience);
}

function sanitizationEntry(summary, slug) {
  return (summary || []).find((entry) => entry.slug === slug) || null;
}

function gate(ok, label, detail, severity = 'required') {
  return { ok, label, detail, severity };
}

function releaseDecision(gates) {
  const failing = gates.filter((entry) => entry.severity !== 'info' && !entry.ok);
  if (failing.length === 0) return 'ready';
  if (failing.some((entry) => entry.severity === 'required')) return 'hold';
  return 'review';
}

const registry = readJson(REGISTRY, { projects: [] });
const sanitization = readJson(SUMMARY, []);
const filteredProjects = projectArg
  ? (registry.projects || []).filter((project) => project.slug === projectArg || project.name === projectArg)
  : (registry.projects || []);

const projects = [];

for (const project of filteredProjects) {
  if (!project.localPath) continue;
  const root = path.resolve(project.localPath);
  const status = readJson(path.join(root, 'context', 'PROJECT_STATUS.json'), {});
  const manifest = readJson(path.join(root, 'context', 'STUDIO_MANIFEST.json'), null) || inferManifest(project, status);
  const publicFacing = isPublicFacing(project, status, manifest);
  const launchStatus = project.launchStatus || status.launchStatus || 'not-applicable';
  const vaultStatus = String(project.vaultStatus || manifest.identity?.vaultStatus || '').toUpperCase();
  const requiredFileCount = REQUIRED_STUDIO_FILES.filter((file) => exists(path.join(root, file))).length;
  const requiredFilesOk = requiredFileCount === REQUIRED_STUDIO_FILES.length;
  const runtimePackOk = exists(path.join(root, 'context', 'runtime-pack', 'RUNTIME_PACK.json'));
  const rightsOk = exists(path.join(root, 'docs', 'RIGHTS_PROVENANCE.md'));
  const manifestOk = exists(path.join(root, 'context', 'STUDIO_MANIFEST.json'));
  const publicSafeMapOk = ['AGENTS.md', 'context/PROJECT_BRIEF.md', 'context/TASK_BOARD.md', 'context/LATEST_HANDOFF.md', 'prompts/start.md', 'prompts/closeout.md']
    .every((file) => exists(path.join(root, file)));
  const brandingRequired = manifest.publicMetadata?.brandingRequired ?? project.brandingRequired ?? false;
  const brandingCompliant = manifest.publicMetadata?.brandingCompliant ?? project.brandingCompliant ?? null;
  const stagingUrl = project.stagingUrl ?? status.stagingUrl ?? manifest.hosting?.stagingUrl ?? null;
  const stagingType = project.stagingType ?? status.stagingType ?? manifest.hosting?.hostingProvider ?? 'none';
  const privateByDefault = manifest.publicMetadata?.privateByDefault ?? true;
  const sanitizationSummary = sanitizationEntry(sanitization, project.slug);

  const gates = [
    gate(privateByDefault, 'Private by default', privateByDefault ? 'Manifest preserves private-first lifecycle.' : 'Manifest does not explicitly preserve private-first lifecycle.'),
    gate(manifestOk, 'Manifest present', manifestOk ? 'Real STUDIO_MANIFEST.json present.' : 'Still using synthesized fallback manifest.'),
    gate(runtimePackOk, 'Runtime pack present', runtimePackOk ? 'Runtime-pack assets generated.' : 'Runtime-pack assets have not been generated yet.', publicFacing ? 'required' : 'recommended'),
    gate(requiredFilesOk, 'Studio OS map intact', `${requiredFileCount}/${REQUIRED_STUDIO_FILES.length} required Studio OS files present.`),
    gate(publicSafeMapOk, 'Public-safe file map intact', publicSafeMapOk ? 'Core navigation surfaces preserved.' : 'Public-safe Studio OS navigation map is incomplete.'),
    gate(rightsOk, 'Rights provenance present', rightsOk ? 'RIGHTS_PROVENANCE.md present.' : 'RIGHTS_PROVENANCE.md missing.', publicFacing ? 'required' : 'recommended'),
    gate(!brandingRequired || brandingCompliant === true, 'Branding compliant', brandingRequired ? (brandingCompliant ? 'VaultSpark branding requirement satisfied.' : 'VaultSpark branding requirement still open.') : 'Branding not required for this project.'),
    gate(!publicFacing || launchStatus !== 'announced' || Boolean(stagingUrl) || stagingType === 'local' || stagingType === 'vercel-preview', 'Staging path available', publicFacing ? `stagingType=${stagingType}${stagingUrl ? ` · ${stagingUrl}` : ''}` : 'Internal/private audience; staging gate exempt.', publicFacing && vaultStatus === 'SPARKED' ? 'required' : 'recommended'),
    gate(!publicFacing || !sanitizationSummary || sanitizationSummary.critical === 0, 'Sanitization clear', sanitizationSummary ? `${sanitizationSummary.critical} critical · ${sanitizationSummary.warning} warning` : 'No local sanitization packet found for this repo.', publicFacing ? 'required' : 'recommended'),
  ];

  projects.push({
    slug: project.slug,
    name: project.name,
    repo: project.repo || null,
    publicFacing,
    launchStatus,
    vaultStatus,
    decision: releaseDecision(gates),
    gates,
    summary: gates.filter((entry) => !entry.ok).map((entry) => entry.label),
  });
}

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'check-release-gate.mjs',
  ready: projects.filter((project) => project.decision === 'ready').length,
  review: projects.filter((project) => project.decision === 'review').length,
  hold: projects.filter((project) => project.decision === 'hold').length,
  projects,
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

writeJson(OUT_JSON, payload);

const lines = [
  '# Release Gates',
  '',
  `> Generated: ${payload.generatedAt.slice(0, 10)} · Ready: ${payload.ready} · Review: ${payload.review} · Hold: ${payload.hold}`,
  '',
  '| Project | Public-facing | Decision | Open gates |',
  '|---|---|---|---|',
  ...projects.map((project) => `| ${project.name} | ${project.publicFacing ? 'yes' : 'no'} | ${project.decision.toUpperCase()} | ${project.summary.length ? project.summary.join(', ') : 'none'} |`),
  '',
];

for (const project of projects) {
  lines.push(`## ${project.name}`);
  lines.push('');
  lines.push(`- Decision: **${project.decision.toUpperCase()}**`);
  lines.push(`- Public-facing: ${project.publicFacing ? 'yes' : 'no'} · Launch status: ${project.launchStatus} · Vault status: ${project.vaultStatus}`);
  lines.push('');
  for (const entry of project.gates) {
    lines.push(`- ${entry.ok ? '✓' : '⛔'} ${entry.label} — ${entry.detail}`);
  }
  lines.push('');
}

writeText(OUT_MD, lines.join('\n'));
console.log(`✓ Release gates → ${path.relative(ROOT, OUT_MD).replace(/\\/g, '/')} (${projects.length} projects)`);
