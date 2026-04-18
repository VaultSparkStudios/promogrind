/**
 * ignis-rank.mjs — IGNIS ranking adapter (S79)
 *
 * Contract between the Studio Ops Unified Genius List and the IGNIS
 * intelligence platform. Once IGNIS Phase 3 ships its MCP server, this
 * adapter switches from deterministic fallback scoring to live IGNIS rank
 * calls. Until then, the deterministic fallback produces identical-shape
 * output so downstream code is stable.
 *
 * Contract:
 *   rankItems(items: GeniusItem[]): Promise<RankedItem[]>
 *
 * GeniusItem = {
 *   id: string,
 *   title: string,
 *   category: string,        // e.g. "CLAUDE-API" | "SECURITY" | "INTEGRATION"
 *   status: string,          // "unblocked" | "human-blocked" | "cross-repo-locked"
 *   effortMin: number | null,
 *   sourceSurface: string,   // "TASK_BOARD" | "HUMAN_ACTION_PRESSURE" | "IGNIS_PROPOSALS" | ...
 *   signals: object,         // free-form per-source signals
 * }
 *
 * RankedItem = GeniusItem & {
 *   ignisScore: number,       // 0–100, higher = higher leverage
 *   ignisTier: 'fire' | 'high' | 'medium' | 'low',
 *   ignisRationale: string,   // one-line why-this-rank
 *   ignisSource: 'live' | 'fallback',
 * }
 *
 * Environment:
 *   IGNIS_MCP_URL   — if set, call live IGNIS MCP rank tool
 *   IGNIS_MCP_TOKEN — auth for live calls
 *
 * Graceful degradation: any live-call error falls back to deterministic
 * scoring without raising.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const IGNIS_MCP_URL = process.env.IGNIS_MCP_URL || null;
const IGNIS_MCP_TOKEN = process.env.IGNIS_MCP_TOKEN || null;

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

// ── Live IGNIS MCP call (activates when IGNIS_MCP_URL is set) ───────────────
async function liveRank(items) {
  if (!IGNIS_MCP_URL) throw new Error('IGNIS_MCP_URL not configured');

  // Placeholder: real implementation will use MCP stdio transport via
  // @modelcontextprotocol/sdk. For now we guard behind explicit env opt-in.
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
      const live = await liveRank(items);
      return live.map(r => ({ ...r, ignisSource: 'live' }));
    } catch (err) {
      // Fall through to deterministic fallback — never throw upward.
      process.stderr.write(`[ignis-rank] live call failed, using fallback: ${err.message}\n`);
    }
  }

  return items
    .filter(it => it.status !== 'done')
    .map(it => {
      const { score, tier, rationale } = fallbackRank(it);
      return {
        ...it,
        ignisScore: score,
        ignisTier: tier,
        ignisRationale: rationale,
        ignisSource: 'fallback',
      };
    })
    .sort((a, b) => b.ignisScore - a.ignisScore);
}

export function isLiveRankingAvailable() {
  return Boolean(IGNIS_MCP_URL);
}

export default { rankItems, isLiveRankingAvailable };
