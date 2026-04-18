/**
 * scripts/ops/session.mjs — session-scoped ops commands (S79)
 *
 * Subset of ops.mjs COMMANDS registry, grouped under "Session".
 * All scripts continue to live at scripts/<name>.mjs — this module
 * only owns the metadata.
 */

export default {
  category: 'Session',
  commands: {
    'doctor': {
      script: 'run-doctor.mjs',
      desc: 'Full studio health check — runs all validators in sequence',
      args: '[--json] [--update-json] [--fix] [--loop]',
    },
    'watch': {
      script: 'ops-watch.mjs',
      desc: 'Live studio health monitor — reruns doctor + cockpit every 30s',
      args: '[--interval <seconds>]',
    },
    'genius-list': {
      script: 'generate-genius-list.mjs',
      desc: 'Pattern-based genius hit list — project-aware or founder-scope recommendations',
      args: '[--json] [--brief] [--top N] [--portfolio] [--project <slug|path>] [--local-only]',
    },
    'genius-unified': {
      script: 'rank-with-ignis.mjs',
      desc: 'Unified Genius List v2 — ranked via IGNIS (or deterministic fallback)',
      args: '[--json] [--top N]',
    },
    'preload': {
      script: 'preload-taskboard.mjs',
      desc: 'Pre-load session priorities from LATEST_HANDOFF + TASK_BOARD',
    },
    'startup-brief': {
      script: 'render-startup-brief.mjs',
      desc: 'Pre-render startup brief → docs/STARTUP_BRIEF.md',
      args: '[--stdout]',
    },
    'fast-start': {
      script: 'render-fast-start.mjs',
      desc: 'Token-light startup surface for founder-scale sessions',
      args: '[--json] [--stdout]',
    },
    'protocol-doctor': {
      script: 'protocol-doctor.mjs',
      desc: 'Single protocol activation gate: skills, MCP, session identity, canon, validators',
      args: '[--json]',
    },
    'register-local-mcp': {
      script: 'register-local-mcp.mjs',
      desc: 'Register local Studio Ops MCP server in Claude and Codex configs',
      args: '[--dry-run] [--json]',
    },
    'closeout-summary': {
      script: 'closeout-summary.mjs',
      desc: 'Deterministic closeout ledger: writebacks, board counts, memory, branch/SHA/push state',
      args: '[--json] [--project <path>] [--pushed yes|no|dry-run] [--message "..."]',
    },
    'cockpit': {
      script: 'render-ops-cockpit.mjs',
      desc: 'Render local ops cockpit → docs/OPS_COCKPIT.md',
      args: '[--json]',
    },
    'cache-ledger': {
      script: 'render-cache-ledger.mjs',
      desc: 'Claude API cache-hit + cost-savings ledger',
      args: '[--json] [--snapshot] [--days N]',
    },
    'action-queue': {
      script: 'render-action-queue.mjs',
      desc: 'Execution-first action queue',
    },
    'intent-plan': {
      script: 'render-session-intent-plan.mjs',
      desc: 'Session intent → scope cap, likely blockers, repo touch set',
    },
    'human-pressure': {
      script: 'render-human-action-pressure.mjs',
      desc: 'Human-action pressure ranking',
    },
    'skill-doctor': {
      script: 'skill-doctor.mjs',
      desc: 'Audit Claude skills + slash commands against SESSION_PROTOCOL.md',
      args: '[--json] [--strict]',
    },
    'session-lease': {
      script: 'session-lease.mjs',
      desc: 'Acquire / heartbeat / release / inspect session lease state for the current repo',
      args: 'status|acquire|heartbeat|release [--agent <id>] [--owner <id>] [--ttl-min <n>] [--note "..."] [--json]',
    },
    'orchestrator': {
      script: 'render-studio-orchestrator.mjs',
      desc: 'Founder-scale runtime/router surface across local work, owner blockers, Codex lane, and automation',
      args: '[--json]',
    },
    'hot-swap-test': {
      script: 'test-hot-swap.mjs',
      desc: 'Claude↔Codex AGENT_STATE parity harness',
      args: '[--json]',
    },
    'brief-golden-test': {
      script: 'test-brief-golden.mjs',
      desc: 'Golden tests for startup/closeout brief consistency',
      args: '[--json]',
    },
    'validate-brief-format': {
      script: 'validate-brief-format.mjs',
      desc: 'Canonical-format gate for docs/STARTUP_BRIEF.md — fails if required blocks are missing or drift markers (deprecated buckets, non-canonical sections) are present. Runs at every /start and in CI to prevent agent-improvised brief formats from drifting across 27 repos.',
      args: '[<path>] [--json] [--stdin]',
    },
    'test-validate-brief-format': {
      script: 'test-validate-brief-format.mjs',
      desc: 'Regression harness for the startup brief validator',
      args: '[--json]',
    },
    'validate-closeout-board-format': {
      script: 'validate-closeout-board-format.mjs',
      desc: 'Canonical-format gate for closeout STATUS BOARD output',
      args: '[<path>] [--json] [--stdin]',
    },
    'test-validate-closeout-board-format': {
      script: 'test-validate-closeout-board-format.mjs',
      desc: 'Regression harness for the closeout status-board validator',
      args: '[--json]',
    },
    'test-meaningful-diff': {
      script: 'test-meaningful-diff.mjs',
      desc: 'Regression harness for timestamp-stripping meaningful diff checks',
      args: '[--json]',
    },
    'studio-status': {
      script: 'studio-conductor.mjs',
      desc: 'Multi-session portfolio status (S79)',
      args: '[--brief] [--json] [--conflicts]',
    },
  },
};
