/**
 * scripts/ops/compliance.mjs — compliance + governance ops commands (S79)
 */

export default {
  category: 'Compliance',
  commands: {
    'validate': {
      script: 'validate-compliance.mjs',
      desc: 'Validate semantic compliance drift',
      args: '[--project <slug>] [--json] [--ci] [--strict]',
    },
    'compliance-velocity': {
      script: 'track-compliance-velocity.mjs',
      desc: 'Track compliance pass-rate history',
      args: '[--json] [--no-write]',
    },
    'canon-check': {
      script: 'check-canon-compliance.mjs',
      desc: 'CANON-006 / 007 / 008 compliance audit',
    },
    'branding': {
      script: 'check-branding-compliance.mjs',
      desc: 'CANON-006 branding link audit',
    },
    'branding-drift': {
      script: 'check-branding-drift.mjs',
      desc: 'Audit brandingRequired drift vs audience/lifecycle rules',
      args: '[--summary] [--json]',
    },
    'sanitize-scan': {
      script: 'check-public-repo-sanitization.mjs',
      desc: 'Public-repo sanitization scan',
      args: '[--summary] [--only-problematic] [--json]',
    },
    'rollout-scoreboard': {
      script: 'render-rollout-scoreboard.mjs',
      desc: 'Manifest + runtime-pack adoption scoreboard',
    },
    'release-gate': {
      script: 'check-release-gate.mjs',
      desc: 'Pre-release readiness gate',
    },
    'foundation-ready': {
      script: 'check-foundation-ready.mjs',
      desc: 'Foundation readiness check (Type B)',
    },
  },
};
