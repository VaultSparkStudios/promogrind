import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function readJson(filePath, fallback = null) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

export function loadStartupPatternMemory({ root, homeDir = os.homedir(), now = Date.now() }) {
  const patterns = [];
  const memoryRoot = path.join(
    homeDir,
    '.claude',
    'projects',
    'C--Users-p4cka-documents-development-vaultspark-studio-ops',
    'memory',
  );

  try {
    for (const file of fs.readdirSync(memoryRoot).filter((name) => /^project_pattern_.+\.md$/.test(name))) {
      const body = fs.readFileSync(path.join(memoryRoot, file), 'utf8');
      const name = body.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? '';
      const match = name.match(/Recurring\s+(\S+)\s+pressure\s*\((\d+)\s*sessions\)/i);
      if (!match) continue;
      patterns.push({
        category: match[1].toUpperCase(),
        sessions: parseInt(match[2], 10),
        window: body.match(/\((S\d+(?:,\s*S\d+)+)\)/)?.[1] ?? '',
        source: 'memory',
      });
    }
  } catch {
    // CI and public clones normally have no private memory directory.
  }

  if (patterns.length === 0) {
    const history = readJson(path.join(root, 'portfolio', 'compiled', 'GENIUS_HISTORY.json'), {});
    const entries = Array.isArray(history.entries) ? history.entries : [];
    const latest = entries.at(-1);
    const ageDays = latest?.date ? Math.floor((now - new Date(latest.date).getTime()) / 86_400_000) : 999;
    if (ageDays <= 3 && entries.length >= 3) {
      const window = entries.slice(-3);
      const counts = new Map();
      for (const entry of window) {
        for (const category of new Set(entry.topCategories ?? [])) {
          counts.set(category, (counts.get(category) ?? 0) + 1);
        }
      }
      for (const [category, sessions] of counts) {
        if (sessions >= 3) {
          patterns.push({
            category: category.toUpperCase(),
            sessions,
            window: window.map((entry) => `S${entry.session}`).join(', '),
            source: 'history',
          });
        }
      }
    }
  }

  return patterns.sort((a, b) => b.sessions - a.sessions);
}
