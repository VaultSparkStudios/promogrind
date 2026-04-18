/**
 * ignis-live-score.mjs — live signal-aware scoring for IGNIS rank service.
 *
 * Pure function used by scripts/ignis-rank-server.mjs. Reads compiled Studio
 * Ops artifacts to derive per-item boosts/penalties the deterministic
 * fallback in scripts/lib/ignis-rank.mjs cannot see.
 *
 * Contract: scoreItem(item, signals) → { score: 0–100, tier, rationale }
 *
 * `signals` bundle is built once per request by loadSignals() and passed
 * into every scoreItem() call.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

// ── Base weights (aligned with fallback) ────────────────────────────────────

const CATEGORY_WEIGHT = {
  SECURITY: 28,
  'CLAUDE-API': 24,
  INTELLIGENCE: 24,
  INTEGRATION: 22,
  AUTOMATION: 20,
  PROTOCOL: 20,
  UX: 14,
  GOVERNANCE: 18,
  INFRA: 16,
  LAUNCH: 26,
  ORCHESTRATION: 22,
  REFACTOR: 8,
  default: 12
};

const STATUS_WEIGHT = {
  unblocked: 20,
  delegated: 8,
  'human-blocked': -10,
  'cross-repo-locked': -15,
  'externally-blocked': -12,
  'blocked-on-hub': -12,
  done: -99,
  default: 0
};

const SOURCE_BOOST = {
  IGNIS_PROPOSALS: 15,
  HUMAN_ACTION_PRESSURE: 18,
  SESSION_INTENT_PLAN: 12,
  ACTION_QUEUE: 10,
  FOUNDER_QUEUE: 8,
  TASK_BOARD: 0,
  default: 0
};

function effortPenalty(effortMin) {
  if (effortMin == null) return 0;
  if (effortMin <= 30) return 8;
  if (effortMin <= 90) return 4;
  if (effortMin <= 180) return 0;
  if (effortMin <= 360) return -4;
  return -10;
}

function ageBoost(signals) {
  const ageSessions = signals?.ageSessions ?? signals?.age ?? 0;
  if (ageSessions >= 30) return 12;
  if (ageSessions >= 15) return 8;
  if (ageSessions >= 5) return 4;
  return 0;
}

// ── Signal bundle (refreshed per request) ───────────────────────────────────

export function loadSignals(rootOverride = null) {
  const root = rootOverride || ROOT;
  const compiled = path.join(root, 'portfolio', 'compiled');
  const releaseGates = readJson(path.join(compiled, 'RELEASE_GATES.json'), null);
  const rollout = readJson(path.join(compiled, 'ROLLOUT_SCOREBOARD.json'), null);
  const feedback = readJson(path.join(compiled, 'FEEDBACK_LOOP_DASHBOARD.json'), null);
  const liveSurfaces = readJson(path.join(compiled, 'LIVE_SURFACES.json'), null);
  const genomeHistory = readJson(path.join(root, 'context', 'GENOME_HISTORY.json'), null);

  return {
    generatedAt: new Date().toISOString(),
    releaseGates: releaseGates
      ? {
          hold: releaseGates.hold ?? 0,
          review: releaseGates.review ?? 0,
          ready: releaseGates.ready ?? 0
        }
      : null,
    rollout: rollout
      ? {
          missingManifest: (rollout.pilots || [])
            .concat(rollout.projects || [])
            .filter((p) => p && p.manifestPresent === false).length,
          missingRuntimePack: (rollout.pilots || [])
            .concat(rollout.projects || [])
            .filter((p) => p && p.runtimePackPresent === false).length,
          fullyReady: rollout.summary?.fullyReady ?? 0,
          totalProjects: rollout.summary?.totalProjects ?? 0
        }
      : null,
    feedback: feedback
      ? {
          loopHealthScore: feedback.loopHealthScore ?? null,
          acceptanceRate: feedback.acceptanceRate ?? null,
          implementationRate: feedback.implementationRate ?? null,
          tryBeforeEscalating: feedback.totals?.tryBeforeEscalating ?? 0
        }
      : null,
    liveSurfaces: liveSurfaces
      ? {
          projectsWithLive: (liveSurfaces.projects || []).filter(
            (p) => typeof p?.liveUrl === 'string' && p.liveUrl.length > 0
          ).length,
          totalProjects: (liveSurfaces.projects || []).length
        }
      : null,
    genome: genomeHistory
      ? {
          latestTotal:
            genomeHistory.snapshots?.[genomeHistory.snapshots.length - 1]?.total ?? null,
          trend: (() => {
            const snaps = genomeHistory.snapshots || [];
            if (snaps.length < 2) return 0;
            const last = snaps[snaps.length - 1]?.total ?? 0;
            const prev = snaps[snaps.length - 2]?.total ?? 0;
            return last - prev;
          })()
        }
      : null
  };
}

// ── Live modifiers on top of fallback ───────────────────────────────────────

function liveModifiers(item, signals) {
  const mods = [];
  const category = String(item.category || '').toUpperCase();

  // Release gates: amplify SECURITY / GOVERNANCE / PROTOCOL items while HOLDs exist
  if (signals.releaseGates?.hold > 0) {
    if (category === 'SECURITY' || category === 'GOVERNANCE') {
      mods.push({ label: 'release-gate-hold', delta: Math.min(8, signals.releaseGates.hold) });
    }
    if (category === 'PROTOCOL' && signals.releaseGates.hold >= 3) {
      mods.push({ label: 'release-gate-hold-protocol', delta: 4 });
    }
  }

  // Rollout scoreboard: boost PROTOCOL / AUTOMATION items while pilots are incomplete
  if (signals.rollout?.missingManifest > 0) {
    if (category === 'PROTOCOL' || category === 'AUTOMATION') {
      mods.push({
        label: 'rollout-incomplete',
        delta: Math.min(6, signals.rollout.missingManifest * 2)
      });
    }
  }

  // Feedback loop: when health is below 70, boost INTELLIGENCE + AUTOMATION items
  const health = signals.feedback?.loopHealthScore;
  if (health != null && health < 70) {
    if (category === 'INTELLIGENCE' || category === 'AUTOMATION') {
      mods.push({ label: 'feedback-loop-unhealthy', delta: 6 });
    }
  }

  // Live surfaces adoption gap → boost INTEGRATION items
  if (signals.liveSurfaces) {
    const coverage =
      signals.liveSurfaces.totalProjects > 0
        ? signals.liveSurfaces.projectsWithLive / signals.liveSurfaces.totalProjects
        : 1;
    if (coverage < 0.5 && category === 'INTEGRATION') {
      mods.push({ label: 'live-surface-gap', delta: 5 });
    }
  }

  // Genome trajectory: declining → boost PROCESS / PROTOCOL items
  if (signals.genome?.trend != null && signals.genome.trend < 0) {
    if (category === 'PROTOCOL' || category === 'GOVERNANCE') {
      mods.push({ label: 'genome-declining', delta: 4 });
    }
  }

  // Try-before-escalating pressure: boost human-blocked items that are agent-attemptable
  if (signals.feedback?.tryBeforeEscalating >= 5) {
    if (item.status === 'human-blocked') {
      mods.push({ label: 'try-before-escalating', delta: 5 });
    }
  }

  return mods;
}

export function scoreItem(item, signals) {
  const cat = CATEGORY_WEIGHT[String(item.category || '').toUpperCase()] ?? CATEGORY_WEIGHT.default;
  const status = STATUS_WEIGHT[item.status] ?? STATUS_WEIGHT.default;
  const source = SOURCE_BOOST[item.sourceSurface] ?? SOURCE_BOOST.default;
  const effort = effortPenalty(item.effortMin);
  const age = ageBoost(item.signals || {});

  const mods = liveModifiers(item, signals);
  const modDelta = mods.reduce((sum, m) => sum + m.delta, 0);

  const raw = cat + status + source + effort + age + modDelta + 40;
  const score = Math.max(0, Math.min(100, raw));

  let tier = 'low';
  if (score >= 75) tier = 'fire';
  else if (score >= 60) tier = 'high';
  else if (score >= 40) tier = 'medium';

  const parts = [
    `cat:${item.category}(+${cat})`,
    item.status !== 'unblocked'
      ? `status:${item.status}(${status > 0 ? '+' : ''}${status})`
      : null,
    source ? `source:${item.sourceSurface}(+${source})` : null,
    effort !== 0 ? `effort(${effort > 0 ? '+' : ''}${effort})` : null,
    age > 0 ? `aged(+${age})` : null,
    ...mods.map((m) => `live:${m.label}(+${m.delta})`)
  ].filter(Boolean);

  return {
    score,
    tier,
    rationale: parts.join(' · '),
    liveModifiers: mods
  };
}

export default { loadSignals, scoreItem };
