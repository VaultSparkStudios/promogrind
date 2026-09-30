import { createStatsPublisher, STATS_TARGET } from './stats-publisher.ts';
const now = new Date('2026-09-30T06:00:00Z');
const key = 'test-only-authority';
const source = () => ({ computedAt: now.toISOString(), weeks: Array.from({ length: 4 }, (_, i) => ({
  start: new Date(Date.parse('2026-09-21T00:00:00Z') - i * 604800000).toISOString(),
  end: new Date(Date.parse('2026-09-28T00:00:00Z') - i * 604800000).toISOString(),
  contributors: 1, workflows: 999, outcomes: 999, outcomeContributors: 1,
})) });
const authorized = () => new Request('https://example.test', { method: 'POST', headers: { Authorization: `Bearer ${key}` } });
function assert(value: unknown) { if (!value) throw new Error('assertion failed'); }
Deno.test('publisher refuses unauthorized requests and wrong project before effects', async () => {
  let calls = 0;
  const request: typeof fetch = () => { calls++; return Promise.resolve(Response.json({})); };
  const handler = createStatsPublisher({ key, url: STATS_TARGET, request });
  assert((await handler(new Request('https://example.test', { method:'POST' }))).status === 401);
  assert((await createStatsPublisher({ key, url: 'https://foreign.supabase.co', request })(authorized())).status === 503);
  assert(calls === 0);
});
Deno.test('source failure never uploads zeroes or refreshes old artifacts', async () => {
  let calls = 0;
  const request: typeof fetch = () => { calls++; return Promise.resolve(new Response('private database error', { status: 503 })); };
  const r = await createStatsPublisher({ key, url: STATS_TARGET, request })(authorized());
  assert(r.status === 503 && calls === 1 && !(await r.text()).includes('private database error'));
});
Deno.test('malformed source never reaches storage', async () => {
  let calls = 0;
  const request: typeof fetch = () => { calls++; return Promise.resolve(Response.json({ weeks: [] })); };
  assert((await createStatsPublisher({ key, url: STATS_TARGET, request })(authorized())).status === 503);
  assert(calls === 1);
});
Deno.test('publication sends only sanitized aggregates to the pinned object', async () => {
  const calls: Array<{url: string; body: string}> = [];
  const request: typeof fetch = (url, options) => {
    calls.push({ url: String(url), body: String(options?.body) });
    return Promise.resolve(Response.json(calls.length === 1 ? source() : {}));
  };
  const r = await createStatsPublisher({ key, url: STATS_TARGET, request, clock: () => now })(authorized());
  assert(r.status === 200 && calls.length === 2);
  assert(calls[1].url === `${STATS_TARGET}/storage/v1/object/public-stats/stats.json`);
  assert(!calls[1].body.includes('999') && !calls[1].body.includes(key));
  assert(JSON.parse(calls[1].body).metrics.every((m: {available: boolean}) => !m.available));
});
Deno.test('failed upload cannot report successful refresh', async () => {
  let calls = 0;
  const request: typeof fetch = () => Promise.resolve(++calls === 1 ? Response.json(source()) : new Response('denied', { status: 403 }));
  assert((await createStatsPublisher({ key, url: STATS_TARGET, request, clock: () => now })(authorized())).status === 503);
});
