#!/usr/bin/env node
/**
 * ops.mjs — Unified CLI entry point for Studio Ops scripts.
 *
 * Canonical command registry lives in `scripts/ops/index.mjs`.
 * This file is now a thin dispatcher only.
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { COMMANDS, CATEGORIES, helpText } from './ops/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  await runTUI();
  process.exit(0);
}

if (command === 'help') {
  console.log(helpText());
  process.exit(0);
}

if (command === 'completion') {
  emitCompletion(args[1] ?? 'bash');
  process.exit(0);
}

const entry = COMMANDS[command];
if (!entry) {
  console.error(`\nUnknown command: "${command}"`);
  const close = Object.keys(COMMANDS).filter(name => name.startsWith(command.slice(0, 4)));
  if (close.length > 0) console.error(`Did you mean: ${close.join(', ')}?`);
  console.error('\nRun: node scripts/ops.mjs help\n');
  process.exit(1);
}

process.exit(dispatch(entry, args.slice(1)));

function dispatch(entry, forwardedArgs = []) {
  const scriptPath = path.join(__dirname, entry.script);
  const extraArgs = entry.extraArgs ?? [];
  const runner = entry.runner ?? (entry.shell ? 'bash' : null);
  const result = runner
    ? spawnSync(runner, [scriptPath, ...extraArgs, ...forwardedArgs], { stdio: 'inherit' })
    : spawnSync(process.execPath, [scriptPath, ...extraArgs, ...forwardedArgs], { stdio: 'inherit' });
  return result.status ?? 0;
}

function emitCompletion(shellArg) {
  const cmds = Object.keys(COMMANDS).join(' ');
  if (shellArg === 'zsh') {
    console.log('# Zsh completion for ops.mjs');
    console.log('# Add to ~/.zshrc:  source <(node /path/to/scripts/ops.mjs completion zsh)');
    console.log('_ops_mjs() {');
    console.log('  local -a cmds');
    console.log(`  cmds=(${Object.entries(COMMANDS).map(([k, v]) => `"${k}:${String(v.desc).replace(/"/g, "'")}"`).join(' ')})`);
    console.log("  _describe 'command' cmds");
    console.log('}');
    console.log(`compdef _ops_mjs 'node scripts/ops.mjs'`);
    return;
  }

  console.log('# Bash completion for ops.mjs');
  console.log('# Add to ~/.bashrc:  source <(node /path/to/scripts/ops.mjs completion)');
  console.log('_ops_mjs_completions() {');
  console.log('  local cur="${COMP_WORDS[COMP_CWORD]}"');
  console.log(`  COMPREPLY=($(compgen -W "${cmds}" -- "$cur"))`);
  console.log('}');
  console.log('complete -F _ops_mjs_completions "node scripts/ops.mjs"');
}

async function runTUI() {
  const { createInterface } = await import('readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const grouped = {};
  for (const category of CATEGORIES) grouped[category] = [];
  for (const [name, spec] of Object.entries(COMMANDS)) grouped[spec.category].push({ name, spec });

  const categoryList = CATEGORIES.map((cat, idx) => ({ idx: idx + 1, cat }));
  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.log('\n┌─ Studio Ops CLI ─────────────────────────────────────────────┐');
  console.log('│  Interactive mode — type a number or a command name         │');
  console.log('└──────────────────────────────────────────────────────────────┘\n');
  console.log('  Categories:\n');
  for (const { idx, cat } of categoryList) {
    console.log(`  ${String(idx).padStart(2)}.  ${cat.padEnd(20)} (${grouped[cat].length} commands)`);
  }
  console.log('\n  Or type a command name directly (e.g. "doctor", "genius-list")');
  console.log('  Type "help" for full command list · Ctrl+C to exit\n');

  const input = (await question('  → ')).trim();
  rl.close();

  if (COMMANDS[input]) {
    process.exit(dispatch(COMMANDS[input]));
  }

  const selected = categoryList.find(item => String(item.idx) === input);
  if (!selected) {
    console.error('\nInvalid selection.\n');
    process.exit(1);
  }

  console.log('');
  const commands = grouped[selected.cat].sort((a, b) => a.name.localeCompare(b.name));
  commands.forEach((entry, idx) => {
    console.log(`  ${String(idx + 1).padStart(2)}.  ${entry.name.padEnd(22)} ${entry.spec.desc}`);
  });

  const rl2 = createInterface({ input: process.stdin, output: process.stdout });
  const choice = await new Promise(resolve => rl2.question('\n  Command → ', resolve));
  rl2.close();
  const picked = commands[Number(choice) - 1];
  if (!picked) {
    console.error('\nInvalid command selection.\n');
    process.exit(1);
  }
  process.exit(dispatch(picked.spec));
}
