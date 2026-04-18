#!/usr/bin/env node
/**
 * check-ci-health.mjs
 *
 * CI Failure Root-Cause Sweep — scans GitHub Actions workflow runs across
 * all studioOsApplied repos and identifies consistently failing workflows.
 *
 * Uses the gh CLI for GitHub API access (no additional credentials needed).
 * Detects workflows with >2 failures in last 20 runs.
 * Outputs a box-drawing dashboard and appends a ci-alerts section to OPS_COCKPIT.
 *
 * Usage:
 *   node scripts/check-ci-health.mjs
 *   node scripts/check-ci-health.mjs --json
 *   node scripts/check-ci-health.mjs --update-cockpit
 *   node scripts/check-ci-health.mjs --project <slug>
 *   node scripts/ops.mjs ci-health [args...]
 *
 * Output:
 *   - Console: box-drawing CI health dashboard
 *   - With --update-cockpit: appends ci-alerts to docs/OPS_COCKPIT.md
 *   - With --json: machine-readable JSON report
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Args ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const jsonMode       = argv.includes('--json');
const updateCockpit  = argv.includes('--update-cockpit');
const projectIdx     = argv.indexOf('--project');
const filterSlug     = projectIdx !== -1 ? argv[projectIdx + 1] : null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function readJson(p, fb = {}) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function today() { return new Date().toISOString().slice(0, 10); }

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8', timeout: 30000 });
  if (r.error) return null;
  return r.stdout?.trim() || null;
}

// ── Load registry ──────────────────────────────────────────────────────────────
const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });

const repos = registry.projects.filter(p => {
  if (!p.studioOsApplied) return false;
  if (!p.repo) return false;
  if (filterSlug && p.slug !== filterSlug) return false;
  return true;
});

// ── Per-repo workflow scan ────────────────────────────────────────────────────
const FAILURE_THRESHOLD = 2; // flag workflow if it has > this many failures in last 20 runs
const RUN_LIMIT = 20;

const results = [];

if (!jsonMode) {
  console.log(`\nScanning ${repos.length} repos for CI failures...\n`);
}

for (const repo of repos) {
  const repoName = repo.repo; // e.g. VaultSparkStudios/vaultspark-studio-ops

  // Fetch recent workflow runs: status, conclusion, workflow name
  const raw = gh([
    'run', 'list',
    '--repo', repoName,
    '--limit', String(RUN_LIMIT),
    '--json', 'status,conclusion,workflowName,event,createdAt,url',
  ]);

  if (!raw) {
    results.push({
      slug: repo.slug,
      repo: repoName,
      error: 'gh command failed or no access',
      alerts: [],
    });
    continue;
  }

  let runs;
  try {
    runs = JSON.parse(raw);
  } catch {
    results.push({ slug: repo.slug, repo: repoName, error: 'parse error', alerts: [] });
    continue;
  }

  // Group by workflow name
  const byWorkflow = {};
  for (const run of runs) {
    const wf = run.workflowName || '(unknown)';
    if (!byWorkflow[wf]) byWorkflow[wf] = [];
    byWorkflow[wf].push(run);
  }

  const alerts = [];
  for (const [wfName, wfRuns] of Object.entries(byWorkflow)) {
    const failed   = wfRuns.filter(r => r.conclusion === 'failure').length;
    const success  = wfRuns.filter(r => r.conclusion === 'success').length;
    const skipped  = wfRuns.filter(r => r.conclusion === 'skipped').length;
    const total    = wfRuns.length;
    const failRate = total > 0 ? Math.round((failed / total) * 100) : 0;
    const lastRun  = wfRuns[0]?.createdAt?.slice(0, 10) || '—';
    const lastConc = wfRuns[0]?.conclusion || '—';

    if (failed > FAILURE_THRESHOLD) {
      alerts.push({
        workflow: wfName,
        failed,
        success,
        skipped,
        total,
        failRate,
        lastRun,
        lastConclusion: lastConc,
        url: wfRuns.find(r => r.conclusion === 'failure')?.url || '',
      });
    }
  }

  // Sort by failure count desc
  alerts.sort((a, b) => b.failed - a.failed);

  results.push({
    slug: repo.slug,
    repo: repoName,
    error: null,
    totalRuns: runs.length,
    alerts,
  });
}

// ── JSON output ───────────────────────────────────────────────────────────────
if (jsonMode) {
  const alertCount = results.reduce((n, r) => n + r.alerts.length, 0);
  console.log(JSON.stringify({
    generatedAt: today(),
    reposScanned: repos.length,
    totalAlerts: alertCount,
    results,
  }, null, 2));
  process.exit(alertCount > 0 ? 1 : 0);
}

// ── Console dashboard ─────────────────────────────────────────────────────────
const allAlerts = results.flatMap(r => r.alerts.map(a => ({ ...a, slug: r.slug, repo: r.repo })));
const errorRepos = results.filter(r => r.error);

console.log('╔══ CI HEALTH DASHBOARD ════════════════════════════════════════╗');
console.log(`║  Scanned:  ${repos.length} repos  ·  Date: ${today()}`.padEnd(65) + '║');
console.log(`║  Failing workflows (>${FAILURE_THRESHOLD} failures in last ${RUN_LIMIT} runs): ${allAlerts.length}`.padEnd(65) + '║');
if (errorRepos.length > 0) {
  console.log(`║  ⚠  ${errorRepos.length} repos could not be scanned (gh access / no workflows)`.padEnd(65) + '║');
}
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

if (allAlerts.length === 0) {
  console.log('  ✓ No consistently failing workflows found.\n');
} else {
  console.log(`  ⛔ ${allAlerts.length} workflow(s) need attention:\n`);

  for (const a of allAlerts) {
    const bar = '█'.repeat(Math.round(a.failRate / 10)) + '░'.repeat(10 - Math.round(a.failRate / 10));
    console.log(`  ┌─ ${a.repo}`);
    console.log(`  │  Workflow: ${a.workflow}`);
    console.log(`  │  Failures: ${a.failed}/${a.total}  Fail rate: [${bar}] ${a.failRate}%`);
    console.log(`  │  Last run: ${a.lastRun}  →  ${a.lastConclusion}`);
    if (a.url) console.log(`  │  URL: ${a.url}`);
    console.log(`  └─ Fix: gh run list --repo ${a.repo} --workflow "${a.workflow}"`);
    console.log('');
  }
}

// Per-repo summary
console.log('  Repository breakdown:');
for (const r of results) {
  const icon = r.error ? '⚠ ' : r.alerts.length > 0 ? '⛔' : '✓ ';
  const detail = r.error ? r.error : `${r.alerts.length} alert(s)`;
  console.log(`  ${icon}  ${r.slug.padEnd(35)} ${detail}`);
}
console.log('');

// ── Update OPS_COCKPIT.md if requested ────────────────────────────────────────
if (updateCockpit) {
  const cockpitPath = path.join(ROOT, 'docs', 'OPS_COCKPIT.md');
  if (!fs.existsSync(cockpitPath)) {
    console.log('⚠  docs/OPS_COCKPIT.md not found — run: node scripts/ops.mjs cockpit first');
  } else {
    let content = fs.readFileSync(cockpitPath, 'utf8');

    const section = [
      `\n## CI Alerts — ${today()}\n`,
      `> Workflows with >${FAILURE_THRESHOLD} failures in last ${RUN_LIMIT} runs · Scanned ${repos.length} repos\n`,
    ];

    if (allAlerts.length === 0) {
      section.push('✓ No failing workflows detected.\n');
    } else {
      section.push(`| Repo | Workflow | Failed | Total | Fail% | Last Run |\n`);
      section.push(`|---|---|---:|---:|---:|---|\n`);
      for (const a of allAlerts) {
        section.push(`| ${a.slug} | ${a.workflow} | ${a.failed} | ${a.total} | ${a.failRate}% | ${a.lastRun} |\n`);
      }
    }

    // Replace existing CI Alerts section or append
    const sectionText = section.join('');
    if (content.includes('## CI Alerts')) {
      content = content.replace(/## CI Alerts[\s\S]*?(?=\n## |$)/, sectionText);
    } else {
      content = content.trimEnd() + '\n' + sectionText;
    }

    fs.writeFileSync(cockpitPath, content, 'utf8');
    console.log('✓ CI alerts appended to docs/OPS_COCKPIT.md');
  }
}

process.exit(allAlerts.length > 0 ? 1 : 0);
