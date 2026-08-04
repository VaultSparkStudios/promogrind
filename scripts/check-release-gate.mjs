#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REQUIRED_STUDIO_FILES, inferManifest, readJson } from './lib/runtime-pack.mjs';
import { getBlockingLaunchProofs } from './lib/launch-proofs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
const SUMMARY = path.join(ROOT, 'audits', 'sanitization', 'latest', '_summary.json');
const OUT_JSON = path.join(ROOT, 'portfolio', 'compiled', 'RELEASE_GATES.json');
const OUT_MD = path.join(ROOT, 'docs', 'RELEASE_GATES.md');

const jsonMode = process.argv.includes('--json');
const checkMode = process.argv.includes('--check');
const requireReady = process.argv.includes('--require-ready');
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

function readText(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
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
const localStatus = readJson(path.join(ROOT, 'context', 'PROJECT_STATUS.json'), {});
const localManifest = readJson(path.join(ROOT, 'context', 'STUDIO_MANIFEST.json'), {});
const registryProjects = Array.isArray(registry.projects) && registry.projects.length
  ? registry.projects
  : [{
      slug: localStatus.slug || localManifest.identity?.slug || path.basename(ROOT).toLowerCase(),
      name: localStatus.name || localManifest.identity?.name || path.basename(ROOT),
      type: localStatus.type || localManifest.identity?.type || 'app',
      audience: localStatus.audience || localManifest.identity?.audience,
      vaultStatus: localStatus.vaultStatus || localManifest.identity?.vaultStatus,
      localPath: ROOT,
      stagingType: localStatus.stagingType,
      stagingUrl: localStatus.stagingUrl,
      brandingRequired: localStatus.brandingRequired,
      brandingCompliant: localStatus.brandingCompliant,
    }];
const sourceMode = Array.isArray(registry.projects) && registry.projects.length ? 'private-registry' : 'public-shim-self-profile';
const filteredProjects = projectArg
  ? registryProjects.filter((project) => project.slug === projectArg || project.name === projectArg)
  : registryProjects;

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
  const stableStaging = Boolean(stagingUrl) && !['none', 'local', 'vercel-preview'].includes(stagingType);
  const privateByDefault = manifest.publicMetadata?.privateByDefault ?? true;
  const sanitizationSummary = sanitizationEntry(sanitization, project.slug);
  const blockingLaunchProofs = publicFacing ? getBlockingLaunchProofs(root) : [];

  const gates = [
    gate(privateByDefault, 'Private by default', privateByDefault ? 'Manifest preserves private-first lifecycle.' : 'Manifest does not explicitly preserve private-first lifecycle.'),
    gate(manifestOk, 'Manifest present', manifestOk ? 'Real STUDIO_MANIFEST.json present.' : 'Still using synthesized fallback manifest.'),
    gate(runtimePackOk, 'Runtime pack present', runtimePackOk ? 'Runtime-pack assets generated.' : 'Runtime-pack assets have not been generated yet.', publicFacing ? 'required' : 'recommended'),
    gate(requiredFilesOk, 'Studio OS map intact', `${requiredFileCount}/${REQUIRED_STUDIO_FILES.length} required Studio OS files present.`),
    gate(publicSafeMapOk, 'Public-safe file map intact', publicSafeMapOk ? 'Core navigation surfaces preserved.' : 'Public-safe Studio OS navigation map is incomplete.'),
    gate(rightsOk, 'Rights provenance present', rightsOk ? 'RIGHTS_PROVENANCE.md present.' : 'RIGHTS_PROVENANCE.md missing.', publicFacing ? 'required' : 'recommended'),
    gate(!brandingRequired || brandingCompliant === true, 'Branding compliant', brandingRequired ? (brandingCompliant ? 'VaultSpark branding requirement satisfied.' : 'VaultSpark branding requirement still open.') : 'Branding not required for this project.'),
    gate(!publicFacing || stableStaging, 'Stable staging path available', publicFacing ? `stagingType=${stagingType}${stagingUrl ? ` · ${stagingUrl}` : ' · no stable URL'}` : 'Internal/private audience; staging gate exempt.', publicFacing ? 'required' : 'recommended'),
    gate(!publicFacing || Boolean(sanitizationSummary && sanitizationSummary.critical === 0), 'Sanitization clear', sanitizationSummary ? `${sanitizationSummary.critical} critical · ${sanitizationSummary.warning} warning` : 'No fresh local sanitization packet found for this repo.', publicFacing ? 'required' : 'recommended'),
    gate(!publicFacing || blockingLaunchProofs.length === 0, 'Blocking launch proofs complete', blockingLaunchProofs.length
      ? `${blockingLaunchProofs.length} typed blocking proof${blockingLaunchProofs.length === 1 ? '' : 's'} remain incomplete: ${blockingLaunchProofs.map((proof) => proof.key).join(', ')}`
      : 'No incomplete typed blocking launch proofs remain.', publicFacing ? 'required' : 'recommended'),
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
  sourceMode,
  evaluatedProjectCount: projects.length,
  ready: projects.filter((project) => project.decision === 'ready').length,
  review: projects.filter((project) => project.decision === 'review').length,
  hold: projects.filter((project) => project.decision === 'hold').length,
  projects,
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
  if (projects.length === 0 || (requireReady && projects.some((project) => project.decision !== 'ready'))) process.exit(1);
  process.exit(0);
}

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

const markdown = lines.join('\n');
if (checkMode) {
  const current = readJson(OUT_JSON, null);
  const comparable = (value) => value ? { ...value, generatedAt: null } : null;
  const jsonFresh = JSON.stringify(comparable(current)) === JSON.stringify(comparable(payload));
  const markdownFresh = readText(OUT_MD) === markdown;
  if (!jsonFresh || !markdownFresh) {
    console.error(`release gates: stale (${jsonFresh ? 'markdown' : markdownFresh ? 'json' : 'json + markdown'})`);
    process.exit(1);
  }
  console.log(`release gates: fresh · ${projects.length} project(s) · ${payload.hold} hold`);
  process.exit(0);
}

writeJson(OUT_JSON, payload);
writeText(OUT_MD, markdown);
console.log(`✓ Release gates → ${path.relative(ROOT, OUT_MD).replace(/\\/g, '/')} (${projects.length} projects)`);
if (projects.length === 0 || (requireReady && projects.some((project) => project.decision !== 'ready'))) process.exit(1);
