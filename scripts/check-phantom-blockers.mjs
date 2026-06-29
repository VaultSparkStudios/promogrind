#!/usr/bin/env node
/**
 * check-phantom-blockers.mjs
 *
 * Phantom Blocker Detector — scans TASK_BOARD.md "Human Action Required" items
 * and applies programmatic resolvers to determine if each is still truly blocked
 * or has already been resolved without the agent knowing.
 *
 * Resolvers applied per item type:
 *   - GitHub label check:  gh label list --repo <repo> | grep <label-name>
 *   - DNS probe:           Node dns.lookup() for staging/app hostnames
 *   - API key env check:   process.env presence check + secrets/social.env probe
 *   - URL reachability:    https.get() HEAD check
 *   - File existence:      local file/path existence check
 *
 * Results: RESOLVED / STILL_BLOCKED / UNKNOWN per item.
 * Automatically marks resolved items in console and recommends TASK_BOARD update.
 *
 * Usage:
 *   node scripts/check-phantom-blockers.mjs
 *   node scripts/check-phantom-blockers.mjs --json
 *   node scripts/check-phantom-blockers.mjs --verbose
 *   node scripts/ops.mjs phantom-check [args...]
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import dns from 'dns/promises';
import { spawnSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Args ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const jsonMode = argv.includes('--json');
const verbose  = argv.includes('--verbose');

// ── Helpers ───────────────────────────────────────────────────────────────────
function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function readEnvFile(p) {
  const env = {};
  for (const line of readText(p).split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}
function today() { return new Date().toISOString().slice(0, 10); }

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8', timeout: 15000 });
  return r.error ? null : (r.stdout?.trim() || '');
}

function httpHead(url) {
  return new Promise(resolve => {
    try {
      const req = https.get(url, { timeout: 8000 }, res => {
        res.destroy();
        resolve({ ok: res.statusCode < 500, status: res.statusCode });
      });
      req.on('error', () => resolve({ ok: false, status: null }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: null }); });
    } catch { resolve({ ok: false, status: null }); }
  });
}

// ── Parse "Human Action Required" section from TASK_BOARD ────────────────────
function parseHumanItems() {
  const tb = readText(path.join(ROOT, 'context', 'TASK_BOARD.md'));
  const sectionMatch = tb.match(/## Human Action Required([\s\S]*?)(?=\n## |$)/);
  if (!sectionMatch) return [];

  const section = sectionMatch[1];
  const items = [];

  for (const line of section.split('\n')) {
    const openMatch = line.match(/^- \[ \] \*\*(.*?)\*\* — (.*)/);
    if (!openMatch) continue;
    items.push({
      title: openMatch[1].trim(),
      description: openMatch[2].trim(),
      raw: line.trim(),
    });
  }

  return items;
}

// ── Resolver registry ─────────────────────────────────────────────────────────
// Each resolver returns { status: 'RESOLVED'|'STILL_BLOCKED'|'UNKNOWN', reason: string }

const secretsEnv = readEnvFile(path.join(ROOT, 'secrets', 'social.env'));

async function resolve(item) {
  const title = item.title.toLowerCase();
  const desc  = item.description.toLowerCase();

  // ── GitHub label check ─────────────────────────────────────────────────────
  if (title.includes('label') || desc.includes('label')) {
    const labelMatch = (item.title + ' ' + item.description).match(/`([^`]+)`|"([^"]+)"/);
    const labelName = labelMatch ? (labelMatch[1] || labelMatch[2]) : null;
    const repoMatch = (item.description).match(/VaultSparkStudios\/[\w-]+/i);
    const repo = repoMatch ? repoMatch[0] : 'VaultSparkStudios/vaultspark-studio-ops';

    if (labelName) {
      const out = gh(['label', 'list', '--repo', repo, '--json', 'name']);
      if (out !== null) {
        try {
          const labels = JSON.parse(out);
          const found = labels.some(l => l.name.toLowerCase() === labelName.toLowerCase());
          if (found) return { status: 'RESOLVED', reason: `GitHub label "${labelName}" exists in ${repo}` };
          return { status: 'STILL_BLOCKED', reason: `Label "${labelName}" not found in ${repo}` };
        } catch {
          return { status: 'UNKNOWN', reason: 'Could not parse gh label output' };
        }
      }
      return { status: 'UNKNOWN', reason: 'gh label list failed (no access?)' };
    }
  }

  // ── DNS check for staging hostnames ──────────────────────────────────────
  if (title.includes('dns') || title.includes('staging') || desc.includes('dns') || desc.includes('*.staging')) {
    const hostMatch = desc.match(/[\w*.-]+\.vaultsparkstudios\.com/i) ||
                      item.title.match(/[\w*.-]+\.vaultsparkstudios\.com/i);
    let host = hostMatch ? hostMatch[0] : null;
    if (host && host.startsWith('*.')) {
      host = 'website.staging.vaultsparkstudios.com'; // test with a concrete subdomain
    }
    if (host) {
      try {
        await dns.lookup(host);
        return { status: 'RESOLVED', reason: `DNS resolves for ${host}` };
      } catch {
        return { status: 'STILL_BLOCKED', reason: `DNS lookup failed for ${host}` };
      }
    }
  }

  // ── URL reachability check ────────────────────────────────────────────────
  if (title.includes('deploy') || title.includes('url') || desc.match(/https:\/\//)) {
    const urlMatch = desc.match(/https:\/\/[\w./-]+/);
    if (urlMatch) {
      const result = await httpHead(urlMatch[0]);
      if (result.ok) return { status: 'RESOLVED', reason: `URL reachable: ${urlMatch[0]} (HTTP ${result.status})` };
      if (result.status) return { status: 'STILL_BLOCKED', reason: `URL returned HTTP ${result.status}: ${urlMatch[0]}` };
      return { status: 'STILL_BLOCKED', reason: `URL unreachable: ${urlMatch[0]}` };
    }
  }

  // ── Resend API key ────────────────────────────────────────────────────────
  if (title.includes('resend') || desc.includes('resend')) {
    const fromEnv = process.env.RESEND_API_KEY || secretsEnv.RESEND_API_KEY;
    if (fromEnv) return { status: 'RESOLVED', reason: 'RESEND_API_KEY found in environment' };
    const secretFile = path.join(ROOT, 'secrets', 'resend.env');
    if (fs.existsSync(secretFile)) return { status: 'RESOLVED', reason: 'secrets/resend.env exists' };
    return { status: 'STILL_BLOCKED', reason: 'RESEND_API_KEY not found in env or secrets/' };
  }

  // ── R2 / Cloudflare credentials ───────────────────────────────────────────
  if (title.includes('r2') || desc.includes('r2') || title.includes('cloudflare r2')) {
    const fromEnv = process.env.CLOUDFLARE_R2_API_KEY ||
                    process.env.R2_API_KEY ||
                    secretsEnv.CLOUDFLARE_R2_API_KEY ||
                    secretsEnv.R2_API_KEY;
    if (fromEnv) return { status: 'RESOLVED', reason: 'R2 API key found in environment' };
    const secretFile = path.join(ROOT, 'secrets', 'r2.env');
    if (fs.existsSync(secretFile)) return { status: 'RESOLVED', reason: 'secrets/r2.env exists' };
    const r2ConfigScript = path.join(ROOT, 'scripts', 'configure-r2-backup.sh');
    if (fs.existsSync(r2ConfigScript)) {
      // Check if backup.sh has been configured (sources an r2-config file)
      const backupScript = readText('/opt/studio/scripts/backup.sh');
      if (backupScript.includes('r2-config')) {
        return { status: 'RESOLVED', reason: 'backup.sh sources r2-config (appears configured on Hetzner)' };
      }
    }
    return { status: 'STILL_BLOCKED', reason: 'R2 API key not found in env or secrets/' };
  }

  // ── Stripe keys ───────────────────────────────────────────────────────────
  if (title.includes('stripe') && (title.includes('key') || desc.includes('key'))) {
    const stripeEnv = path.join(ROOT, 'secrets', 'stripe.env');
    if (fs.existsSync(stripeEnv)) {
      const stripeVars = readEnvFile(stripeEnv);
      if (stripeVars.STRIPE_SECRET_KEY) return { status: 'RESOLVED', reason: 'STRIPE_SECRET_KEY present in secrets/stripe.env' };
    }
    if (process.env.STRIPE_SECRET_KEY) return { status: 'RESOLVED', reason: 'STRIPE_SECRET_KEY in environment' };
    return { status: 'STILL_BLOCKED', reason: 'Stripe secret key not found in secrets/ or env' };
  }

  // ── Railway project ───────────────────────────────────────────────────────
  if (title.includes('railway') && title.includes('project')) {
    const railwayOut = spawnSync('railway', ['status'], { encoding: 'utf8', timeout: 10000 });
    if (!railwayOut.error && railwayOut.stdout) {
      return { status: 'RESOLVED', reason: 'Railway CLI responds (project may exist — verify manually)' };
    }
    return { status: 'STILL_BLOCKED', reason: 'railway CLI not available or project not provisioned' };
  }

  // ── DBA filing ───────────────────────────────────────────────────────────
  if (title.includes('dba') || title.includes('doing business as')) {
    return { status: 'UNKNOWN', reason: 'DBA filing cannot be verified programmatically — check state SOS website' };
  }

  // ── Affiliate approval ────────────────────────────────────────────────────
  if (title.includes('affiliate')) {
    return { status: 'UNKNOWN', reason: 'Affiliate approval requires manual check of affiliate program dashboard' };
  }

  // ── VAPID keys ────────────────────────────────────────────────────────────
  if (title.includes('vapid')) {
    const vapidPub = process.env.VAPID_PUBLIC_KEY || secretsEnv.VAPID_PUBLIC_KEY;
    if (vapidPub) return { status: 'RESOLVED', reason: 'VAPID_PUBLIC_KEY found in environment' };
    return { status: 'STILL_BLOCKED', reason: 'VAPID_PUBLIC_KEY not found in env — generate with web-push CLI' };
  }

  return { status: 'UNKNOWN', reason: 'No resolver matched this item type' };
}

// ── Main ───────────────────────────────────────────────────────────────────────
const items = parseHumanItems();

if (items.length === 0) {
  if (!jsonMode) console.log('\n✓ No open Human Action Required items found on TASK_BOARD.\n');
  process.exit(0);
}

if (!jsonMode) {
  console.log(`\n╔══ PHANTOM BLOCKER SCAN ══════════════════════════════════════╗`);
  console.log(`║  Checking ${items.length} open Human Action Required items...`.padEnd(65) + '║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

const report = { generatedAt: today(), scanned: items.length, results: [] };
let resolvedCount = 0;
let blockedCount  = 0;
let unknownCount  = 0;

for (const item of items) {
  const { status, reason } = await resolve(item);
  report.results.push({ title: item.title, status, reason });

  if (!jsonMode) {
    const icon = status === 'RESOLVED' ? '✓  RESOLVED   ' :
                 status === 'STILL_BLOCKED' ? '⛔ BLOCKED    ' : '⚠  UNKNOWN    ';
    console.log(`  ${icon} ${item.title}`);
    console.log(`             ${reason}`);
    if (verbose) console.log(`             Description: ${item.description}`);
    console.log('');
  }

  if (status === 'RESOLVED') resolvedCount++;
  else if (status === 'STILL_BLOCKED') blockedCount++;
  else unknownCount++;
}

report.resolvedCount  = resolvedCount;
report.blockedCount   = blockedCount;
report.unknownCount   = unknownCount;

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(resolvedCount > 0 ? 0 : 1);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('╔══ SCAN RESULTS ═══════════════════════════════════════════════╗');
console.log(`║  ✓  RESOLVED:    ${resolvedCount} item(s) — can be marked done on TASK_BOARD`.padEnd(65) + '║');
console.log(`║  ⛔  BLOCKED:     ${blockedCount} item(s) — still require Studio Owner action`.padEnd(65) + '║');
console.log(`║  ⚠   UNKNOWN:    ${unknownCount} item(s) — cannot verify programmatically`.padEnd(65) + '║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

if (resolvedCount > 0) {
  console.log('📋 Action: Update TASK_BOARD.md — mark the RESOLVED items as done:');
  for (const r of report.results.filter(r => r.status === 'RESOLVED')) {
    console.log(`   - [x] ~~**${r.title}**~~ — RESOLVED ${today()}: ${r.reason}`);
  }
  console.log('');
}

if (blockedCount > 0) {
  console.log('⛔ Still requiring Studio Owner action:');
  for (const r of report.results.filter(r => r.status === 'STILL_BLOCKED')) {
    console.log(`   · ${r.title}: ${r.reason}`);
  }
  console.log('\n  Run: node scripts/ops.mjs credentials — for structured intake checklist\n');
}

process.exit(resolvedCount > 0 ? 0 : 1);
