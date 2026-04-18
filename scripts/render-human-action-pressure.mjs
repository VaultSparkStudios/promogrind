#!/usr/bin/env node
/**
 * render-human-action-pressure.mjs
 *
 * Ranks founder-only / human-action items by age, dependency fan-out,
 * and portfolio impact so they stop silently compressing velocity.
 *
 * Outputs:
 * - context/HUMAN_ACTION_PRESSURE.md
 * - portfolio/compiled/HUMAN_ACTION_PRESSURE.json
 *
 * Usage:
 *   node scripts/render-human-action-pressure.mjs
 *   node scripts/render-human-action-pressure.mjs --json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifyBlocker } from './lib/blocker-rules.mjs';
import { resolveCapability } from './lib/secrets.mjs';
import { parseHumanItems } from './lib/task-board.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TASK_BOARD = path.join(ROOT, 'context', 'TASK_BOARD.md');
const OUT_MD = path.join(ROOT, 'context', 'HUMAN_ACTION_PRESSURE.md');
const OUT_JSON = path.join(ROOT, 'portfolio', 'compiled', 'HUMAN_ACTION_PRESSURE.json');
const jsonMode = process.argv.includes('--json');

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function impactProfile(text) {
  const source = String(text || '').toLowerCase();

  if (/social api|reddit|twitter|announce/.test(source)) {
    return { dependencyFanout: 8, portfolioImpact: 26, impactLabel: 'studio-wide launch reach' };
  }
  if (/workflow scope|github token/.test(source)) {
    return { dependencyFanout: 5, portfolioImpact: 20, impactLabel: 'Hub dispatch / founder workflow' };
  }
  if (/staging|wildcard|dns/.test(source)) {
    return { dependencyFanout: 6, portfolioImpact: 18, impactLabel: 'multi-project staging access' };
  }
  if (/resend|smtp|email/.test(source)) {
    return { dependencyFanout: 5, portfolioImpact: 18, impactLabel: 'auth and email delivery' };
  }
  if (/\br2\b|backup/.test(source)) {
    return { dependencyFanout: 7, portfolioImpact: 24, impactLabel: 'studio backup safety' };
  }
  if (/workers routes|auth worker/.test(source)) {
    return { dependencyFanout: 2, portfolioImpact: 10, impactLabel: 'single-route infrastructure' };
  }
  if (/railway|social dashboard/.test(source)) {
    return { dependencyFanout: 2, portfolioImpact: 12, impactLabel: 'single-project deployment' };
  }
  if (/affiliate/.test(source)) {
    return { dependencyFanout: 1, portfolioImpact: 8, impactLabel: 'single-project revenue path' };
  }

  return { dependencyFanout: 1, portfolioImpact: 6, impactLabel: 'localized blocker' };
}

function pressureBand(score) {
  if (score >= 80) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function iconForBand(band) {
  return band === 'critical' ? '⛔' : band === 'high' ? '⚠' : band === 'medium' ? '•' : '·';
}

const items = parseHumanItems(readText(TASK_BOARD)).map((item) => {
  const blocker = classifyBlocker(`${item.title} ${item.description}`);
  const capabilityState = blocker.capabilities.map((capability) => ({
    capability,
    ...resolveCapability(capability),
  }));
  const { dependencyFanout, portfolioImpact, impactLabel } = impactProfile(`${item.title} ${item.description}`);
  const ageSessions = item.ageSessions ?? 0;
  const capabilityReady = capabilityState.some((entry) => entry.ok);
  const pressureScore =
    (ageSessions * 1.4) +
    (dependencyFanout * 5) +
    portfolioImpact +
    (blocker.attemptable ? 8 : 0) +
    (capabilityReady ? -6 : 6);

  return {
    title: item.title,
    description: item.description,
    ageSessions,
    category: blocker.category,
    attemptable: blocker.attemptable,
    capabilityState,
    dependencyFanout,
    portfolioImpact,
    impactLabel,
    pressureScore: Math.max(0, Math.round(pressureScore)),
    pressureBand: pressureBand(pressureScore),
    nextAgentAction: blocker.probeCommands[0] || 'node scripts/ops.mjs blocker-preflight',
  };
}).sort((a, b) => b.pressureScore - a.pressureScore);

const payload = {
  generatedAt: new Date().toISOString().slice(0, 10),
  topPressure: items.slice(0, 5),
  items,
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const lines = [
  '<!-- generated-by: scripts/render-human-action-pressure.mjs -->',
  `<!-- generated-at: ${payload.generatedAt} -->`,
  '',
  '# Human Action Pressure',
  '',
  '> Founder-only pressure view. Ranks open `Human Action Required` items by age, dependency fan-out, and portfolio impact.',
  '',
  `**${items.length} open item(s)** · updated ${payload.generatedAt}`,
  '',
  '## Ranked Pressure',
  '',
];

if (items.length === 0) {
  lines.push('- No open Human Action Required items.');
} else {
  for (const item of items) {
    const caps = item.capabilityState.length > 0
      ? item.capabilityState.map((entry) => `${entry.capability}=${entry.ok ? 'READY' : 'MISSING'}`).join(' · ')
      : 'none mapped';
    lines.push(`- **${iconForBand(item.pressureBand)} ${item.title}** — score ${item.pressureScore} · ${item.pressureBand}`);
    lines.push(`  Age ${item.ageSessions || '?'} sessions · fan-out ${item.dependencyFanout} · impact ${item.impactLabel}`);
    lines.push(`  Capability state: ${caps}`);
    lines.push(`  Next agent action: \`${item.nextAgentAction}\``);
  }
}

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_MD, lines.join('\n'));
fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2));
console.log(`✓ Human-action pressure → context/HUMAN_ACTION_PRESSURE.md  (${items.length} item(s))`);
