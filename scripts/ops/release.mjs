/**
 * scripts/ops/release.mjs — release + launch ops commands (S79)
 */

export default {
  category: 'Release',
  commands: {
    'launch-ready': {
      script: 'check-launch-ready.mjs',
      desc: 'Go/no-go release readiness check',
    },
    'announce-setup': {
      script: 'announce-setup.mjs',
      desc: 'Configure social credentials for announce workflow',
    },
    'generate-announcement': {
      script: 'generate-announcement.mjs',
      desc: 'Draft announcement across X + Reddit + Discord + TikTok',
    },
    'post-announcement': {
      script: 'post-announcement.mjs',
      desc: 'Post announcement via configured channels',
    },
    'capacity-planner': {
      script: 'render-capacity-planner.mjs',
      desc: 'Capacity-aware platform planner',
    },
    'sanitization-status': {
      script: 'render-sanitization-status.mjs',
      desc: 'Sanitization status per public repo',
    },
  },
};
