import React, { useEffect } from 'react';
import { K, font, fontD } from '../lib/shared.js';
import { AppFooter } from '../app/AppChrome.jsx';
import { usePublicStats, StatsSummary, statsLinkStyle } from '../components/PublicStats.jsx';
import { metricDisplay } from '../lib/publicStats.js';

export default function StatsRoute({ darkMode, toggleTheme }) {
  const state = usePublicStats();
  const { feed } = state;
  useEffect(() => { const old = document.title; document.title = 'Community Stats — PromoGrind'; return () => { document.title = old; }; }, []);
  return <div style={{ minHeight: '100vh', background: K.bg, color: K.tx, fontFamily: font }}>
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '24px clamp(16px, 4vw, 40px) 48px' }}>
      <nav aria-label='Statistics navigation' style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <a href='/' style={statsLinkStyle()}>← PromoGrind</a>
        <button onClick={toggleTheme} aria-label={`Switch stats page to ${darkMode ? 'light' : 'dark'} theme`} style={{ minHeight: 44, padding: '10px 16px', border: `1px solid ${K.bd}`, borderRadius: 10, background: K.s1, color: K.tx, cursor: 'pointer' }}>{darkMode ? 'Light theme' : 'Dark theme'}</button>
      </nav>
      <header style={{ padding: '32px 0 24px', maxWidth: 780 }}>
        <p style={{ color: K.gn, fontSize: 14, letterSpacing: 2, fontWeight: 800 }}>COMMUNITY REPORT</p>
        <h1 style={{ fontFamily: fontD, fontSize: 'clamp(34px, 5vw, 54px)', letterSpacing: '-1.5px', lineHeight: 1.08, margin: '12px 0 18px' }}>What gets saved.<br />What gets followed through.</h1>
        <p style={{ color: K.dm, lineHeight: 1.8, fontSize: 16 }}>An open look at recorded workflow activity, with the limits beside the numbers. No winnings claims, private account details, or estimates of unmeasured activity.</p>
      </header>
      <StatsSummary state={state} detailed />
      <section style={{ marginTop: 36 }}>
        <h2 style={{ fontFamily: fontD, fontSize: 25 }}>Four weeks, side by side</h2>
        <p style={{ color: K.dm, lineHeight: 1.7 }}>Each row is a separate, complete UTC week. Ranges overlap, so small movements cannot establish growth or decline. Withheld figures never contribute to a published total or percentage.</p>
        {feed ? <div style={{ display: 'grid', gap: 12 }}>
          {[{ metrics: feed.metrics }, ...feed.history].map((week, i) => <article key={week.metrics[0].period} style={{ background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 14, padding: 20 }}>
            <h3 style={{ fontSize: 14, margin: '0 0 16px' }}>{i === 0 ? 'Latest week · ' : ''}{week.metrics[0].period}</h3>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, margin: 0 }}>
              {week.metrics.map(metric => <div key={metric.id}><dt style={{ color: K.dm, fontSize: 14 }}>{metric.label}</dt><dd style={{ margin: '6px 0', color: K.gn, fontSize: 23, fontWeight: 800 }}>{metricDisplay(metric)}</dd><div style={{ color: K.dm, fontSize: 12, lineHeight: 1.6 }}>{metric.available === false && <div>{metric.unavailableReason}</div>}As of {new Date(metric.computedAt).toLocaleString()}</div></div>)}
            </dl>
          </article>)}
        </div> : <p style={{ color: K.dm }}>History will appear when a verified source report is available.</p>}
      </section>
      <section style={{ marginTop: 36 }}>
        <h2 style={{ fontFamily: fontD, fontSize: 25 }}>How to read this report</h2>
        {feed?.metrics.map(metric => <div key={metric.id} style={{ padding: '18px 0', borderBottom: `1px solid ${K.bd}` }}>
          <h3 style={{ fontSize: 16, marginTop: 0 }}>{metric.label}</h3><p style={{ color: K.dm, lineHeight: 1.8 }}>{metric.unitOrDenominator}</p><p style={{ color: K.tx, lineHeight: 1.8, marginBottom: 0 }}>{metric.interpretation}</p>
        </div>)}
        <p style={{ color: K.dm, lineHeight: 1.8 }}>Only aggregate counts are published. Each nonzero figure requires at least 10 contributing accounts and is shown as a range of 10. A single prolific account cannot make a small group publishable. Zero means the source returned no qualifying records; an unavailable source never becomes zero.</p>
        <p style={{ color: K.dm, lineHeight: 1.8 }}>Reports refresh daily. This page checks for an updated report every five minutes; a missed daily refresh is labelled stale. As-of dates describe when the source was read. Saved workflows use app-supplied creation times. History uses record creation timestamps, normally assigned by the database when synced but editable by account owners. These dates are not independently verified; delayed sync, edits and deletions can change earlier weeks.</p>
        <a href='/stats.json' style={statsLinkStyle()}>Read the same report as JSON →</a>
      </section>
    </main>
    <footer><AppFooter /></footer>
  </div>;
}
