import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

export function loadProjectRegistry() {
  const registryPath = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
  const registry = readJson(registryPath);
  if (Array.isArray(registry?.projects) && registry.projects.length > 0) {
    return { ...registry, source: 'portfolio' };
  }
  return { projects: [buildLocalProject()], source: 'local' };
}

function buildLocalProject() {
  const status = readJson(path.join(ROOT, 'context', 'PROJECT_STATUS.json')) || {};
  const manifest = readJson(path.join(ROOT, 'context', 'STUDIO_MANIFEST.json')) || {};
  const identity = manifest.identity || {};
  const publicMeta = manifest.publicMetadata || {};
  const hosting = manifest.hosting || {};
  const studioOs = manifest.studioOs || {};

  const repoFromGithub = (() => {
    const github = status.github || '';
    const match = github.match(/github\.com\/([^/]+\/[^/]+)/i);
    return match?.[1] ?? identity.repo ?? null;
  })();

  return {
    slug: status.slug || identity.slug || path.basename(ROOT),
    name: status.name || identity.name || path.basename(ROOT),
    repo: repoFromGithub,
    localPath: ROOT,
    studioOsApplied: studioOs.applied ?? true,
    status: status.status || 'active',
    lifecycle: status.lifecycle || identity.lifecycle || 'active',
    audience: status.audience || identity.audience || 'internal',
    vaultStatus: String(status.vaultStatus || identity.vaultStatus || '').toUpperCase(),
    brandingRequired: publicMeta.brandingRequired ?? true,
    brandingCompliant: publicMeta.brandingCompliant ?? true,
    stagingType: status.stagingType || (hosting.stagingUrl ? 'staging' : 'none'),
    stagingUrl: status.stagingUrl || hosting.stagingUrl || null,
    liveUrl: status.liveUrl || hosting.liveUrl || null,
    launchStatus: status.launchStatus || hosting.deployStatus || null,
    revenueModel: status.revenueModel || 'none',
    stripeReady: status.stripeReady === true,
    health: status.health || 'unknown',
  };
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}
