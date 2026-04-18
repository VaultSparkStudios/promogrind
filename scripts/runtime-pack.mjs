#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildRuntimePack,
  efficiencyPlaybookMarkdown,
  integrationChecklistMarkdown,
  runtimePackMarkdown,
  scorecardMarkdown,
  writeJson,
  writeText
} from './lib/runtime-pack.mjs';
import { appendEvent } from './lib/studio-events.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const writeMode = args.includes('--write');
const projectIndex = args.indexOf('--project');
const projectArg = projectIndex !== -1 ? args[projectIndex + 1] : null;

const pack = buildRuntimePack(ROOT, projectArg);

if (writeMode) {
  const outDir = path.join(pack.project.localPath, 'context', 'runtime-pack');
  writeJson(path.join(outDir, 'RUNTIME_PACK.json'), pack);
  writeText(path.join(outDir, 'RUNTIME_PACK.md'), runtimePackMarkdown(pack));
  writeText(path.join(outDir, 'ONBOARDING_SCORECARD.md'), scorecardMarkdown(pack));
  writeText(path.join(outDir, 'INTEGRATION_CHECKLIST.md'), integrationChecklistMarkdown(pack));
  writeText(path.join(outDir, 'EFFICIENCY_PLAYBOOK.md'), efficiencyPlaybookMarkdown(pack));
  appendEvent(ROOT, {
    type: 'runtime-pack-generated',
    slug: pack.project.slug,
    source: 'runtime-pack',
    signal: `${pack.project.slug}: runtime pack generated`,
    action: 'refresh onboarding assets',
    severity: 'low',
    automationStatus: 'completed',
    attemptable: true,
    note: 'Runtime-pack outputs refreshed.'
  });
}

if (jsonMode) {
  console.log(JSON.stringify(pack, null, 2));
} else if (writeMode) {
  console.log(`✓ Runtime pack → ${path.relative(ROOT, path.join(pack.project.localPath, 'context', 'runtime-pack')).replace(/\\/g, '/')} (${pack.project.slug})`);
} else {
  console.log(runtimePackMarkdown(pack));
}
