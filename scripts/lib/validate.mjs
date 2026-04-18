#!/usr/bin/env node
/**
 * validate.mjs — CLI argument validation for Studio Ops scripts.
 *
 * Prevents path traversal, injection, and malformed inputs when scripts
 * accept user-controlled --project, --repo, --date, or --dir arguments.
 *
 * Usage: import { validateSlug, validateDate, validateDir, validateRepo } from './lib/validate.mjs';
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * validateSlug — lowercase alphanumeric + hyphen, 1–80 chars.
 * @param {string} name  — CLI flag name (for error messages)
 * @param {string|null} value — raw arg value
 * @returns {string|null}
 */
export function validateSlug(name, value) {
  if (value == null) return null;
  const v = String(value).trim();
  if (v.length === 0) return null;
  if (!/^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$/.test(v)) {
    console.error(`ERROR: --${name} "${v}" is not a valid slug (lowercase letters, digits, and hyphens only; max 80 chars)`);
    process.exit(1);
  }
  return v;
}

/**
 * validateDate — strict YYYY-MM-DD format with basic calendar sanity check.
 * @param {string} name
 * @param {string|null} value
 * @returns {string|null}
 */
export function validateDate(name, value) {
  if (value == null) return null;
  const v = String(value).trim();
  if (v.length === 0) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    console.error(`ERROR: --${name} "${v}" must be in YYYY-MM-DD format`);
    process.exit(1);
  }
  const d = new Date(v + 'T00:00:00Z');
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    console.error(`ERROR: --${name} "${v}" is not a valid calendar date`);
    process.exit(1);
  }
  return v;
}

/**
 * validateDir — path must resolve within allowedRoot to prevent traversal.
 * Rejects absolute paths pointing outside root, and traversal sequences.
 * Returns the resolved absolute path.
 *
 * @param {string} name
 * @param {string|null} value       — relative or absolute path string
 * @param {string} [allowedRoot]    — defaults to PROJECT_ROOT
 * @returns {string|null}
 */
export function validateDir(name, value, allowedRoot = PROJECT_ROOT) {
  if (value == null) return null;
  const v = String(value).trim();
  if (v.length === 0) return null;
  const resolved = path.resolve(allowedRoot, v);
  const safeRoot = path.resolve(allowedRoot);
  if (resolved !== safeRoot && !resolved.startsWith(safeRoot + path.sep)) {
    console.error(`ERROR: --${name} "${v}" resolves outside the allowed root (${allowedRoot})`);
    console.error(`  Resolved: ${resolved}`);
    process.exit(1);
  }
  return resolved;
}

/**
 * validateRepo — org/repo or bare repo-name form.
 * Allows alphanumeric, hyphen, dot, underscore; max 200 chars total.
 *
 * @param {string} name
 * @param {string|null} value
 * @returns {string|null}
 */
export function validateRepo(name, value) {
  if (value == null) return null;
  const v = String(value).trim();
  if (v.length === 0) return null;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}(\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,99})?$/.test(v)) {
    console.error(`ERROR: --${name} "${v}" is not a valid repo name (org/repo or bare slug)`);
    process.exit(1);
  }
  return v;
}
