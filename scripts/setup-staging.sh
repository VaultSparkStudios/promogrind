#!/usr/bin/env bash
# ── VaultSpark Staging Setup ──────────────────────────────────────────────────
# Deploys website.staging + studio-hub.staging on the existing Hetzner CX31.
# Webhook receiver auto-pulls on every push to main.
#
# Usage: ssh root@178.156.211.100 "bash -s" < scripts/setup-staging.sh
#
# Prerequisites:
#   - Cloudflare wildcard DNS: *.staging A → 178.156.211.100
#   - Run AFTER adding DNS (Caddy needs to reach Let's Encrypt)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

WEBHOOK_SECRET="eaca5d56232985c735206b0e29fb06fea1b500d2d623254dff68b916be2d2460"
STAGING_DIR="/opt/studio/staging"
WEBHOOK_PORT=3457
CADDYFILE="/etc/caddy/Caddyfile"
SSH_DIR="/opt/studio/.ssh"
KNOWN_HOSTS="$SSH_DIR/known_hosts"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VaultSpark Staging Setup"
echo "  Server: $(hostname) | $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Directories ────────────────────────────────────────────────────────────
echo "1/5  Creating staging directories..."
mkdir -p "$STAGING_DIR"
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"
touch "$KNOWN_HOSTS"
chmod 600 "$KNOWN_HOSTS"
if ! ssh-keygen -F github.com -f "$KNOWN_HOSTS" >/dev/null 2>&1; then
  ssh-keyscan github.com >> "$KNOWN_HOSTS" 2>/dev/null
fi
echo "     ✓ $STAGING_DIR"

# ── 2. Clone / update repos ───────────────────────────────────────────────────
echo ""
echo "2/5  Cloning repos..."

if [ ! -d "$STAGING_DIR/website/.git" ]; then
  git clone --depth 5 \
    https://github.com/VaultSparkStudios/VaultSparkStudios.github.io.git \
    "$STAGING_DIR/website"
  echo "     ✓ website cloned"
else
  git -C "$STAGING_DIR/website" fetch --depth 5 origin
  git -C "$STAGING_DIR/website" reset --hard origin/main 2>/dev/null \
    || git -C "$STAGING_DIR/website" reset --hard origin/master
  echo "     ✓ website updated"
fi

# Hub uses SSH deploy key (private repo)
# Deploy key: /opt/studio/.ssh/hub-deploy (id 147667401, read-only)
# Registered at: github.com/VaultSparkStudios/vaultspark-studio-hub → Settings → Deploy keys
export GIT_SSH_COMMAND="ssh -i /opt/studio/.ssh/hub-deploy -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/opt/studio/.ssh/known_hosts"

if [ ! -d "$STAGING_DIR/hub/.git" ]; then
  git clone --depth 5 \
    git@github.com:VaultSparkStudios/vaultspark-studio-hub.git \
    "$STAGING_DIR/hub"
  echo "     ✓ hub cloned"
else
  git -C "$STAGING_DIR/hub" fetch --depth 5 origin
  git -C "$STAGING_DIR/hub" reset --hard origin/main 2>/dev/null \
    || git -C "$STAGING_DIR/hub" reset --hard origin/master
  echo "     ✓ hub updated"
fi

unset GIT_SSH_COMMAND

# ── 3. Webhook receiver ───────────────────────────────────────────────────────
echo ""
echo "3/5  Writing webhook receiver..."

cat > "$STAGING_DIR/webhook-receiver.js" << 'NODEEOF'
'use strict';
const http   = require('http');
const crypto = require('crypto');
const { execSync, spawnSync } = require('child_process');

const SECRET      = process.env.WEBHOOK_SECRET || '';
const STAGING_DIR = '/opt/studio/staging';
const PORT        = 3457;

function verifySignature(req, body) {
  const sig = req.headers['x-hub-signature-256'];
  if (!sig || !SECRET) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

const ROUTES = {
  '/deploy/website': { dir: `${STAGING_DIR}/website`, name: 'website', sshKey: null,                                    url: 'https://website.staging.vaultsparkstudios.com'     },
  '/deploy/hub':     { dir: `${STAGING_DIR}/hub`,     name: 'hub',     sshKey: '/opt/studio/.ssh/hub-deploy',           url: 'https://studio-hub.staging.vaultsparkstudios.com'  },
};

// Per-site deploy state (in-memory; resets on service restart)
const deployState = {
  website: { site: 'website', lastDeploy: null, sha: null, status: 'unknown' },
  hub:     { site: 'hub',     lastDeploy: null, sha: null, status: 'unknown' },
};

// Fire a curl to the staging root URL after deploy; logs HTTP status, never throws.
function smokeTest(name, url) {
  try {
    const result = spawnSync(
      'curl', ['-sf', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '8', url],
      { encoding: 'utf8' }
    );
    const code = (result.stdout || '').trim();
    if (result.status === 0 && code.startsWith('2')) {
      console.log(`[${new Date().toISOString()}] ✓ Smoke test ${name}: HTTP ${code}`);
    } else {
      console.warn(`[${new Date().toISOString()}] ⚠ Smoke test ${name}: HTTP ${code || 'no response'} (DNS may not be active yet)`);
    }
  } catch (e) {
    console.warn(`[${new Date().toISOString()}] ⚠ Smoke test ${name}: ${e.message}`);
  }
}

const server = http.createServer((req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // Deploy status — returns JSON per site: { site, lastDeploy, sha, status }
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Object.values(deployState), null, 2));
    return;
  }

  if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return; }

  const route = ROUTES[req.url];
  if (!route) { res.writeHead(404); res.end('Unknown route'); return; }

  let body = '';
  req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
  req.on('end', () => {
    if (!verifySignature(req, body)) {
      console.warn(`[${new Date().toISOString()}] Invalid signature — ${req.url}`);
      res.writeHead(401); res.end('Unauthorized');
      return;
    }

    // Only deploy on push events
    const event = req.headers['x-github-event'];
    if (event !== 'push') {
      res.writeHead(200); res.end(`Ignored: ${event}`);
      return;
    }

    let payload;
    try { payload = JSON.parse(body); } catch {
      res.writeHead(400); res.end('Bad JSON'); return;
    }

    const ref           = payload.ref || '';
    const defaultBranch = payload.repository?.default_branch || 'main';
    const targetRef     = `refs/heads/${defaultBranch}`;

    if (ref !== targetRef) {
      res.writeHead(200); res.end(`Ignored branch: ${ref}`);
      return;
    }

    try {
      const gitEnv = route.sshKey
        ? { ...process.env, GIT_SSH_COMMAND: `ssh -i ${route.sshKey} -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/opt/studio/.ssh/known_hosts` }
        : process.env;
      execSync(`git -C ${route.dir} fetch --depth 5 origin ${defaultBranch}`, { stdio: 'pipe', env: gitEnv });
      execSync(`git -C ${route.dir} reset --hard origin/${defaultBranch}`,     { stdio: 'pipe', env: gitEnv });
      const sha = execSync(`git -C ${route.dir} rev-parse --short HEAD`, { stdio: 'pipe' }).toString().trim();
      const now = new Date().toISOString();
      console.log(`[${now}] ✓ Deployed ${route.name} @ ${sha}`);

      // Update deploy state
      deployState[route.name] = { site: route.name, lastDeploy: now, sha, status: 'ok' };

      // Smoke test — runs async so webhook response is not delayed
      setImmediate(() => smokeTest(route.name, route.url));

      res.writeHead(200); res.end(`Deployed ${sha}`);
    } catch (e) {
      const now = new Date().toISOString();
      console.error(`[${now}] ✗ Deploy failed for ${route.name}: ${e.message}`);
      deployState[route.name] = { site: route.name, lastDeploy: now, sha: deployState[route.name].sha, status: 'failed' };
      res.writeHead(500); res.end('Deploy failed');
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[${new Date().toISOString()}] Webhook receiver on 127.0.0.1:${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
NODEEOF

echo "     ✓ webhook-receiver.js written"

# ── 4. Systemd service ────────────────────────────────────────────────────────
echo ""
echo "4/5  Installing systemd service..."

cat > /etc/systemd/system/staging-webhook.service << SVCEOF
[Unit]
Description=VaultSpark Staging Webhook Receiver
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/studio/staging
ExecStart=/usr/bin/node /opt/studio/staging/webhook-receiver.js
Restart=always
RestartSec=5
Environment=WEBHOOK_SECRET=${WEBHOOK_SECRET}
StandardOutput=journal
StandardError=journal
SyslogIdentifier=staging-webhook

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable staging-webhook
systemctl restart staging-webhook
sleep 2

if systemctl is-active --quiet staging-webhook; then
  echo "     ✓ staging-webhook service running"
else
  echo "     ✗ Service failed — check: journalctl -u staging-webhook -n 20"
  exit 1
fi

# Quick health check
sleep 1
HEALTH=$(curl -sf http://127.0.0.1:3457/health || echo "FAIL")
if [ "$HEALTH" = "OK" ]; then
  echo "     ✓ Health check passed"
else
  echo "     ✗ Health check failed — service may still be starting"
fi

# ── 5. Caddy config ───────────────────────────────────────────────────────────
echo ""
echo "5/5  Updating Caddy config..."

if grep -q "website.staging.vaultsparkstudios.com" "$CADDYFILE"; then
  echo "     ✓ Caddy blocks already present — skipping"
else
  cat >> "$CADDYFILE" << 'CADDYEOF'

# ─── Staging environments ─────────────────────────────────────────────────────

website.staging.vaultsparkstudios.com {
  root * /opt/studio/staging/website
  file_server
  try_files {path} {path}.html /index.html
  encode gzip
}

studio-hub.staging.vaultsparkstudios.com {
  root * /opt/studio/staging/hub
  file_server
  try_files {path} {path}.html /index.html
  encode gzip
}

webhook.staging.vaultsparkstudios.com {
  reverse_proxy 127.0.0.1:3457
}
CADDYEOF

  if caddy validate --config "$CADDYFILE" 2>&1; then
    caddy reload --config "$CADDYFILE"
    echo "     ✓ Caddy reloaded"
  else
    echo "     ✗ Caddyfile validation failed — check config manually"
    exit 1
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup complete ✓"
echo ""
echo "  Staging URLs (live once DNS wildcard is active):"
echo "    website  → https://website.staging.vaultsparkstudios.com"
echo "    hub      → https://studio-hub.staging.vaultsparkstudios.com"
echo "    webhook  → https://webhook.staging.vaultsparkstudios.com/health"
echo ""
echo "  Webhook endpoints:"
echo "    website  → POST /deploy/website"
echo "    hub      → POST /deploy/hub"
echo "    status   → GET  /status  (JSON: site, lastDeploy, sha, status per site)"
echo ""
echo "  DNS required: *.staging A → 178.156.211.100 (Cloudflare)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
