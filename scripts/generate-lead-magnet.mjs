#!/usr/bin/env node
/**
 * generate-lead-magnet.mjs — SparkFunnel lead-magnet bootstrap (v3.1)
 *
 * For a given project slug, drafts:
 *   - 3 headline variants (for A/B testing)
 *   - A landing-page React component
 *   - A 5-email nurture sequence
 *   - 6 tracked social posts (Reddit + X variants)
 *
 * Uses project's SOUL.md + PROJECT_BRIEF.md as voice source. Output goes to
 * `spark-funnel/magnets/<slug>/` — review, edit, ship.
 *
 * Usage:
 *   node scripts/ops.mjs lead-magnet --project velaxis
 *   node scripts/ops.mjs lead-magnet --project call-of-doodie
 */

import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { MODELS, callClaude, withLongCache, logMetrics } from './lib/model-router.mjs';
import { getSecret } from './lib/secrets.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');

const args = process.argv.slice(2);
const projectIdx = args.indexOf('--project');
const slug = projectIdx >= 0 ? args[projectIdx + 1] : null;

if (!slug) {
  console.error('Usage: node scripts/ops.mjs lead-magnet --project <slug>');
  process.exit(1);
}

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

const registry = readJson(REGISTRY, { projects: [] });
const project = (registry.projects || []).find(p => p.slug === slug);
if (!project) { console.error(`Project "${slug}" not found in registry.`); process.exit(1); }

const soul = project.localPath ? readText(path.join(project.localPath, 'context', 'SOUL.md')) : '';
const brief = project.localPath ? readText(path.join(project.localPath, 'context', 'PROJECT_BRIEF.md')) : '';

const apiKey = getSecret('ANTHROPIC_API_KEY', 'claude.api');
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY missing — add to secrets or shell env.');
  process.exit(1);
}

const outDir = path.join(ROOT, 'spark-funnel', 'magnets', slug);
fs.mkdirSync(outDir, { recursive: true });

const systemStable = withLongCache({
  type: 'text',
  text: `You are SparkFunnel's lead-magnet copywriter for VaultSpark Studios. You write in the project's own voice using its SOUL and BRIEF as guidance. You never use generic marketing copy. Dark patterns forbidden. Every piece is specific, grounded, honest.

Output format (strict):
# HEADLINES (3 variants)
1. ...
2. ...
3. ...

# LANDING PAGE (React/Next.js component code)
\`\`\`tsx
export default function MagnetPage() { ... }
\`\`\`

# EMAIL SEQUENCE (5 emails)
## Email 1 — subject, preview, body
## Email 2 — ...
...

# SOCIAL POSTS (6)
## Reddit (3 subreddits + copy)
## X/Twitter (3 variants, ≤280 chars each)
`,
});

const userPrompt = `Project: ${project.name} (${project.slug})
Type: ${project.type}
Live URL: ${project.liveUrl || 'pending'}
GitHub: ${project.github || 'n/a'}

=== SOUL.md ===
${soul.slice(0, 3000) || '(not available)'}

=== PROJECT_BRIEF.md (first 3k chars) ===
${brief.slice(0, 3000) || '(not available)'}

Draft the full lead magnet package. Be specific to this project's voice. No generic SaaS phrasing.`;

console.log(`→ Generating lead magnet for ${slug}…`);
const resp = await callClaude({
  apiKey,
  model: MODELS.sonnet,
  maxTokens: 4000,
  system: [systemStable],
  messages: [{ role: 'user', content: userPrompt }],
}, https);

logMetrics({ script: 'generate-lead-magnet', model: MODELS.sonnet, usage: resp.usage, mode: slug });

const text = resp.content?.map(c => c.text || '').join('') || '';
if (!text) { console.error('Empty response from Claude.'); process.exit(1); }

fs.writeFileSync(path.join(outDir, 'MAGNET.md'), `# Lead Magnet — ${project.name}\n\n<!-- generated ${new Date().toISOString()} via Sonnet 4.6 -->\n\n${text}\n`);
console.log(`✓ Draft → spark-funnel/magnets/${slug}/MAGNET.md`);
console.log(`  Tokens: input ${resp.usage?.input_tokens || 0}  output ${resp.usage?.output_tokens || 0}  cache_read ${resp.usage?.cache_read_input_tokens || 0}`);
console.log(`  Review + edit, then run capture widget build to ship.`);
