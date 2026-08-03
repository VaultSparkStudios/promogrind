import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseCodexTokenCount, readCodexContext } from '../../scripts/lib/codex-context-probe.mjs';

const roots = [];
const THREAD = '019fc4e4-ef2f-7ca2-a56d-f24193df37f6';
const CWD = path.resolve('C:/work/promogrind');

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture({ threadId = THREAD, cwd = CWD, tail = [] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-context-'));
  roots.push(root);
  const dir = path.join(root, '2026', '08', '02');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `rollout-${threadId}.jsonl`);
  const records = [
    { type: 'session_meta', payload: { id: threadId, cwd } },
    ...tail,
  ];
  fs.writeFileSync(file, records.map((row) => JSON.stringify(row)).join('\n') + '\n');
  return root;
}

function tokenEvent(input, contextWindow = 258400) {
  return {
    type: 'event_msg',
    payload: {
      type: 'token_count',
      info: {
        last_token_usage: { input_tokens: input, cached_input_tokens: input - 100, output_tokens: 50 },
        model_context_window: contextWindow,
      },
    },
  };
}

describe('Codex context probe', () => {
  it('uses the newest complete provider token_count event', () => {
    const parsed = parseCodexTokenCount([
      JSON.stringify(tokenEvent(120000)),
      '{ malformed',
      JSON.stringify(tokenEvent(148558)),
    ].join('\n'));
    expect(parsed).toMatchObject({ tokens: 148558, contextWindow: 258400, cachedInputTokens: 148458 });
  });

  it('binds evidence to CODEX_THREAD_ID and the current repository cwd', () => {
    const sessionsRoot = fixture({ tail: [tokenEvent(148558)] });
    expect(readCodexContext({ threadId: THREAD, cwd: CWD, sessionsRoot })).toMatchObject({
      source: 'codex-token-count',
      threadId: THREAD,
      tokens: 148558,
      contextWindow: 258400,
    });
  });

  it('rejects a foreign thread', () => {
    const sessionsRoot = fixture({ tail: [tokenEvent(100)] });
    expect(readCodexContext({
      threadId: '019fc4e4-ef2f-7ca2-a56d-f24193df37f7',
      cwd: CWD,
      sessionsRoot,
    })).toBeNull();
  });

  it('rejects a transcript from another repository', () => {
    const sessionsRoot = fixture({ cwd: 'C:/work/other', tail: [tokenEvent(100)] });
    expect(readCodexContext({ threadId: THREAD, cwd: CWD, sessionsRoot })).toBeNull();
  });

  it('returns null when no complete token event exists', () => {
    const sessionsRoot = fixture({ tail: [{ type: 'event_msg', payload: { type: 'token_count', info: {} } }] });
    expect(readCodexContext({ threadId: THREAD, cwd: CWD, sessionsRoot })).toBeNull();
  });
});
