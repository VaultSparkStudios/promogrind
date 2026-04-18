#!/usr/bin/env node
/**
 * update-revenue-signals.mjs
 *
 * Structured revenue data intake for all revenue-relevant projects.
 * Solves the "Revenue signals stale" doctor warning without requiring the
 * Studio Owner to manually edit REVENUE_SIGNALS.md.
 *
 * Stores structured revenue data in portfolio/REVENUE_DATA.json.
 * After update, re-renders REVENUE_SIGNALS.md with fresh Generated date.
 *
 * Modes:
 *   --status            Show current revenue data for all projects
 *   --template          Dump a fill-in questionnaire (Markdown) to stdout
 *   --apply <file>      Apply a completed questionnaire JSON/YAML file
 *   --project <slug>    Filter to a single project
 *   (default)           Interactive prompts via readline
 *
 * Usage:
 *   node scripts/update-revenue-signals.mjs
 *   node scripts/update-revenue-signals.mjs --status
 *   node scripts/update-revenue-signals.mjs --template > revenue-questions.md
 *   node scripts/update-revenue-signals.mjs --apply answers.json
 *   node scripts/ops.mjs revenue-update [args...]
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Args ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const statusMode   = argv.includes('--status');
const templateMode = argv.includes('--template');
const applyIdx     = argv.indexOf('--apply');
const applyFile    = applyIdx !== -1 ? argv[applyIdx + 1] : null;
const projectIdx   = argv.indexOf('--project');
const filterSlug   = projectIdx !== -1 ? argv[projectIdx + 1] : null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function readJson(p, fb = {}) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }
function today() { return new Date().toISOString().slice(0, 10); }

// ── Revenue data store ─────────────────────────────────────────────────────────
const DATA_PATH = path.join(ROOT, 'portfolio', 'REVENUE_DATA.json');

function loadData() {
  return readJson(DATA_PATH, {
    _meta: { description: 'Structured revenue data for VaultSpark portfolio. Updated by update-revenue-signals.mjs.', updatedAt: null },
    projects: {},
  });
}

function saveData(data) {
  data._meta.updatedAt = today();
  writeJson(DATA_PATH, data);
}

// ── Revenue-relevant projects (has revenue model or is public-facing) ─────────
const REGISTRY_PATH = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
const registry = readJson(REGISTRY_PATH, { projects: [] });

const revenueProjects = registry.projects.filter(p => {
  if (filterSlug && p.slug !== filterSlug) return false;
  if (p.status === 'archived') return false;
  // Include any project with a revenue model or that is public-facing with a live URL
  const hasRevModel = p.revenueModel && p.revenueModel !== 'none';
  const isPublicLive = ['public-live', 'public-unlaunched', 'public-traction'].includes(p.audience);
  return hasRevModel || isPublicLive;
});

// ── Questions per project ─────────────────────────────────────────────────────
const QUESTIONS = [
  { key: 'mrrUsd',          label: 'Monthly Recurring Revenue (MRR) in USD', hint: '0 if none, skip to keep previous', nullable: true },
  { key: 'activeUsers',     label: 'Active users (last 30 days)',              hint: 'unique visitors or DAU, skip to keep previous', nullable: true },
  { key: 'paidUsers',       label: 'Paid / subscribed users',                  hint: '0 if none, skip to keep previous', nullable: true },
  { key: 'conversionRate',  label: 'Free-to-paid conversion rate (%)',          hint: 'e.g. 2.5 — skip to keep previous', nullable: true },
  { key: 'revenueNotes',    label: 'Revenue notes / context',                  hint: 'key events, changes, next steps — or skip' },
];

// ── --status mode ─────────────────────────────────────────────────────────────
if (statusMode) {
  const data = loadData();
  console.log('\n╔══ REVENUE DATA STATUS ════════════════════════════════════╗');
  console.log(`║  Last updated: ${data._meta.updatedAt || 'never'}`.padEnd(65) + '║');
  console.log('║  Project'.padEnd(30) + '  MRR ($)   Users  Paid   Conv%   Updated'.padEnd(35) + '║');
  console.log('║' + '─'.repeat(64) + '║');
  for (const p of revenueProjects) {
    const d = data.projects[p.slug] || {};
    const mrr  = d.mrrUsd        != null ? `$${d.mrrUsd}`  : '—';
    const users = d.activeUsers  != null ? String(d.activeUsers) : '—';
    const paid  = d.paidUsers    != null ? String(d.paidUsers) : '—';
    const conv  = d.conversionRate != null ? `${d.conversionRate}%` : '—';
    const upd   = d.updatedAt || '—';
    const row = `║  ${p.slug.slice(0,22).padEnd(22)}  ${mrr.padEnd(9)} ${users.padEnd(6)} ${paid.padEnd(6)} ${conv.padEnd(7)} ${upd}`;
    console.log(row.padEnd(65) + '║');
  }
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  process.exit(0);
}

// ── --template mode ───────────────────────────────────────────────────────────
if (templateMode) {
  console.log(`# Revenue Data Questionnaire — ${today()}\n`);
  console.log('> Fill in values below. Leave blank to skip (keeps previous data).');
  console.log('> Save as JSON and apply with: node scripts/ops.mjs revenue-update --apply <file>\n');
  console.log('```json');
  const template = { updatedAt: today(), projects: {} };
  for (const p of revenueProjects) {
    template.projects[p.slug] = {
      name: p.name,
      mrrUsd: null,
      activeUsers: null,
      paidUsers: null,
      conversionRate: null,
      revenueNotes: '',
    };
  }
  console.log(JSON.stringify(template, null, 2));
  console.log('```\n');
  process.exit(0);
}

// ── --apply mode ──────────────────────────────────────────────────────────────
if (applyFile) {
  if (!fs.existsSync(applyFile)) {
    console.error(`⛔ File not found: ${applyFile}`);
    process.exit(1);
  }
  const answers = readJson(applyFile);
  const data = loadData();
  let count = 0;
  for (const [slug, vals] of Object.entries(answers.projects || {})) {
    if (!data.projects[slug]) data.projects[slug] = {};
    for (const q of QUESTIONS) {
      if (vals[q.key] != null && vals[q.key] !== '') {
        data.projects[slug][q.key] = vals[q.key];
      }
    }
    data.projects[slug].updatedAt = today();
    count++;
  }
  saveData(data);
  console.log(`\n✓ Applied revenue data for ${count} project(s) → portfolio/REVENUE_DATA.json`);
  refreshRevenueSurface(data);
  process.exit(0);
}

// ── Interactive mode ───────────────────────────────────────────────────────────
const data = loadData();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) { return new Promise(resolve => rl.question(q, resolve)); }

async function runInteractive() {
  console.log('\n╔══ REVENUE SIGNALS UPDATE ══════════════════════════════════╗');
  console.log(`║  ${revenueProjects.length} revenue-relevant projects found`.padEnd(65) + '║');
  console.log('║  Press Enter to skip any field (keeps previous value).     ║');
  console.log('║  Type "q" at any project to quit and save progress.        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  let savedCount = 0;

  for (let i = 0; i < revenueProjects.length; i++) {
    const p = revenueProjects[i];
    const existing = data.projects[p.slug] || {};

    console.log(`\n[${i + 1}/${revenueProjects.length}] ${p.name} (${p.slug})`);
    console.log(`  Revenue model: ${p.revenueModel || 'none'} · Audience: ${p.audience}`);
    console.log(`  Live URL: ${p.liveUrl || p.runtimeUrl || '(none)'}`);
    if (existing.updatedAt) console.log(`  Last updated: ${existing.updatedAt}`);

    const updates = {};
    let quit = false;

    for (const q of QUESTIONS) {
      const current = existing[q.key] != null ? ` [current: ${existing[q.key]}]` : '';
      const answer = await ask(`  ${q.label}${current} (${q.hint}): `);

      if (answer.trim().toLowerCase() === 'q') { quit = true; break; }
      if (answer.trim() === '') continue;

      const num = ['mrrUsd', 'activeUsers', 'paidUsers', 'conversionRate'].includes(q.key)
        ? parseFloat(answer.trim())
        : answer.trim();

      updates[q.key] = num;
    }

    if (!data.projects[p.slug]) data.projects[p.slug] = {};
    Object.assign(data.projects[p.slug], updates);
    data.projects[p.slug].updatedAt = today();
    savedCount++;
    saveData(data);
    console.log(`  ✓ Saved.`);

    if (quit) { console.log('\n  Quit — progress saved.'); break; }
  }

  rl.close();

  if (savedCount > 0) {
    console.log(`\n✓ Revenue data updated for ${savedCount} project(s) → portfolio/REVENUE_DATA.json`);
    refreshRevenueSurface(data);
  } else {
    console.log('\nNo changes made.');
  }
}

// ── Re-render REVENUE_SIGNALS.md after data update ───────────────────────────
function refreshRevenueSurface(data) {
  const signalsPath = path.join(ROOT, 'portfolio', 'REVENUE_SIGNALS.md');
  if (!fs.existsSync(signalsPath)) {
    console.log('⚠  portfolio/REVENUE_SIGNALS.md not found — run: node scripts/ops.mjs revenue-signals');
    return;
  }

  // Stamp fresh Generated date into the file
  let content = fs.readFileSync(signalsPath, 'utf8');
  const newDate = today();
  content = content.replace(/Generated: \d{4}-\d{2}-\d{2}/, `Generated: ${newDate}`);

  // Inject revenue data table if section exists
  const dataRows = Object.entries(data.projects)
    .filter(([, d]) => d.mrrUsd != null || d.activeUsers != null)
    .map(([slug, d]) => {
      const mrr   = d.mrrUsd        != null ? `$${d.mrrUsd}` : '—';
      const users = d.activeUsers   != null ? String(d.activeUsers) : '—';
      const paid  = d.paidUsers     != null ? String(d.paidUsers) : '—';
      const conv  = d.conversionRate != null ? `${d.conversionRate}%` : '—';
      return `| ${slug} | ${mrr} | ${users} | ${paid} | ${conv} | ${d.updatedAt || '—'} |`;
    });

  const tableBlock = dataRows.length > 0
    ? `\n## Live Revenue Data (from update-revenue-signals.mjs)\n\n` +
      `> Last updated: ${newDate}\n\n` +
      `| Project | MRR (USD) | Active Users | Paid Users | Conv% | As-Of |\n` +
      `|---|---:|---:|---:|---:|---|\n` +
      dataRows.join('\n') + '\n'
    : '';

  // Replace or append the live data section
  if (content.includes('## Live Revenue Data')) {
    content = content.replace(/## Live Revenue Data[\s\S]*?(?=\n## |$)/, tableBlock);
  } else if (tableBlock) {
    content = content.trimEnd() + '\n\n' + tableBlock;
  }

  fs.writeFileSync(signalsPath, content, 'utf8');
  console.log(`✓ REVENUE_SIGNALS.md refreshed — Generated: ${newDate}`);
}

runInteractive().catch(err => { console.error(err); process.exit(1); });
