#!/usr/bin/env node
/**
 * render-intent-history.mjs
 *
 * Parses all declared session intents + outcomes from LATEST_HANDOFF.md,
 * builds a per-session history table, detects scope drift patterns,
 * and surfaces recommendations for improving intent completion rate.
 *
 * Usage:
 *   node scripts/render-intent-history.mjs
 *   node scripts/ops.mjs intent-history
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'docs', 'INTENT_HISTORY.md');

function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

const handoff = readText(path.join(ROOT, 'context', 'LATEST_HANDOFF.md'));
const sil     = readText(path.join(ROOT, 'context', 'SELF_IMPROVEMENT_LOOP.md'));
const today   = new Date().toISOString().slice(0, 10);

// ── Parse intents from LATEST_HANDOFF ─────────────────────────────────────────
// Pattern: ## Session Intent: Session N \n <intent text> \n **Outcome:** ...
const intentBlocks = [...handoff.matchAll(
  /## Session Intent: Session (\d+)\n([\s\S]*?)(?=\n---|\n## |$)/g
)];

const sessions = intentBlocks.map(m => {
  const num    = parseInt(m[1]);
  const body   = m[2].trim();
  const intent = body.split('\n')[0].trim().slice(0, 80);
  const outcomeMatch = body.match(/\*\*Outcome:\s*([^*]+)\*\*/i);
  const outcome      = outcomeMatch?.[1]?.trim() ?? 'unknown';
  const achieved     = /achieved/i.test(outcome) ? 'Achieved' :
                       /partial/i.test(outcome) ? 'Partial' :
                       /redirect/i.test(outcome) ? 'Redirected' : 'Unknown';
  return { session: num, intent, outcome: achieved, detail: outcome };
});

// ── Parse velocity from SIL entries ──────────────────────────────────────────
const velMap = new Map();
for (const m of sil.matchAll(/## \d{4}-\d{2}-\d{2} — Session (\d+)[^|]*\| Velocity: (\d+)/g)) {
  velMap.set(parseInt(m[1]), parseInt(m[2]));
}

// ── Merge into full records ────────────────────────────────────────────────────
const records = sessions.map(s => ({
  ...s,
  velocity: velMap.get(s.session) ?? null,
})).sort((a, b) => b.session - a.session); // newest first

// ── Compute stats ──────────────────────────────────────────────────────────────
const total     = records.length;
const achieved  = records.filter(r => r.outcome === 'Achieved').length;
const partial   = records.filter(r => r.outcome === 'Partial').length;
const redirected = records.filter(r => r.outcome === 'Redirected').length;
const rate      = total > 0 ? Math.round((achieved / total) * 100) : 0;
const last5     = records.slice(0, 5);
const last5Rate = last5.length > 0 ? Math.round(last5.filter(r => r.outcome === 'Achieved').length / last5.length * 100) : 0;

// Consecutive achieved streak
let streak = 0;
for (const r of records) {
  if (r.outcome === 'Achieved') streak++;
  else break;
}

// ── Patterns ──────────────────────────────────────────────────────────────────
const patterns = [];
if (last5Rate < 70) patterns.push(`⚠ Intent rate ${last5Rate}% (last 5) — reduce session scope to restore momentum`);
if (last5Rate >= 90) patterns.push(`✓ Strong intent completion rate ${last5Rate}% (last 5) — maintain current scope calibration`);
if (streak >= 3) patterns.push(`✓ ${streak}-session achievement streak — velocity is well-calibrated`);
if (partial >= 2) patterns.push(`⚠ ${partial} partial sessions — scope overreach pattern detected; apply scope cap more strictly`);
if (redirected > 0) patterns.push(`ℹ ${redirected} redirected session(s) — human direction changes are expected; log in CDR`);

// High-velocity achieved sessions
const highVel = records.filter(r => r.outcome === 'Achieved' && (r.velocity ?? 0) >= 8);
if (highVel.length > 0) {
  patterns.push(`💡 ${highVel.length} session(s) achieved with velocity ≥8 — identify what enabled those sprints`);
}

// ── Write output ──────────────────────────────────────────────────────────────
const lines = [
  `# Session Intent History`,
  ``,
  `> Generated: ${today} · Sessions analyzed: ${total} · Achieved: ${achieved} · Partial: ${partial} · Rate: ${rate}%`,
  ``,
  `---`,
  ``,
  `## Stats`,
  ``,
  `| Metric | Value |`,
  `|---|---|`,
  `| Total sessions | ${total} |`,
  `| Achieved | ${achieved} (${rate}%) |`,
  `| Partial | ${partial} |`,
  `| Redirected | ${redirected} |`,
  `| Intent rate (last 5) | ${last5Rate}% |`,
  `| Current streak | ${streak} consecutive Achieved |`,
  ``,
  `---`,
  ``,
  `## Per-Session History`,
  ``,
  `| Session | Outcome | Velocity | Intent (truncated) |`,
  `|---|---|---|---|`,
  ...records.map(r => {
    const badge = r.outcome === 'Achieved' ? '✓' : r.outcome === 'Partial' ? '⚠' : '→';
    const vel   = r.velocity != null ? r.velocity : '—';
    return `| S${r.session} | ${badge} ${r.outcome} | ${vel} | ${r.intent.slice(0, 60)} |`;
  }),
  ``,
  `---`,
  ``,
  `## Patterns Detected`,
  ``,
  ...patterns.map(p => `- ${p}`),
  ...(patterns.length === 0 ? ['- No anomalies detected.'] : []),
  ``,
  `---`,
  ``,
  `## Recommendations`,
  ``,
  last5Rate < 80
    ? `- **Reduce scope:** Intent rate ${last5Rate}% is below 80%. Apply \`sessionScopeCap = floor(lastVelocity × 1.5)\` strictly at session start.`
    : `- Intent rate is healthy. Continue current scope calibration.`,
  partial > 1 ? `- Review partial sessions (${partial} total) — identify if overreach, interruption, or external blocking caused incompletion.` : '',
  highVel.length > 0 ? `- Replicate conditions from high-velocity Achieved sessions (S${highVel.map(r => r.session).join(', S')}).` : '',
  ``,
  `---`,
  ``,
  `*Generated by \`scripts/render-intent-history.mjs\` · run \`node scripts/ops.mjs intent-history\` to refresh*`,
];

fs.writeFileSync(OUT, lines.filter(l => l !== '').join('\n').replace(/\n{3,}/g, '\n\n'), 'utf8');
console.log(`✓ Intent history → docs/INTENT_HISTORY.md`);
console.log(`  ${total} sessions · ${achieved} Achieved · ${partial} Partial · rate: ${rate}% (last 5: ${last5Rate}%)`);
