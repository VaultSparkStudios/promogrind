import fs from 'fs';
import path from 'path';
import { forecastNext, parseSilHistory } from './sil-forecaster.mjs';

const W = 62;

function pad(s, w) { const str = String(s ?? ''); return str.length >= w ? str.slice(0, w) : str + ' '.repeat(w - str.length); }
function row(content) { return `║  ${pad(content, W)}  ║`; }
function top(title) {
  const t = title ? `══ ${title} ` : '';
  return '╔' + t + '═'.repeat(Math.max(1, W + 2 - t.length)) + '╗';
}
function bot() { return '╚' + '═'.repeat(W + 2) + '╝'; }

function readText(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

export function renderIgnisInsightBlock(ignisInsight) {
  if (!ignisInsight?.present) return null;
  const out = [top('IGNIS INSIGHT')];
  if (ignisInsight.generated) out.push(row(`Synth:    ${ignisInsight.generated} (${ignisInsight.daysSinceSynth}d old) · ${ignisInsight.phase || ''}`.slice(0, W)));
  if (ignisInsight.avgIq) out.push(row(`Avg IQ:   ${ignisInsight.avgIq}`.slice(0, W)));
  if (ignisInsight.coverage) out.push(row(`Coverage: ${ignisInsight.coverage}`.slice(0, W)));
  if (ignisInsight.topProject) out.push(row(`Top:      ${ignisInsight.topProject}`.slice(0, W)));
  if (ignisInsight.topRisk) out.push(row(`Top risk: ${ignisInsight.topRisk}`.slice(0, W)));
  if (ignisInsight.truthMix) out.push(row(`Truth:    ${ignisInsight.truthMix}`.slice(0, W)));
  if (ignisInsight.firstAction) out.push(row(`Do next:  ${ignisInsight.firstAction}`.slice(0, W)));
  if (ignisInsight.summaryLead) out.push(row(`Summary:  ${ignisInsight.summaryLead}`.slice(0, W)));
  out.push(bot());
  return out.join('\n');
}

export function renderExternalSignalsBlock({ root }) {
  const log = readText(path.join(root, 'portfolio', 'EXTERNAL_SIGNAL_LOG.md'));
  if (!log) return null;
  const entries = log.split(/^### /m).slice(1);
  if (entries.length === 0) return null;
  const latest = entries[entries.length - 1];
  const title = latest.split(/\r?\n/)[0]?.trim() || 'latest signal';
  const body = latest.split(/\r?\n/).slice(1).join(' ').replace(/\s+/g, ' ').trim();
  const out = [top('EXTERNAL SIGNALS')];
  out.push(row(`${entries.length} logged · latest: ${title}`.slice(0, W)));
  if (body) out.push(row(body.slice(0, W)));
  out.push(bot());
  return out.join('\n');
}

export function renderExecutionPlanBlock({ intentLine, repoTouchLine, yieldLine }) {
  if (!intentLine) return [];
  return [
    top('EXECUTION PLAN'),
    row(`Intent:        ${intentLine.slice(0, W - 15)}`),
    ...(repoTouchLine ? [row(`Repo touch:    ${repoTouchLine.slice(0, W - 15)}`)] : []),
    ...(yieldLine ? [row(`Expected:      ${yieldLine.slice(0, W - 15)}`)] : []),
    bot(),
    ``,
  ];
}

export function renderHumanPressureBlock(topPressure) {
  if (!topPressure) return [];
  return [
    top('HUMAN PRESSURE'),
    row(`Top item:      ${topPressure.title.slice(0, W - 15)}`),
    row(`Pressure:      ${topPressure.pressureScore} · ${topPressure.pressureBand}`),
    row(`Next action:   ${topPressure.nextAgentAction.slice(0, W - 15)}`),
    bot(),
    ``,
  ];
}

export function renderMomentumMeterBlock({
  velHistBar,
  velocity,
  velTrend,
  intentPct,
  streak,
  cacheHitPct,
  weeklyCost,
}) {
  return [
    top('MOMENTUM METER'),
    row(`Velocity:   ${velHistBar || '—'}  ${velocity}${velTrend || '→'}  (last 5 sessions)`),
    row(`Intent:     ${intentPct || '?'}% achieved last 5`),
    row(`Streak:     ${streak > 0 ? `✓ ${streak} consecutive achieved-intent session${streak > 1 ? 's' : ''}` : '— (last intent not achieved)'}`),
    ...(cacheHitPct !== null ? [row(`Cache hit:  ${cacheHitPct}%  ${cacheHitPct >= 60 ? '✓ meeting target' : '⚠ below 60% target'}`)] : []),
    ...(weeklyCost !== null ? [row(`Weekly spend: $${weeklyCost.toFixed(2)}`)] : []),
    bot(),
    ``,
  ];
}

export function renderSilForecastBlock({ root, velocity, currentTotal, blockerPressure = 0, contextAge = 0 }) {
  try {
    const silTxt = fs.readFileSync(path.join(root, 'context', 'SELF_IMPROVEMENT_LOOP.md'), 'utf8');
    const sessions = parseSilHistory(silTxt);
    if (!sessions.length) return [];
    const f = forecastNext(sessions, { velocity, blockerPressure, contextAge });
    if (!f) return [];
    const diff = f.totalPredicted - sessions[0].total;
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
    const risky = Object.entries(f.categories)
      .filter(([, x]) => x.delta != null && x.delta <= -3)
      .sort((a, b) => a[1].delta - b[1].delta).slice(0, 3);
    const mitigationRow = buildMitigationRow({ root, risky });
    return [
      top('SIL FORECAST (next session)'),
      row(`Projected:  ${f.totalPredicted}/1000  (${arrow}${Math.abs(diff)} vs current ${currentTotal ?? sessions[0].total})`),
      ...(risky.length
        ? [row(`At-risk:    ${risky.map(([c, x]) => `${c} Δ${x.delta}`).join(' · ')}`)]
        : [row(`All categories forecast stable or rising.`)]),
      ...(mitigationRow ? [mitigationRow] : []),
      bot(),
      ``,
    ];
  } catch {
    return [];
  }
}

function buildMitigationRow({ root, risky }) {
  if (!risky.length) return null;
  try {
    const mit = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'SIL_MITIGATIONS.json'), 'utf8'));
    const [topRiskCat] = risky[0];
    const match = mit.mitigations?.[topRiskCat];
    return match?.hint ? row(`Mitigation: ${match.hint.slice(0, 56)}`) : null;
  } catch {
    return null;
  }
}
