/**
 * scripts/ops/portfolio.mjs — studio-wide ops commands (S79)
 */

export default {
  category: 'Portfolio',
  commands: {
    'feeds': {
      script: 'compile-consumption-feeds.mjs',
      desc: 'Compile Hub + Social Dashboard + Website consumption feeds',
      args: '[--hub] [--social] [--website] [--json]',
    },
    'studio-brain': {
      script: 'render-studio-brain.mjs',
      desc: 'Render portfolio/STUDIO_BRAIN.md weekly synthesis',
    },
    'founder-queue': {
      script: 'render-founder-queue.mjs',
      desc: 'Render Founder Queue from anomalies + human-blocked',
    },
    'founder-control': {
      script: 'render-founder-control.mjs',
      desc: 'Render fused founder action board for Claude/Codex/ChatGPT',
      args: '[--json]',
    },
    'openai-founder-agent': {
      script: 'render-openai-founder-agent.mjs',
      desc: 'Render OpenAI Founder Control Agent scaffold for Responses/Agents SDK',
      args: '[--json]',
    },
    'weekly-digest': {
      script: 'generate-weekly-digest.mjs',
      desc: 'Generate portfolio/WEEKLY_DIGEST.md',
    },
    'registry': {
      script: 'render-project-registry.mjs',
      desc: 'Render portfolio/PROJECT_REGISTRY.md from JSON',
    },
    'studio-pulse': {
      script: 'studio-pulse.mjs',
      desc: 'Heartbeat log — NDJSON events, 7-day buffer',
    },
    'narrator': {
      script: 'studio-narrator.mjs',
      desc: 'Daily Haiku-powered narrative summary',
    },
    'launch-momentum': {
      script: 'render-launch-momentum.mjs',
      desc: 'Launch readiness + announcement decay per project',
    },
    'revenue': {
      script: 'update-revenue-signals.mjs',
      desc: 'Refresh portfolio/REVENUE_SIGNALS.md from REVENUE_DATA.json',
    },
    'testability': {
      script: 'render-testability.mjs',
      desc: 'Probe testingSurfaces across all projects',
    },
    'codex-worker-lane': {
      script: 'render-codex-worker-lane.mjs',
      desc: 'Render Codex bounded execution lane definition',
      args: '[--json]',
    },
    'runtime-profiles': {
      script: 'render-runtime-profiles.mjs',
      desc: 'Render Studio OS repo-class runtime profiles',
      args: '[--json]',
    },
    'portfolio-omnilist': {
      script: 'render-portfolio-omnilist.mjs',
      desc: 'Render one ranked portfolio-wide Omnilist',
      args: '[--json]',
    },
    'identity-contracts': {
      script: 'render-studio-identity-contracts.mjs',
      desc: 'Render canonical portfolio identity contracts for downstream consumers',
      args: '[--json]',
    },
    'project-mesh': {
      script: 'render-project-mesh.mjs',
      desc: 'Render project mesh schema + current portfolio signal feed',
      args: '[--json]',
    },
    'control-tower': {
      script: 'render-founder-control-tower.mjs',
      desc: 'Render founder control tower for 8-16 concurrent sessions',
      args: '[--json]',
    },
    'repo-readiness': {
      script: 'render-repo-readiness.mjs',
      desc: 'Score portfolio repos for autonomous-agent readiness',
      args: '[--json]',
    },
    'founder-digest': {
      script: 'render-founder-digest.mjs',
      desc: 'Render daily founder digest 5 surface',
      args: '[--json]',
    },
    'cross-repo-plan': {
      script: 'render-cross-repo-change-plan.mjs',
      desc: 'Render safe write-order plan across active repo locks',
      args: '[--json]',
    },
    'runtime-assignment': {
      script: 'render-runtime-assignment-engine.mjs',
      desc: 'Render runtime assignment engine for Claude/Codex/ChatGPT lanes',
      args: '[--json]',
    },
    'launch-mesh': {
      script: 'render-launch-mesh.mjs',
      desc: 'Render launch status and announcement readiness across the portfolio',
      args: '[--json]',
    },
    'skill-pack': {
      script: 'render-studio-skill-pack.mjs',
      desc: 'Render global + project skill standardization pack',
      args: '[--json]',
    },
    'listing-metadata': {
      script: 'compile-studio-fabric.mjs',
      desc: 'Compile LISTING_METADATA.json + PUBLIC_SURFACES + LIVE_SURFACES',
    },
    'portfolio-tasks': {
      script: 'lib/cross-repo-tasks.mjs',
      desc: 'Aggregate every project TASK_BOARD.md — per-project + portfolio totals',
      args: '[--json]',
    },
    'ignis-insight': {
      script: 'lib/ignis-insight.mjs',
      desc: 'Compact IGNIS synth summary (phase · avg IQ · coverage · top · risk · next action)',
      args: '[--json]',
    },
    'consumer-adoption': {
      script: 'verify-consumer-adoption.mjs',
      desc: 'Verify Hub / website / Social Dashboard / SparkFunnel feed adoption',
      args: '[--json]',
    },
    'rescore-project': {
      script: 'rescore-project.mjs',
      desc: 'Compute/write the canonical projectHealthScore distinct from SIL',
      args: '<slug> [--write] [--json]',
    },
    'external-signals': {
      script: 'render-external-signal-log.mjs',
      desc: 'Read or append founder-curated external market/platform signals',
      args: '[--json] [--append --kind <k> --source <s> --text "..."]',
    },
  },
};
