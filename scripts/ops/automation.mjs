/**
 * scripts/ops/automation.mjs — session automation ops commands (S79)
 */

export default {
  category: 'Automation',
  commands: {
    'closeout': {
      script: 'closeout-autopilot.mjs',
      desc: 'Closeout autopilot — doctor + write-back + confirm + commit + push',
      args: '[--dry-run] [--skip-push] [--message <msg>]',
    },
    'validate-agent-dna': {
      script: 'validate-agent-dna.mjs',
      desc: 'Validate every agents/dna/*.json against AgentDNA schema + cross-file rules (call_sign uniqueness, public-bio sanitization, trust-tier constraints).',
      args: '[<file>] [--json]',
    },
    'compile-managed-agents': {
      script: 'compile-managed-agents.mjs',
      desc: 'Compile agents/dna/*.json (runtime=claude-managed) into Anthropic Managed Agent YAML at agents/managed/*.yaml. Idempotent.',
      args: '[--agent <call_sign>]',
    },
    'register-managed-agents': {
      script: 'register-managed-agents.mjs',
      desc: 'Idempotent create/update loop — registers compiled YAMLs on Anthropic via `ant beta:agents create|update`. Writes portfolio/MANAGED_AGENT_IDS.json. Requires ANTHROPIC_API_KEY + ant CLI on PATH.',
      args: '[--apply] [--only=callSign1,callSign2]',
    },
    'render-agent-roster': {
      script: 'render-agent-roster.mjs',
      desc: 'Render portfolio/AGENT_ROSTER.md + portfolio/compiled/AGENT_ROSTER.json from DNA + AGENT_COSTS telemetry.',
      args: '[--json-only]',
    },
    'mint-mcp-token': {
      script: 'mint-mcp-token.mjs',
      desc: 'Mint a signed bearer token for a given agent DNA (requires STUDIO_OPS_MCP_SIGNING_KEY).',
      args: '--agent <call_sign> [--ttl-days <n>]',
    },
    'agent-budget-warden': {
      script: 'agent-budget-warden.mjs',
      desc: 'Poll agent spend vs ceiling; at ≥150% of daily ceiling, pause the agent. Writes portfolio/AGENT_COSTS.json.',
      args: '[--source=local|anthropic] [--apply] [--json]',
    },
    'sync-to-vorn': {
      script: 'sync-to-vorn.mjs',
      desc: 'Register/update Studio Ops agents with vorn_public=true on joinvorn.com via @joinvorn/agent-sdk payload shape.',
      args: '[--apply] [--json]',
    },
    'test-agent-auth': {
      script: 'test-agent-auth.mjs',
      desc: 'Regression tests for MCP bearer auth + trust-tier tool gating.',
    },
    'onboard': {
      script: 'ops-onboard.mjs',
      desc: 'Initiate v3 bootstrap / adopt / repair a project from runtime-pack + templates + contracts',
      args: '[--slug <s>] [--bootstrap | --repair | --adopt] [--target-path <path>]',
    },
    'onboard-retry': {
      script: 'onboard-retry-remote.mjs',
      desc: 'Retry onboard --repair on locked/incomplete pilot repos via GH_TOKEN (autonomous unlock of the 4-locked-pilot gap)',
      args: '[--dry-run] [--only=slug1,slug2]',
    },
    'ignis-rank-server': {
      script: 'ignis-rank-server.mjs',
      desc: 'Live IGNIS rank HTTP service — signal-aware scoring for Unified Genius List. Set IGNIS_MCP_URL to flip adapter from fallback to live.',
      args: '[--port <n>] [--probe]',
    },
    'ignis-rank-selftest': {
      script: 'ignis-rank-selftest.mjs',
      desc: 'End-to-end self-test for the IGNIS rank service — spawns the server on an ephemeral port, round-trips /rank, then verifies the adapter flips to `ignisSource: "live"`. Exits non-zero on contract drift.',
    },
    'pattern-memory': {
      script: 'pattern-memory.mjs',
      desc: 'Auto-write `project` memory entries for genius-list categories that recur in the top-N for N consecutive sessions — reduces cold-start forgetting across 27 repos.',
      args: '[--threshold <n>] [--top <n>] [--dry-run]',
    },
    'runtime-pack': {
      script: 'runtime-pack.mjs',
      desc: 'Generate runtime-pack outputs for a project',
    },
    'intake-credentials': {
      script: 'credential-intake.mjs',
      desc: 'Guided credential intake wizard',
    },
    'ingest-engagement': {
      script: 'ingest-engagement-event.mjs',
      desc: 'Append engagement event to portfolio feed (S79)',
      args: '--project <s> --type <t> [--source <s>] [--amount <n>] | --stdin | --summary',
    },
    'studio-conductor': {
      script: 'studio-conductor.mjs',
      desc: 'Multi-session orchestrator — refresh ACTIVE_SESSIONS.json (S79)',
      args: '[--refresh] [--brief] [--json] [--conflicts]',
    },
    'propagate-templates': {
      script: 'propagate-templates.sh',
      desc: 'Legacy file-copy propagation (use policy-fetch for S79+ pull-model)',
      args: '[--apply] [--dry-run]',
      shell: true,
    },
  },
};
