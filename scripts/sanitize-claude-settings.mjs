#!/usr/bin/env node
/**
 * sanitize-claude-settings.mjs — redact secrets/credentials from .claude/settings.local.json
 *
 * Rewrites the `permissions.allow` array by:
 *   • Stripping URL query strings (?token=…, ?key=…, ?api_key=…)
 *   • Redacting Authorization headers (Authorization: Bearer …)
 *   • Redacting raw bearer tokens, basic-auth credentials
 *   • Redacting credential-pattern values (Stripe, Render, GitHub, AWS, JWT, Postgres URLs)
 *   • Redacting env-var assignments (PGPASSWORD=…, STRIPE_SECRET_KEY=…, …_TOKEN=…, …_KEY=…)
 *   • Dropping duplicate entries after redaction
 *
 * Usage:
 *   node scripts/sanitize-claude-settings.mjs                 # sanitize in place
 *   node scripts/sanitize-claude-settings.mjs --check         # exit 1 if changes needed (no write)
 *   node scripts/sanitize-claude-settings.mjs --path <file>   # target a specific settings file
 *   node scripts/sanitize-claude-settings.mjs --json          # machine-readable summary
 *
 * Exit codes:
 *   0 — file is clean (or was sanitized successfully in write mode)
 *   1 — --check mode and findings exist
 *   2 — file missing / unreadable / invalid JSON
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const JSON_OUT = args.includes('--json');
const pathIdx = args.indexOf('--path');
const TARGET = pathIdx >= 0
  ? path.resolve(args[pathIdx + 1])
  : path.join(REPO_ROOT, '.claude', 'settings.local.json');

const REDACTED = '[REDACTED]';

// ── Redaction rules (applied in order) ───────────────────────────────────────
// Each rule replaces matches with a redacted marker. Rules are intentionally
// conservative — prefer false positives (over-redaction) over leaked secrets.
const RULES = [
  // URL query strings on http(s) URLs — strip entire query for safety.
  {
    name: 'url-query-string',
    pattern: /(https?:\/\/[^\s"'?]+)\?[^\s"']+/gi,
    replace: (_m, url) => `${url}?${REDACTED}`,
  },
  // Authorization headers (Bearer / Basic / Token).
  {
    name: 'authorization-header',
    pattern: /\b(Authorization\s*:\s*)(?:Bearer|Basic|Token)\s+[^\s"'`]+/gi,
    replace: (_m, pre) => `${pre}${REDACTED}`,
  },
  // Raw "Bearer <token>" outside headers.
  {
    name: 'bearer-token',
    pattern: /\bBearer\s+[A-Za-z0-9._\-~+/=]{16,}/g,
    replace: () => `Bearer ${REDACTED}`,
  },
  // Postgres / MySQL / MongoDB connection strings with embedded credentials.
  {
    name: 'db-url-with-password',
    pattern: /\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/([^:/\s"']+):([^@\s"']{4,})@([^\s"']+)/gi,
    replace: (_m, proto, user, _pw, host) => `${proto}://${user}:${REDACTED}@${host}`,
  },
  // Stripe live secret keys.
  { name: 'stripe-live-key', pattern: /\bsk_live_[A-Za-z0-9]{20,}\b/g, replace: () => REDACTED },
  // Render API keys.
  { name: 'render-key', pattern: /\brnd_[A-Za-z0-9]{20,}\b/g, replace: () => REDACTED },
  // GitHub classic + fine-grained PATs + OAuth tokens.
  {
    name: 'github-token',
    pattern: /\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,}|gho_[A-Za-z0-9]{36}|ghs_[A-Za-z0-9]{36})\b/g,
    replace: () => REDACTED,
  },
  // AWS access key IDs.
  { name: 'aws-access-key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, replace: () => REDACTED },
  // Anthropic keys.
  { name: 'anthropic-key', pattern: /\bsk-ant-[A-Za-z0-9_\-]{20,}\b/g, replace: () => REDACTED },
  // OpenAI keys.
  { name: 'openai-key', pattern: /\bsk-(?:proj-)?[A-Za-z0-9_\-]{20,}\b/g, replace: () => REDACTED },
  // Supabase/JWT-style tokens (HS256 header prefix, 3-part JWT).
  {
    name: 'jwt-token',
    pattern: /\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b/g,
    replace: () => REDACTED,
  },
  // Env-var assignments with secret-like names — VAR='value' or VAR="value" or VAR=value.
  // Covers PGPASSWORD, STRIPE_SECRET_KEY, RESEND_API_KEY, *_TOKEN, *_KEY, *_SECRET, *_PASSWORD, *_PWD, *_AUTH.
  {
    name: 'secret-env-assignment',
    pattern: /\b([A-Z][A-Z0-9_]*(?:PASSWORD|PWD|SECRET|TOKEN|APIKEY|API_KEY|ACCESS_KEY|AUTH_KEY|PRIVATE_KEY))\s*=\s*(['"])[^'"]{4,}\2/g,
    replace: (_m, name, q) => `${name}=${q}${REDACTED}${q}`,
  },
  {
    name: 'secret-env-assignment-unquoted',
    pattern: /\b([A-Z][A-Z0-9_]*(?:PASSWORD|PWD|SECRET|TOKEN|APIKEY|API_KEY|ACCESS_KEY|AUTH_KEY|PRIVATE_KEY))\s*=([^\s'"&|;`)]{8,})/g,
    replace: (_m, name) => `${name}=${REDACTED}`,
  },
  // CLI flags like --password=… / --api-key=… / --token=… (flag form).
  // Stops at whitespace / quotes / ) so Bash(...) wrappers stay valid.
  {
    name: 'cli-secret-flag',
    pattern: /(--(?:password|passwd|pwd|api[-_]?key|secret|auth[-_]?token|access[-_]?token|token)[=\s]+)(['"])([^'"]{4,})\2/gi,
    replace: (_m, flag, q) => `${flag}${q}${REDACTED}${q}`,
  },
  {
    name: 'cli-secret-flag-unquoted',
    pattern: /(--(?:password|passwd|pwd|api[-_]?key|secret|auth[-_]?token|access[-_]?token|token)[=\s]+)([^\s'"`)]{8,})/gi,
    replace: (_m, flag) => `${flag}${REDACTED}`,
  },
];

// ── Sanitize one entry ───────────────────────────────────────────────────────
function sanitizeEntry(entry) {
  if (typeof entry !== 'string') return { value: entry, hits: [] };
  let out = entry;
  const hits = [];
  for (const rule of RULES) {
    let matched = false;
    out = out.replace(rule.pattern, (...args) => {
      const replaced = rule.replace(...args);
      if (replaced !== args[0]) matched = true;
      return replaced;
    });
    if (matched) hits.push(rule.name);
  }
  return { value: out, hits };
}

// ── Main ─────────────────────────────────────────────────────────────────────
function fail(msg, code = 2) {
  if (JSON_OUT) console.log(JSON.stringify({ ok: false, error: msg }));
  else console.error(`⛔ ${msg}`);
  process.exit(code);
}

if (!fs.existsSync(TARGET)) {
  if (JSON_OUT) console.log(JSON.stringify({ ok: true, skipped: 'missing', path: TARGET }));
  else console.log(`  (skip) ${path.relative(REPO_ROOT, TARGET)} does not exist — nothing to sanitize.`);
  process.exit(0);
}

let raw;
try { raw = fs.readFileSync(TARGET, 'utf8'); }
catch (e) { fail(`Cannot read ${TARGET}: ${e.message}`); }

let data;
try { data = JSON.parse(raw); }
catch (e) { fail(`Invalid JSON in ${TARGET}: ${e.message}`); }

const allowList = data?.permissions?.allow;
if (!Array.isArray(allowList)) {
  if (JSON_OUT) console.log(JSON.stringify({ ok: true, skipped: 'no-allow-array', path: TARGET }));
  else console.log(`  (skip) no permissions.allow array in ${path.relative(REPO_ROOT, TARGET)}.`);
  process.exit(0);
}

const findings = [];
const sanitizedSet = new Set();
const sanitizedList = [];

for (let i = 0; i < allowList.length; i++) {
  const original = allowList[i];
  const { value, hits } = sanitizeEntry(original);
  if (hits.length > 0) {
    findings.push({ index: i, rules: hits, before: original, after: value });
  }
  if (!sanitizedSet.has(value)) {
    sanitizedSet.add(value);
    sanitizedList.push(value);
  }
}

const changed = findings.length > 0 || sanitizedList.length !== allowList.length;

if (JSON_OUT) {
  console.log(JSON.stringify({
    ok: true,
    path: TARGET,
    changed,
    findings: findings.length,
    redactedRules: [...new Set(findings.flatMap(f => f.rules))].sort(),
    entriesBefore: allowList.length,
    entriesAfter: sanitizedList.length,
    duplicatesRemoved: allowList.length - sanitizedList.length,
    checkOnly: CHECK_ONLY,
  }, null, 2));
} else {
  const rel = path.relative(REPO_ROOT, TARGET);
  if (!changed) {
    console.log(`✓ ${rel} is clean (${allowList.length} entries).`);
  } else {
    console.log(`⚠ ${rel}: ${findings.length} entry/entries contain secret-like patterns.`);
    for (const f of findings.slice(0, 10)) {
      console.log(`   [${f.index}] rules: ${f.rules.join(', ')}`);
    }
    if (findings.length > 10) console.log(`   … and ${findings.length - 10} more.`);
    const dupes = allowList.length - sanitizedList.length;
    if (dupes > 0) console.log(`   ${dupes} duplicate entry/entries collapsed after redaction.`);
  }
}

if (CHECK_ONLY) {
  process.exit(changed ? 1 : 0);
}

if (changed) {
  data.permissions.allow = sanitizedList;
  fs.writeFileSync(TARGET, JSON.stringify(data, null, 2) + '\n');
  if (!JSON_OUT) console.log(`✓ Sanitized → ${path.relative(REPO_ROOT, TARGET)} (${sanitizedList.length} entries).`);
}

process.exit(0);
