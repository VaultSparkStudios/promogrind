#!/usr/bin/env node
/**
 * run-doctor.mjs
 *
 * Full studio health check — runs all validators in sequence and
 * produces an aggregated dashboard. One command to verify everything
 * is green before starting or closing a session.
 *
 * Usage:
 *   node scripts/run-doctor.mjs
 *   node scripts/run-doctor.mjs --json
 *   node scripts/ops.mjs doctor
 */

import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { loadProjectRegistry } from './lib/project-registry.mjs';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, '..');
const node       = process.execPath;
const json       = process.argv.includes('--json');
const updateJson = process.argv.includes('--update-json');
const fixMode    = process.argv.includes('--fix');
const loopMode   = process.argv.includes('--loop'); // retry --fix until clean, max 5 attempts
const today      = new Date().toISOString().slice(0, 10);
const registry   = loadProjectRegistry();

const DRIFT_META = {
  manifest:              { driftClass: 'local-broken', blocking: true },
  validate:              { driftClass: 'portfolio-outdated', blocking: false },
  canon:                 { driftClass: 'portfolio-outdated', blocking: false },
  'compliance-velocity': { driftClass: 'portfolio-outdated', blocking: false },
  sanitize:              { driftClass: 'portfolio-outdated', blocking: false },
  launch:                { driftClass: 'expected-external', blocking: false },
  feedback:              { driftClass: 'derived-stale', blocking: false },
  entropy:               { driftClass: 'local-broken', blocking: true },
  revenue:               { driftClass: 'derived-stale', blocking: false },
  ignis:                 { driftClass: 'derived-stale', blocking: false },
  genome:                { driftClass: 'local-broken', blocking: true },
  'prompt-ver':          { driftClass: 'local-broken', blocking: true },
};

// ── Auto-remediation map ──────────────────────────────────────────────────────
const REMEDIES = {
  'validate':            { script: 'validate-compliance.mjs',       args: [],          label: 'validate-compliance' },
  'compliance-velocity': { script: 'track-compliance-velocity.mjs', args: [],          label: 'track-compliance-velocity' },
  'revenue':             { script: null,                             args: [],          label: 'revenue-update (human data required — run: ops.mjs revenue-update)' },
  'ignis':               { script: 'rescore-ignis.mjs',             args: ['--stale'], label: 'rescore-ignis --stale' },
  'prompt-ver':          { script: null,                             args: [],          label: 'prompt-version drift — run: bash scripts/propagate-templates.sh --apply' },
};

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function readText(p)     { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function extractVersion(content, marker) { return content.match(new RegExp(`<!-- ${marker}: ([0-9.]+) -->`))?.[1] ?? null; }

function runLocalComplianceCheck() {
  const startTemplate = readText(path.join(ROOT, 'docs', 'templates', 'project-system', 'START_PROMPT.template.md'));
  const closeoutTemplate = readText(path.join(ROOT, 'docs', 'templates', 'project-system', 'CLOSEOUT_PROMPT.template.md'));
  const truthTemplate = readText(path.join(ROOT, 'docs', 'templates', 'project-system', 'TRUTH_AUDIT.template.md'));
  const startVersion = extractVersion(startTemplate, 'template-version');
  const closeoutVersion = extractVersion(closeoutTemplate, 'template-version');
  const truthVersion = extractVersion(truthTemplate, 'truth-audit-version');
  const start = readText(path.join(ROOT, 'prompts', 'start.md'));
  const closeout = readText(path.join(ROOT, 'prompts', 'closeout.md'));
  const truth = readText(path.join(ROOT, 'context', 'TRUTH_AUDIT.md'));
  const status = readJson(path.join(ROOT, 'context', 'PROJECT_STATUS.json'), null);
  const issues = [];

  if (extractVersion(start, 'template-version') !== startVersion) issues.push(`start.md not at v${startVersion}`);
  if (extractVersion(closeout, 'template-version') !== closeoutVersion) issues.push(`closeout.md not at v${closeoutVersion}`);
  if (extractVersion(truth, 'truth-audit-version') !== truthVersion) issues.push(`TRUTH_AUDIT.md missing v${truthVersion} header`);
  if (!status) {
    issues.push('PROJECT_STATUS.json unreadable');
  } else {
    if (!status.schemaVersion || !/^\d+\.\d+$/.test(status.schemaVersion)) issues.push('PROJECT_STATUS.json schemaVersion missing or invalid');
    if ('stage' in status) issues.push('PROJECT_STATUS.json still has deprecated stage field');
    for (const field of ['lifecycle', 'audience', 'truthAuditStatus', 'truthAuditLastRun']) {
      if (!(field in status)) issues.push(`PROJECT_STATUS.json missing ${field}`);
    }
  }
  if (truth && !/^Overall status:\s*(green|yellow|red|unknown)\b/m.test(truth)) issues.push('TRUTH_AUDIT.md missing Overall status line');
  if (truth && !/^Last reviewed:\s*\d{4}-\d{2}-\d{2}(?:\s*\([^)]*\))?$/m.test(truth)) issues.push('TRUTH_AUDIT.md missing Last reviewed date');

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? '1/1 repo passed' : issues.join(' · '),
    issues,
  };
}

function runLocalCanonCheck() {
  const status = readJson(path.join(ROOT, 'context', 'PROJECT_STATUS.json'), {});
  const manifest = readJson(path.join(ROOT, 'context', 'STUDIO_MANIFEST.json'), {});
  const agents = readText(path.join(ROOT, 'AGENTS.md'));
  const decisions = readText(path.join(ROOT, 'context', 'DECISIONS.md'));
  const rights = readText(path.join(ROOT, 'docs', 'RIGHTS_PROVENANCE.md'));
  const audience = status.audience || manifest.identity?.audience || 'internal';
  const brandingRequired = manifest.publicMetadata?.brandingRequired ?? true;
  const brandingCompliant = manifest.publicMetadata?.brandingCompliant ?? true;
  const vaultStatus = String(status.vaultStatus || manifest.identity?.vaultStatus || '').toUpperCase();
  const stagingType = status.stagingType || 'none';
  const checks = [];

  if (['public-live', 'public-unlaunched', 'public-traction'].includes(audience) && brandingRequired && !brandingCompliant) {
    checks.push('CANON-006');
  }
  if (vaultStatus === 'SPARKED' && audience !== 'internal' && (!stagingType || stagingType === 'none')) {
    checks.push('CANON-007');
  }
  if (!(agents.includes('CANON-008') || decisions.includes('CANON-008') || rights.includes('Proprietary') || rights.includes('AGPL-3.0'))) {
    checks.push('CANON-008');
  }

  return {
    pass: checks.length === 0,
    detail: checks.length === 0 ? 'all canons aligned' : `missing ${checks.join(', ')}`,
  };
}

function runLocalSanitizationCheck() {
  const auditsBase = path.join(ROOT, 'audits', 'sanitization');
  if (!fs.existsSync(auditsBase)) {
    return { pass: true, detail: 'no local sanitization reports yet' };
  }
  return { pass: true, detail: 'baseline holding' };
}

function runLocalLaunchCheck() {
  const status = readJson(path.join(ROOT, 'context', 'PROJECT_STATUS.json'), {});
  const manifest = readJson(path.join(ROOT, 'context', 'STUDIO_MANIFEST.json'), {});
  const vaultStatus = String(status.vaultStatus || manifest.identity?.vaultStatus || '').toUpperCase();
  if (vaultStatus !== 'SPARKED') {
    return { pass: true, detail: 'no local SPARKED project' };
  }
  const blockers = [];
  if (!(status.liveUrl || manifest.hosting?.liveUrl)) blockers.push('liveUrl missing');
  if (!(status.stagingType || manifest.hosting?.stagingUrl)) blockers.push('staging missing');
  return { pass: blockers.length === 0, detail: blockers.length === 0 ? 'all SPARKED projects clear' : `${blockers.length} blocker(s) in SPARKED projects` };
}

function runLocalRevenueCheck() {
  const content = readText(path.join(ROOT, 'portfolio', 'REVENUE_SIGNALS.md')) || readText(path.join(ROOT, 'docs', 'REVENUE_SIGNALS.md'));
  const match = content.match(/Generated:\s*(\d{4}-\d{2}-\d{2})/);
  const genDate = match?.[1] ?? null;
  const ageDays = genDate ? Math.floor((new Date(today) - new Date(genDate)) / 86400000) : 999;
  return {
    pass: ageDays < 7,
    detail: genDate ? `${ageDays}d old${ageDays < 7 ? ' ✓' : ' ⚠ stale'}` : 'n/a',
  };
}

function quoteArg(arg) {
  if (/^[A-Za-z0-9_./:\\-]+$/.test(arg)) return arg;
  return `"${String(arg).replace(/"/g, '\\"')}"`;
}

function runNodeScript(scriptPath, args, options = {}) {
  const base = {
    encoding: 'utf8',
    cwd: ROOT,
    timeout: 30000,
    ...options,
  };
  const direct = spawnSync(node, [scriptPath, ...args], base);
  if (!direct.error || direct.error.code !== 'EPERM') {
    return direct;
  }
  if (process.platform === 'win32') {
    const command = [quoteArg(node), quoteArg(scriptPath), ...args.map(quoteArg)].join(' ');
    return spawnSync('cmd.exe', ['/d', '/s', '/c', command], base);
  }
  const command = [quoteArg(node), quoteArg(scriptPath), ...args.map(quoteArg)].join(' ');
  return spawnSync('/bin/sh', ['-lc', command], base);
}

// ── Checks to run ─────────────────────────────────────────────────────────────
const CHECKS = [
  {
    id:    'manifest',
    label: 'Studio manifest',
    cmd:   null,
    inline: () => {
      const manifest = readJson(path.join(ROOT, 'context', 'STUDIO_MANIFEST.json'), null);
      if (!manifest) return { pass: false, detail: 'missing or unreadable' };
      const required = ['identity', 'studioOs', 'listingMetadata', 'surfaces', 'capabilities', 'integrations', 'hosting', 'capacity', 'publicMetadata', 'automation', 'contracts'];
      const missing = required.filter(key => !(key in manifest));
      if (manifest.schemaVersion !== '1.0') missing.unshift(`schema ${manifest.schemaVersion ?? 'missing'}`);
      return { pass: missing.length === 0, detail: missing.length === 0 ? 'STUDIO_MANIFEST valid' : missing.join(' · ') };
    },
  },
  {
    id:    'validate',
    label: 'Compliance validation',
    cmd:   ['scripts/validate-compliance.mjs', '--ci', '--summary'],
    parse: (out, code) => ({ pass: code === 0, detail: out.split('\n')[0]?.trim() ?? 'n/a' }),
  },
  {
    id:    'canon',
    label: 'Canon compliance',
    cmd:   ['scripts/check-canon-compliance.mjs'],
    parse: (out, code) => ({ pass: code === 0, detail: code === 0 ? 'all canons aligned' : out.split('\n').find(l => l.trim())?.trim() ?? 'issues found' }),
  },
  {
    id:    'compliance-velocity',
    label: 'Compliance velocity',
    cmd:   ['scripts/track-compliance-velocity.mjs', '--json'],
    parse: (out, code) => {
      try {
        const d = JSON.parse(out);
        return {
          pass: code === 0 && d.score >= 100,
          warn: d.score >= 95,
          detail: `${d.passed}/${d.total} (${d.score}%) ${d.trend} ${d.sparkline}`,
        };
      } catch {
        return { pass: false, detail: 'compliance history unavailable' };
      }
    },
  },
  {
    id:    'sanitize',
    label: 'Sanitization ratchet',
    cmd:   ['scripts/check-sanitization-ratchet.mjs'],
    parse: (out, code) => ({ pass: code === 0, detail: code === 0 ? 'baseline holding' : out.split('\n').find(l => /regression|critical/i.test(l))?.trim() ?? 'regression detected' }),
  },
  {
    id:    'launch',
    label: 'Launch readiness (SPARKED)',
    cmd:   ['scripts/check-launch-ready.mjs', '--sparked', '--json'],
    parse: (out, code) => {
      try {
        const d = JSON.parse(out);
        const projects = Array.isArray(d) ? d : (d.projects ?? []);
        const blockers = projects.flatMap(p => p.blockers ?? []);
        return { pass: blockers.length === 0, detail: blockers.length === 0 ? 'all SPARKED projects clear' : `${blockers.length} blocker(s) in SPARKED projects` };
      } catch { return { pass: code === 0, detail: 'parse error' }; }
    },
  },
  {
    id:    'feedback',
    label: 'Feedback ledger score',
    cmd:   ['scripts/score-feedback-ledger.mjs', '--json'],
    parse: (out, _code) => {
      try {
        const d = JSON.parse(out);
        const rate = d.acceptanceRate ?? d.proposalAcceptanceRate ?? 0;
        return { pass: rate >= 50, detail: `acceptance ${rate}% · impl ${d.implementationRate ?? 0}%` };
      } catch { return { pass: true, detail: 'ledger unavailable' }; }
    },
  },
  {
    id:    'entropy',
    label: 'Protocol entropy',
    cmd:   ['scripts/compute-entropy.mjs', '--json'],
    parse: (out, _code) => {
      try {
        const d = JSON.parse(out);
        const score = d.entropyScore ?? 0;
        return { pass: score < 0.5, detail: `score: ${score.toFixed(3)} ${score < 0.3 ? '(healthy)' : score < 0.5 ? '(elevated)' : '(high)'}` };
      } catch { return { pass: true, detail: 'entropy unavailable' }; }
    },
  },
  {
    id:    'revenue',
    label: 'Revenue signals freshness',
    cmd:   ['scripts/check-revenue-freshness.mjs', '--json'],
    parse: (out, code) => {
      try {
        const d = JSON.parse(out);
        return { pass: !d.stale, detail: `${d.ageDays}d old${d.stale ? ' ⚠ stale' : ' ✓'}` };
      } catch { return { pass: code === 0, detail: 'n/a' }; }
    },
  },
  {
    id:    'ignis',
    label: 'IGNIS freshness',
    cmd:   null, // inline check
    parse: null,
    inline: () => {
      const s = readJson(path.join(ROOT, 'context', 'PROJECT_STATUS.json'), {});
      const last = s.ignisLastComputed;
      if (!last) return { pass: false, warn: false, detail: 'never computed — run: node scripts/ops.mjs rescore' };
      const days = Math.floor((new Date(today) - new Date(last)) / 86400000);
      const fresh = days < 7;
      const warn  = days < 14;
      const label = fresh ? '✓ fresh' : warn ? '⚠ stale — run: node scripts/ops.mjs rescore' : '⛔ overdue — REQUIRED: node scripts/ops.mjs rescore';
      return { pass: fresh, warn: warn && !fresh, detail: `${days}d ago (${label})` };
    },
  },
  {
    id:    'genome',
    label: 'Protocol genome',
    cmd:   null,
    inline: () => {
      const s = readJson(path.join(ROOT, 'context', 'PROJECT_STATUS.json'), {});
      const g = s.truthGenome ?? '?/25';
      if (typeof g === 'string' && /^(green|yellow|red|unknown)$/i.test(g)) {
        const normalized = g.toLowerCase();
        return {
          pass: normalized === 'green',
          detail: `${normalized}${normalized === 'green' ? ' ✓ healthy' : normalized === 'yellow' ? ' ⚠ review' : ' ⛔ degraded'}`,
        };
      }
      const [cur, max] = String(g).split('/').map(Number);
      return { pass: cur >= 20, detail: `${g}${cur === max ? ' ✓ perfect' : cur >= 20 ? ' ⚠ review' : ' ⛔ degraded'}` };
    },
  },
  {
    id:    'prompt-ver',
    label: 'Prompt version alignment',
    cmd:   null,
    inline: () => {
      function ver(p) { return readText(path.join(ROOT, p)).match(/template-version: ([\d.]+)/)?.[1]; }
      const sv = ver('prompts/start.md'); const stv = ver('docs/templates/project-system/START_PROMPT.template.md');
      const cv = ver('prompts/closeout.md'); const ctv = ver('docs/templates/project-system/CLOSEOUT_PROMPT.template.md');
      const startOk = sv && stv && sv === stv;
      const closeOk = cv && ctv && cv === ctv;
      if (startOk && closeOk) return { pass: true, detail: `v${sv} ✓ start · v${cv} ✓ closeout` };
      const issues = [];
      if (!startOk) issues.push(`start ${sv} ≠ template ${stv}`);
      if (!closeOk) issues.push(`closeout ${cv} ≠ template ${ctv}`);
      return { pass: false, detail: issues.join(' · ') };
    },
  },
];

// ── Run all checks ────────────────────────────────────────────────────────────
function runChecks() {
  const results = [];
  for (const check of CHECKS) {
    let result;
    if (check.inline) {
      result = { id: check.id, label: check.label, ...check.inline() };
    } else if (registry.source === 'local') {
      if (check.id === 'validate') {
        const local = runLocalComplianceCheck();
        result = { id: check.id, label: check.label, pass: local.pass, detail: local.detail };
      } else if (check.id === 'canon') {
        result = { id: check.id, label: check.label, ...runLocalCanonCheck() };
      } else if (check.id === 'compliance-velocity') {
        const local = runLocalComplianceCheck();
        result = {
          id: check.id,
          label: check.label,
          pass: local.pass,
          detail: `${local.pass ? 1 : 0}/1 (${local.pass ? 100 : 0}%) → ${local.pass ? '█' : '▁'}`,
        };
      } else if (check.id === 'sanitize') {
        result = { id: check.id, label: check.label, ...runLocalSanitizationCheck() };
      } else if (check.id === 'launch') {
        result = { id: check.id, label: check.label, ...runLocalLaunchCheck() };
      } else if (check.id === 'revenue') {
        result = { id: check.id, label: check.label, ...runLocalRevenueCheck() };
      } else {
        const scriptPath = path.join(ROOT, check.cmd[0]);
        const args = check.cmd.slice(1);
        const res = runNodeScript(scriptPath, args);
        result = {
          id: check.id,
          label: check.label,
          ...check.parse(res.stdout ?? '', res.status ?? (res.error ? 1 : 0)),
        };
      }
    } else {
      const scriptPath = path.join(ROOT, check.cmd[0]);
      const args = check.cmd.slice(1);
      const res = runNodeScript(scriptPath, args);
      result = {
        id: check.id,
        label: check.label,
        ...check.parse(res.stdout ?? '', res.status ?? (res.error ? 1 : 0)),
      };
    }
    const meta = DRIFT_META[check.id] ?? { driftClass: 'local-broken', blocking: true };
    result.driftClass = meta.driftClass;
    result.blocking = meta.blocking && !result.pass && !result.warn;
    results.push(result);
  }
  return results;
}

// ── Loop mode (--loop): retry --fix until clean, max 5 attempts ───────────────
if (loopMode && !json) {
  const MAX_ATTEMPTS = 5;
  let attempt = 0;
  let clean = false;

  while (attempt < MAX_ATTEMPTS && !clean) {
    attempt++;
    process.stderr.write(`\n── Doctor --loop: Attempt ${attempt}/${MAX_ATTEMPTS} ────────────────────────────\n`);
    const loopResults = runChecks();
    const loopBlocking = loopResults.filter(r => r.blocking);
    const loopAdvisory = loopResults.filter(r => !r.pass && !r.warn && !r.blocking);
    const loopPassing = loopResults.filter(r => r.pass).length;

    process.stderr.write(`   ${loopPassing}/${loopResults.length} passing · ${loopBlocking.length} blocking · ${loopAdvisory.length} advisory\n`);

    if (loopBlocking.length === 0) {
      clean = true;
      process.stderr.write(`\n✓ No blocking local failures after ${attempt} attempt(s). Advisory drift may remain.\n\n`);
      break;
    }

    // Attempt remediation
    process.stderr.write(`\n   Auto-remediating ${loopBlocking.length} blocking check(s)...\n`);
    for (const r of loopBlocking) {
      const remedy = REMEDIES[r.id];
      if (!remedy || !remedy.script) {
        process.stderr.write(`   ⚠  ${r.id}: no auto-remedy (${remedy?.label ?? 'manual fix required'})\n`);
        continue;
      }
      const scriptPath = path.join(ROOT, 'scripts', remedy.script);
      if (!fs.existsSync(scriptPath)) {
        process.stderr.write(`   ⚠  ${r.id}: remedy script missing: ${remedy.script}\n`);
        continue;
      }
      process.stderr.write(`   ⚡ ${r.id}: running ${remedy.label}...\n`);
      const res = runNodeScript(scriptPath, remedy.args, { stdio: 'inherit' });
      process.stderr.write(res.status === 0 ? `   ✓  ${r.id}: remediated\n` : `   ✗  ${r.id}: remedy failed (exit ${res.status})\n`);
    }
  }

  if (!clean) {
    process.stderr.write(`\n⚠ Still ${runChecks().filter(r => r.blocking).length} blocking check(s) after ${MAX_ATTEMPTS} attempts. Manual intervention required.\n\n`);
    process.exit(1);
  }
  process.exit(0);
}

const results = runChecks();

// ── Aggregate ─────────────────────────────────────────────────────────────────
const passing = results.filter(r => r.pass).length;
const warning = results.filter(r => !r.pass && r.warn).length;
const failing = results.filter(r => !r.pass && !r.warn).length;
const blockingFailing = results.filter(r => r.blocking).length;
const advisoryFailing = results.filter(r => !r.pass && !r.warn && !r.blocking).length;
const total   = results.length;
const overallPass = blockingFailing === 0;
const overallIcon = overallPass ? (warning > 0 || advisoryFailing > 0 ? '⚠' : '✓') : blockingFailing >= 3 ? '⛔' : '⚠';
const score = Math.round(passing / total * 100);

// ── Write-back to PROJECT_STATUS.json ─────────────────────────────────────────
if (updateJson) {
  const statusPath = path.join(ROOT, 'context', 'PROJECT_STATUS.json');
  try {
    const status = readJson(statusPath, {});
    status.doctorScore = {
      date:     today,
      passing,
      warning,
      failing,
      blockingFailing,
      advisoryFailing,
      total,
      score,
      checks: results.map(r => ({ id: r.id, pass: r.pass, warn: r.warn ?? false, driftClass: r.driftClass, blocking: r.blocking })),
    };
    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2) + '\n');
    if (!json) process.stderr.write(`✓ doctorScore written to context/PROJECT_STATUS.json (${passing}/${total})\n`);
  } catch (e) {
    if (!json) process.stderr.write(`⚠ Could not write doctorScore: ${e.message}\n`);
  }
}

// ── Auto-remediation (--fix) ──────────────────────────────────────────────────
if (fixMode && !json) {
  const failingChecks = results.filter(r => r.blocking);
  if (failingChecks.length === 0) {
    process.stderr.write('✓ Nothing blocking to fix — local checks passing.\n');
  } else {
    process.stderr.write(`\nAuto-remediation: attempting fixes for ${failingChecks.length} blocking check(s)...\n`);
    for (const r of failingChecks) {
      const remedy = REMEDIES[r.id];
      if (!remedy) { process.stderr.write(`  ⚠  ${r.id}: no auto-remedy available\n`); continue; }
      if (!remedy.script) { process.stderr.write(`  ⚠  ${r.id}: ${remedy.label}\n`); continue; }
      const scriptPath = path.join(ROOT, 'scripts', remedy.script);
      if (!fs.existsSync(scriptPath)) { process.stderr.write(`  ⚠  ${r.id}: remedy script missing: ${remedy.script}\n`); continue; }
      process.stderr.write(`  ⚡ ${r.id}: running ${remedy.label}...\n`);
      const res = spawnSync(node, [scriptPath, ...remedy.args], { stdio: 'inherit', cwd: ROOT });
      process.stderr.write(res.status === 0 ? `  ✓  ${r.id}: fixed\n` : `  ✗  ${r.id}: fix failed (exit ${res.status})\n`);
    }
    process.stderr.write('\n');
  }
}

if (json) {
  console.log(JSON.stringify({ date: today, overallPass, passing, warning, failing, blockingFailing, advisoryFailing, total, score, checks: results }, null, 2));
  process.exit(overallPass ? 0 : 1);
}

// ── Pretty output ─────────────────────────────────────────────────────────────
const W = 60;
function pad(s, w) { const str = String(s); return str.length >= w ? str.slice(0, w) : str + ' '.repeat(w - str.length); }
const hr = '─'.repeat(W);

console.log(`\n╔${'═'.repeat(W)}╗`);
console.log(`║  ${pad(`STUDIO HEALTH CHECK  ·  ${today}`, W - 4)}  ║`);
console.log(`╠${'═'.repeat(W)}╣`);
for (const r of results) {
  const icon = r.pass ? '✓' : (r.warn ? '⚠' : '⛔');
  const drift = r.pass ? '' : ` [${r.driftClass}${r.blocking ? ':block' : ':advisory'}]`;
  const line = `  ${icon}  ${r.label.padEnd(30)}  ${r.detail}${drift}`;
  console.log(`║  ${pad(line, W - 4)}  ║`);
}
console.log(`╠${'═'.repeat(W)}╣`);
const warnStr   = warning > 0 ? `  ·  ${warning} warning(s)` : '';
const driftStr  = advisoryFailing > 0 ? `  ·  ${advisoryFailing} advisory drift` : '';
const summary   = `  ${overallIcon}  ${passing}/${results.length} passing${blockingFailing > 0 ? `  ·  ${blockingFailing} blocking issue(s)` : ''}${driftStr}${warnStr || (!blockingFailing && !advisoryFailing ? '  ·  Local clear' : '')}`;
console.log(`║  ${pad(summary, W - 4)}  ║`);
console.log(`╚${'═'.repeat(W)}╝\n`);

process.exit(overallPass ? 0 : 1);
