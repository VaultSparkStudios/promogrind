#!/usr/bin/env node
/**
 * render-innovation-pack.mjs
 *
 * Deterministic second-order work finder for /go saturation when the primary
 * genius list is empty. It intentionally uses only repo-local evidence and
 * marks external proof gates as deferrals instead of pretending they are shippable.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanWindowsHide, scanDirectChildProcessImports } from './check-windows-hide.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const JSON_MODE = process.argv.includes('--json');
const DRY = process.argv.includes('--dry-run');
const TOP = Number(argValue('--top', '12'));

const OUT_MD = path.join(ROOT, 'docs', 'INNOVATION_PACK.md');
const OUT_JSON = path.join(ROOT, 'docs', 'INNOVATION_PACK.json');

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] !== undefined ? process.argv[idx + 1] : fallback;
}

function readText(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; }
}

function readJson(rel, fallback = {}) {
  try { return JSON.parse(readText(rel)); } catch { return fallback; }
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (['node_modules', '.git', 'dist', 'dist-cap', '.cache', 'coverage'].includes(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function add(items, item) {
  const effortHours = item.effortHours ?? 1;
  const priority = Number(((item.impact * item.innovation) / Math.log2(effortHours + 2)).toFixed(1));
  items.push({
    status: item.status ?? 'unblocked',
    effort: item.effort ?? `${effortHours}h`,
    effortHours,
    priority,
    ...item,
  });
}

function collectTodoSignals() {
  const roots = ['src', 'scripts', 'supabase/functions'];
  const signals = [];
  const re = /\b(TODO|FIXME|HACK|not implemented)\b/i;
  for (const root of roots) {
    for (const file of walk(path.join(ROOT, root))) {
      if (!/\.(mjs|js|jsx|ts|tsx)$/.test(file)) continue;
      if (rel(file) === 'scripts/render-innovation-pack.mjs') continue;
      const fileRel = rel(file);
      if (/^scripts\/test-|^src\/__tests__\//.test(fileRel)) continue;
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (/not implemented/i.test(trimmed) && (/implemented/i.test(trimmed) || /outcome/i.test(trimmed))) return;
        if (/template|placeholder|fill in|drift stub|prose drift/i.test(trimmed)) return;
        if (re.test(trimmed)) signals.push(`${fileRel}:${idx + 1} ${trimmed.slice(0, 120)}`);
      });
    }
  }
  return signals;
}

function collectLargeFiles() {
  const roots = ['src', 'scripts'];
  const rows = [];
  for (const root of roots) {
    for (const file of walk(path.join(ROOT, root))) {
      if (!/\.(mjs|js|jsx|ts|tsx)$/.test(file)) continue;
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
      const limit = rel(file).startsWith('src/') ? 650 : 900;
      if (lines >= limit) rows.push({ file: rel(file), lines, limit });
    }
  }
  return rows.sort((a, b) => b.lines - a.lines).slice(0, 8);
}

function collectLaunchDeferrals(status) {
  return (status.blockers ?? [])
    .filter((entry) => /proof|smoke|friend|brevo|capture|capability|stripe|email/i.test(entry))
    .slice(0, 8);
}

function buildPack() {
  const status = readJson('context/PROJECT_STATUS.json', {});
  const genius = readText('docs/GENIUS_LIST.md');
  const taskBoard = readText('context/TASK_BOARD.md');
  const windowsShell = scanWindowsHide(path.join(ROOT, 'scripts'));
  const rawImports = scanDirectChildProcessImports(path.join(ROOT, 'scripts'));
  const todoSignals = collectTodoSignals();
  const largeFiles = collectLargeFiles();
  const launchDeferrals = collectLaunchDeferrals(status);
  const items = [];

  if (windowsShell.length || rawImports.length) {
    add(items, {
      id: 'windows-hide-window-storm-hardening',
      tier: 'high',
      axis: 'automation / developer-experience / security',
      impact: 9,
      innovation: 4,
      effort: '30m',
      effortHours: 0.5,
      evidence: `${windowsShell.length} shell:true missing windowsHide; ${rawImports.length} direct child_process imports.`,
      recipe: 'Route all child spawns through scripts/lib/safe-spawn.mjs or add windowsHide:true at shell:true call sites, then run node scripts/check-windows-hide.mjs.',
    });
  }

  if (!/innovation-pack/i.test(readText('scripts/ops/intelligence.mjs') + readText('scripts/ops/legacy.mjs'))) {
    add(items, {
      id: 'local-innovation-pack-command',
      tier: 'high',
      axis: 'process / automation',
      impact: 8,
      innovation: 6,
      effort: '1h',
      effortHours: 1,
      evidence: 'docs/SESSION_PROTOCOL.md requires node scripts/ops.mjs innovation-pack, but the local ops registry has no command.',
      recipe: 'Add a deterministic innovation-pack renderer that turns TODOs, stale live-code signals, recent audit deferrals, and launch-proof blockers into docs/INNOVATION_PACK.md.',
    });
  }

  if (todoSignals.length) {
    add(items, {
      id: 'inline-debt-triage',
      tier: 'medium',
      axis: 'maintainability',
      impact: 6,
      innovation: 3,
      effort: '1h',
      effortHours: 1,
      evidence: `${todoSignals.length} inline TODO/FIXME/HACK/not-implemented signals. First: ${todoSignals[0]}`,
      recipe: 'Convert true code-owned TODOs into either tests, explicit TASK_BOARD entries, or completed fixes; reject form placeholder false positives.',
    });
  }

  if (largeFiles.length) {
    const top = largeFiles[0];
    add(items, {
      id: 'next-god-file-decomposition',
      tier: 'medium',
      axis: 'speed / organization',
      impact: 7,
      innovation: 3,
      effort: '2h',
      effortHours: 2,
      evidence: `${top.file} is ${top.lines} lines (threshold ${top.limit}); ${largeFiles.length} files exceed local maintainability thresholds.`,
      recipe: `Extract one cohesive ownership slice from ${top.file}, add or extend focused tests, and preserve the existing launch-local gate.`,
    });
  }

  if (launchDeferrals.length) {
    add(items, {
      id: 'external-launch-proof-ledger',
      tier: 'external',
      axis: 'truth / launch-readiness',
      impact: 10,
      innovation: 1,
      effort: 'external',
      effortHours: 8,
      status: 'honest-deferral',
      evidence: `${launchDeferrals.length} real-world proof gates remain in PROJECT_STATUS.blockers.`,
      recipe: 'Do not fabricate proof. Keep these as explicit launch blockers until real email, Stripe, tester, Brevo, Supabase capability, or deploy-config evidence exists.',
    });
  }

  const ranked = items
    .sort((a, b) => b.priority - a.priority)
    .slice(0, TOP);

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    project: status.name ?? status.slug ?? 'PromoGrind',
    session: (status.currentSession ?? 0) + 1,
    sourceSignals: {
      geniusListEmpty: !/^## /m.test(genius),
      taskBoardBytes: taskBoard.length,
      windowsHideShellViolations: windowsShell.length,
      directChildProcessImports: rawImports.length,
      todoSignals: todoSignals.length,
      largeFiles: largeFiles.length,
      launchDeferrals: launchDeferrals.length,
    },
    ranked,
    evidence: {
      windowsShell,
      rawImports,
      todoSignals: todoSignals.slice(0, 20),
      largeFiles,
      launchDeferrals,
    },
  };
}

function renderMd(pack) {
  const lines = [
    '# Innovation Pack',
    '',
    `> Generated: ${pack.generatedAt.slice(0, 10)} | Project: ${pack.project} | Session: ${pack.session}`,
    '',
    'Second-order work generated after the primary genius list is empty. Items are live-code verified where repo-owned; external proof gates stay explicit deferrals.',
    '',
    '## Ranked Candidates',
    '',
    '| # | Tier | Axis | Status | Effort | Impact | Innov. | Priority | Item |',
    '|---|---|---|---|---|---:|---:|---:|---|',
    ...pack.ranked.map((item, idx) =>
      `| ${idx + 1} | ${item.tier} | ${item.axis} | ${item.status} | ${item.effort} | ${item.impact} | ${item.innovation} | ${item.priority} | **${item.id}** - ${item.evidence} **Recipe:** ${item.recipe} |`
    ),
    '',
    '## Source Signals',
    '',
    ...Object.entries(pack.sourceSignals).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '*Generated by `scripts/render-innovation-pack.mjs` · run `node scripts/ops.mjs innovation-pack` to refresh*',
    '',
  ];
  return lines.join('\n');
}

const pack = buildPack();

if (!DRY) {
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(pack, null, 2)}\n`);
  fs.writeFileSync(OUT_MD, renderMd(pack));
}

if (JSON_MODE) {
  console.log(JSON.stringify(pack, null, 2));
} else {
  console.log(`${DRY ? 'DRY-RUN ' : ''}OK Innovation pack -> docs/INNOVATION_PACK.md (${pack.ranked.length} items)`);
  for (const [idx, item] of pack.ranked.entries()) {
    console.log(`  ${String(idx + 1).padStart(2)}. [${item.status}] ${item.id} · priority ${item.priority}`);
  }
}