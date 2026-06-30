/**
 * scripts/ops/intelligence.mjs — IGNIS + memory + truth ops commands (S79)
 */

export default {
  category: 'Intelligence',
  commands: {
    'rescore': {
      script: 'rescore-ignis.mjs',
      desc: 'Refresh IGNIS scores per project',
      args: '[--project <slug>] [--all] [--stale] [--json]',
    },
    'ignis-core': {
      script: 'render-ignis-core.mjs',
      desc: 'Render portfolio/IGNIS_CORE.md',
    },
    'memory-graph': {
      script: 'build-memory-graph.mjs',
      desc: 'Build cross-project memory graph (S79)',
      args: '[--project <slug>] [--query <q>] [--stats]',
    },
    'entropy': {
      script: 'compute-entropy.mjs',
      desc: 'Compute protocol entropy score',
      args: '[--update] [--project .]',
    },
    'genome-snapshot': {
      script: 'append-genome-snapshot.mjs',
      desc: 'Append protocol genome snapshot',
      args: '[--project .]',
    },
    'genome-history': {
      script: 'render-genome-history.mjs',
      desc: 'Render docs/GENOME_HISTORY.md',
    },
    'truth-dashboard': {
      script: 'render-truth-dashboard.mjs',
      desc: 'Render portfolio/TRUTH_DASHBOARD.md',
    },
    'state-vector': {
      script: 'render-state-vector.mjs',
      desc: 'Per-project state vector snapshot',
      args: '[--project <slug>]',
    },
    'feedback-score': {
      script: 'score-feedback-ledger.mjs',
      desc: 'Proposal acceptance + feedback-loop health subscores',
      args: '[--json]',
    },
    'feedback-dashboard': {
      script: 'render-feedback-loop-dashboard.mjs',
      desc: 'Portfolio feedback-loop dashboard',
    },
    'plan-next': {
      script: 'plan-next-session.mjs',
      desc: 'Predicted SIL range + scope cap + risk flags',
    },
    'innovation-pack': {
      script: 'render-innovation-pack.mjs',
      desc: 'Generate second-order work after the primary genius list is exhausted',
      args: '[--json] [--dry-run] [--top <n>]',
    },
  },
};
