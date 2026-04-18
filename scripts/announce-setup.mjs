#!/usr/bin/env node
/**
 * announce-setup.mjs
 *
 * Credential setup wizard for the social announcement workflow.
 * Walks through Reddit script app + Twitter/X developer app creation,
 * validates credentials locally, and prints the exact `gh secret set`
 * commands needed to activate post-announcements.yml in GitHub Actions.
 *
 * Usage:
 *   node scripts/announce-setup.mjs
 *   node scripts/announce-setup.mjs --check    → validate existing creds only
 *   node scripts/announce-setup.mjs --status   → show what's configured
 *   node scripts/ops.mjs announce-setup
 */

import https from 'https';
import { createInterface } from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const argv      = process.argv.slice(2);
const checkMode = argv.includes('--check');
const statusMode = argv.includes('--status');

// Credential store (secrets/ folder, never committed)
const CREDS_FILE = path.join(ROOT, 'secrets', 'social.env');

function readText(p)  { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function readCreds()  {
  const text = readText(CREDS_FILE);
  const env  = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// ── Status mode ───────────────────────────────────────────────────────────────
const REQUIRED_CREDS = [
  { key: 'REDDIT_CLIENT_ID',      label: 'Reddit Client ID',       platform: 'reddit' },
  { key: 'REDDIT_CLIENT_SECRET',  label: 'Reddit Client Secret',   platform: 'reddit' },
  { key: 'REDDIT_USERNAME',       label: 'Reddit Username',        platform: 'reddit' },
  { key: 'REDDIT_PASSWORD',       label: 'Reddit Password',        platform: 'reddit' },
  { key: 'REDDIT_USER_AGENT',     label: 'Reddit User Agent',      platform: 'reddit' },
  { key: 'TWITTER_API_KEY',       label: 'Twitter API Key',        platform: 'twitter' },
  { key: 'TWITTER_API_SECRET',    label: 'Twitter API Secret',     platform: 'twitter' },
  { key: 'TWITTER_ACCESS_TOKEN',  label: 'Twitter Access Token',   platform: 'twitter' },
  { key: 'TWITTER_ACCESS_TOKEN_SECRET', label: 'Twitter Access Token Secret', platform: 'twitter' },
];

if (statusMode) {
  const creds = readCreds();
  const W = 56;
  console.log(`\n╔${'═'.repeat(W)}╗`);
  console.log(`║  ${'ANNOUNCE CREDENTIAL STATUS'.padEnd(W - 2)}  ║`);
  console.log(`╠${'═'.repeat(W)}╣`);
  let redditReady = true, twitterReady = true;
  for (const c of REQUIRED_CREDS) {
    const set = !!creds[c.key];
    if (c.platform === 'reddit' && !set) redditReady = false;
    if (c.platform === 'twitter' && !set) twitterReady = false;
    const icon = set ? '✓' : '✗';
    console.log(`║  ${icon}  ${c.label.padEnd(W - 6)}  ║`);
  }
  console.log(`╠${'═'.repeat(W)}╣`);
  console.log(`║  Reddit:  ${redditReady ? '✓ ready' : '✗ missing credentials'}`.padEnd(W + 2) + '  ║');
  console.log(`║  Twitter: ${twitterReady ? '✓ ready' : '✗ missing credentials'}`.padEnd(W + 2) + '  ║`');
  console.log(`╚${'═'.repeat(W)}╝\n`);
  if (!redditReady || !twitterReady) {
    console.log('Run without flags to start the setup wizard.\n');
  }
  process.exit(0);
}

// ── Validate Reddit credentials ───────────────────────────────────────────────
async function validateReddit(clientId, clientSecret, username, password, userAgent) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'www.reddit.com',
      path: '/api/v1/access_token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ ok: !!parsed.access_token, detail: parsed.error ?? 'token obtained' });
        } catch { resolve({ ok: false, detail: 'parse error' }); }
      });
    });
    req.on('error', e => resolve({ ok: false, detail: e.message }));
    req.write(body);
    req.end();
  });
}

// ── Main wizard ───────────────────────────────────────────────────────────────
async function runWizard() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  ANNOUNCE CREDENTIAL SETUP WIZARD                        ║
║  Sets up Reddit + Twitter/X for post-announcements.yml   ║
╚══════════════════════════════════════════════════════════╝

This wizard will:
  1. Walk you through creating a Reddit script app
  2. Walk you through creating a Twitter/X developer app
  3. Validate credentials locally
  4. Output the exact 'gh secret set' commands to run

Press Enter to continue or Ctrl+C to exit.
`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  await prompt(rl, '');

  // ── Reddit setup ────────────────────────────────────────────────────────────
  console.log(`
━━━ REDDIT SETUP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Open: https://www.reddit.com/prefs/apps
2. Scroll to "developed applications" → click "create another app"
3. Fill in:
     Name:         VaultSpark Studio Bot
     App type:     script
     Description:  Studio OS social automation
     Redirect URI: http://localhost:8080
4. Click "create app"
5. Note the CLIENT_ID (under the app name) and CLIENT_SECRET ("secret" field)
`);

  const redditClientId     = await prompt(rl, 'Reddit Client ID: ');
  const redditClientSecret = await prompt(rl, 'Reddit Client Secret: ');
  const redditUsername     = await prompt(rl, 'Reddit Username (your account): ');
  const redditPassword     = await prompt(rl, 'Reddit Password: ');
  const redditUserAgent    = `VaultSparkStudioBot/1.0 by u/${redditUsername}`;

  process.stdout.write('\nValidating Reddit credentials...');
  const redditResult = await validateReddit(redditClientId, redditClientSecret, redditUsername, redditPassword, redditUserAgent);
  console.log(redditResult.ok ? ' ✓ valid' : ` ✗ FAILED: ${redditResult.detail}`);

  // ── Twitter setup ────────────────────────────────────────────────────────────
  console.log(`
━━━ TWITTER/X SETUP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Open: https://developer.twitter.com/en/portal/dashboard
2. Create a new project + app (Free tier is OK for posting)
3. In App Settings → Keys and Tokens:
     Generate: API Key + Secret
     Generate: Access Token + Secret (with "Read and Write" permissions)
4. Note all 4 values below.

Note: Free tier allows 1,500 tweets/month — more than enough.
`);

  const twitterApiKey            = await prompt(rl, 'Twitter API Key: ');
  const twitterApiSecret         = await prompt(rl, 'Twitter API Secret: ');
  const twitterAccessToken       = await prompt(rl, 'Twitter Access Token: ');
  const twitterAccessTokenSecret = await prompt(rl, 'Twitter Access Token Secret: ');

  rl.close();

  // ── Save to secrets/ ─────────────────────────────────────────────────────────
  const secretsDir = path.join(ROOT, 'secrets');
  if (!fs.existsSync(secretsDir)) fs.mkdirSync(secretsDir, { recursive: true });

  const envContent = [
    `REDDIT_CLIENT_ID=${redditClientId}`,
    `REDDIT_CLIENT_SECRET=${redditClientSecret}`,
    `REDDIT_USERNAME=${redditUsername}`,
    `REDDIT_PASSWORD=${redditPassword}`,
    `REDDIT_USER_AGENT=${redditUserAgent}`,
    `TWITTER_API_KEY=${twitterApiKey}`,
    `TWITTER_API_SECRET=${twitterApiSecret}`,
    `TWITTER_ACCESS_TOKEN=${twitterAccessToken}`,
    `TWITTER_ACCESS_TOKEN_SECRET=${twitterAccessTokenSecret}`,
  ].join('\n') + '\n';

  fs.writeFileSync(CREDS_FILE, envContent, { mode: 0o600 });
  console.log(`\n✓ Credentials saved to secrets/social.env (chmod 600, never committed)\n`);

  // ── Output gh secret set commands ────────────────────────────────────────────
  console.log(`
━━━ GITHUB ACTIONS SECRETS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run these commands to add secrets to GitHub Actions
(or paste them into GitHub Settings → Secrets → Actions):

  gh secret set REDDIT_CLIENT_ID        --body "${redditClientId}"
  gh secret set REDDIT_CLIENT_SECRET    --body "${redditClientSecret}"
  gh secret set REDDIT_USERNAME         --body "${redditUsername}"
  gh secret set REDDIT_PASSWORD         --body "${redditPassword}"
  gh secret set REDDIT_USER_AGENT       --body "${redditUserAgent}"
  gh secret set TWITTER_API_KEY         --body "${twitterApiKey}"
  gh secret set TWITTER_API_SECRET      --body "${twitterApiSecret}"
  gh secret set TWITTER_ACCESS_TOKEN    --body "${twitterAccessToken}"
  gh secret set TWITTER_ACCESS_TOKEN_SECRET --body "${twitterAccessTokenSecret}"

After running those, the post-announcements.yml workflow_dispatch
will be fully operational. Test with: --dry-run (default) first.

━━━ NEXT STEPS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Run the gh secret set commands above
  2. Go to Studio Hub → Announce tab → dispatch workflow (dry-run)
  3. Verify dry-run output, then dispatch with --live flag
  4. Update LATEST_HANDOFF.md blocker: "Social API credentials — RESOLVED"
`);

  const redditStatus = redditResult.ok ? 'READY' : `FAILED (${redditResult.detail})`;
  console.log(`Reddit:  ${redditStatus}`);
  console.log(`Twitter: CONFIGURED (manual validation — check API key permissions)`);
  console.log('');
}

runWizard().catch(e => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
