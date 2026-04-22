import fs from 'fs';
import path from 'path';

function normalizeTitle(line = '') {
  return String(line)
    .replace(/^- \[ \]\s*/, '')
    .replace(/\*\*/g, '')
    .split(/\s+—\s+/)[0]
    .trim();
}

function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

export function daysSince(dateLike) {
  if (!dateLike) return 0;
  const then = new Date(dateLike);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86400000));
}

export function ensureAges(taskBoard = '', { root = process.cwd() } = {}) {
  const ledgerPath = path.join(root, '.cache', 'human-action-ages.json');
  const ledger = readJson(ledgerPath, {});
  const today = new Date().toISOString().slice(0, 10);
  const lines = String(taskBoard).split(/\r?\n/);

  const titles = [];
  let inHumanSection = false;
  for (const line of lines) {
    if (/^##\s+Human Action Required\b/i.test(line)) {
      inHumanSection = true;
      continue;
    }
    if (inHumanSection && /^##\s+/.test(line)) break;
    if (!inHumanSection || !/^- \[ \]/.test(line)) continue;
    const title = normalizeTitle(line);
    if (title) titles.push(title);
  }

  let changed = false;
  for (const title of titles) {
    if (!ledger[title]?.firstSeen) {
      ledger[title] = { firstSeen: today, lastSeen: today };
      changed = true;
      continue;
    }
    if (ledger[title].lastSeen !== today) {
      ledger[title] = { ...ledger[title], lastSeen: today };
      changed = true;
    }
  }

  if (changed) writeJson(ledgerPath, ledger);
  return ledger;
}
