#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { latestDecisionMap, normalizeSignal } from './lib/founder-decisions.mjs';
import { classifyBlocker } from './lib/blocker-rules.mjs';
import { resolveCapability } from './lib/secrets.mjs';
import { latestEvents } from './lib/studio-events.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'portfolio', 'AUTOMATION_QUEUE.json');
const FOUNDER_QUEUE = path.join(ROOT, 'context', 'FOUNDER_QUEUE.md');
const jsonMode = process.argv.includes('--json');

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function extractSignals(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => line.startsWith('## '))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function founderDecisionItems() {
  const signals = extractSignals(readText(FOUNDER_QUEUE));
  const decisions = latestDecisionMap();

  return signals
    .map((signal) => {
      const latest = decisions.get(normalizeSignal(signal));
      if (!latest) return null;

      const info = classifyBlocker(signal);
      const capabilityStatus = info.capabilities.map((capability) => ({
        capability,
        ...resolveCapability(capability),
      }));
      const allReady = capabilityStatus.length === 0 || capabilityStatus.every((entry) => entry.ok);

      let automationStatus = 'recorded';
      if (latest.decision === 'yes') {
        automationStatus = info.attemptable ? (allReady ? 'ready-to-run' : 'waiting-on-prereq') : 'approved-human-only';
      } else if (latest.decision === 'defer') {
        automationStatus = 'deferred';
      } else if (latest.decision === 'no') {
        automationStatus = 'declined';
      } else if (latest.decision === 'more-info') {
        automationStatus = 'needs-context';
      }

      return {
        source: 'founder-decision',
        signal,
        project: signal.split(':')[0] || 'studio-ops',
        decision: latest.decision,
        note: latest.note,
        decidedAt: latest.ts,
        category: info.category,
        attemptable: info.attemptable,
        capabilityStatus,
        automationStatus,
        probeCommands: info.probeCommands,
      };
    })
    .filter(Boolean);
}

function eventItems() {
  const decisions = latestDecisionMap();
  return latestEvents(ROOT, 30)
    .filter((event) => event.action || event.signal)
    .map((event) => {
      const key = normalizeSignal(event.signal || `${event.slug}: ${event.action}`);
      const latestDecision = decisions.get(key);

      let automationStatus = event.automationStatus || 'recorded';
      if (event.requiresFounderDecision && !latestDecision) {
        automationStatus = 'needs-founder-decision';
      } else if (latestDecision?.decision === 'yes' && automationStatus === 'recorded') {
        automationStatus = event.attemptable === false ? 'approved-human-only' : 'ready-to-run';
      } else if (latestDecision?.decision === 'defer') {
        automationStatus = 'deferred';
      } else if (latestDecision?.decision === 'no') {
        automationStatus = 'declined';
      }

      return {
        source: 'event-bus',
        signal: event.signal || `${event.slug}: ${event.action}`,
        project: event.slug || 'studio-ops',
        decision: latestDecision?.decision || null,
        note: event.note || latestDecision?.note || null,
        decidedAt: latestDecision?.ts || null,
        category: event.type || 'event',
        attemptable: event.attemptable !== false,
        capabilityStatus: [],
        automationStatus,
        probeCommands: [],
        action: event.action || null,
        severity: event.severity || 'low',
        eventTs: event.ts
      };
    });
}

const items = [...founderDecisionItems(), ...eventItems()];
const payload = {
  generatedAt: new Date().toISOString(),
  items
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`✓ Automation queue → portfolio/AUTOMATION_QUEUE.json  (${items.length} items from decisions + events)`);
}
