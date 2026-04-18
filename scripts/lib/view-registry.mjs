/**
 * view-registry.mjs — canonical view registry (S79)
 *
 * Before S79, 19 separate render-*.mjs scripts each re-parsed TASK_BOARD,
 * PROJECT_STATUS, SIL, and other source files with slightly different
 * regex logic. Parser drift caused S78's "deprecated bucket logic" bug.
 *
 * This registry is the single source of truth for "which view reads which
 * source files and produces which artifact." The `renderer.mjs` entry
 * point dispatches view requests through this registry.
 *
 * Migration strategy: existing render-*.mjs scripts are wrapped as views.
 * Over time, the shared parsers (TASK_BOARD, SIL, PROJECT_STATUS) get
 * promoted into scripts/lib/ so all views share one implementation.
 */

export const VIEWS = {
  'startup-brief': {
    script: 'render-startup-brief.mjs',
    sources: ['context/SELF_IMPROVEMENT_LOOP.md', 'context/TASK_BOARD.md', 'context/PROJECT_STATUS.json', 'context/TRUTH_AUDIT.md', 'context/GENIUS_LIST.md'],
    outputs: ['docs/STARTUP_BRIEF.md'],
    role: 'session-kickoff',
    consumers: ['studio-start skill', 'agents at session start'],
  },
  'closeout-board': {
    script: 'closeout-autopilot.mjs',
    sources: ['context/*.md', 'audits/*.json'],
    outputs: ['STATUS BOARD to stdout'],
    role: 'session-end',
    consumers: ['studio-closeout skill', 'autopilot'],
  },
  'genius-list': {
    script: 'generate-genius-list.mjs',
    sources: ['context/TASK_BOARD.md', 'context/SELF_IMPROVEMENT_LOOP.md', 'portfolio/compiled/*.json'],
    outputs: ['docs/GENIUS_LIST.md', 'context/GENIUS_LIST.json'],
    role: 'ranking',
    consumers: ['startup-brief', 'founder-queue', 'Hub feed'],
  },
  'genius-unified': {
    script: 'rank-with-ignis.mjs',
    sources: ['context/TASK_BOARD.md', 'context/ACTION_QUEUE.md', 'context/HUMAN_ACTION_PRESSURE.md', 'portfolio/IGNIS_PROPOSALS.md'],
    outputs: ['context/GENIUS_LIST.md', 'context/GENIUS_LIST.json'],
    role: 'ranking-v2',
    consumers: ['startup-brief', 'Hub feed', 'Social Dashboard'],
    notes: 'S79 unified list — calls ignis-rank.mjs; deterministic fallback until IGNIS Phase 3 MCP lands',
  },
  'founder-queue': {
    script: 'render-founder-queue.mjs',
    sources: ['context/HUMAN_ACTION_PRESSURE.md', 'portfolio/ACTIVE_SESSIONS.json', 'context/TASK_BOARD.md'],
    outputs: ['context/FOUNDER_QUEUE.md'],
    role: 'founder-attention',
    consumers: ['Hub founder cockpit', 'daily review'],
  },
  'ops-cockpit': {
    script: 'render-ops-cockpit.mjs',
    sources: ['context/PROJECT_STATUS.json', 'doctor output', 'portfolio/compiled/*.json'],
    outputs: ['docs/OPS_COCKPIT.md'],
    role: 'quick-health',
    consumers: ['watch loop', 'doctor command'],
  },
  'studio-brain': {
    script: 'render-studio-brain.mjs',
    sources: ['portfolio/*.md', 'portfolio/compiled/*.json'],
    outputs: ['portfolio/STUDIO_BRAIN.md'],
    role: 'weekly-synthesis',
    consumers: ['Studio Owner weekly review', 'Agent Coordinator'],
  },
  'weekly-digest': {
    script: 'generate-weekly-digest.mjs',
    sources: ['all projects WORK_LOG.md + SIL entries'],
    outputs: ['portfolio/WEEKLY_DIGEST.md'],
    role: 'weekly-digest',
    consumers: ['studio-brain', 'Studio Owner'],
  },
  'action-queue': {
    script: 'render-action-queue.mjs',
    sources: ['context/TASK_BOARD.md', 'context/HUMAN_ACTION_PRESSURE.md'],
    outputs: ['context/ACTION_QUEUE.md'],
    role: 'execution-plan',
    consumers: ['startup-brief', 'session kickoff'],
  },
  'intent-plan': {
    script: 'render-session-intent-plan.mjs',
    sources: ['LATEST_HANDOFF Session Intent', 'SELF_IMPROVEMENT_LOOP Rolling Status'],
    outputs: ['context/SESSION_INTENT_PLAN.md'],
    role: 'scope-plan',
    consumers: ['startup-brief', 'ranker'],
  },
  'human-pressure': {
    script: 'render-human-action-pressure.mjs',
    sources: ['context/TASK_BOARD.md Human Action Required'],
    outputs: ['context/HUMAN_ACTION_PRESSURE.md', 'portfolio/compiled/HUMAN_ACTION_PRESSURE.json'],
    role: 'blocker-ranking',
    consumers: ['genius-unified', 'founder-queue'],
  },
  'truth-dashboard': {
    script: 'render-truth-dashboard.mjs',
    sources: ['portfolio/PROJECT_REGISTRY.json', 'all projects TRUTH_AUDIT.md'],
    outputs: ['portfolio/TRUTH_DASHBOARD.md'],
    role: 'truth-coherence',
    consumers: ['studio-brain', 'Studio Owner'],
  },
  'testability': {
    script: 'render-testability.mjs',
    sources: ['all projects PROJECT_STATUS.json testingSurfaces'],
    outputs: ['portfolio/TESTABILITY.md'],
    role: 'testing-matrix',
    consumers: ['startup-brief test-it-now', 'Hub'],
  },
  'launch-momentum': {
    script: 'render-launch-momentum.mjs',
    sources: ['portfolio/PROJECT_REGISTRY.json', 'portfolio/CONTENT_PIPELINE.md'],
    outputs: ['portfolio/LAUNCH_MOMENTUM.md'],
    role: 'launch-readiness',
    consumers: ['Social Dashboard', 'studio-brain'],
  },
  'ignis-core': {
    script: 'render-ignis-core.mjs',
    sources: ['IGNIS CLI output per project'],
    outputs: ['portfolio/IGNIS_CORE.md'],
    role: 'ignis-portfolio',
    consumers: ['studio-brain', 'Hub'],
  },
  'cache-ledger': {
    script: 'render-cache-ledger.mjs',
    sources: ['.ops-cache/semantic/', 'model-router telemetry'],
    outputs: ['docs/CACHE_LEDGER.md'],
    role: 'cost-tracking',
    consumers: ['Studio Owner cost review'],
  },
  'rollout-scoreboard': {
    script: 'render-rollout-scoreboard.mjs',
    sources: ['all projects STUDIO_MANIFEST.json presence', 'runtime-pack presence'],
    outputs: ['portfolio/ROLLOUT_SCOREBOARD.md', 'portfolio/compiled/ROLLOUT_SCOREBOARD.json'],
    role: 'adoption-matrix',
    consumers: ['studio-review', 'Hub'],
  },
  'feedback-dashboard': {
    script: 'render-feedback-loop-dashboard.mjs',
    sources: ['portfolio/FEEDBACK_LOOP_LEDGER.md', 'CDR entry rates'],
    outputs: ['portfolio/FEEDBACK_LOOP_DASHBOARD.md', 'portfolio/compiled/FEEDBACK_LOOP_DASHBOARD.json'],
    role: 'loop-health',
    consumers: ['studio-review', 'engagement scoring'],
  },
  'consumption-feeds': {
    script: 'compile-consumption-feeds.mjs',
    sources: ['portfolio/PROJECT_REGISTRY.json', 'ACTIVE_SESSIONS', 'LIVE_SURFACES', 'LISTING_METADATA', 'RELEASE_GATES'],
    outputs: ['portfolio/compiled/HUB_FEED.json', 'SOCIAL_DASHBOARD_FEED.json', 'WEBSITE_FEED.json'],
    role: 'consumer-api',
    consumers: ['Studio Hub', 'Social Dashboard', 'vaultsparkstudios.com'],
    notes: 'S79 consumption bridge — closes downstream consumption lag',
  },
};

/** Returns the set of all source files declared by any view. */
export function allSources() {
  const s = new Set();
  for (const v of Object.values(VIEWS)) for (const src of v.sources) s.add(src);
  return [...s];
}

/** Returns views that read a given source file (glob patterns matched loosely). */
export function viewsReading(sourceGlob) {
  return Object.entries(VIEWS).filter(([, v]) =>
    v.sources.some(s => s.includes(sourceGlob) || sourceGlob.includes(s))
  ).map(([name]) => name);
}

/** Returns views that write a given output. */
export function viewsWriting(outputGlob) {
  return Object.entries(VIEWS).filter(([, v]) =>
    v.outputs.some(o => o.includes(outputGlob) || outputGlob.includes(o))
  ).map(([name]) => name);
}

export default { VIEWS, allSources, viewsReading, viewsWriting };
