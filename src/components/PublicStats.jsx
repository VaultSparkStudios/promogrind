import React, { useEffect, useState } from 'react';
import { K, font, fontD } from '../lib/shared.js';
import { STATS_URL, STATS_POLL_MS, validatePublicStats, statsAreStale, metricDisplay } from '../lib/publicStats.js';

export function usePublicStats() {
  const [state, setState] = useState({ feed: null, loading: true, error: false, now: Date.now() });
  useEffect(() => {
    let active = true;
    let controller;
    let busy = false;
    async function refresh() {
      if (busy) return;
      busy = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(STATS_URL, { signal: controller.signal, cache: 'no-cache', credentials: 'omit' });
        if (!response.ok) throw new Error('Unavailable');
        const feed = validatePublicStats(await response.json());
        if (active) setState({ feed, loading: false, error: false, now: Date.now() });
      } catch {
        if (active) setState(previous => ({ ...previous, loading: false, error: true, now: Date.now() }));
      } finally { clearTimeout(timeout); busy = false; }
    }
    refresh();
    const interval = setInterval(refresh, STATS_POLL_MS);
    const clock = setInterval(() => { if (active) setState(previous => ({ ...previous, now: Date.now() })); }, 30000);
    return () => { active = false; controller?.abort(); clearInterval(interval); clearInterval(clock); };
  }, []);
  return { ...state, stale: state.feed ? statsAreStale(state.feed, state.now) : false };
}

const box = () => ({ background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 18, padding: 'clamp(18px, 3vw, 28px)' });
const link = () => ({ color: K.gn, minHeight: 44, display: 'inline-flex', alignItems: 'center', fontWeight: 700 });
export function StatsSummary({ state, detailed = false }) {
  const { feed, loading, error, stale } = state;
  return <section aria-labelledby={detailed ? 'weekly-heading' : 'community-heading'} data-public-stats style={{ ...box(), fontFamily: font, color: K.tx }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div><div style={{ color: K.gn, fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>THE COMMUNITY, IN CONTEXT</div>
        <h2 id={detailed ? 'weekly-heading' : 'community-heading'} style={{ fontFamily: fontD, fontSize: 26, margin: '10px 0' }}>Saved work. Recorded outcomes.</h2></div>
      {!detailed && <a href='/stats' style={link()}>Explore the stats →</a>}
    </div>
    <p style={{ color: K.dm, lineHeight: 1.7, margin: '0 0 18px' }}>A weekly view of how people use PromoGrind’s saved workflows. These figures describe activity, not betting performance.</p>
    <p role='status' style={{ color: error || stale ? K.yl : K.dm, fontSize: 14, lineHeight: 1.6 }}>
      {loading ? 'Loading community statistics…' : !feed ? 'Statistics unavailable. The source has not returned a verified report; no counts are shown.' : `${stale ? 'Stale report — the daily refresh is overdue. ' : ''}${error ? 'Refresh failed — showing the last dated report. ' : ''}Computed ${new Date(feed.generatedAt).toLocaleString()} · daily refresh`}
    </p>
    {feed && <>
      <p style={{ color: K.dm, fontSize: 14 }}>Latest complete week: {feed.metrics[0].period}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12 }}>
        {feed.metrics.map(metric => <article key={metric.id} style={{ padding: 20, borderRadius: 12, background: K.s2, border: `1px solid ${K.bd}` }}>
          <div style={{ color: K.dm, fontSize: 14 }}>{metric.label}</div>
          <div style={{ color: K.gn, fontFamily: fontD, fontWeight: 800, fontSize: 34, margin: '10px 0' }}>{metricDisplay(metric)}</div>
          <p style={{ color: K.dm, lineHeight: 1.6, fontSize: 14, margin: 0 }}>{metric.available === false ? metric.unavailableReason : metric.value === 0 ? 'No qualifying records observed.' : 'A range, to protect individual activity.'}</p>
          <p style={{ color: K.dm, fontSize: 12, marginBottom: 0 }}>As of {new Date(metric.computedAt).toLocaleString()}</p>
        </article>)}
      </div>
    </>}
    <p style={{ color: K.dm, fontSize: 14, lineHeight: 1.7, marginBottom: 0 }}>Small groups stay private. Guest calculations and local-only activity are outside this report.</p>
  </section>;
}
export default function PublicStats() {
  return <StatsSummary state={usePublicStats()} />;
}
export { link as statsLinkStyle };
