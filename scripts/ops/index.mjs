/**
 * scripts/ops/index.mjs — composed command registry (S79)
 *
 * Merges all verb-grouped modules into one flat registry suitable for the
 * thin ops.mjs dispatcher. Future ops.mjs will simply do:
 *
 *   import { COMMANDS, CATEGORIES } from './ops/index.mjs';
 *
 * Today, ops.mjs still has its inline COMMANDS constant — this module
 * is additive and verifiable side-by-side.
 */

import session from './session.mjs';
import portfolio from './portfolio.mjs';
import compliance from './compliance.mjs';
import intelligence from './intelligence.mjs';
import security from './security.mjs';
import automation from './automation.mjs';
import release from './release.mjs';
import legacy from './legacy.mjs';

const MODULES = [session, portfolio, compliance, intelligence, security, automation, release, legacy];

export const COMMANDS = (() => {
  const merged = {};
  const conflicts = [];
  for (const m of MODULES) {
    for (const [name, spec] of Object.entries(m.commands)) {
      if (merged[name]) {
        conflicts.push({ name, from: merged[name]._category, duplicate: m.category });
      }
      merged[name] = { ...spec, category: spec.category ?? m.category, _category: m.category };
    }
  }
  if (conflicts.length) {
    const msg = conflicts.map(c => `  ${c.name}: in both ${c.from} and ${c.duplicate}`).join('\n');
    throw new Error(`ops module merge: conflicting command names:\n${msg}`);
  }
  return merged;
})();

export const CATEGORIES = Array.from(new Set(Object.values(COMMANDS).map(spec => spec.category)));

export function byCategory() {
  const out = {};
  for (const cat of CATEGORIES) out[cat] = {};
  for (const [name, spec] of Object.entries(COMMANDS)) {
    out[spec.category][name] = spec;
  }
  return out;
}

export function helpText() {
  const lines = ['Studio Ops — canonical command engine'];
  lines.push('');
  const grouped = byCategory();
  for (const cat of CATEGORIES) {
    const cmds = Object.keys(grouped[cat]).sort();
    if (!cmds.length) continue;
    lines.push(`  ── ${cat} ─────────────────────────────────────────────────────`);
    for (const name of cmds) {
      const spec = grouped[cat][name];
      lines.push(`    ${name.padEnd(22)} ${spec.desc}`);
      if (spec.args) lines.push(`    ${' '.repeat(22)}   ${spec.args}`);
    }
    lines.push('');
  }
  lines.push(`Total: ${Object.keys(COMMANDS).length} commands across ${CATEGORIES.length} categories.`);
  return lines.join('\n');
}

export default { COMMANDS, CATEGORIES, byCategory, helpText };
