#!/usr/bin/env node
/**
 * post-announcement.mjs
 *
 * Option A — Social Platform Posting Bot.
 * Posts pre-generated announcement drafts from docs/launch/<slug>-announcement-draft.md
 * to Reddit and/or X (Twitter) for deployed-unannounced projects.
 *
 * Default mode is --dry-run (shows what would be posted; no API calls).
 * Pass --live to actually post. Reads credentials from secrets/social.env.
 * Tracks post history in docs/launch/post-log.json to prevent double-posting.
 * On successful post, updates launchStatus → "announced" in PROJECT_REGISTRY.json.
 *
 * Usage:
 *   node scripts/post-announcement.mjs                          # dry-run all
 *   node scripts/post-announcement.mjs --project <slug>         # dry-run one
 *   node scripts/post-announcement.mjs --platform reddit        # reddit only
 *   node scripts/post-announcement.mjs --platform twitter       # twitter only
 *   node scripts/post-announcement.mjs --live                   # actually post
 *   node scripts/post-announcement.mjs --live --project <slug>  # post one live
 *   node scripts/post-announcement.mjs --status                 # show post log
 *   node scripts/ops.mjs post-announcement [args...]
 *
 * Required credentials in secrets/social.env (--live mode):
 *   Reddit:  REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD
 *   Twitter: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Arg parsing ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const isLive    = argv.includes('--live');
const statusMode = argv.includes('--status');
const dryRun    = !isLive;

const projectIdx  = argv.indexOf('--project');
const filterSlug  = projectIdx !== -1 ? argv[projectIdx + 1] : null;

const platformIdx = argv.indexOf('--platform');
const platformArg = platformIdx !== -1 ? argv[platformIdx + 1]?.toLowerCase() : 'both';
const postReddit  = platformArg === 'both' || platformArg === 'reddit';
const postTwitter = platformArg === 'both' || platformArg === 'twitter';

// ── Helpers ───────────────────────────────────────────────────────────────────
function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function readJson(p, fb = {}) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

function loadEnvFile(p) {
  const env = {};
  const text = readText(p);
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
  return env;
}

/** Extract a named section from a Markdown draft file */
function extractSection(text, heading) {
  const lines = text.split('\n');
  let inSection = false;
  const out = [];
  for (const line of lines) {
    if (line.startsWith('## ') && line.includes(heading)) { inSection = true; continue; }
    if (inSection && line.startsWith('## ')) break;
    if (inSection) out.push(line);
  }
  return out.join('\n').trim();
}

/** Extract first fenced code block content from a section string */
function extractCodeBlock(text) {
  const match = text.match(/```[^\n]*\n([\s\S]*?)```/);
  return match ? match[1].trim() : text.replace(/^#+.*$/mg, '').trim();
}

/** Extract all listed subreddits from the draft */
function extractSubreddits(text) {
  const sectionText = extractSection(text, 'Reddit');
  const postToLine = sectionText.match(/Post to:\s*(.*)/i);
  if (!postToLine) return ['r/SideProject'];
  return postToLine[1].split(/[,·]+/).map(s => s.trim()).filter(Boolean);
}

// ── Load post log (tracks what has already been posted) ───────────────────────
const POST_LOG_PATH = path.join(ROOT, 'docs', 'launch', 'post-log.json');
const postLog = readJson(POST_LOG_PATH, { posts: [] });

function alreadyPosted(slug, platform, subreddit = null) {
  return postLog.posts.some(p =>
    p.slug === slug &&
    p.platform === platform &&
    (!subreddit || p.subreddit === subreddit) &&
    p.status === 'success'
  );
}

function logPost(entry) {
  postLog.posts.push({ ...entry, timestamp: new Date().toISOString() });
  fs.mkdirSync(path.dirname(POST_LOG_PATH), { recursive: true });
  writeJson(POST_LOG_PATH, postLog);
}

// ── Status mode ───────────────────────────────────────────────────────────────
if (statusMode) {
  console.log('\n╔══ POST LOG STATUS ════════════════════════════════════════╗');
  if (postLog.posts.length === 0) {
    console.log('║  No posts recorded yet.                                   ║');
  } else {
    const bySlug = {};
    for (const p of postLog.posts) {
      if (!bySlug[p.slug]) bySlug[p.slug] = [];
      bySlug[p.slug].push(p);
    }
    for (const [slug, posts] of Object.entries(bySlug)) {
      console.log(`║  ${slug}`);
      for (const p of posts) {
        const icon = p.status === 'success' ? '✓' : '⛔';
        const target = p.subreddit || p.platform;
        console.log(`║    ${icon} ${p.platform.padEnd(8)} ${target.padEnd(25)} ${p.timestamp.slice(0,10)}`);
      }
    }
  }
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  process.exit(0);
}

// ── Load credentials (only needed for --live) ──────────────────────────────────
let CREDS = {};
if (isLive) {
  const socialEnv = path.join(ROOT, 'secrets', 'social.env');
  if (!fs.existsSync(socialEnv)) {
    console.error(`\n⛔  secrets/social.env not found.`);
    console.error(`    Create it with the following variables:\n`);
    console.error(`    # Reddit`);
    console.error(`    REDDIT_CLIENT_ID=<your-script-app-client-id>`);
    console.error(`    REDDIT_CLIENT_SECRET=<your-script-app-client-secret>`);
    console.error(`    REDDIT_USERNAME=<your-reddit-username>`);
    console.error(`    REDDIT_PASSWORD=<your-reddit-password>`);
    console.error(`    REDDIT_USER_AGENT=node:vaultspark-announcer:v1.0 (by /u/<username>)\n`);
    console.error(`    # X (Twitter)`);
    console.error(`    TWITTER_API_KEY=<consumer-key>`);
    console.error(`    TWITTER_API_SECRET=<consumer-secret>`);
    console.error(`    TWITTER_ACCESS_TOKEN=<user-access-token>`);
    console.error(`    TWITTER_ACCESS_TOKEN_SECRET=<user-access-token-secret>\n`);
    console.error(`    See secrets/SOCIAL_CREDENTIALS_TEMPLATE.md for setup instructions.\n`);
    process.exit(1);
  }
  CREDS = { ...process.env, ...loadEnvFile(socialEnv) };
}

// ── HTTPS helpers ─────────────────────────────────────────────────────────────
function httpsRequest(opts, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Reddit API ────────────────────────────────────────────────────────────────
async function redditGetToken(creds) {
  const auth = Buffer.from(`${creds.REDDIT_CLIENT_ID}:${creds.REDDIT_CLIENT_SECRET}`).toString('base64');
  const body = `grant_type=password&username=${encodeURIComponent(creds.REDDIT_USERNAME)}&password=${encodeURIComponent(creds.REDDIT_PASSWORD)}`;
  const res = await httpsRequest({
    hostname: 'www.reddit.com',
    path: '/api/v1/access_token',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': creds.REDDIT_USER_AGENT || 'node:vaultspark-announcer:v1.0',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);

  if (res.status !== 200) throw new Error(`Reddit auth failed (${res.status}): ${res.body}`);
  const json = JSON.parse(res.body);
  if (!json.access_token) throw new Error(`Reddit auth: no access_token — ${res.body}`);
  return json.access_token;
}

async function redditSubmit(token, subreddit, title, text, creds) {
  const sr = subreddit.replace(/^r\//, '');
  const body = new URLSearchParams({
    kind: 'self',
    sr,
    title,
    text,
    api_type: 'json',
    resubmit: 'true',
  }).toString();

  const res = await httpsRequest({
    hostname: 'oauth.reddit.com',
    path: '/api/submit',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': creds.REDDIT_USER_AGENT || 'node:vaultspark-announcer:v1.0',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);

  const json = JSON.parse(res.body);
  const errors = json?.json?.errors;
  if (errors && errors.length > 0) throw new Error(`Reddit submit error: ${JSON.stringify(errors)}`);
  const postUrl = json?.json?.data?.url;
  return { url: postUrl || `https://reddit.com/r/${sr}` };
}

// ── Twitter OAuth 1.0a ─────────────────────────────────────────────────────────
function oauthSign(method, url, params, consumerSecret, tokenSecret) {
  const sorted = Object.keys(params).sort().map(k =>
    `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`
  ).join('&');
  const base = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sorted)}`;
  const key = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', key).update(base).digest('base64');
}

function buildOAuthHeader(method, url, creds) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const ts = Math.floor(Date.now() / 1000).toString();

  const params = {
    oauth_consumer_key:     creds.TWITTER_API_KEY,
    oauth_nonce:            nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        ts,
    oauth_token:            creds.TWITTER_ACCESS_TOKEN,
    oauth_version:          '1.0',
  };

  params.oauth_signature = oauthSign(
    method, url, params,
    creds.TWITTER_API_SECRET,
    creds.TWITTER_ACCESS_TOKEN_SECRET
  );

  const header = 'OAuth ' + Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ');

  return header;
}

async function twitterPost(text, creds) {
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text });
  const authHeader = buildOAuthHeader('POST', url, creds);

  const res = await httpsRequest({
    hostname: 'api.twitter.com',
    path: '/2/tweets',
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);

  if (res.status >= 400) throw new Error(`Twitter post failed (${res.status}): ${res.body}`);
  const json = JSON.parse(res.body);
  const tweetId = json?.data?.id;
  return { id: tweetId, url: tweetId ? `https://twitter.com/i/web/status/${tweetId}` : 'https://twitter.com' };
}

// ── Load registry + find targets ──────────────────────────────────────────────
const registryPath = path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json');
const registry = readJson(registryPath, { projects: [] });

const targets = registry.projects.filter(p => {
  if (filterSlug && p.slug !== filterSlug) return false;
  return p.launchStatus === 'deployed-unannounced';
});

if (targets.length === 0) {
  const msg = filterSlug
    ? `No deployed-unannounced project found: "${filterSlug}". Check portfolio/PROJECT_REGISTRY.json.`
    : 'No deployed-unannounced projects found. All projects may already be announced.';
  console.log(`\n${msg}\n`);
  process.exit(0);
}

// ── Main loop ─────────────────────────────────────────────────────────────────
console.log(`\n╔══ ${dryRun ? 'DRY-RUN — ' : '🚀 LIVE — '}POST ANNOUNCEMENT BOT ════════════════════════╗`);
console.log(`║  Targets: ${targets.length} project(s)${filterSlug ? ` (filtered: ${filterSlug})` : ''}`.padEnd(65) + '║');
console.log(`║  Platforms: ${[postReddit && 'Reddit', postTwitter && 'Twitter'].filter(Boolean).join(' + ')}`.padEnd(65) + '║');
if (dryRun) console.log('║  ⚠  DRY-RUN mode — no API calls. Pass --live to post for real.'.padEnd(65) + '║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

let redditToken = null;

for (const project of targets) {
  const { slug, name } = project;
  const draftPath = path.join(ROOT, 'docs', 'launch', `${slug}-announcement-draft.md`);

  if (!fs.existsSync(draftPath)) {
    console.log(`⚠  ${slug}: No draft found at docs/launch/${slug}-announcement-draft.md`);
    console.log(`   Run: node scripts/ops.mjs announce --project ${slug}\n`);
    continue;
  }

  const draft = readText(draftPath);

  // ── Parse Twitter copy ──────────────────────────────────────────────────────
  const twitterSection = extractSection(draft, 'X / Twitter');
  const tweetText = extractCodeBlock(twitterSection);

  // ── Parse Reddit copy ───────────────────────────────────────────────────────
  const redditSection = extractSection(draft, 'Reddit');
  const titleMatch = redditSection.match(/\*\*Title:\*\*\s*```[^\n]*\n([\s\S]*?)```/);
  const bodyMatch  = redditSection.match(/\*\*Body:\*\*\s*```[^\n]*\n([\s\S]*?)```/);
  const redditTitle = titleMatch ? titleMatch[1].trim() : `${name} is live`;
  const redditBody  = bodyMatch  ? bodyMatch[1].trim()  : `Check it out: ${project.liveUrl || project.runtimeUrl || ''}`;
  const subreddits  = extractSubreddits(draft);

  console.log(`━━━━ ${name} (${slug}) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // ── Twitter ─────────────────────────────────────────────────────────────────
  if (postTwitter) {
    const icon = alreadyPosted(slug, 'twitter') ? '↩ (skip — already posted)' : '';
    if (dryRun) {
      console.log(`\n[TWITTER] ${icon || 'Would post:'}`);
      console.log('─'.repeat(60));
      console.log(tweetText);
      console.log('─'.repeat(60));
      console.log(`Chars: ${tweetText.length}/280\n`);
    } else if (icon) {
      console.log(`[TWITTER] ${icon}`);
    } else {
      process.stdout.write('[TWITTER] Posting... ');
      try {
        const result = await twitterPost(tweetText, CREDS);
        console.log(`✓ Posted: ${result.url}`);
        logPost({ slug, platform: 'twitter', url: result.url, status: 'success' });
      } catch (err) {
        console.log(`⛔ Failed: ${err.message}`);
        logPost({ slug, platform: 'twitter', status: 'failed', error: err.message });
      }
    }
  }

  // ── Reddit ──────────────────────────────────────────────────────────────────
  if (postReddit) {
    for (const sub of subreddits) {
      const icon = alreadyPosted(slug, 'reddit', sub) ? '↩ (skip — already posted)' : '';
      if (dryRun) {
        console.log(`\n[REDDIT → ${sub}] ${icon || 'Would post:'}`);
        console.log('─'.repeat(60));
        console.log(`Title: ${redditTitle}`);
        console.log('─'.repeat(60));
        console.log(redditBody);
        console.log('─'.repeat(60) + '\n');
      } else if (icon) {
        console.log(`[REDDIT → ${sub}] ${icon}`);
      } else {
        // Rate limit: wait 1.5s between Reddit posts (API enforced)
        if (redditToken) await new Promise(r => setTimeout(r, 1500));

        process.stdout.write(`[REDDIT → ${sub}] Posting... `);
        try {
          if (!redditToken) redditToken = await redditGetToken(CREDS);
          const result = await redditSubmit(redditToken, sub, redditTitle, redditBody, CREDS);
          console.log(`✓ Posted: ${result.url}`);
          logPost({ slug, platform: 'reddit', subreddit: sub, url: result.url, status: 'success' });
        } catch (err) {
          console.log(`⛔ Failed: ${err.message}`);
          logPost({ slug, platform: 'reddit', subreddit: sub, status: 'failed', error: err.message });
        }
      }
    }
  }

  console.log('');
}

// ── Update launchStatus on successful live posts ───────────────────────────────
if (isLive) {
  const successSlugs = new Set(
    postLog.posts.filter(p => p.status === 'success').map(p => p.slug)
  );

  let changed = false;
  for (const proj of registry.projects) {
    if (successSlugs.has(proj.slug) && proj.launchStatus === 'deployed-unannounced') {
      proj.launchStatus = 'announced';
      changed = true;
      console.log(`✓ Registry updated: ${proj.slug} → launchStatus: "announced"`);
    }
  }
  if (changed) {
    registry.updatedAt = new Date().toISOString().slice(0, 10);
    writeJson(registryPath, registry);
  }
}

if (dryRun) {
  console.log('╔══ DRY-RUN COMPLETE ════════════════════════════════════════════╗');
  console.log('║  No posts were made. Review the copy above, then run:          ║');
  console.log('║                                                                 ║');
  console.log('║  # Post all projects:                                           ║');
  console.log('║  node scripts/ops.mjs post-announcement --live                 ║');
  console.log('║                                                                 ║');
  console.log('║  # Post one project:                                            ║');
  console.log(`║  node scripts/ops.mjs post-announcement --live --project <slug>║`);
  console.log('║                                                                 ║');
  console.log('║  Setup credentials first: secrets/social.env                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}
