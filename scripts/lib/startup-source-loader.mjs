import fs from 'node:fs';
import path from 'node:path';

export async function loadStartupBriefSources(root) {
  const revenueSignalsPath = [
    path.join(root, 'portfolio', 'REVENUE_SIGNALS.md'),
    path.join(root, 'docs', 'REVENUE_SIGNALS.md'),
  ].find((candidate) => fs.existsSync(candidate))
    || path.join(root, 'docs', 'REVENUE_SIGNALS.md');
  const manifest = [
    ['status', 'context/PROJECT_STATUS.json', true],
    ['sil', 'context/SELF_IMPROVEMENT_LOOP.md', false],
    ['taskBoard', 'context/TASK_BOARD.md', false],
    ['handoff', 'context/LATEST_HANDOFF.md', false],
    ['genome', 'context/GENOME_HISTORY.json', true],
    ['state', 'context/STATE_VECTOR.json', true],
    ['cdr', 'docs/CREATIVE_DIRECTION_RECORD.md', false],
    ['sessionPlan', 'docs/SESSION_PLAN.md', false],
    ['startMd', 'prompts/start.md', false],
    ['startTpl', 'docs/templates/project-system/START_PROMPT.template.md', false],
    ['registry', 'portfolio/PROJECT_REGISTRY.json', true],
  ].map(([key, relative, json]) => ({ key, path: path.join(root, relative), json }));
  manifest.push(
    { key: 'revSig', path: revenueSignalsPath, json: false },
    { key: 'doctorOut', path: path.join(root, 'context', 'PROJECT_STATUS.json'), json: true },
  );

  const startedAt = Date.now();
  const loaded = await Promise.all(manifest.map(async ({ key, path: filePath, json }) => {
    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      return { key, value: json ? JSON.parse(data) : data };
    } catch {
      return { key, value: json ? {} : '' };
    }
  }));
  return {
    fileCache: Object.fromEntries(loaded.map(({ key, value }) => [key, value])),
    revenueSignalsPath,
    elapsedMs: Date.now() - startedAt,
  };
}
