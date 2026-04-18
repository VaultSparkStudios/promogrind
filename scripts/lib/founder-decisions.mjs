import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

export const FOUNDER_DECISIONS_PATH = path.join(ROOT, 'portfolio', 'FOUNDER_DECISIONS.ndjson');

export function normalizeSignal(signal) {
  return String(signal || '').trim().toLowerCase();
}

export function readDecisionHistory() {
  try {
    return fs.readFileSync(FOUNDER_DECISIONS_PATH, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

export function latestDecisionMap() {
  const map = new Map();
  for (const entry of readDecisionHistory()) {
    map.set(normalizeSignal(entry.signal), entry);
  }
  return map;
}

export function appendDecision(entry) {
  fs.mkdirSync(path.dirname(FOUNDER_DECISIONS_PATH), { recursive: true });
  fs.appendFileSync(FOUNDER_DECISIONS_PATH, `${JSON.stringify(entry)}\n`);
}
