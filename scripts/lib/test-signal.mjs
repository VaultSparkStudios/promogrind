// test-signal.mjs — S263. One honest reading of "are the tests green?"
//
// THE DEFECT THIS EXISTS TO KILL
//
// PROJECT_STATUS.json carries two independent test surfaces:
//
//   file-level      testsPassing / testsTotal          owned by refresh-test-count.mjs
//                                                      and test-proof-reconciliation.mjs
//   assertion-level testsAssertionsPassing / ...Total  owned by run-tests.mjs
//
// They are deliberately separate (S160 #4: one shared pair of fields made
// last-writer-wins flip the numbers). But `testsLastRun` — the freshness stamp
// that every consumer renders NEXT TO the file-level counts — was written by
// BOTH. run-tests.mjs stamped `new Date()` on it while refusing to write the
// counts it dates.
//
// The consequence, observed live at S263 start:
//
//   testsPassing 346/346          frozen since 2026-08-01 (commit c302e046)
//   testsLastRun "2026-08-03"     bumped by a RED run on 08-02
//   testsAssertions 2170/2184     RED
//
// So a failing run REFRESHED THE FRESHNESS of a stale green it did not produce.
// The startup brief rendered "✓ Tests 346/346 (2026-08-03)". The doctor `tests`
// probe computes staleness from that same field, so its anti-phantom-green guard
// was reset to zero days old by the very run that failed. Brief and doctor both
// reported green, from one defect, while the suite was red.
//
// THE RULE
//
// A freshness stamp belongs to the producer of the numbers it dates. Beyond that,
// two surfaces measuring the same thing must be RECONCILED, not read
// independently — when a newer assertion-level run contradicts an older
// file-level green, the green is not evidence. Say CONTRADICTED and name both
// sides; never silently prefer the reassuring one (CANON-031).

/** Parse a YYYY-MM-DD or ISO stamp to epoch ms; NaN when absent/unparseable. */
function stamp(v) {
  if (!v) return NaN;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : NaN;
}

function countList(v) {
  return Array.isArray(v) ? v.length : 0;
}

/**
 * resolveTestSignal(status) -> {
 *   state:    'green' | 'red' | 'contradicted' | 'unknown'
 *   passing, total, deferred, lastRun,
 *   assertionsPassing, assertionsTotal, assertionsLastRun,
 *   ok:       boolean  — true ONLY for a clean green
 *   detail:   string   — human-readable, always names the evidence
 * }
 *
 * Pure function of the status object. No I/O, no clock — callers that need
 * staleness compare `lastRun` themselves, so this stays testable.
 */
export function resolveTestSignal(status = {}) {
  if (status.testsLatestRunState === 'inconclusive') {
    return { state: 'unknown', ok: false, detail: 'latest full test run was inconclusive — green evidence was not refreshed' };
  }
  const passing = status.testsPassing;
  const total = status.testsTotal;
  const deferred = countList(status.testsDeferred);
  const lastRun = status.testsLastRun || null;

  const aPass = status.testsAssertionsPassing;
  const aTotal = status.testsAssertionsTotal;
  const aLastRun = status.testsAssertionsLastRun || null;

  const base = {
    passing, total, deferred, lastRun,
    assertionsPassing: aPass, assertionsTotal: aTotal, assertionsLastRun: aLastRun,
  };

  const fileLevelKnown = typeof passing === 'number' && typeof total === 'number' && total > 0;
  const assertionsKnown = typeof aPass === 'number' && typeof aTotal === 'number' && aTotal > 0;

  if (!fileLevelKnown && !assertionsKnown) {
    return { ...base, state: 'unknown', ok: false, detail: 'no test run recorded — run: node scripts/run-tests.mjs' };
  }

  let assertionsRed = assertionsKnown && aPass < aTotal;
  const fileRed = fileLevelKnown && passing < total;

  // Is the assertion-level red SUPERSEDED by a strictly newer file-level green?
  // Once a newer full green run lands, an older red is history. Without this the
  // signal would stay red forever after any single failure — and a gate nobody
  // can ever clear is a gate that gets ignored or disabled. Missing stamps are
  // treated as contemporaneous rather than "old", so an unstamped red is never
  // quietly dismissed.
  const fileMs = stamp(lastRun);
  const aMs = stamp(aLastRun);
  const assertionsSuperseded =
    !fileRed && Number.isFinite(fileMs) && Number.isFinite(aMs) && aMs < fileMs;
  if (assertionsSuperseded) assertionsRed = false;

  // The contradiction case: a CURRENT assertion-level RED standing beside a
  // file-level GREEN. The green describes a world that no longer exists.
  if (assertionsRed && !fileRed && fileLevelKnown) {
    return {
      ...base,
      state: 'contradicted',
      ok: false,
      detail:
        `file-level ${passing}/${total}${lastRun ? ` (${lastRun})` : ''} reads green, but the ` +
        `assertion-level run is RED at ${aPass}/${aTotal}${aLastRun ? ` (${aLastRun})` : ''} — ` +
        `the green is stale, not evidence`,
    };
  }

  if (assertionsRed || fileRed) {
    const parts = [];
    if (fileRed) parts.push(`${passing}/${total} files`);
    if (assertionsRed) parts.push(`${aPass}/${aTotal} assertions`);
    return { ...base, state: 'red', ok: false, detail: `suite RED — ${parts.join(' · ')}` };
  }

  const defNote = deferred ? ` · ${deferred} deferred (not counted green)` : '';
  return {
    ...base,
    state: 'green',
    ok: true,
    detail: `${passing}/${total} files${assertionsKnown ? ` · ${aPass}/${aTotal} assertions` : ''}${defNote}`,
  };
}

export default { resolveTestSignal };
