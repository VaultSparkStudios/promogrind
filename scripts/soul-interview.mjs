#!/usr/bin/env node
/**
 * soul-interview.mjs — Interactive CLI for writing SOUL.md non-negotiables
 *
 * Usage:
 *   node scripts/soul-interview.mjs <project-local-path>
 *
 * Example:
 *   node scripts/soul-interview.mjs "C:\Users\p4cka\documents\development\canon"
 *   node scripts/soul-interview.mjs "C:\Users\p4cka\documents\development\the-living-protocol\living-protocol"
 *
 * What it does:
 *   1. Reads the project's context/SOUL.md
 *   2. Asks 3 targeted questions about the project's soul
 *   3. Writes/replaces the Non-negotiables section with the answers
 *
 * Run after Bootstrap Initiation for projects that need SOUL non-negotiables defined.
 */

import { createInterface } from 'readline';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// ── Helpers ──────────────────────────────────────────────────────────────────

function ask(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

function ask_multiline(rl, prompt) {
  return new Promise(resolve => {
    console.log(prompt);
    console.log('  (Press Enter twice to finish)\n');
    const lines = [];
    let lastWasEmpty = false;

    rl.on('line', function handler(line) {
      if (line === '' && lastWasEmpty) {
        rl.removeListener('line', handler);
        resolve(lines.slice(0, -1).join('\n').trim());
      } else {
        lines.push(line);
        lastWasEmpty = line === '';
      }
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

const projectPath = process.argv[2];

if (!projectPath) {
  console.error('Usage: node scripts/soul-interview.mjs <project-local-path>');
  console.error('Example: node scripts/soul-interview.mjs "../canon"');
  process.exit(1);
}

const absPath = resolve(projectPath);
const soulPath = join(absPath, 'context', 'SOUL.md');
const briefPath = join(absPath, 'context', 'PROJECT_BRIEF.md');

if (!existsSync(soulPath)) {
  console.error(`❌  context/SOUL.md not found at: ${soulPath}`);
  console.error('    Run Bootstrap Initiation first.');
  process.exit(1);
}

// Extract project name from PROJECT_BRIEF.md if available
let projectName = projectPath.split(/[/\\]/).pop();
if (existsSync(briefPath)) {
  const brief = readFileSync(briefPath, 'utf8');
  const nameMatch = brief.match(/^#\s+(.+)/m) || brief.match(/\*\*Name:\*\*\s*(.+)/);
  if (nameMatch) projectName = nameMatch[1].trim();
}

const currentSoul = readFileSync(soulPath, 'utf8');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  SOUL INTERVIEW — ${projectName}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\nThis interview defines the 3 non-negotiables that govern every decision.');
console.log('These are not goals — they are constraints. Things that must always be true.');
console.log('\nCurrent SOUL.md:\n');
console.log(currentSoul);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function run() {
  console.log('Answer each question in 1–3 sentences. Be specific and opinionated.\n');

  // Q1: Core promise
  const corePromise = await ask(
    rl,
    '1. What is the single emotional promise of this project?\n' +
    '   (The feeling users should have when they use it at its best)\n' +
    '   > '
  );
  console.log();

  // Q2: Must-always-be-true
  const mustBeTrue = await ask(
    rl,
    '2. What must always be true, no matter what?\n' +
    '   (A constraint so fundamental that violating it would make this a different product)\n' +
    '   > '
  );
  console.log();

  // Q3: Audience feeling
  const audienceFeel = await ask(
    rl,
    '3. How should the audience feel when they engage with the best version of this?\n' +
    '   (One specific emotion or thought — not a list)\n' +
    '   > '
  );
  console.log();

  // Q4: Quality bar
  const qualityBar = await ask(
    rl,
    '4. What is the quality bar? (One concrete test that any feature must pass before shipping)\n' +
    '   > '
  );
  console.log();

  // Q5: Must-never-drift
  const antiGoal = await ask(
    rl,
    '5. What must this project never become? (The failure mode or cheap imitation to avoid)\n' +
    '   > '
  );
  console.log();

  rl.close();

  // ── Build new SOUL.md ────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0];

  const newNonNegotiables = `## Non-negotiables

- **must always be true:** ${mustBeTrue}
- **audience should feel:** ${audienceFeel}
- **quality bar:** ${qualityBar}`;

  const newAntiGoals = `## Anti-goals

- must never drift into: ${antiGoal}
- cheap imitation to avoid: [fill in — what existing product does this most resemble at its worst?]
- tonal failure mode: [fill in — how does the voice/brand fail when it's off?]`;

  const newCorePromise = `## Core promise

${corePromise}`;

  const newSoul = `# Soul

${newCorePromise}

${newNonNegotiables}

${newAntiGoals}

---
*Written via soul-interview.mjs — ${today}*
`;

  // Check if the existing SOUL.md already has real content (not just template)
  const isTemplate =
    currentSoul.includes('Describe the emotional and creative promise') ||
    currentSoul.includes('must always be true:') && !currentSoul.match(/must always be true:\s+\S/);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PREVIEW');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(newSoul);

  if (!isTemplate) {
    console.log('⚠  SOUL.md already has real content. Overwriting it will replace the existing text.');
    const overwrite = await new Promise(res => {
      const rl2 = createInterface({ input: process.stdin, output: process.stdout });
      rl2.question('Overwrite existing SOUL.md? (y/N) > ', ans => {
        rl2.close();
        res(ans.toLowerCase() === 'y');
      });
    });
    if (!overwrite) {
      console.log('\n✗  Aborted. No changes made.');
      process.exit(0);
    }
  }

  writeFileSync(soulPath, newSoul, 'utf8');

  console.log(`\n✓  Written to: ${soulPath}`);
  console.log('\nNext steps:');
  console.log('  1. Review and refine the Anti-goals section (2 fields left blank)');
  console.log('  2. Run `start` in this project to begin Foundation Initiation');
  console.log('  3. Update context/TASK_BOARD.md — add first real Now task if needed\n');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
