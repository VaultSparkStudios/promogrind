#!/usr/bin/env node
/**
 * register-local-mcp.mjs
 *
 * Registers the local Studio Ops MCP server in Claude and Codex home configs.
 * Idempotent and intentionally narrow: it only adds/updates the `studio-ops`
 * server block.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const HOME = os.homedir();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const asJson = args.has('--json');
const codexBootstrap = args.has('--codex-bootstrap');
const claudeDirect = args.has('--claude-direct');
const nodeCommand = process.execPath;
const studioOpsRoot = resolveStudioOpsRoot();
const bootstrapServerPath = path.join(ROOT, 'scripts', 'studio-ops-mcp-bootstrap.mjs');
const directServerPath = path.join(studioOpsRoot, 'ignis', 'mcp', 'studio-ops-server.mjs');
const claudeServerPath = claudeDirect ? directServerPath : bootstrapServerPath;
const codexServerPath = codexBootstrap ? bootstrapServerPath : directServerPath;
const report = {
  dryRun,
  mode: {
    claude: claudeDirect ? 'direct-server' : 'bootstrap',
    codex: codexBootstrap ? 'bootstrap' : 'direct-server',
  },
  nodeCommand,
  studioOpsRoot,
  serverPath: {
    claude: claudeServerPath,
    codex: codexServerPath,
  },
  claude: registerClaude(),
  codex: registerCodex(),
};

if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`register-local-mcp · dryRun=${dryRun}`);
  console.log(`  Claude: ${report.claude.changed ? 'updated' : 'current'} · ${report.claude.path}`);
  console.log(`  Codex:  ${report.codex.changed ? 'updated' : 'current'} · ${report.codex.path}`);
}

function registerClaude() {
  const dir = path.join(HOME, '.claude');
  const file = path.join(dir, 'mcp.json');
  let data = {};
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { data = {}; }
  }
  if (!data.mcpServers || typeof data.mcpServers !== 'object') data.mcpServers = {};
  const next = {
    command: nodeCommand,
    args: [claudeServerPath],
  };
  const before = normalizeConfigObject(data.mcpServers['studio-ops'] || null);
  data.mcpServers['studio-ops'] = next;
  const changed = before !== normalizeConfigObject(next);
  if (changed && !dryRun) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  }
  return { path: file, changed };
}

function registerCodex() {
  const dir = path.join(HOME, '.codex');
  const file = path.join(dir, 'config.toml');
  const block = [
    '[mcp_servers.studio-ops]',
    `command = "${tomlString(nodeCommand)}"`,
    `args = ["${tomlString(codexServerPath)}"]`,
    '',
  ].join('\n');
  let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const regex = /\[mcp_servers\.studio-ops\][\s\S]*?(?=\n\[|$)/;
  let next;
  if (regex.test(text)) next = text.replace(regex, block.trimEnd());
  else next = `${text.replace(/\s*$/, '\n\n')}${block}`;
  const changed = normalize(text) !== normalize(next);
  if (changed && !dryRun) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, next);
  }
  return { path: file, changed };
}

function tomlString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function normalize(value) {
  const text = String(value).replace(/\r\n/g, '\n').trim();
  return process.platform === 'win32' ? text.toLowerCase() : text;
}

function normalizeConfigObject(value) {
  return normalize(JSON.stringify(value));
}

function resolveStudioOpsRoot() {
  const candidates = [
    process.env.STUDIO_OPS_ROOT,
    path.resolve(ROOT, '..', 'vaultspark-studio-ops'),
    ROOT,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = path.resolve(candidate);
    if (fs.existsSync(path.join(normalized, 'ignis', 'mcp', 'studio-ops-server.mjs'))) {
      return normalized;
    }
  }

  return path.resolve(candidates[0]);
}
