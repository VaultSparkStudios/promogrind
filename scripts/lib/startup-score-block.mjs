// startup-score-block.mjs
// Pure SCORE block renderer for scripts/render-startup-brief.mjs.

const W = 62;

function pad(s, w) { const str = String(s ?? ''); return str.length >= w ? str.slice(0, w) : str + ' '.repeat(w - str.length); }
function row(content) { return `║  ${pad(content, W)}  ║`; }
function blank() { return `║  ${' '.repeat(W)}  ║`; }
function top(title) {
  const t = title ? `══ ${title} ` : '';
  return '╔' + t + '═'.repeat(Math.max(1, W + 2 - t.length)) + '╗';
}
function bot() { return '╚' + '═'.repeat(W + 2) + '╝'; }

export function renderStartupScoreBlock({
  silTotal,
  silMax,
  bar24,
  pct,
  avg3Raw,
  velocity,
  velTrend,
  silStreak,
  daysSinceActive,
  daysSinceClosedOut,
  velHistBar,
  sparkline,
  velLast5,
  bar10,
  spark,
  trend,
  catHistory,
  cat3,
  lastDev,
  lastAlign,
  lastMomentum,
  lastEngage,
  lastProcess,
  lastCoherence,
  lastSecurity,
  lastEcosystem,
  lastCapital,
  lastAutomation,
}) {
  const streak = silStreak >= 2
    ? `  ·  Streak ${silStreak}${silStreak >= 8 ? ' 🔥' : silStreak >= 4 ? ' ✦' : ''}`
    : '';
  return [
    top('SCORE'),
    blank(),
    row(`  ${silTotal}/${silMax}   ${bar24(silTotal, silMax)}   ${pct}`),
    row(`  SIL v3.0  ·  Avg3: ${avg3Raw ?? '?'}  ·  Velocity ${velocity}${velTrend || '→'}${streak}`),
    row(`  Last active: ${daysSinceActive}d  ·  Last closeout: ${daysSinceClosedOut}d  ·  (active = newest of SIL/status/handoff)`),
    row(`  Trend  ${velHistBar || sparkline}  ${velTrend || '→'}  (last ${(velLast5 || []).length || 5} sessions)`),
    blank(),
    row(`  Category         Score  Bar        Spark   Δ`),
    row(`  ─────────────── ────── ────────── ──────── ─`),
    row(`  Dev Health      ${String(lastDev).padStart(3)}    ${bar10(lastDev)}  ${spark(catHistory.dev).padEnd(8)} ${trend(lastDev, cat3.dev)}`),
    row(`  Alignment       ${String(lastAlign).padStart(3)}    ${bar10(lastAlign)}  ${spark(catHistory.align).padEnd(8)} ${trend(lastAlign, cat3.align)}`),
    row(`  Momentum        ${String(lastMomentum).padStart(3)}    ${bar10(lastMomentum)}  ${spark(catHistory.momentum).padEnd(8)} ${trend(lastMomentum, cat3.momentum)}`),
    row(`  Engagement      ${String(lastEngage).padStart(3)}    ${bar10(lastEngage)}  ${spark(catHistory.engage).padEnd(8)} ${trend(lastEngage, cat3.engage)}`),
    row(`  Process Qual    ${String(lastProcess).padStart(3)}    ${bar10(lastProcess)}  ${spark(catHistory.process).padEnd(8)} ${trend(lastProcess, cat3.process)}`),
    row(`  Coherence       ${String(lastCoherence).padStart(3)}    ${bar10(lastCoherence)}  ${'·'.repeat(8)} →`),
    row(`  Security        ${String(lastSecurity).padStart(3)}    ${bar10(lastSecurity)}  ${'·'.repeat(8)} →`),
    row(`  Ecosystem       ${String(lastEcosystem).padStart(3)}    ${bar10(lastEcosystem)}  ${'·'.repeat(8)} →`),
    row(`  Capital         ${String(lastCapital).padStart(3)}    ${bar10(lastCapital)}  ${'·'.repeat(8)} →`),
    row(`  Automation      ${String(lastAutomation).padStart(3)}    ${bar10(lastAutomation)}  ${'·'.repeat(8)} →`),
    blank(),
    bot(),
  ].join('\n');
}
