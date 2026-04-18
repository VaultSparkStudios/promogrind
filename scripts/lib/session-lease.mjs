import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SCHEMA_VERSION = '1.0';
const LEASE_FILE = path.join('context', '.session-lease.json');
const LOCK_FILE = path.join('context', '.session-lock');

export function leasePath(repoRoot) {
  return path.join(repoRoot, LEASE_FILE);
}

export function lockPath(repoRoot) {
  return path.join(repoRoot, LOCK_FILE);
}

export function readLease(repoRoot) {
  try {
    return JSON.parse(fs.readFileSync(leasePath(repoRoot), 'utf8'));
  } catch {
    return null;
  }
}

export function writeLease(repoRoot, lease) {
  const p = leasePath(repoRoot);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(lease, null, 2) + '\n');
  return lease;
}

export function readLock(repoRoot) {
  try {
    const raw = fs.readFileSync(lockPath(repoRoot), 'utf8');
    const out = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^(\w[\w_-]*):\s*(.+?)\s*$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  } catch {
    return null;
  }
}

export function defaultLease(repoRoot, options = {}) {
  const lock = readLock(repoRoot) ?? {};
  const now = new Date();
  const ttlMinutes = Number(options.ttlMinutes ?? 180);
  return {
    schemaVersion: SCHEMA_VERSION,
    leaseId: options.leaseId ?? crypto.randomBytes(6).toString('hex'),
    project: options.project ?? path.basename(repoRoot),
    owner: options.owner ?? `${options.agent ?? lock.agent ?? 'unknown'}:${process.pid}`,
    agent: options.agent ?? lock.agent ?? 'other',
    sessionStart: options.sessionStart ?? lock.session_start ?? now.toISOString(),
    acquiredAt: now.toISOString(),
    heartbeatAt: now.toISOString(),
    expiresAt: addMinutes(now, ttlMinutes).toISOString(),
    ttlMinutes,
    status: options.status ?? 'active',
    note: options.note ?? null,
  };
}

export function acquireLease(repoRoot, options = {}) {
  const next = defaultLease(repoRoot, options);
  return writeLease(repoRoot, next);
}

export function heartbeatLease(repoRoot, options = {}) {
  const current = readLease(repoRoot) ?? defaultLease(repoRoot, options);
  const now = new Date();
  const ttlMinutes = Number(options.ttlMinutes ?? current.ttlMinutes ?? 180);
  const next = {
    ...current,
    schemaVersion: SCHEMA_VERSION,
    status: options.status ?? 'active',
    heartbeatAt: now.toISOString(),
    expiresAt: addMinutes(now, ttlMinutes).toISOString(),
    ttlMinutes,
    note: options.note ?? current.note ?? null,
    owner: options.owner ?? current.owner,
    agent: options.agent ?? current.agent,
  };
  return writeLease(repoRoot, next);
}

export function releaseLease(repoRoot, options = {}) {
  const current = readLease(repoRoot) ?? defaultLease(repoRoot, options);
  const now = new Date().toISOString();
  const next = {
    ...current,
    schemaVersion: SCHEMA_VERSION,
    status: 'released',
    releasedAt: now,
    heartbeatAt: now,
    expiresAt: now,
    note: options.note ?? current.note ?? null,
  };
  return writeLease(repoRoot, next);
}

export function leaseHealth(lease) {
  if (!lease) return { present: false, expired: false, active: false, ageMinutes: null, expiresInMinutes: null };
  const now = Date.now();
  const hb = Date.parse(lease.heartbeatAt ?? '');
  const exp = Date.parse(lease.expiresAt ?? '');
  const ageMinutes = Number.isNaN(hb) ? null : Math.round((now - hb) / 60000);
  const expiresInMinutes = Number.isNaN(exp) ? null : Math.round((exp - now) / 60000);
  const expired = lease.status !== 'released' && expiresInMinutes != null ? expiresInMinutes < 0 : lease.status === 'expired';
  const active = lease.status === 'active' && !expired;
  return { present: true, expired, active, ageMinutes, expiresInMinutes };
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + (minutes * 60000));
}

export default {
  leasePath,
  lockPath,
  readLease,
  writeLease,
  readLock,
  defaultLease,
  acquireLease,
  heartbeatLease,
  releaseLease,
  leaseHealth,
};
