/**
 * access-ledger.mjs — secrets access audit log (S79)
 *
 * Replaces the flat secrets/.access.log (gitignored) with a rotated,
 * portfolio-level NDJSON ledger at portfolio/ACCESS_LEDGER.ndjson.
 *
 * Also exposes anomaly detection: capabilities read from unexpected
 * projects (e.g. content project reading stripe-live) get flagged.
 *
 * Integrates with scripts/lib/secrets.mjs — the gateway calls appendAccess()
 * on every getSecret() invocation.
 *
 * Consumers:
 *   - access-tripwire.yml workflow: daily anomaly scan
 *   - /studio-status skill (optional security summary)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const LEDGER_PATH = path.join(ROOT, 'portfolio', 'ACCESS_LEDGER.ndjson');

/**
 * Append a credential-access event to the ledger.
 * @param {object} ev
 *   type:        'read' | 'write' | 'scan' | 'validate' | 'rotate'
 *   capability:  string — e.g. "claude.api"
 *   project:     string — slug of the project requesting access (cwd-inferred)
 *   actor:       string — 'agent-session' | 'ci' | 'human'
 *   success:     boolean
 *   notes:       string — optional
 */
export function appendAccess(ev) {
  const entry = {
    ts: new Date().toISOString(),
    type: ev.type || 'read',
    capability: ev.capability || 'unknown',
    project: ev.project || inferProject(),
    actor: ev.actor || 'agent-session',
    success: ev.success !== false,
    notes: ev.notes || null,
  };

  try {
    fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
    fs.appendFileSync(LEDGER_PATH, JSON.stringify(entry) + '\n');
  } catch (err) {
    // Never throw on audit-log write failure — secrets access must not be blocked.
    process.stderr.write(`[access-ledger] failed to append: ${err.message}\n`);
  }
}

export function inferProject() {
  const cwd = process.cwd();
  const parts = cwd.replace(/\\/g, '/').split('/');
  const dev = parts.indexOf('development');
  if (dev >= 0 && parts[dev + 1]) return parts[dev + 1];
  return path.basename(cwd);
}

/**
 * Scan the ledger for anomalies. Returns an array of flagged events.
 *
 * Heuristics:
 *   1. stripe-live capability read from a project whose revenueModel is "none"
 *   2. Same capability read > 50 times in 24h from the same project (loop)
 *   3. Read from a project that's not in PROJECT_REGISTRY
 *   4. Failed validation > 3× in an hour (brute-force pattern)
 */
export function scanForAnomalies(opts = {}) {
  const windowHours = opts.windowHours ?? 24;
  const cutoff = Date.now() - windowHours * 3_600_000;

  if (!fs.existsSync(LEDGER_PATH)) return [];

  const registry = (() => {
    try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8')); }
    catch { return { projects: [] }; }
  })();
  const projectsByslug = new Map((registry.projects || []).map(p => [p.slug, p]));

  const entries = [];
  for (const line of fs.readFileSync(LEDGER_PATH, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line);
      if (Date.parse(ev.ts) >= cutoff) entries.push(ev);
    } catch {}
  }

  const anomalies = [];

  // Rule 1: stripe-live reads from non-revenue projects
  for (const ev of entries) {
    if (ev.capability === 'stripe.live' && ev.type === 'read') {
      const p = projectsByslug.get(ev.project);
      if (p && (p.revenueModel === 'none' || !p.revenueModel)) {
        anomalies.push({ rule: 'stripe-live-from-non-revenue', event: ev, severity: 'high' });
      }
    }
  }

  // Rule 2: loop detection
  const readsByKey = new Map();
  for (const ev of entries) {
    if (ev.type !== 'read') continue;
    const key = `${ev.project}::${ev.capability}`;
    readsByKey.set(key, (readsByKey.get(key) || 0) + 1);
  }
  for (const [key, count] of readsByKey) {
    if (count > 50) {
      const [project, capability] = key.split('::');
      anomalies.push({ rule: 'high-frequency-reads', project, capability, count, severity: 'medium' });
    }
  }

  // Rule 3: unknown project
  for (const ev of entries) {
    if (ev.project && !projectsByslug.has(ev.project) && ev.project !== 'vaultspark-studio-ops') {
      anomalies.push({ rule: 'unknown-project', event: ev, severity: 'low' });
    }
  }

  // Rule 4: repeated failures
  const failuresByProject = new Map();
  for (const ev of entries) {
    if (ev.type !== 'validate' || ev.success) continue;
    const t = Date.parse(ev.ts);
    const key = `${ev.project}::${ev.capability}`;
    if (!failuresByProject.has(key)) failuresByProject.set(key, []);
    failuresByProject.get(key).push(t);
  }
  for (const [key, times] of failuresByProject) {
    // Sliding window — 3 failures in 1 hour
    times.sort();
    for (let i = 0; i + 2 < times.length; i++) {
      if (times[i + 2] - times[i] <= 3_600_000) {
        const [project, capability] = key.split('::');
        anomalies.push({ rule: 'repeated-validation-failures', project, capability, count: times.length, severity: 'high' });
        break;
      }
    }
  }

  return anomalies;
}

export default { appendAccess, scanForAnomalies, inferProject };
