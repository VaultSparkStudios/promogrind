import { describe, it, expect } from 'vitest';
import { buildPublicStats } from '../../supabase/functions/_shared/public-stats.ts';
import { validatePublicStats, statsAreStale, metricDisplay } from '../lib/publicStats.js';
const now = new Date('2026-09-30T06:00:00Z');
function feed(count = 0) {
  return buildPublicStats({ computedAt: now.toISOString(), weeks: Array.from({ length: 4 }, (_, i) => ({
    start: new Date(Date.parse('2026-09-21T00:00:00Z') - i * 604800000).toISOString(),
    end: new Date(Date.parse('2026-09-28T00:00:00Z') - i * 604800000).toISOString(),
    contributors: count, workflows: count, outcomes: count, outcomeContributors: count,
  })) }, now);
}
describe('public stats trust boundary', () => {
  it('accepts the real producer shape, observed zero and privacy suppression', () => {
    for (const count of [0, 1, 9, 10, 19, 30]) expect(validatePublicStats(feed(count), +now)).toBeTruthy();
    expect(metricDisplay(feed(1).metrics[0])).toBe('Private');
    expect(metricDisplay(feed(0).metrics[0])).toBe('0');
  });
  it('rejects foreign, future and malformed feeds', () => {
    for (const mutate of [f => { f.project.slug = 'foreign'; }, f => { f.precomputed = false; }, f => { f.generatedAt = '2099-01-01'; }, f => { f.metrics = []; }, f => { f.history = []; }]) {
      const f = feed(); mutate(f); expect(() => validatePublicStats(f, +now)).toThrow();
    }
  });
  it('never displays an exact nonzero count or a value declared unavailable', () => {
    for (const value of [1, 15, '1–9', '10–22', '20–21']) { const f = feed(10); f.metrics[0].value = value; expect(() => validatePublicStats(f, +now)).toThrow(); }
    const f = feed(1); f.metrics[0].value = 0; expect(() => validatePublicStats(f, +now)).toThrow();
  });
  it('a fresh envelope cannot launder stale metric dates', () => {
    const f = feed();
    expect(statsAreStale(f, +now + 86400001)).toBe(true);
    f.generatedAt = new Date(+now + 86400001).toISOString();
    expect(statsAreStale(f, +now + 86400001)).toBe(true);
    expect(statsAreStale(feed(), +now + 86399999)).toBe(false);
  });
  it('applies validation to hidden history as well as showcased values', () => {
    const f = feed(); f.history[1].metrics[0].value = 2;
    expect(() => validatePublicStats(f, +now)).toThrow();
  });
});
