import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

export const DEFAULT_IGNORED_JSON_KEYS = new Set([
  '_generatedAt',
  '_generatedBy',
  'generatedAt',
  'updatedAt',
  'capturedAt',
]);

export const PROFILE_RULES = {
  default: {
    ignoredJsonKeys: DEFAULT_IGNORED_JSON_KEYS,
    stripLinePatterns: [],
  },
  conductor: {
    ignoredJsonKeys: DEFAULT_IGNORED_JSON_KEYS,
    stripLinePatterns: [],
  },
  'founder-surfaces': {
    ignoredJsonKeys: DEFAULT_IGNORED_JSON_KEYS,
    stripLinePatterns: [
      /^Last synthesised:\s+\d{4}-\d{2}-\d{2}.*$/m,
      /^Generated:\s+\d{4}-\d{2}-\d{2}.*$/m,
      /^> Generated:\s+\d{4}-\d{2}-\d{2}.*$/m,
      /^## CURRENT — \d{4}-\d{2}-\d{2}$/m,
    ],
  },
  'debt-report': {
    ignoredJsonKeys: DEFAULT_IGNORED_JSON_KEYS,
    stripLinePatterns: [
      /^## \d{4}-\d{2}-\d{2} — Debt Assessment$/m,
      /^\*Generated:\s+\d{4}-\d{2}-\d{2}\s+\| Source:.*\*$/m,
    ],
  },
};

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((out, key) => {
        out[key] = sortKeys(value[key]);
        return out;
      }, {});
  }
  return value;
}

export function stripIgnoredJsonKeys(value, ignoredKeys = DEFAULT_IGNORED_JSON_KEYS) {
  if (Array.isArray(value)) {
    return value.map((entry) => stripIgnoredJsonKeys(entry, ignoredKeys));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (ignoredKeys.has(key)) continue;
    out[key] = stripIgnoredJsonKeys(entry, ignoredKeys);
  }
  return out;
}

export function normalizeTextContent(content, stripLinePatterns = []) {
  let normalized = String(content ?? '').replace(/\r\n/g, '\n');
  for (const pattern of stripLinePatterns) {
    normalized = normalized.replace(pattern, '');
  }
  return normalized
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trim();
}

export function normalizeJsonContent(content, ignoredKeys = DEFAULT_IGNORED_JSON_KEYS) {
  const parsed = typeof content === 'string' ? JSON.parse(content) : content;
  return JSON.stringify(sortKeys(stripIgnoredJsonKeys(parsed, ignoredKeys)));
}

export function normalizeByProfile(filePath, content, profileName = 'default') {
  const profile = PROFILE_RULES[profileName] || PROFILE_RULES.default;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') {
    return normalizeJsonContent(content, profile.ignoredJsonKeys);
  }
  return normalizeTextContent(content, profile.stripLinePatterns);
}

export function hashNormalizedContent(normalized) {
  return crypto.createHash('sha256').update(String(normalized)).digest('hex');
}

export function hashFileContent(filePath, content, profileName = 'default') {
  return hashNormalizedContent(normalizeByProfile(filePath, content, profileName));
}

export function aggregateHash(entries) {
  const payload = entries
    .map((entry) => `${entry.filePath}\n${entry.hash}`)
    .join('\n--\n');
  return hashNormalizedContent(payload);
}

export function readHeadFile(root, relativeFilePath) {
  try {
    return execFileSync(
      'git',
      ['show', `HEAD:${relativeFilePath.replace(/\\/g, '/')}`],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch {
    return null;
  }
}

export function readSidecarHash(sidecarPath) {
  try {
    return fs.readFileSync(sidecarPath, 'utf8').trim() || null;
  } catch {
    return null;
  }
}

export function writeSidecarHash(sidecarPath, hash) {
  fs.mkdirSync(path.dirname(sidecarPath), { recursive: true });
  fs.writeFileSync(sidecarPath, `${hash}\n`);
}
