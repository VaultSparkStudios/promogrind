#!/usr/bin/env node
// initiate.mjs — One-shot new-project orchestrator (<60s target)
//
// Does, in order:
//   1. Validate slug + name + audience + type
//   2. Create local repo dir, `git init`, copy template stack from docs/templates/project-system
//   3. Register in portfolio/PROJECT_REGISTRY.json
//   4. Run SOUL interview (delegates to /soul-interview skill if available; else scaffolds placeholder)
//   5. Create GitHub repo via `gh repo create` (private by default)
//   6. Seed initial commit + push
//   7. Register Hub tile (adds entry to portfolio/HUB_FEED.json)
//   8. Configure beacon gist entry (uses existing scripts/configure-beacon.mjs if present)
//   9. Emit studio event
//  10. Print founder brief
//
// Use:
//   node scripts/initiate.mjs --name="Call of Doodie" --slug=call-of-doodie --type=game --audience=public
//   node scripts/initiate.mjs --spec=new-project.json       (batch mode)
//   node scripts/initiate.mjs --dry-run                     (walk the steps, make no changes)

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from './lib/safe-spawn.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const eq = a.indexOf('=');
    return eq > 0 ? [a.slice(0, eq).replace(/^--/, ''), a.slice(eq + 1)] : [a.replace(/^--/, ''), true];
  }),
);

const ROOT = process.cwd();
const dryRun = args['dry-run'] === true || args['dry-run'] === 'true';
const step = (n, label) => console.log(`\n[${n}] ${label}${dryRun ? '  (DRY-RUN)' : ''}`);

let spec;
if (args.spec) {
  spec = JSON.parse(fs.readFileSync(args.spec, 'utf8'));
} else {
  spec = {
    name: args.name,
    slug: args.slug,
    type: args.type || 'app',
    audience: args.audience || 'internal',
    visibility: args.visibility || 'private',
    vaultStatus: 'FORGE',
    developmentPhase: 'incubating',
    stagingType: args['staging-type'] || (args.audience === 'internal' ? 'none' : 'local'),
    brandingRequired: args.audience !== 'internal',
  };
}

if (!spec.name || !spec.slug) {
  console.error('initiate: --name and --slug are required (or --spec=file.json)');
  process.exit(2);
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
if (!SLUG_RE.test(spec.slug)) {
  console.error(`initiate: invalid slug "${spec.slug}" — must match ${SLUG_RE}`);
  process.exit(2);
}

const DEV_ROOT = process.env.STUDIO_DEV_ROOT || path.resolve(ROOT, '..');
const PROJECT_DIR = path.join(DEV_ROOT, spec.slug);
const TEMPLATES = path.join(ROOT, 'docs/templates/project-system');
const REGISTRY_PATH = path.join(ROOT, 'portfolio/PROJECT_REGISTRY.json');
const T0 = Date.now();

function sh(cmd, cwd = ROOT) {
  if (dryRun) { console.log(`    $ ${cmd}`); return ''; }
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

function copyTree(src, dst) {
  if (dryRun) { console.log(`    copy ${path.relative(ROOT, src)} → ${path.relative(ROOT, dst)}`); return; }
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name.replace(/\.template\.md$/, '.md').replace(/\.template\.json$/, '.json'));
    if (e.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

function substitute(dir, vars) {
  if (dryRun) return;
  const walk = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const fp = path.join(p, e.name);
      if (e.isDirectory()) walk(fp);
      else if (/\.(md|json|ya?ml)$/.test(e.name)) {
        let txt = fs.readFileSync(fp, 'utf8');
        for (const [k, v] of Object.entries(vars)) {
          txt = txt.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
        }
        fs.writeFileSync(fp, txt);
      }
    }
  };
  walk(dir);
}

// ---- Steps

step(1, `Validate spec: ${spec.slug} (${spec.name})`);
console.log(`    type=${spec.type} audience=${spec.audience} visibility=${spec.visibility}`);
if (fs.existsSync(PROJECT_DIR)) {
  console.error(`initiate: ${PROJECT_DIR} already exists — aborting`);
  process.exit(2);
}

step(2, `Create repo at ${PROJECT_DIR} + seed templates`);
if (!dryRun) fs.mkdirSync(PROJECT_DIR, { recursive: true });
sh('git init -q', PROJECT_DIR);
copyTree(TEMPLATES, PROJECT_DIR);
substitute(PROJECT_DIR, {
  PROJECT_NAME: spec.name,
  PROJECT_SLUG: spec.slug,
  PROJECT_TYPE: spec.type,
  PROJECT_AUDIENCE: spec.audience,
  PROJECT_VAULT_STATUS: spec.vaultStatus,
  INITIATED_AT: new Date().toISOString().slice(0, 10),
  STAGING_TYPE: spec.stagingType,
});

step(3, 'Register in PROJECT_REGISTRY.json');
if (!dryRun) {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  const list = registry.projects || registry;
  if (list.find((p) => p.slug === spec.slug)) {
    console.error('initiate: slug already registered');
    process.exit(2);
  }
  list.push({
    slug: spec.slug,
    name: spec.name,
    type: spec.type,
    audience: spec.audience,
    vaultStatus: spec.vaultStatus,
    developmentPhase: spec.developmentPhase,
    stagingType: spec.stagingType,
    stagingUrl: null,
    brandingRequired: spec.brandingRequired,
    brandingCompliant: false,
    github: `https://github.com/VaultSparkStudios/${spec.slug}`,
    localPath: PROJECT_DIR,
    initiatedAt: new Date().toISOString(),
  });
  registry.projects = list;
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
}

step(4, 'SOUL interview (placeholder; invoke /soul-interview to fill)');
console.log('    (Studio Owner: run `/soul-interview` in the new repo to complete)');

step(5, `Create GitHub repo (gh repo create VaultSparkStudios/${spec.slug} --${spec.visibility})`);
sh(`gh repo create VaultSparkStudios/${spec.slug} --${spec.visibility} --source=. --remote=origin`, PROJECT_DIR);

step(6, 'Initial commit + push');
sh('git add -A', PROJECT_DIR);
sh(`git commit -q -m "feat: scaffold ${spec.slug} via initiate v1.0"`, PROJECT_DIR);
sh('git branch -M main', PROJECT_DIR);
sh('git push -u origin main', PROJECT_DIR);

step(7, 'Register Hub tile (portfolio/HUB_FEED.json)');
const hubFeedPath = path.join(ROOT, 'portfolio/compiled/HUB_FEED.json');
if (!dryRun && fs.existsSync(hubFeedPath)) {
  const hub = JSON.parse(fs.readFileSync(hubFeedPath, 'utf8'));
  hub.tiles = hub.tiles || [];
  hub.tiles.push({
    slug: spec.slug,
    name: spec.name,
    status: 'incubating',
    health: 'yellow',
    currentFocus: 'just initiated — awaiting first work session',
    nextMilestone: 'SOUL interview + first build session',
    lastUpdated: new Date().toISOString(),
  });
  fs.writeFileSync(hubFeedPath, JSON.stringify(hub, null, 2) + '\n');
}

step(8, 'Configure beacon gist entry (delegates to scripts/configure-beacon.mjs)');
const beaconScript = path.join(ROOT, 'scripts/configure-beacon.mjs');
if (fs.existsSync(beaconScript)) {
  sh(`node ${beaconScript} --slug=${spec.slug} --register`, ROOT);
} else {
  console.log('    (configure-beacon.mjs not present — skip)');
}

step(9, 'Emit studio event');
const eventScript = path.join(ROOT, 'scripts/emit-studio-event.mjs');
if (fs.existsSync(eventScript)) {
  sh(`node ${eventScript} --kind=project-initiated --slug=${spec.slug}`, ROOT);
}

step(10, 'Founder brief');
const elapsed = ((Date.now() - T0) / 1000).toFixed(1);
console.log(`
───────────────────────────────────────────
 INITIATE COMPLETE · ${spec.name} (${spec.slug})
───────────────────────────────────────────
 • Local:     ${PROJECT_DIR}
 • GitHub:    https://github.com/VaultSparkStudios/${spec.slug}
 • Type:      ${spec.type} · Audience: ${spec.audience}
 • Status:    ${spec.vaultStatus} / ${spec.developmentPhase}
 • Staging:   ${spec.stagingType}
 • Elapsed:   ${elapsed}s (target: <60s)

Next actions (Studio Owner):
 1. cd ${PROJECT_DIR}
 2. claude → /soul-interview
 3. claude → /start → /go
`);
