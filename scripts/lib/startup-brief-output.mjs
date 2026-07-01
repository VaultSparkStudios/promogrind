import fs from 'fs';
import path from 'path';
import { spawnSync } from './safe-spawn.mjs';

export async function writeStartupBriefWithTelemetry({
  root,
  scriptsDir,
  node = process.execPath,
  outputPath,
  briefBody,
  currentSession,
  silTotal,
  silMax,
  pct,
  openNow,
  openBlocked,
  signals,
  today,
  env = process.env,
}) {
  let body = briefBody;
  try {
    const { enforceTileBudgets } = await import('../validate-brief-format.mjs');
    const result = enforceTileBudgets(body);
    body = result.body;
    for (const trimmed of result.trimmed) {
      console.log(`  ✂ tile trimmed to budget: ${trimmed.title} (−${trimmed.dropped} lines, cap ${(trimmed.budget / 1024).toFixed(1)}KB)`);
    }
  } catch {
    // Budget enforcement is advisory at render time; validate-brief-format is the hard gate.
  }

  fs.writeFileSync(outputPath, body, 'utf8');
  console.log(`✓ Startup brief → docs/STARTUP_BRIEF.md  (v3.2)`);
  console.log(`  Session ${currentSession} · SIL ${silTotal}/${silMax} · ${pct} · Unblocked ${openNow.length} / Blocked ${openBlocked.length}`);
  console.log(`  Signals: ${signals.join('  ')}`);

  await recordStartupBriefCost({ root, currentSession, body });
  runBriefV5DualRender({
    root,
    scriptsDir,
    node,
    outputPath,
    currentSession,
    today,
    env,
  });

  return body;
}

async function recordStartupBriefCost({ root, currentSession, body }) {
  try {
    const { recordSkillCost } = await import('./skill-cost-ledger.mjs');
    const approxTokens = Math.ceil(Buffer.byteLength(body, 'utf8') / 4);
    recordSkillCost(root, {
      sessionId: `S${currentSession}`,
      skill: 'start',
      model: 'script',
      inputTokens: approxTokens,
      outputTokens: 0,
      elapsedMs: 0,
      note: 'render-startup-brief output size',
    });
  } catch {
    // Telemetry must never break /start.
  }
}

function runBriefV5DualRender({ root, scriptsDir, node, outputPath, currentSession, today, env }) {
  const v5Mode = env.STUDIO_BRIEF_V5
    || (fs.existsSync(path.join(root, '.cache', 'brief-v5-enable.flag')) ? 'shadow' : '');
  if (!v5Mode || v5Mode === '0') return;

  try {
    const v5Path = path.resolve(scriptsDir, 'render-startup-brief-v5.mjs');
    if (!fs.existsSync(v5Path)) return;
    const v5File = outputPath.replace(/STARTUP_BRIEF\.md$/, 'STARTUP_BRIEF.v5.md');
    const envNext = { ...env, STUDIO_BRIEF_NO_DOCTOR_FIX: '1', STUDIO_BRIEF_V5: '0', BRIEF_V5_OUT: v5File };
    const started = Date.now();
    const result = spawnSync(node, [v5Path, '--out', v5File], { cwd: root, env: envNext, encoding: 'utf8', timeout: 30000 });
    const elapsed = Date.now() - started;
    if (result.status === 0 && fs.existsSync(v5File)) {
      const v5 = fs.readFileSync(v5File, 'utf8');
      const v3Size = fs.statSync(outputPath).size;
      const v5Size = Buffer.byteLength(v5, 'utf8');
      const savings = v3Size > 0 ? Math.round((1 - v5Size / v3Size) * 100) : 0;
      fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
      fs.writeFileSync(path.join(root, '.cache', 'brief-v5-metrics.json'), JSON.stringify({
        generatedAt: new Date().toISOString(),
        session: currentSession,
        v3Bytes: v3Size,
        v5Bytes: v5Size,
        savingsPct: savings,
        elapsedMs: elapsed,
        promoted: v5Mode === 'promote',
      }, null, 2) + '\n');
      if (v5Mode === 'promote') {
        const hasStub = /\[\[computed-block:/.test(v5);
        const valid = spawnSync(node, [path.join(scriptsDir, 'validate-brief-format.mjs'), v5File], { cwd: root });
        if (!hasStub && valid.status === 0) {
          fs.copyFileSync(v5File, outputPath);
          process.stderr.write(`  ✓ brief-v5 promoted (${savings}% smaller)\n`);
        } else {
          process.stderr.write(`  ⚠ brief-v5 promotion BLOCKED — ${hasStub ? 'unresolved computed-block stub' : 'failed validate-brief-format'}; keeping v3.1 canonical.\n`);
        }
      } else {
        process.stderr.write(`  v5 shadow: ${savings}% smaller (${v5Size}/${v3Size} bytes) · ${elapsed}ms\n`);
      }
    } else if (result.stderr) {
      process.stderr.write(`  ⚠ v5 shadow render failed: ${String(result.stderr).slice(0, 200)}\n`);
    }
  } catch (error) {
    process.stderr.write(`  ⚠ v5 dual-render skipped: ${error.message}\n`);
  }
}
