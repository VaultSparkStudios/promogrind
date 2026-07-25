import React, { useEffect, useMemo, useState } from "react";
import { AppDataCtx } from "../contexts.jsx";
import { PROMO_SCHED, DAYS_ORDER } from "../data/promoSchedule.js";
import { K, f, font, downloadFile } from "../lib/shared.js";
import { derivePromoValueConfidence, getPromoFreshness, normalizePromoObservations, promoObservationKey, rankPromoPatterns, recordPromoObservation } from "../lib/promoObservations.js";
import { S, Tl, Nt, Help } from "../ui.jsx";

const OBSERVATION_KEY = "pg_promo_observations_v1";
const PREFS_KEY = "pg_calendar_prefs_v2";
const DEFAULT_PREFS = { verifyFirst: true, includeNotSeen: false, queue: {} };

function readLocalJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; } catch { return fallback; }
}

const LocalCalendarPrefs = ({ prefs, setPrefs }) => {
  const [saved, setSaved] = useState(false);
  const save = () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <div style={{ ...S.card, background: K.s2, border: `1px solid ${K.bd}`, marginTop: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: K.ac, marginBottom: 8, textTransform: "uppercase", letterSpacing: "1.5px" }}>Local verification queue</div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
        <label style={{ display: "flex", gap: 6, fontSize: 11, color: K.dm }}>
          <input type="checkbox" checked={prefs.verifyFirst} onChange={(event) => setPrefs((value) => ({ ...value, verifyFirst: event.target.checked }))} />
          Rank unverified and stale patterns first
        </label>
        <label style={{ display: "flex", gap: 6, fontSize: 11, color: K.dm }}>
          <input type="checkbox" checked={prefs.includeNotSeen} onChange={(event) => setPrefs((value) => ({ ...value, includeNotSeen: event.target.checked }))} />
          Include patterns marked not seen
        </label>
      </div>
      <button onClick={save} style={{ padding: "7px 16px", background: K.gn, border: "none", borderRadius: 6, color: K.ink, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: font }}>Save local preferences</button>
      {saved && <div style={{ fontSize: 11, color: K.gn, marginTop: 8 }}>Saved on this device.</div>}
      <Nt c={K.mt}>No email or push delivery is configured. Exporting the calendar creates a local calendar file; queued rows are only a checklist in this browser.</Nt>
    </div>
  );
};

const PromoROITable = ({ promoValueHistory, observations, now }) => {
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => Object.entries(promoValueHistory || {}).map(([key, history]) => {
    const values = history.map((item) => Number(item.value)).filter(Number.isFinite);
    const promo = PROMO_SCHED.find((item) => `${item.book}-${item.promo}` === key);
    const freshness = promo ? getPromoFreshness(promo, observations, now) : { state: "unverified" };
    const confidence = derivePromoValueConfidence(history, freshness);
    return { key, average: values.length ? f(values.reduce((sum, value) => sum + value, 0) / values.length) : "0.00", best: values.length ? f(Math.max(...values)) : "0.00", count: values.length, confidence };
  }).sort((a, b) => Number(b.average) - Number(a.average)), [promoValueHistory, observations, now]);
  return (
    <div style={{ ...S.card, marginTop: 12 }}>
      <button onClick={() => setOpen((value) => !value)} style={{ width: "100%", background: "none", border: "none", textAlign: "left", color: K.ac, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: font }}>Realized value evidence {open ? "▲" : "▼"}</button>
      {open && <div style={{ marginTop: 12, overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 11, color: K.mt }}>Record a realized value after checking current terms to build evidence.</div> :
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>{["Promo", "Average", "Reports", "Best", "Confidence"].map((heading) => <th key={heading} style={{ textAlign: "left", padding: 6, color: K.mt }}>{heading}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.key}>
              <td style={{ padding: 6, borderTop: `1px solid ${K.bd}` }}>{row.key.replace(/-/g, " ")}</td>
              <td style={{ padding: 6, borderTop: `1px solid ${K.bd}`, color: K.gn }}>${row.average}</td>
              <td style={{ padding: 6, borderTop: `1px solid ${K.bd}` }}>{row.count}</td>
              <td style={{ padding: 6, borderTop: `1px solid ${K.bd}` }}>${row.best}</td>
              <td style={{ padding: 6, borderTop: `1px solid ${K.bd}`, color: row.confidence.level === "high" ? K.gn : row.confidence.level === "medium" ? K.yl : K.mt }}>{row.confidence.label}</td>
            </tr>)}</tbody>
          </table>}
      </div>}
    </div>
  );
};

const PromoCalendar = () => {
  const context = React.useContext(AppDataCtx) || {};
  const data = context.appData || {};
  const syncAppData = context.syncAppData || (() => {});
  const [filterBook, setFilterBook] = useState("All");
  const [filterDay, setFilterDay] = useState("All");
  const [filterGrade, setFilterGrade] = useState("All");
  const [marketFilter, setMarketFilter] = useState("All");
  const [now, setNow] = useState(() => new Date());
  const [historyOpen, setHistoryOpen] = useState({});
  const [observations, setObservations] = useState(() => normalizePromoObservations(readLocalJson(OBSERVATION_KEY, {})));
  const [prefs, setPrefs] = useState(() => ({ ...DEFAULT_PREFS, ...readLocalJson(PREFS_KEY, {}) }));

  useEffect(() => {
    localStorage.removeItem("pg_alert_prefs");
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { localStorage.setItem(OBSERVATION_KEY, JSON.stringify(observations)); }, [observations]);

  const visible = useMemo(() => {
    const rows = PROMO_SCHED.filter((promo) =>
      (marketFilter === "All" || promo.market === marketFilter)
      && (filterBook === "All" || promo.book === filterBook)
      && (filterDay === "All" || promo.day === filterDay)
      && (filterGrade === "All" || promo.grade === filterGrade)
      && (prefs.includeNotSeen || getPromoFreshness(promo, observations, now).state !== "not-seen")
    );
    return prefs.verifyFirst ? rankPromoPatterns(rows, observations, now) : rows;
  }, [filterBook, filterDay, filterGrade, marketFilter, observations, now, prefs.includeNotSeen, prefs.verifyFirst]);

  const observe = (promo, status) => setObservations((current) => recordPromoObservation(current, promo, status, new Date()));
  const clearObservation = (promo) => setObservations((current) => {
    const next = { ...current };
    delete next[promoObservationKey(promo)];
    return next;
  });
  const toggleQueue = (promo) => {
    const key = promoObservationKey(promo);
    setPrefs((current) => ({ ...current, queue: { ...current.queue, [key]: !current.queue?.[key] } }));
  };
  const trackValue = (promo) => {
    const raw = prompt(`Realized value for ${promo.promo} after checking current terms:`);
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) return;
    const key = `${promo.book}-${promo.promo}`;
    const history = data.promoValueHistory || {};
    syncAppData({ ...data, promoValueHistory: { ...history, [key]: [...(history[key] || []), { date: new Date().toISOString().slice(0, 10), value }].slice(-12) } });
  };
  const exportICS = () => {
    const today = new Date();
    const ymd = (date) => `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const dayMap = { Monday: "MO", Tuesday: "TU", Wednesday: "WE", Thursday: "TH", Friday: "FR" };
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PromoGrind//EN", "CALSCALE:GREGORIAN"];
    visible.forEach((promo, index) => {
      const repeat = promo.day === "Weekend" ? "RRULE:FREQ=WEEKLY;BYDAY=SA,SU" : dayMap[promo.day] ? `RRULE:FREQ=WEEKLY;BYDAY=${dayMap[promo.day]}` : "RRULE:FREQ=DAILY";
      lines.push("BEGIN:VEVENT", `UID:promogrind-${promo.id}-${index}@vaultsparkstudios.com`, `DTSTART:${ymd(today)}T080000`, `DTEND:${ymd(today)}T083000`, `SUMMARY:Verify pattern - ${promo.book}: ${promo.promo}`, `DESCRIPTION:Historical ${promo.market} pattern. Verify current terms, eligibility, limits, void rules, and odds before acting.`, repeat, "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    downloadFile(lines.join("\r\n"), "promogrind-verification-calendar.ics", "text/calendar");
  };

  const evidenceColors = { current: K.gn, aging: K.yl, stale: K.rd, unverified: K.mt, "not-seen": K.rd };
  return <div>
    <div style={S.card}>
      <Tl t="Promo Calendar" badge="EVIDENCE-DATED PATTERNS" bc={K.ac} shareable />
      <div style={{ ...S.note(K.ac), marginBottom: 12 }}>Every row is a historical pattern, not a live offer. Confirm what you actually see in the sportsbook app; local observations then determine freshness and what to verify next.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <select aria-label="Market" style={{ ...S.input, width: "auto" }} value={marketFilter} onChange={(event) => { setMarketFilter(event.target.value); setFilterBook("All"); }}><option>All</option><option>US</option><option>UK</option></select>
        <select aria-label="Book" style={{ ...S.input, width: "auto" }} value={filterBook} onChange={(event) => setFilterBook(event.target.value)}><option>All</option>{[...new Set(PROMO_SCHED.filter((promo) => marketFilter === "All" || promo.market === marketFilter).map((promo) => promo.book))].map((book) => <option key={book}>{book}</option>)}</select>
        <select aria-label="Day" style={{ ...S.input, width: "auto" }} value={filterDay} onChange={(event) => setFilterDay(event.target.value)}><option>All</option>{DAYS_ORDER.map((day) => <option key={day}>{day}</option>)}</select>
        <select aria-label="Grade" style={{ ...S.input, width: "auto" }} value={filterGrade} onChange={(event) => setFilterGrade(event.target.value)}><option>All</option><option>A</option><option>B</option><option>C</option></select>
        <button onClick={exportICS} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${K.ac}`, borderRadius: 6, color: K.ac, cursor: "pointer", fontFamily: font }}>Export verification calendar</button>
      </div>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr>{["Book / market", "Pattern", "Evidence", "Modeled range", "Value confidence", "Observe", "Local queue", "Realized"].map((heading) => <th key={heading} style={{ textAlign: "left", padding: 7, borderBottom: `1px solid ${K.bd2}`, color: K.mt, fontSize: 10 }}>{heading}</th>)}</tr></thead>
        <tbody>{visible.map((promo) => {
          const key = `${promo.book}-${promo.promo}`;
          const history = data.promoValueHistory?.[key] || [];
          const freshness = getPromoFreshness(promo, observations, now);
          const confidence = derivePromoValueConfidence(history, freshness);
          return <React.Fragment key={promo.id}>
            <tr>
              <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}`, fontWeight: 600 }}>{promo.book}<div style={{ fontSize: 9, color: K.mt }}>{promo.market} · jurisdiction-wide pattern only</div></td>
              <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}` }}>{promo.promo}<div style={{ fontSize: 9, color: K.mt }}>{promo.day} · {promo.type} · ~{promo.timeMin}m</div></td>
              <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}` }}><span style={S.tag(evidenceColors[freshness.state])}>{freshness.label}</span></td>
              <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}`, color: K.ac }}>{promo.value}<div style={{ fontSize: 9, color: K.mt }}>historical estimate</div></td>
              <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}`, color: confidence.level === "high" ? K.gn : confidence.level === "medium" ? K.yl : K.mt }}>{confidence.label}</td>
              <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}`, whiteSpace: "nowrap" }}>
                <button onClick={() => observe(promo, "confirmed")} style={{ marginRight: 4, color: K.gn, background: "transparent", border: `1px solid ${K.gn}`, borderRadius: 4 }}>Seen</button>
                <button onClick={() => observe(promo, "rejected")} style={{ color: K.rd, background: "transparent", border: `1px solid ${K.rd}`, borderRadius: 4 }}>Not seen</button>
                {freshness.observedAt && <button aria-label={`Clear observation for ${promo.promo}`} onClick={() => clearObservation(promo)} style={{ display: "block", marginTop: 4, color: K.mt, background: "none", border: 0, fontSize: 9 }}>clear</button>}
              </td>
              <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}` }}><button onClick={() => toggleQueue(promo)} style={{ color: prefs.queue?.[promoObservationKey(promo)] ? K.yl : K.mt, background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4 }}>{prefs.queue?.[promoObservationKey(promo)] ? "Queued" : "Queue"}</button></td>
              <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}` }}><button onClick={() => trackValue(promo)} style={{ color: K.gn, background: "transparent", border: `1px solid ${K.gn}`, borderRadius: 4 }}>Track</button>{history.length > 0 && <button onClick={() => setHistoryOpen((open) => ({ ...open, [key]: !open[key] }))} style={{ display: "block", marginTop: 4, color: K.mt, background: "none", border: 0, fontSize: 9 }}>{historyOpen[key] ? "hide" : `${history.length} reports`}</button>}</td>
            </tr>
            {historyOpen[key] && <tr><td colSpan={8} style={{ padding: 8, background: K.s2, color: K.dm }}>Realized values: {history.map((item) => `$${item.value} on ${item.date}`).join(" · ")}</td></tr>}
          </React.Fragment>;
        })}</tbody>
      </table></div>
    </div>
    <LocalCalendarPrefs prefs={prefs} setPrefs={setPrefs} />
    <PromoROITable promoValueHistory={data.promoValueHistory || {}} observations={observations} now={now} />
    <Help entries={[
      ["Why verify first", "Offer cadence and terms change by account and jurisdiction. Unverified or stale patterns appear first so you spend time checking the uncertain rows."],
      ["What Seen means", "Seen records a local observation timestamp. It does not certify another account, market, or future date."],
      ["How value confidence works", "Confidence combines observation freshness with your realized-value reports. It never converts a historical estimate into a promised result."],
    ]} />
  </div>;
};

export default PromoCalendar;
