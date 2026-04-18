#!/usr/bin/env node
/**
 * credential-intake.mjs
 *
 * Structured credential intake protocol for Studio Owner.
 * Surfaces a checklist of all missing/pending credentials that are
 * blocking studio work. When ≥3 human-blocked items are open, this
 * command is the canonical "one place to go" to understand what's needed.
 *
 * Reads TASK_BOARD.md human-blocked items and cross-references with
 * PROJECT_REGISTRY.json to produce a prioritised intake checklist.
 *
 * Usage:
 *   node scripts/credential-intake.mjs
 *   node scripts/credential-intake.mjs --json
 *   node scripts/ops.mjs credentials
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifyBlocker } from './lib/blocker-rules.mjs';
import { parseHumanItems } from './lib/task-board.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');

function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }

// ── Known credential checklist ────────────────────────────────────────────────
// Each entry: { id, category, label, description, impact, docs, status }
// status: 'pending' | 'done' | 'blocked'
const CREDENTIAL_CHECKLIST = [
  {
    id: 'cloudflare-wildcard-dns',
    category: 'DNS',
    label: 'Cloudflare wildcard DNS *.staging',
    description: 'Add A record: *.staging → 178.156.211.100 in Cloudflare DNS panel',
    impact: 'website.staging + studio-hub.staging unreachable; staging smoke tests fail',
    docs: 'Run setup script after DNS: ssh root@178.156.211.100 "bash -s" < scripts/setup-staging.sh',
    age: '~33 sessions',
    priority: 'HIGH',
  },
  {
    id: 'resend-api-key',
    category: 'Email',
    label: 'Resend API key',
    description: 'Create API key at resend.com → configure in Supabase SMTP settings',
    impact: 'Supabase auth emails (signup, password reset) not sent; Vorn user auth at risk',
    docs: 'Supabase Dashboard → Authentication → SMTP Settings → Resend provider',
    age: '~35 sessions',
    priority: 'HIGH',
  },
  {
    id: 'r2-credentials',
    category: 'Storage',
    label: 'Cloudflare R2 bucket + API key',
    description: 'Create R2 bucket "studio-backups" + API key at dash.cloudflare.com → R2 → API tokens',
    impact: 'Automated pg_dump backups not running; Hetzner Postgres DB unprotected',
    docs: 'Run: node scripts/ops.mjs credentials --setup-r2 (after credentials provided)',
    age: '~35 sessions',
    priority: 'HIGH',
  },
  {
    id: 'mindframe-stripe',
    category: 'Stripe',
    label: 'MindFrame Stripe products + Railway env vars',
    description: 'Create MindFrame Pro monthly/annual price objects in Stripe; add 4 Railway env vars',
    impact: 'MindFrame checkout blocked; code is complete and waiting',
    docs: 'Checklist: docs/launch/mindframe-stripe-checklist.md',
    age: 'S46',
    priority: 'MEDIUM',
  },
  {
    id: 'social-dashboard-railway',
    category: 'Infrastructure',
    label: 'Social Dashboard: Railway project + DNS + Supabase secrets',
    description: 'Provision Railway project, attach Postgres, point app-social-dashboard subdomain, add 3 Supabase env vars',
    impact: 'Social Dashboard deployment blocked',
    docs: 'Three steps: Railway provision → DNS → env vars',
    age: 'long-standing',
    priority: 'MEDIUM',
  },
  {
    id: 'dba-filing',
    category: 'Legal',
    label: 'File DBA for "VaultSpark Studios"',
    description: 'File "doing business as" registration under VaultSpark Studios LLC at state SOS website',
    impact: 'Operating without DBA filing; legal exposure for LLC',
    docs: 'State Secretary of State online portal',
    age: 'S33',
    priority: 'MEDIUM',
  },
  {
    id: 'promogrind-affiliate',
    category: 'Revenue',
    label: 'PromoGrind affiliate approvals',
    description: 'Apply at DraftKings Partners, FanDuel Partners, BetMGM Partners; once approved, wire URLs in src/books.js',
    impact: 'PromoGrind has zero revenue until affiliate links are live',
    docs: 'Launch plan: docs/launch/promogrind-launch-plan.md',
    age: 'S44',
    priority: 'LOW',
  },
  {
    id: 'vapid-keys',
    category: 'Push',
    label: 'VAPID keys for PromoGrind + Website push notifications',
    description: 'Generate VAPID key pair: node -e "const w=require(\'web-push\');console.log(w.generateVAPIDKeys())"',
    impact: 'Web push notifications infrastructure cannot launch',
    docs: 'Configure in .env for both PromoGrind and VaultSparkStudios.github.io',
    age: 'S47',
    priority: 'LOW',
  },
];

// ── Parse TASK_BOARD for human action items ───────────────────────────────────
const taskBoard = readText(path.join(ROOT, 'context', 'TASK_BOARD.md'));
const openHumanItems = parseHumanItems(taskBoard);

// ── Priority sort: HIGH first ─────────────────────────────────────────────────
const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const sorted = [...CREDENTIAL_CHECKLIST].sort((a, b) =>
  (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
);

if (jsonMode) {
  console.log(JSON.stringify({
    date: new Date().toISOString().slice(0, 10),
    openHumanActionItems: openHumanItems.length,
    credentials: sorted,
  }, null, 2));
  process.exit(0);
}

// ── Pretty output ─────────────────────────────────────────────────────────────
const W = 62;
function pad(s, w) { const str = String(s ?? ''); return str.length >= w ? str.slice(0, w) : str + ' '.repeat(w - str.length); }
function row(content) { return `║  ${pad(content, W)}  ║`; }
function blank() { return `║  ${' '.repeat(W)}  ║`; }
function top(t) { const h = `══ ${t} `; return '╔' + h + '═'.repeat(Math.max(1, W + 2 - h.length)) + '╗'; }
function bot() { return '╚' + '═'.repeat(W + 2) + '╝'; }

const PRIORITY_ICON = { HIGH: '⛔', MEDIUM: '⚠', LOW: '💡' };
const today = new Date().toISOString().slice(0, 10);

console.log(`\n${top(`CREDENTIAL INTAKE PROTOCOL  ·  ${today}`)}`);
console.log(row(`${openHumanItems.length} open human action item(s) in TASK_BOARD`));
console.log(row(`Resolve HIGH items first — but agents must try blocker preflight first`));
console.log(bot());

for (const cred of sorted) {
  const icon = PRIORITY_ICON[cred.priority] ?? '•';
  console.log(`\n${top(`${icon} ${cred.priority}  ·  ${cred.category}`)}`);
  console.log(row(`Item:    ${cred.label}`));
  console.log(row(`Impact:  ${cred.impact.slice(0, W - 9)}`));
  if (cred.impact.length > W - 9) console.log(row(`         ${cred.impact.slice(W - 9, (W - 9) * 2)}`));
  console.log(row(`Age:     ${cred.age}`));
  console.log(row(`Action:  ${cred.description.slice(0, W - 9)}`));
  if (cred.description.length > W - 9) console.log(row(`         ${cred.description.slice(W - 9, (W - 9) * 2)}`));
  const preflight = classifyBlocker(`${cred.label} ${cred.description}`);
  const caps = preflight.capabilities.length > 0 ? preflight.capabilities.join(', ') : 'none mapped';
  console.log(row(`Preflight:${caps.slice(0, W - 10)}`));
  if (caps.length > W - 10) console.log(row(`         ${caps.slice(W - 10, (W - 10) * 2)}`));
  console.log(row(`Docs:    ${cred.docs.slice(0, W - 9)}`));
  console.log(bot());
}

console.log(`\n💡 Once credentials are available, paste them into the session chat.`);
console.log(`   Agents must first run blocker preflight and try any available elevated/admin path before leaving the item as human-blocked.\n`);
