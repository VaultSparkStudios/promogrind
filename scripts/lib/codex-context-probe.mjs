import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const THREAD_ID_RE = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function samePath(a, b) {
  if (!a || !b) return false;
  return path.resolve(a).replace(/\\/g, '/').toLowerCase()
    === path.resolve(b).replace(/\\/g, '/').toLowerCase();
}

function walkForThread(root, threadId) {
  if (!fs.existsSync(root)) return null;
  const suffix = `${threadId}.jsonl`.toLowerCase();
  const stack = [root];
  let found = null;
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const candidate = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(candidate);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(suffix)) {
        const stat = fs.statSync(candidate);
        if (!found || stat.mtimeMs > found.mtimeMs) found = { path: candidate, mtimeMs: stat.mtimeMs, size: stat.size };
      }
    }
  }
  return found;
}

function readHead(filePath, maxBytes = 32 * 1024) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const stat = fs.fstatSync(fd);
    const size = Math.min(stat.size, maxBytes);
    const buffer = Buffer.alloc(size);
    fs.readSync(fd, buffer, 0, size, 0);
    return buffer.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

function readTail(filePath, maxBytes = 512 * 1024) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const stat = fs.fstatSync(fd);
    const size = Math.min(stat.size, maxBytes);
    const buffer = Buffer.alloc(size);
    fs.readSync(fd, buffer, 0, size, stat.size - size);
    return buffer.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

export function parseCodexTokenCount(jsonlTail = '') {
  const lines = String(jsonlTail).split(/\r?\n/);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trim();
    if (!line) continue;
    try {
      const event = JSON.parse(line);
      if (event?.type !== 'event_msg' || event?.payload?.type !== 'token_count') continue;
      const info = event.payload.info || {};
      const last = info.last_token_usage || {};
      const tokens = Number(last.input_tokens);
      const contextWindow = Number(info.model_context_window);
      if (!Number.isFinite(tokens) || tokens < 0 || !Number.isFinite(contextWindow) || contextWindow <= 0) continue;
      return {
        tokens,
        contextWindow,
        cachedInputTokens: Number.isFinite(Number(last.cached_input_tokens)) ? Number(last.cached_input_tokens) : null,
        outputTokens: Number.isFinite(Number(last.output_tokens)) ? Number(last.output_tokens) : null,
      };
    } catch {
      // A concurrently appended or malformed final line is not evidence; keep
      // walking backward to the newest complete token_count event.
    }
  }
  return null;
}

export function readCodexContext({
  threadId = process.env.CODEX_THREAD_ID,
  cwd = process.cwd(),
  sessionsRoot = process.env.CODEX_SESSIONS_DIR || path.join(os.homedir(), '.codex', 'sessions'),
} = {}) {
  if (!THREAD_ID_RE.test(String(threadId || ''))) return null;
  const match = walkForThread(sessionsRoot, threadId);
  if (!match) return null;

  const firstLine = readHead(match.path).split(/\r?\n/).find(Boolean);
  let meta;
  try { meta = JSON.parse(firstLine || ''); } catch { return null; }
  if (meta?.type !== 'session_meta' || meta?.payload?.id !== threadId || !samePath(meta?.payload?.cwd, cwd)) return null;

  const usage = parseCodexTokenCount(readTail(match.path));
  if (!usage) return null;
  return {
    source: 'codex-token-count',
    threadId,
    file: path.basename(match.path),
    bytes: match.size,
    ageSeconds: Math.max(0, Math.round((Date.now() - match.mtimeMs) / 1000)),
    ...usage,
  };
}

export default { parseCodexTokenCount, readCodexContext };
