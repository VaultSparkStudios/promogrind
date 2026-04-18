#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  readAgentState,
  markInFlight,
  markComplete,
  recordGeniusOutcome,
  recordGeniusRefresh,
  resetSessionFields,
} from './lib/agent-state.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const json = process.argv.includes('--json');
const results = [];

run('Claude and Codex read the same continuation view from shared AGENT_STATE', () => {
  const repo = makeTempRepo();
  try {
    markInFlight(repo, {
      agent: 'claude-code',
      command: '/go',
      skill: 'go',
      sessionId: 'claude001',
      note: 'skill-doctor first',
    });
    recordGeniusRefresh(repo);
    recordGeniusOutcome(repo, { kind: 'shipped', title: 'Skill-doctor' });

    const claudeView = continuationView(readAgentState(repo));
    const codexView = continuationView(readAgentState(repo));
    assert.deepEqual(codexView, claudeView);
    assert.equal(codexView.command, '/go');
    assert.equal(codexView.skill, 'go');
    assert.equal(codexView.shipped, 1);
  } finally {
    cleanupTempRepo(repo);
  }
});

run('Codex can continue Claude state and Claude sees Codex completion', () => {
  const repo = makeTempRepo();
  try {
    markInFlight(repo, {
      agent: 'claude-code',
      command: '/go',
      skill: 'go',
      sessionId: 'shared001',
      note: 'founder-scale protocol sweep',
    });

    const inherited = readAgentState(repo);
    markInFlight(repo, {
      agent: 'codex',
      command: inherited.inFlight.command,
      skill: inherited.inFlight.skill,
      sessionId: inherited.sessionId,
      note: 'codex resumed shared sprint',
    });
    recordGeniusOutcome(repo, { kind: 'deferred', title: 'Portfolio Omnilist', reason: 'blocked on IGNIS live rank' });
    markComplete(repo, {
      status: 'completed',
      note: 'shipped protocol hardening',
      handoffNote: 'Read TASK_BOARD items 90+ before the next orchestration sprint.',
    });

    const resumed = readAgentState(repo);
    assert.equal(resumed.lastAgent, 'codex');
    assert.equal(resumed.sessionId, 'shared001');
    assert.equal(resumed.inFlight.status, 'completed');
    assert.match(resumed.handoffNote ?? '', /TASK_BOARD items 90\+/);
    assert.equal(resumed.geniusList.deferredThisSession.length, 1);
  } finally {
    cleanupTempRepo(repo);
  }
});

run('Session reset clears per-session fields but preserves handoff continuity', () => {
  const repo = makeTempRepo();
  try {
    markInFlight(repo, {
      agent: 'codex',
      command: '/closeout',
      skill: 'studio-closeout',
      sessionId: 'close001',
      note: 'closing out',
    });
    recordGeniusOutcome(repo, { kind: 'shipped', title: 'Hot-swap certifier' });
    markComplete(repo, {
      status: 'completed',
      note: 'closeout ready',
      handoffNote: 'Safe to resume with Codex or Claude.',
    });
    resetSessionFields(repo);

    const state = readAgentState(repo);
    assert.equal(state.sessionId, null);
    assert.equal(state.inFlight.command, null);
    assert.equal(state.geniusList.shippedThisSession.length, 0);
    assert.equal(state.handoffNote, 'Safe to resume with Codex or Claude.');
    assert.equal(state.lastAgent, 'codex');
  } finally {
    cleanupTempRepo(repo);
  }
});

run('Current repo protocol contract exposes AGENT_STATE as the shared hot-swap surface', () => {
  const currentState = fs.readFileSync(path.join(ROOT, 'context', 'CURRENT_STATE.md'), 'utf8');
  const latestHandoff = fs.readFileSync(path.join(ROOT, 'context', 'LATEST_HANDOFF.md'), 'utf8');
  const state = JSON.parse(fs.readFileSync(path.join(ROOT, 'context', 'AGENT_STATE.json'), 'utf8'));

  assert.equal(state.schemaVersion, '1.0');
  assert.ok('inFlight' in state);
  assert.ok('geniusList' in state);
  assert.match(currentState, /AGENT_STATE\.json/);
  assert.match(latestHandoff, /hot-swap/i);
});

const summary = {
  ok: results.every(result => result.pass),
  checkedAt: new Date().toISOString(),
  passing: results.filter(result => result.pass).length,
  failing: results.filter(result => !result.pass).length,
  results,
};

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('\nHot-swap test');
  for (const result of results) {
    console.log(`  ${result.pass ? '✓' : '⛔'} ${result.name}${result.pass ? '' : ` — ${result.detail}`}`);
  }
  console.log(`\n  ${summary.passing}/${results.length} passing\n`);
}

process.exit(summary.ok ? 0 : 1);

function continuationView(state) {
  return {
    command: state.inFlight.command,
    skill: state.inFlight.skill,
    status: state.inFlight.status,
    shipped: state.geniusList.shippedThisSession.length,
    deferred: state.geniusList.deferredThisSession.length,
    handoffNote: state.handoffNote,
  };
}

function makeTempRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-ops-hotswap-'));
  fs.mkdirSync(path.join(repo, 'context'), { recursive: true });
  return repo;
}

function cleanupTempRepo(repo) {
  if (repo) fs.rmSync(repo, { recursive: true, force: true });
}

function run(name, fn) {
  try {
    fn();
    results.push({ name, pass: true });
  } catch (error) {
    results.push({ name, pass: false, detail: error.message });
  }
}
