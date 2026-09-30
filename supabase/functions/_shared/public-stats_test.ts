import { buildPublicStats } from './public-stats.ts';
const now = new Date('2026-09-30T06:00:00Z');
export function source(count = 0, contributors = count) {
  return { computedAt: now.toISOString(), weeks: Array.from({ length: 4 }, (_, i) => ({
    start: new Date(Date.parse('2026-09-21T00:00:00Z') - i * 604800000).toISOString(),
    end: new Date(Date.parse('2026-09-28T00:00:00Z') - i * 604800000).toISOString(),
    contributors, workflows: count, outcomes: count, outcomeContributors: contributors,
  })) };
}
function assert(ok: unknown, message = 'assertion failed') { if (!ok) throw new Error(message); }
function rejects(fn: () => unknown) { let rejected = false; try { fn(); } catch { rejected = true; } assert(rejected, 'expected rejection'); }
Deno.test('observed zero is explicit and distinct from withheld', () => {
  const feed = buildPublicStats(source(), now);
  assert(feed.metrics.every(m => m.available === true && 'value' in m && m.value === 0));
});
Deno.test('a prolific single account cannot reveal its activity', () => {
  const feed = buildPublicStats(source(912, 1), now);
  assert(feed.metrics.every(m => !m.available && !('value' in m)));
  assert(!JSON.stringify(feed).includes('912'));
});
Deno.test('threshold boundary and band endpoints are exact without rounding up counts', () => {
  for (const [count, expected] of [[10, '10–19'], [19, '10–19'], [20, '20–29']] as const) {
    const feed = buildPublicStats(source(count), now);
    assert(feed.metrics.every(m => 'value' in m && m.value === expected));
  }
  assert(buildPublicStats(source(9), now).metrics.every(m => !m.available));
});
Deno.test('outcome contributor privacy is independent of the workflow cohort', () => {
  const input = source(40, 20); input.weeks[0].outcomeContributors = 2;
  const feed = buildPublicStats(input, now);
  assert(feed.metrics[0].available && !feed.metrics[2].available);
});
Deno.test('source extras and identities never cross the public boundary', () => {
  const input = { ...source(17, 10), email: 'private@example.test', user_id: 'secret-id', actual_profit: 17432 };
  const json = JSON.stringify(buildPublicStats(input, now));
  for (const secret of ['private@example.test', 'secret-id', '17432', 'outcomeContributors', 'actual_profit']) assert(!json.includes(secret));
});
Deno.test('missing, future, stale and malformed data fail closed', () => {
  for (const computedAt of ['bad', '2026-09-30T07:00:00Z', '2026-09-29T06:00:00Z']) rejects(() => buildPublicStats({ ...source(), computedAt }, now));
  rejects(() => buildPublicStats({ ...source(), weeks: [] }, now));
  for (const count of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) rejects(() => buildPublicStats(source(count), now));
  rejects(() => buildPublicStats(source(9, 10), now));
});
Deno.test('overlapping, partial and unordered periods cannot be published', () => {
  const duplicate = source(); duplicate.weeks[1] = duplicate.weeks[0];
  rejects(() => buildPublicStats(duplicate, now));
  const partial = source(); partial.weeks[0].end = now.toISOString();
  rejects(() => buildPublicStats(partial, now));
});
Deno.test('every historical period applies the same suppression and has its own dates', () => {
  const input = source(40, 20); input.weeks[2].contributors = 1; input.weeks[2].outcomeContributors = 1;
  const feed = buildPublicStats(input, now);
  assert(feed.history.length === 3 && feed.history[1].metrics.every(m => !m.available));
  assert(new Set([feed.metrics[0].period, ...feed.history.map(w => w.metrics[0].period)]).size === 4);
});
