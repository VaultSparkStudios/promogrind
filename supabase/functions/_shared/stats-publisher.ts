import { withSchedulerAuthorization } from './scheduler-auth.ts';
import { buildPublicStats } from './public-stats.ts';
export const STATS_TARGET = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
export function createStatsPublisher({ key, url, request = fetch, clock = () => new Date() }: {
  key: string; url: string; request?: typeof fetch; clock?: () => Date;
}) {
  return withSchedulerAuthorization(key, async () => {
    try {
      if (url !== STATS_TARGET) throw new Error('Wrong target');
      const headers = { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' };
      const source = await request(`${url}/rest/v1/rpc/public_stats_source`, {
        method: 'POST', headers, body: '{}', signal: AbortSignal.timeout(15000),
      });
      if (!source.ok) throw new Error('Source unavailable');
      const feed = buildPublicStats(await source.json(), clock());
      const upload = await request(`${url}/storage/v1/object/public-stats/stats.json`, {
        method: 'POST', headers: { ...headers, 'x-upsert': 'true', 'cache-control': 'max-age=300' },
        body: JSON.stringify(feed), signal: AbortSignal.timeout(15000),
      });
      if (!upload.ok) throw new Error('Publication failed');
      return Response.json({ ok: true, generatedAt: feed.generatedAt, metrics: feed.metrics.length });
    } catch {
      return Response.json({ ok: false, error: 'Stats refresh failed; prior artifact retained.' }, { status: 503 });
    }
  });
}
