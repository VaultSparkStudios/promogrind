#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const today = new Date().toISOString().slice(0, 10);

const targets = [
  { path: 'portfolio/STUDIO_BRAIN.md', cadenceDays: 2, valueHint: 'daily coordinator output' },
  { path: 'portfolio/IGNIS_CORE.md', cadenceDays: 31, valueHint: 'founder-facing monthly synthesis' },
  { path: 'portfolio/TRUTH_DASHBOARD.md', cadenceDays: 7, valueHint: 'contradiction visibility' },
  { path: 'portfolio/WEEKLY_DIGEST.md', cadenceDays: 7, valueHint: 'weekly decision summary' },
  { path: 'portfolio/DEBT_REPORT.md', cadenceDays: 7, valueHint: 'debt monitoring' },
  { path: 'portfolio/REVENUE_SIGNALS.md', cadenceDays: 7, valueHint: 'revenue readiness' },
];

const rows = targets.map((target) => {
  const fullPath = path.join(root, target.path);
  const exists = fs.existsSync(fullPath);
  const content = exists ? fs.readFileSync(fullPath, 'utf8') : '';
  const mtime = exists ? fs.statSync(fullPath).mtime : null;
  const daysOld = mtime ? Math.floor((Date.now() - mtime.getTime()) / 86400000) : null;
  const signals = [];
  if (!exists) signals.push('missing');
  if (daysOld != null && daysOld > target.cadenceDays) signals.push(`stale ${daysOld}d`);
  if (/INACTIVE|template-only|no backing workflow|mechanical commit counts|template shell/i.test(content)) signals.push('low-value content');
  if ((content.match(/^###{0,1} /gm) ?? []).length < 3) signals.push('thin structure');
  const status = signals.length === 0 ? 'keep' : signals.includes('missing') ? 'build' : signals.includes('low-value content') ? 'rebuild' : 'watch';
  return { ...target, exists, daysOld, signals, status };
});

const lines = [
  '# Automation Value Gate',
  '',
  `Generated: ${today}`,
  '',
  '| Surface | Status | Freshness | Signals | Why it exists |',
  '|---|---|---|---|---|',
  ...rows.map((row) => `| ${path.basename(row.path)} | ${row.status} | ${row.daysOld == null ? 'missing' : `${row.daysOld}d`} | ${row.signals.join(', ') || 'healthy'} | ${row.valueHint} |`),
  '',
  '## Actions',
  '',
  ...rows
    .filter((row) => row.status !== 'keep')
    .map((row, index) => `${index + 1}. **${path.basename(row.path)}** — ${row.status}; ${row.signals.join(', ') || 'review needed'}.`),
];

fs.writeFileSync(path.join(root, 'portfolio', 'AUTOMATION_VALUE_GATE.md'), `${lines.join('\n')}\n`);
