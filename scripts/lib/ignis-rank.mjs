/**
 * ignis-rank.mjs — IGNIS ranking adapter (S79, live wiring 2026-05-18)
 *
 * Contract between the Studio Ops Unified Genius List and the IGNIS
 * intelligence platform.
 *
 * Live path: spawns the IGNIS CLI (`cli.js export json`) to obtain
 * current project-level IQ + pillar grades, then layers a pillar-aware
 * boost over the deterministic per-item score. IGNIS does not yet
 * expose a per-item rank tool (see NOTE_FROM_PROMOGRIND_2026-05-18.md
 * in the vaultspark-ignis repo) — until it does, per-item ranking
 * stays deterministic but is informed by live pillar context.
 *
 * Contract:
 *   rankItems(items: GeniusItem[]): Promise<RankedItem[]>
 *
 * GeniusItem = {
 *   id, title, category, status, effortMin, sourceSurface, signals
 * }
 *
 * RankedItem = GeniusItem & {
 *   ignisScore, ignisTier, ignisRationale,
 *   ignisSource: 'live' | 'fallback',
 * }
 *
 * Environment:
 *   IGNIS_ROOT      — override path to vaultspark-ignis checkout
 *                     (default: sibling repo ../vaultspark-ignis)
 *   IGNIS_DISABLE   — set to "1" to force fallback (skip CLI)
 *   IGNIS_MCP_URL   — legacy HTTP transport (kept for future server)
 *   IGNIS_MCP_TOKEN — auth for legacy HTTP path
 *
 * Graceful degradation: any live-call error falls back to deterministic
 * scoring without raising.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const IGNIS_MCP_URL = process.env.IGNIS_MCP_URL || null;
const IGNIS_MCP_TOKEN = process.env.IGNIS_MCP_TOKEN || null;
const IGNIS_DISABLED = process.env.IGNIS_DISABLE === '1';
const IGNIS_ROOT = process.env.IGNIS_ROOT
  || path.resolve(ROOT, '..', 'vaultspark-ignis');
const IGNIS_CLI = path.join(IGNIS_ROOT, 'dist', 'cli.js');
const IGNIS_EXPORT_PATH = path.join(ROOT, 'json', 'ignis', 'output', 'export.json');
const IGNIS_EXPORT_TTL_MS = 60 * 60 * 1000; // 1h

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }

// ── Deterministic fallback scoring ──────────────────────────────────────────
// Weights encode studio-wide leverage heuristics. When IGNIS Phase 3 lands,
// these get replaced by IGNIS's actual learned rankings.

const CATEGORY_WEIGHT = {
  'SECURITY':      28,
  'CLAUDE-API':    24,
  'INTELLIGENCE':  24,
  'INTEGRATION':   22,
  'AUTOMATION':    20,
  'PROTOCOL':      20,
  'UX':            14,
  'GOVERNANCE':    18,
  'INFRA':         16,
  'LAUNCH':        26,
  'REFACTOR':       8,
  default:         12,
};

const STATUS_WEIGHT = {
  'unblocked':             20,
  'delegated':              8,
  'human-blocked':        -10,
  'cross-repo-locked':    -15,
  'externally-blocked':   -12,
  'blocked-on-hub':       -12,
  'done':                 -99, // exclude
  default:                  0,
};

const SOURCE_BOOST = {
  'IGNIS_PROPOSALS':         15,   // IGNIS Forge items are high-signal
  'HUMAN_ACTION_PRESSURE':   18,   // aged human blockers compress velocity
  'SESSION_INTENT_PLAN':     12,   // current session intent
  'ACTION_QUEUE':            10,
  'FOUNDER_QUEUE':            8,
  'TASK_BOARD':               0,   // baseline
  default:                    0,
};

function effortPenalty(effortMin) {
  if (effortMin == null) return 0;
  if (effortMin <= 30)  return 8;
  if (effortMin <= 90)  return 4;
  if (effortMin <= 180) return 0;
  if (effortMin <= 360) return -4;
  return -10;
}

function ageBoost(signals) {
  // Aged blockers accumulate priority
  const ageSessions = signals?.ageSessions ?? signals?.age ?? 0;
  if (ageSessions >= 30) return 12;
  if (ageSessions >= 15) return 8;
  if (ageSessions >= 5)  return 4;
  return 0;
}

function fallbackRank(item) {
  const cat = CATEGORY_WEIGHT[item.category] ?? CATEGORY_WEIGHT.default;
  const status = STATUS_WEIGHT[item.status] ?? STATUS_WEIGHT.default;
  const source = SOURCE_BOOST[item.sourceSurface] ?? SOURCE_BOOST.default;
  const effort = effortPenalty(item.effortMin);
  const age = ageBoost(item.signals || {});

  const raw = cat + status + source + effort + age + 40; // +40 baseline for 0–100 mapping
  const score = Math.max(0, Math.min(100, raw));

  let tier = 'low';
  if (score >= 75) tier = 'fire';
  else if (score >= 60) tier = 'high';
  else if (score >= 40) tier = 'medium';

  const rationale = [
    `cat:${item.category}(+${cat})`,
    item.status !== 'unblocked' ? `status:${item.status}(${status > 0 ? '+' : ''}${status})` : null,
    source ? `source:${item.sourceSurface}(+${source})` : null,
    effort !== 0 ? `effort(${effort > 0 ? '+' : ''}${effort})` : null,
    age > 0 ? `aged(+${age})` : null,
  ].filter(Boolean).join(' · ');

  return { score, tier, rationale };
}

// ── Live IGNIS context via CLI (2026-05-18) ────────────────────────────────
// IGNIS only ships stdio MCP + CLI today — no HTTP server. We invoke the CLI
// to get current pillar scores, then use them to inform per-item ranking.

const CATEGORY_TO_PILLAR = {
  'SECURITY':      'vitality',
  'CLAUDE-API':    'cognition',
  'INTELLIGENCE':  'cognition',
  'INTEGRATION':   'synthesis',
  'AUTOMATION':    'execution',
  'PROTOCOL':      'execution',
  'UX':            'expression',
  'GOVERNANCE':    'trajectory',
  'INFRA':         'vitality',
  'LAUNCH':        'potential',
  'REFACTOR':      'execution',
};

function exportIsFresh() {
  try {
    const st = fs.statSync(IGNIS_EXPORT_PATH);
    return (Date.now() - st.mtimeMs) < IGNIS_EXPORT_TTL_MS;
  } catch { return false; }
}

function runIgnisExport() {
  if (!fs.existsSync(IGNIS_CLI)) {
    throw new Error(`IGNIS CLI not found at ${IGNIS_CLI}`);
  }
  const res = spawnSync(process.execPath, [IGNIS_CLI, 'export', 'json', ROOT], {
    cwd: ROOT,
    timeout: 60_000,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`IGNIS export exited ${res.status}: ${(res.stderr || '').slice(0, 200)}`);
  }
}

function loadLiveContext() {
  if (IGNIS_DISABLED) return null;
  try {
    if (!exportIsFresh()) runIgnisExport();
    const data = readJson(IGNIS_EXPORT_PATH, null);
    if (!data || !data.pillars) return null;
    return {
      iqScore: data.iqScore ?? 0,
      tier: data.tier ?? 'unknown',
      pillars: data.pillars,
    };
  } catch (err) {
    process.stderr.write(`[ignis-rank] live context failed, using fallback: ${err.message}\n`);
    return null;
  }
}

// Pillar scores are roughly 0–10000. Weak pillars surface higher leverage
// for items that touch them. boost ∈ roughly [-8, +12].
function pillarBoost(category, pillars) {
  const pillarName = CATEGORY_TO_PILLAR[category];
  if (!pillarName) return { boost: 0, pillar: null, pillarScore: null };
  const pillar = pillars[pillarName];
  if (!pillar) return { boost: 0, pillar: pillarName, pillarScore: null };
  const score = pillar.score ?? 5000;
  const raw = (5000 - score) / 400;
  const boost = Math.max(-8, Math.min(12, Math.round(raw)));
  return { boost, pillar: pillarName, pillarScore: Math.round(score) };
}

// ── Legacy HTTP rank (kept for future IGNIS HTTP server) ───────────────────
async function liveRankHttp(items) {
  if (!IGNIS_MCP_URL) throw new Error('IGNIS_MCP_URL not configured');
  const res = await fetch(`${IGNIS_MCP_URL}/rank`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(IGNIS_MCP_TOKEN ? { 'Authorization': `Bearer ${IGNIS_MCP_TOKEN}` } : {}),
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(`IGNIS rank call failed: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.ranked)) throw new Error('IGNIS rank returned invalid shape');
  return data.ranked;
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function rankItems(items) {
  if (!Array.isArray(items) || items.length === 0) return [];

  if (IGNIS_MCP_URL) {
    try {
      const live = await liveRankHttp(items);
      return live.map(r => ({ ...r, ignisSource: 'live' }));
    } catch (err) {
      process.stderr.write(`[ignis-rank] HTTP live call failed, falling through: ${err.message}\n`);
    }
  }

  const ctx = loadLiveContext();
  const source = ctx ? 'live' : 'fallback';

  return items
    .filter(it => it.status !== 'done')
    .map(it => {
      const { score, tier, rationale } = fallbackRank(it);
      let finalScore = score;
      let finalRationale = rationale;
      let finalTier = tier;

      if (ctx) {
        const { boost, pillar, pillarScore } = pillarBoost(it.category, ctx.pillars);
        finalScore = Math.max(0, Math.min(100, score + boost));
        if (boost !== 0 && pillar) {
          finalRationale = `${rationale} · pillar:${pillar}=${pillarScore}(${boost > 0 ? '+' : ''}${boost})`;
        }
        if (finalScore >= 75) finalTier = 'fire';
        else if (finalScore >= 60) finalTier = 'high';
        else if (finalScore >= 40) finalTier = 'medium';
        else finalTier = 'low';
      }

      return {
        ...it,
        ignisScore: finalScore,
        ignisTier: finalTier,
        ignisRationale: finalRationale,
        ignisSource: source,
      };
    })
    .sort((a, b) => b.ignisScore - a.ignisScore);
}

export function isLiveRankingAvailable() {
  if (IGNIS_MCP_URL) return true;
  if (IGNIS_DISABLED) return false;
  return fs.existsSync(IGNIS_CLI);
}

export default { rankItems, isLiveRankingAvailable };
