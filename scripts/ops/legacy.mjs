/**
 * scripts/ops/legacy.mjs — commands not yet lifted into the original S79 modules.
 *
 * This module preserves the full command surface while `ops.mjs` transitions
 * to the composed dispatcher. Each command keeps its historical category so
 * `ops help` remains stable after the engine swap.
 */

export default {
  category: 'Legacy',
  commands: {
    'foundation-check': {
      script: 'check-foundation-ready.mjs',
      desc: 'Scan bootstrapped projects for Foundation session readiness',
      args: '[--project <slug>]',
      category: 'Validation',
    },
    'launch-check': {
      script: 'check-launch-ready.mjs',
      desc: 'Portfolio-wide launch readiness reporter',
      args: '[--sparked] [--project <slug>] [--json]',
      category: 'Validation',
    },
    'sanitize-ratchet': {
      script: 'check-sanitization-ratchet.mjs',
      desc: 'Check sanitization baseline ratchet',
      args: '[--report-dir <dir>] [--date <YYYY-MM-DD>] [--update-baseline]',
      category: 'Sanitization',
    },
    'sanitize-status': {
      script: 'render-sanitization-status.mjs',
      desc: 'Render SANITIZATION_STATUS.md',
      args: '[--refresh] [--json]',
      category: 'Sanitization',
    },
    'sanitize-issues': {
      script: 'open-sanitization-issues.mjs',
      desc: 'Open GitHub sanitization issues from audit packets',
      args: '[--date <YYYY-MM-DD>] [--repo <slug>] [--dry-run]',
      category: 'Sanitization',
    },
    'sanitize-settings': {
      script: 'sanitize-claude-settings.mjs',
      desc: 'Redact secrets from .claude/settings.local.json permissions.allow entries',
      args: '[--check] [--path <file>] [--json]',
      category: 'Sanitization',
    },
    'surfaces': {
      script: 'render-all-surfaces.mjs',
      desc: 'Render all 6 founder-facing intelligence surfaces',
      category: 'Intelligence',
    },
    'debt-report': {
      script: 'render-debt-report.mjs',
      desc: 'Regenerate DEBT_REPORT.md',
      category: 'Intelligence',
    },
    'revenue-signals': {
      script: 'render-revenue-signals.mjs',
      desc: 'Regenerate REVENUE_SIGNALS.md',
      category: 'Intelligence',
    },
    'content-pipeline': {
      script: 'render-content-pipeline.mjs',
      desc: 'Seed CONTENT_PIPELINE.md with per-project content-readiness signals',
      category: 'Intelligence',
    },
    'fabric': {
      script: 'compile-studio-fabric.mjs',
      desc: 'Compile manifest-backed portfolio truth, integration, and live-surface artifacts',
      args: '[--json]',
      category: 'Registry',
    },
    'ignis-diff': {
      script: 'portfolio-ignis-diff.mjs',
      desc: 'Per-project IGNIS IQ delta report',
      args: '[--archive]',
      category: 'Registry',
    },
    'rename-audit': {
      script: 'rename-drift-audit.mjs',
      desc: 'Scan for formerName/formerSlug drift references',
      args: '[--verbose]',
      category: 'Registry',
    },
    'reconcile-remotes': {
      script: 'reconcile-registry-remotes.mjs',
      desc: 'Reconcile registry localPaths against actual remotes',
      category: 'Registry',
    },
    'announce': {
      script: 'generate-announcement.mjs',
      desc: 'Generate announcement drafts for deployed-unannounced projects → docs/launch/<slug>-announcement-draft.md',
      args: '[--project <slug>] [--list] [--dry-run]',
      category: 'Launch',
    },
    'stripe-check': {
      script: 'check-stripe-readiness.mjs',
      desc: 'Portfolio-wide Stripe readiness status',
      category: 'Launch',
    },
    'session-plan': {
      script: 'plan-next-session.mjs',
      desc: 'Predictive session planner → docs/SESSION_PLAN.md',
      category: 'Protocol',
    },
    'founder-decision': {
      script: 'founder-queue-decision.mjs',
      desc: 'Record a Founder Queue decision in append-only NDJSON',
      args: '--signal "<signal>" --decision yes|no|defer|more-info [--note "..."]',
      category: 'Protocol',
    },
    'apply-founder-decisions': {
      script: 'apply-founder-decisions.mjs',
      desc: 'Derive portfolio/AUTOMATION_QUEUE.json from recorded founder decisions',
      args: '[--json]',
      category: 'Protocol',
    },
    'manifest-check': {
      script: 'validate-studio-manifest.mjs',
      desc: 'Validate the current repo STUDIO_MANIFEST.json',
      args: '[--json] [--path <relative-path>]',
      category: 'Protocol',
    },
    'test-model-router': {
      script: 'test-model-router.mjs',
      desc: 'Focused model-router test bench for routing, semantic cache, and telemetry behavior',
      category: 'Protocol',
    },
    'contracts': {
      script: 'generate-project-contracts.mjs',
      desc: 'Generate current repo integration contracts from STUDIO_MANIFEST.json',
      args: '[--json]',
      category: 'Protocol',
    },
    'automation-queue': {
      script: 'compile-automation-queue.mjs',
      desc: 'Compile portfolio/AUTOMATION_QUEUE.json from founder decisions and event bus inputs',
      args: '[--json]',
      category: 'Protocol',
    },
    'emit-event': {
      script: 'emit-studio-event.mjs',
      desc: 'Append a Studio Ops event to the portfolio event bus',
      args: '--type <type> --slug <slug> [--action <action>] [--signal "..."]',
      category: 'Protocol',
    },
    'biography': {
      script: 'render-protocol-biography.mjs',
      desc: 'Temporal protocol replay → docs/PROTOCOL_BIOGRAPHY.md',
      args: '[--project <path>] [--limit N]',
      category: 'Protocol',
    },
    'decision-graph': {
      script: 'render-decision-graph.mjs',
      desc: 'Causal decision graph (Mermaid DAG) → docs/DECISION_GRAPH.md',
      args: '[--project <path>] [--no-implicit]',
      category: 'Protocol',
    },
    'rank-tasks': {
      script: 'score-tasks.mjs',
      desc: 'Stake-weighted task prioritization from TASK_BOARD.md',
      args: '[--json] [--top N] [--bucket now|next|all]',
      category: 'Protocol',
    },
    'ask': {
      script: 'ask-protocol.mjs',
      desc: 'Protocol Oracle — ask questions about Studio OS (uses Claude API or keyword search)',
      args: '"question" | --search <term> | --list | --no-cache',
      category: 'Protocol',
    },
    'brainstorm-archive': {
      script: 'render-brainstorm-archive.mjs',
      desc: 'Analyze SIL brainstorm history — committed vs orphaned → docs/BRAINSTORM_ARCHIVE.md',
      category: 'Protocol',
    },
    'intent-history': {
      script: 'render-intent-history.mjs',
      desc: 'Session intent vs outcome history table → docs/INTENT_HISTORY.md',
      category: 'Protocol',
    },
    'protocol-changelog': {
      script: 'update-protocol-changelog.mjs',
      desc: 'Auto-append changelog entry if prompt/template files changed',
      args: '[--session N] [--summary "text"]',
      category: 'Protocol',
    },
    'loop-c': {
      script: 'run-loop-c.mjs',
      desc: 'Semantic decision pattern detector (local n-gram scan)',
      args: '[--threshold N] [--json] [--min-words N]',
      category: 'Protocol',
    },
    'studio-review-auto': {
      script: 'run-studio-review.mjs',
      desc: 'Autonomous portfolio health report → docs/STUDIO_REVIEW_AUTO_YYYY-MM.md',
      args: '[--month YYYY-MM] [--json]',
      category: 'Protocol',
    },
    'revenue-check': {
      script: 'check-revenue-freshness.mjs',
      desc: 'Check REVENUE_SIGNALS.md freshness (warns if > 7 days old)',
      args: '[--json]',
      category: 'Intelligence',
    },
    'revenue-update': {
      script: 'update-revenue-signals.mjs',
      desc: 'Interactive revenue data intake → portfolio/REVENUE_DATA.json + refreshes REVENUE_SIGNALS.md',
      args: '[--status] [--template] [--apply <file>] [--project <slug>]',
      category: 'Intelligence',
    },
    'ci-health': {
      script: 'check-ci-health.mjs',
      desc: 'CI failure root-cause sweep — scans all studioOsApplied repos for consistently failing workflows',
      args: '[--json] [--update-cockpit] [--project <slug>]',
      category: 'Intelligence',
    },
    'phantom-check': {
      script: 'check-phantom-blockers.mjs',
      desc: 'Phantom blocker detector — checks if Human Action Required items are already resolved',
      args: '[--json] [--verbose]',
      category: 'Intelligence',
    },
    'stale-tasks': {
      script: 'audit-stale-tasks.mjs',
      desc: 'Scan for stale TASK_BOARD items',
      category: 'Maintenance',
    },
    'batch-foundation': {
      script: 'batch-foundation.mjs',
      desc: 'Scan projects for missing/bootstrap-only SIL entries',
      args: '[--apply] [--project <slug>]',
      category: 'Maintenance',
    },
    'propagate-hooks': {
      script: 'propagate-hooks.mjs',
      desc: 'Deploy .claude/settings.json hooks to all repos',
      category: 'Maintenance',
    },
    'propagate': {
      script: 'run-template-propagation.mjs',
      desc: 'Run template propagation with local summary output',
      args: '[--apply] [--commit] [--push]',
      category: 'Maintenance',
    },
    'install-hooks': {
      script: 'install-hooks.mjs',
      desc: 'Install git hooks (pre-push secret scan) into current repo',
      args: '[--repo <path>]',
      category: 'Maintenance',
    },
    'soul-interview': {
      script: 'soul-interview.mjs',
      desc: 'Interactive 5-question CLI to write SOUL.md non-negotiables',
      category: 'Maintenance',
    },
    'resolve-blockers': {
      script: 'resolve-blockers.mjs',
      desc: 'Cross-repo blocker auto-resolver (stale locks, remote-ahead)',
      category: 'Maintenance',
    },
    'history-scan': {
      script: 'scan-git-history.mjs',
      desc: 'Scan full git history for accidentally committed secrets',
      args: '[--since <date>] [--repo <path>] [--json]',
      category: 'Security',
    },
    'dep-graph': {
      script: 'render-dependency-graph.mjs',
      desc: 'Cross-project service dependency graph → docs/DEPENDENCY_GRAPH.md',
      args: '[--json]',
      category: 'Intelligence',
    },
    'brainstorm-propose': {
      script: 'render-brainstorm-archive.mjs',
      desc: 'Propose top orphaned SIL brainstorm ideas as pre-drafted TASK_BOARD items',
      args: '--propose',
      extraArgs: ['--propose'],
      category: 'Protocol',
    },
    'agent-status': {
      script: 'show-agent-registry.mjs',
      desc: 'Show active concurrent agent sessions from AGENT_REGISTRY.json',
      category: 'Session',
    },
    'harden-workflows': {
      script: 'harden-workflow-permissions.mjs',
      desc: 'Add least-privilege permissions blocks to GitHub Actions workflows',
      args: '[--apply]',
      category: 'Security',
    },
    'harden-all-repos': {
      script: 'harden-all-repos.mjs',
      desc: 'Harden workflow permissions across ALL 24 child repos (reads PROJECT_REGISTRY)',
      args: '[--apply] [--apply --push]',
      category: 'Security',
    },
    'setup-shell': {
      script: 'setup-shell.sh',
      desc: 'One-time: add global `ops` alias + tab completion to your shell profile',
      args: '[--dry-run] [--zsh] [--bash]',
      runner: 'bash',
      category: 'Setup',
    },
    'session-mode': {
      script: 'detect-session-mode.mjs',
      desc: 'Classify current session as BUILDER or FOUNDER mode (v3.1)',
      args: '[--json] [--explain]',
      category: 'Session',
    },
    'pulse': {
      script: 'studio-pulse.mjs',
      desc: 'Studio Pulse — poll 25 projects, emit NDJSON events, detect anomalies (v3.1)',
      args: '[--watch] [--once] [--interval <sec>]',
      category: 'Intelligence',
    },
    'compact-handoff': {
      script: 'compact-handoff.mjs',
      desc: 'Compact LATEST_HANDOFF.md to ≤500 tokens via Haiku (cached 1h) (v3.1)',
      args: '[--force]',
      category: 'Session',
    },
    'lead-magnet': {
      script: 'generate-lead-magnet.mjs',
      desc: 'Draft SparkFunnel lead magnet + landing + emails + social posts for a project (v3.1)',
      args: '[--project <slug>]',
      category: 'Launch',
    },
  },
};
