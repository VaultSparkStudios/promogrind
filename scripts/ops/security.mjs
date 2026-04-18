/**
 * scripts/ops/security.mjs — secrets + access + security ops commands (S79)
 */

export default {
  category: 'Security',
  commands: {
    'check-secrets': {
      script: 'check-secrets.mjs',
      desc: 'Capability readiness audit',
      args: '[--for <capability>] [--audit] [--json]',
    },
    'credentials': {
      script: 'credential-intake.mjs',
      desc: 'Structured credential intake checklist',
      args: '[--json]',
    },
    'blocker-preflight': {
      script: 'blocker-preflight.mjs',
      desc: 'Attempt elevated/admin actions before escalating',
    },
    'scan-secrets': {
      script: 'scan-secrets.mjs',
      desc: 'Pre-commit / pre-push secret scanner (S79)',
      args: '[--staged] [--all] [<path>] [--json]',
    },
    'sanitize-untrack': {
      script: 'apply-sanitization-untrack.mjs',
      desc: 'Preserve local files while untracking public-risk files from repos flagged by latest sanitization audit',
      args: '[--apply] [--json] [--only=slug1,slug2]',
    },
    'access-anomalies': {
      script: 'check-access-anomalies.mjs',
      desc: 'Access-ledger tripwire scan (S79)',
      args: '[--window <hours>] [--json]',
    },
    'security-policy': {
      script: 'render-security-policy-engine.mjs',
      desc: 'Render security trust tiers, action classes, and credential freshness',
      args: '[--json]',
    },
    'credential-aging': {
      script: 'render-credential-aging-dashboard.mjs',
      desc: 'Render credential aging and missing capability dashboard',
      args: '[--json]',
    },
    'policy-fetch': {
      script: 'policy-fetch.mjs',
      desc: 'Skill-based policy/canon pull from studio-ops (S79)',
      args: '[--policy <name>] [--force] [--offline]',
    },
    'harden-repos': {
      script: 'harden-all-repos.mjs',
      desc: 'Apply security hardening across all repos',
    },
    'rotate-render-key': {
      script: 'rotate-render-key.mjs',
      desc: 'Rotate Render API key',
    },
  },
};
