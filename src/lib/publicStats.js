export const STATS_URL = '/stats.json';
export const STATS_POLL_MS = 300000;
const ids = ['workflow-contributors', 'workflows-saved', 'outcomes-recorded'];
export function validatePublicStats(feed, now = Date.now()) {
  if (feed?.feedVersion !== 'analytica-feed-v1' || feed.project?.slug !== 'promogrind' || feed.precomputed !== true || feed.refreshSeconds !== 86400 || feed.privacy?.aggregateOnly !== true || feed.privacy?.smallCountThreshold !== 10) throw new Error('Invalid statistics feed');
  if (!Number.isFinite(Date.parse(feed.generatedAt)) || Date.parse(feed.generatedAt) > now + 60000) throw new Error('Invalid feed date');
  if (JSON.stringify(feed.showcase) !== JSON.stringify(ids) || !Array.isArray(feed.metrics) || feed.metrics.length !== 3 || !Array.isArray(feed.history) || feed.history.length !== 3) throw new Error('Incomplete statistics feed');
  for (const group of [feed, ...feed.history]) {
    if (!Array.isArray(group.metrics) || group.metrics.length !== 3) throw new Error('Incomplete weekly metrics');
    group.metrics.forEach((m, i) => {
      if (m.id !== ids[i] || m.public !== true || !m.label || !m.period || !m.unitOrDenominator || !m.interpretation || !Number.isFinite(Date.parse(m.computedAt)) || Date.parse(m.computedAt) > now + 60000) throw new Error('Invalid metric');
      if (m.available === false) {
        if ('value' in m || !m.unavailableReason) throw new Error('Unavailable metric contains a value');
      } else if (!(m.available === true && ((m.value === 0 && m.smallCountOk === true) || (m.banded === true && /^\d+–\d+$/.test(m.value) && Number(m.value.split('–')[0]) >= 10 && Number(m.value.split('–')[0]) % 10 === 0 && Number(m.value.split('–')[1]) === Number(m.value.split('–')[0]) + 9)))) throw new Error('Unprotected metric');
    });
  }
  return feed;
}
export function statsAreStale(feed, now = Date.now()) {
  return now - Math.min(Date.parse(feed.generatedAt), ...feed.metrics.map(m => Date.parse(m.computedAt))) > feed.refreshSeconds * 1000;
}
export function metricDisplay(metric) {
  return metric.available === false ? (metric.privacySuppressed ? 'Private' : 'Unavailable') : String(metric.value);
}
