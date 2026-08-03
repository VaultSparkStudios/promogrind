import path from 'node:path';

const PROJECT_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function normalizeProjectSlug(value) {
  const normalized = String(value || '').trim().toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return PROJECT_RE.test(normalized) ? normalized : null;
}

export function resolveProjectIdentity({ explicitProject, root = process.cwd() } = {}) {
  const rootProject = normalizeProjectSlug(path.basename(path.resolve(root)));
  const project = normalizeProjectSlug(explicitProject) || rootProject;
  if (!project || !rootProject) {
    return { ok: false, project: null, rootProject, reason: 'project identity is empty or invalid' };
  }
  return {
    ok: true,
    project,
    rootProject,
    source: explicitProject ? 'explicit' : 'repository-root',
  };
}

export default { normalizeProjectSlug, resolveProjectIdentity };
