#!/usr/bin/env node
/**
 * generate-announcement.mjs
 *
 * Auto-generates announcement copy for deployed-but-unannounced projects.
 * Reads PROJECT_REGISTRY.json for projects with launchStatus="deployed-unannounced",
 * reads each project's SOUL.md and PROJECT_BRIEF.md if accessible locally,
 * and produces ready-to-post announcement drafts:
 *   - X/Twitter post (280 chars max)
 *   - Reddit post (title + body)
 *   - Product Hunt tagline
 *
 * Saves to docs/launch/<slug>-announcement-draft.md
 *
 * Usage:
 *   node scripts/generate-announcement.mjs
 *   node scripts/generate-announcement.mjs --project <slug>
 *   node scripts/generate-announcement.mjs --list
 *   node scripts/generate-announcement.mjs --dry-run
 *   node scripts/ops.mjs announce [--project <slug>] [--list] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args        = process.argv.slice(2);
const listMode    = args.includes('--list');
const dryRun      = args.includes('--dry-run');
const projectIdx  = args.indexOf('--project');
const filterSlug  = projectIdx !== -1 ? args[projectIdx + 1] : null;
const today       = new Date().toISOString().slice(0, 10);

function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractSection(content, heading) {
  const parts = content.split(/^## /m);
  const match = parts.find(p => p.startsWith(heading));
  if (!match) return '';
  const nl = match.indexOf('\n');
  return nl === -1 ? '' : match.slice(nl + 1).trim();
}

function extractFirstPara(text) {
  return text.split(/\n\n+/)[0]?.replace(/^#+\s+[^\n]+\n/, '').replace(/\n/g, ' ').trim() ?? '';
}

// ── Reddit subreddit map by project type ─────────────────────────────────────
const SUBREDDITS = {
  game:         ['r/indiegaming', 'r/gamedev'],
  tool:         ['r/SideProject', 'r/webdev', 'r/programming'],
  app:          ['r/SideProject', 'r/webdev'],
  platform:     ['r/SideProject', 'r/webdev'],
  'browser-ext': ['r/SideProject', 'r/chrome'],
  default:      ['r/SideProject', 'r/webdev'],
};

// ── Project-specific context (fallback if SOUL/BRIEF not accessible) ─────────
const PROJECT_CONTEXT = {
  'mindframe': {
    type: 'app',
    tagline: 'AI-powered mental model builder for clear thinking',
    twitterHook: '🧠 MindFrame is live — build mental models, sharpen your thinking, and get AI feedback on your reasoning.',
    redditTitle: 'I built MindFrame — an AI tool to help you think more clearly through mental models',
    audience: 'people interested in productivity, decision-making, and clear thinking',
    subreddits: ['r/productivity', 'r/DecisionMaking', 'r/SideProject'],
  },
  'call-of-doodie': {
    type: 'game',
    tagline: 'Chaotic multiplayer browser game — no install needed',
    twitterHook: '🎮 Call of Doodie is live — a chaotic multiplayer browser game. Jump in, no install needed.',
    redditTitle: 'I made Call of Doodie — a free multiplayer browser game (no login required)',
    audience: 'casual gamers and browser game fans',
    subreddits: ['r/indiegaming', 'r/WebGames', 'r/gamedev'],
  },
  'football-gm': {
    type: 'game',
    tagline: 'Deep NFL GM simulation — build your dynasty in the browser',
    twitterHook: '🏈 VaultSpark Football GM is live — the deepest browser-based NFL GM sim. Build your dynasty.',
    redditTitle: 'I built a deep NFL GM simulation game — free, runs in your browser',
    audience: 'NFL fans, football strategy fans',
    subreddits: ['r/nfl', 'r/football', 'r/indiegaming'],
  },
  'gridiron-gm-play': {
    type: 'game',
    tagline: 'Play-style football GM — call every play from the sideline',
    twitterHook: '🏈 Gridiron GM Play is live — call plays, manage your team, and win the championship.',
    redditTitle: 'I built a football GM game where you actually call the plays — free browser game',
    audience: 'football fans, strategy game fans',
    subreddits: ['r/football', 'r/indiegaming', 'r/SideProject'],
  },
  'velaxis': {
    type: 'tool',
    tagline: 'Real-time crypto dashboard — all your signals in one tab',
    twitterHook: '📊 Velaxis is live — a real-time crypto dashboard with 8 data tabs, alerts, and optional AI analysis.',
    redditTitle: 'I built Velaxis — a free real-time crypto dashboard (no backend, all client-side)',
    audience: 'crypto traders and investors',
    subreddits: ['r/CryptoCurrency', 'r/algotrading', 'r/SideProject'],
  },
  'promogrind': {
    type: 'tool',
    tagline: 'Sports betting promo tracker — find +EV offers fast',
    twitterHook: '📈 PromoGrind is live — track sports betting promos, find +EV offers, and maximize your edges.',
    redditTitle: 'I built PromoGrind — a free tool to track sports betting promos and find +EV offers',
    audience: 'sports bettors, +EV bettors',
    subreddits: ['r/sportsbook', 'r/SideProject', 'r/dfs'],
  },
  'vorn': {
    type: 'platform',
    tagline: 'Social bookmarking platform — save, tag, and share what matters',
    twitterHook: '🔖 Vorn is live — a social bookmarking platform to save, tag, and share the content that matters to you.',
    redditTitle: 'I built Vorn — a social bookmarking platform (open for signups)',
    audience: 'people who curate and save content online',
    subreddits: ['r/SideProject', 'r/webdev', 'r/productivity'],
  },
};

// ── Load registry ─────────────────────────────────────────────────────────────
const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
const unannounced = registry.projects.filter(p => {
  if (p.launchStatus !== 'deployed-unannounced') return false;
  if (filterSlug && p.slug !== filterSlug) return false;
  return true;
});

if (listMode) {
  console.log(`\nDeployed-unannounced projects (${unannounced.length}):\n`);
  unannounced.forEach((p, i) => console.log(`  ${i + 1}. ${p.slug}  —  ${p.name}  (${p.liveUrl || p.runtimeUrl || 'no URL'})`));
  console.log('\nRun without --list to generate drafts for all, or use --project <slug> for one.\n');
  process.exit(0);
}

if (unannounced.length === 0) {
  console.log(filterSlug
    ? `No deployed-unannounced project found with slug "${filterSlug}".`
    : 'No deployed-unannounced projects found in registry.');
  process.exit(0);
}

// ── Generate draft for each project ──────────────────────────────────────────
const outputDir = path.join(ROOT, 'docs', 'launch');
if (!dryRun) fs.mkdirSync(outputDir, { recursive: true });

const generated = [];

for (const project of unannounced) {
  const slug = project.slug;
  const ctx = PROJECT_CONTEXT[slug];
  const liveUrl = project.liveUrl || project.runtimeUrl || 'https://vaultsparkstudios.com/';
  const name = project.name;

  // Try to read SOUL.md and PROJECT_BRIEF.md for richer copy
  const localPath = project.localPath?.replace(/\\/g, '/');
  const soul  = localPath ? readText(path.join(localPath, 'context', 'SOUL.md')) : '';
  const brief = localPath ? readText(path.join(localPath, 'context', 'PROJECT_BRIEF.md')) : '';

  const soulNonNeg = extractSection(soul, 'Non-Negotiables') || extractSection(soul, 'Core Identity');
  const briefPitch = brief ? extractFirstPara(brief) : '';
  const summary = project.summary || briefPitch || ctx?.tagline || `${name} is now live.`;

  const subreddits = ctx?.subreddits ?? SUBREDDITS[ctx?.type ?? 'default'] ?? SUBREDDITS.default;

  // ── X/Twitter ───────────────────────────────────────────────────────────────
  const twitterHook = ctx?.twitterHook ?? `🚀 ${name} is live — ${(ctx?.tagline || summary).slice(0, 180)}`;
  const twitterPost = `${twitterHook}

${liveUrl}

#VaultSpark ${ctx?.type === 'game' ? '#indiegame #gamedev' : '#buildinpublic #SideProject'}`;

  // ── Reddit ───────────────────────────────────────────────────────────────────
  const redditTitle = ctx?.redditTitle ?? `I built ${name} — ${(ctx?.tagline || summary).slice(0, 100)}`;
  const redditBody = `Hey everyone,

I've been working on **${name}** for a while and just shipped it publicly. Here's what it is:

${summary}

**Live at:** ${liveUrl}

${soulNonNeg ? `**What makes it different:**\n${soulNonNeg.split('\n').slice(0, 3).map(l => `- ${l.replace(/^[-*•]\s*/, '').trim()}`).filter(l => l.length > 2).join('\n')}\n` : ''}Would love to get feedback from the community. What do you think?

Built by [VaultSpark Studios](https://vaultsparkstudios.com/)`;

  // ── Product Hunt ─────────────────────────────────────────────────────────────
  const phTagline = ctx?.tagline ?? summary.slice(0, 60);
  const phDescription = `${summary}

Built with care by VaultSpark Studios. Free to use at ${liveUrl}`;

  // ── Screenshot checklist ──────────────────────────────────────────────────────
  const screenshotChecklist = [
    `[ ] Hero / landing page (1280×800)`,
    `[ ] Core feature in action`,
    `[ ] Mobile view (375×812)`,
    ctx?.type === 'game' ? `[ ] Gameplay screenshot or GIF` : `[ ] Dashboard or main view`,
    `[ ] Any social proof or stats if available`,
  ];

  // ── Compile the draft ─────────────────────────────────────────────────────────
  const draft = `# Announcement Draft — ${name}

> Generated: ${today} by scripts/generate-announcement.mjs
> Live URL: ${liveUrl}
> Subreddits: ${subreddits.join(', ')}

---

## Screenshot Checklist

${screenshotChecklist.join('\n')}

---

## X / Twitter

> Max 280 characters. Copy-paste, add screenshot(s), post.

\`\`\`
${twitterPost}
\`\`\`

**Character count:** ~${twitterPost.replace(/\n/g, ' ').length}

---

## Reddit

> Post to: ${subreddits.join(' · ')}

**Title:**
\`\`\`
${redditTitle}
\`\`\`

**Body:**
\`\`\`
${redditBody}
\`\`\`

---

## Product Hunt

**Tagline (max 60 chars):**
\`\`\`
${phTagline}
\`\`\`

**Description:**
\`\`\`
${phDescription}
\`\`\`

---

## Post-Announcement Actions

- [ ] Update \`launchStatus\` → \`announced\` in \`portfolio/PROJECT_REGISTRY.json\`
- [ ] Open SPARKED transition ticket in Studio Hub if metrics warrant it
- [ ] Monitor for first comments/feedback (24h window)
- [ ] Log any engagement data in the project's CREATIVE_DIRECTION_RECORD.md
`;

  const outPath = path.join(outputDir, `${slug}-announcement-draft.md`);

  if (dryRun) {
    console.log(`[dry-run] Would write: ${outPath}`);
    console.log('---');
    console.log(draft.slice(0, 300) + '...\n');
  } else {
    fs.writeFileSync(outPath, draft);
    generated.push({ slug, name, outPath: outPath.replace(ROOT + path.sep, ''), liveUrl });
    console.log(`✓  ${slug}  →  ${outPath.replace(ROOT + path.sep, '')}`);
  }
}

if (!dryRun && generated.length > 0) {
  console.log(`\n✓ ${generated.length} announcement draft(s) written to docs/launch/`);
  console.log(`\nNext steps:`);
  console.log(`  1. Take screenshots for each project (use the checklist in each draft)`);
  console.log(`  2. Paste X post + screenshot → post`);
  console.log(`  3. Paste Reddit title + body → post to listed subreddits`);
  console.log(`  4. Update launchStatus → "announced" in portfolio/PROJECT_REGISTRY.json`);
  console.log(`  5. Run: node scripts/ops.mjs registry  (regenerate PROJECT_REGISTRY.md)\n`);
}
