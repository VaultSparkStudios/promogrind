import React, { useState, useEffect, useContext, useMemo } from "react";
import { K, font, fontD } from "../../lib/shared.js";
import { S } from "../../ui.jsx";
import { AppDataCtx } from "../../contexts.jsx";
import { getDailyMissions, completeMission, getTodayXp } from "../../lib/missions.js";
import { buildOperatorSeason } from "../../lib/seasons.js";

export default function DailyMissionsPanel({ navigate }) {
  const ctx = useContext(AppDataCtx);
  const appData = ctx?.appData || {};
  const todayStr = new Date().toISOString().slice(0, 10);

  const [tick, setTick] = useState(0);
  const missions = useMemo(() => getDailyMissions(appData, todayStr), [appData, todayStr, tick]);
  const season = useMemo(() => buildOperatorSeason(appData), [appData, tick]);
  const xpToday = getTodayXp(todayStr);
  const maxXp = missions.reduce((s, m) => s + m.xp, 0);
  const doneCount = missions.filter(m => m.completed).length;

  // Auto-complete any mission whose check has passed
  useEffect(() => {
    let changed = false;
    for (const m of missions) {
      if (m.eligible && !m.completed) {
        completeMission(m.id, todayStr);
        changed = true;
      }
    }
    if (changed) setTick(t => t + 1);
  }, [missions, todayStr]);

  // Refresh when window regains focus so localStorage-based checks pick up new flags
  useEffect(() => {
    const refresh = () => setTick(t => t + 1);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  function handleComplete(mission) {
    if (mission.completed) {
      if (navigate) navigate(mission.nav);
      return;
    }
    completeMission(mission.id, todayStr);
    setTick(t => t + 1);
    if (navigate) navigate(mission.nav);
  }

  const seasonRail = (
    <div style={{ ...S.card, marginBottom: 12, padding: '14px 18px', border: `1px solid ${season.score >= 85 ? K.gn + '40' : K.bd}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: fontD, fontSize: 11, fontWeight: 700, color: K.ac, textTransform: 'uppercase', letterSpacing: '2px' }}>
            Operator Season
          </div>
          <div style={{ fontSize: 10, color: K.mt, marginTop: 2 }}>Day {season.day}/{season.lengthDays} · {season.band}</div>
        </div>
        <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 800, color: season.score >= 85 ? K.gn : K.yl }}>
          {season.score}
        </div>
      </div>
      <div style={{ height: 5, background: K.s3, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: 5, background: season.score >= 85 ? K.gn : K.yl, borderRadius: 3, width: `${season.score}%`, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 8 }}>
        {season.targets.map((target) => (
          <div
            key={target.id}
            title={`${target.label}: ${target.value}/${target.goal}`}
            style={{
              height: 4, borderRadius: 2,
              background: target.complete ? K.gn : target.pct > 0 ? K.yl : K.s3,
              opacity: target.complete ? 1 : 0.75,
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5 }}>{season.next}</div>
    </div>
  );

  if (doneCount === 3) {
    return (
      <>
      {seasonRail}
      <div style={{ ...S.card, border: `1px solid ${K.gn}40`, background: `${K.gn}06`, marginBottom: 12, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: K.gn, marginBottom: 2 }}>✓ All missions done — come back tomorrow</div>
            <div style={{ fontSize: 10, color: K.mt }}>{xpToday} XP earned today</div>
          </div>
          <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 800, color: K.gn }}>+{xpToday}</div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    {seasonRail}
    <div style={{ ...S.card, marginBottom: 12, padding: '14px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: fontD, fontSize: 11, fontWeight: 700, color: K.ac, textTransform: 'uppercase', letterSpacing: '2px' }}>Daily Missions</span>
          <span style={{ fontSize: 10, color: K.mt }}>{doneCount}/3 done</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: K.yl, fontWeight: 600 }}>{xpToday}/{maxXp} XP</span>
          <div style={{ width: 48, height: 4, background: K.s3, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: 4, background: K.yl, borderRadius: 2, width: `${maxXp > 0 ? (xpToday / maxXp) * 100 : 0}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {missions.map((m) => (
          <button
            key={m.id}
            onClick={() => handleComplete(m)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px',
              background: m.completed ? `${K.gn}08` : K.s2,
              border: `1px solid ${m.completed ? K.gn + '40' : K.bd}`,
              borderRadius: 7, cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.2s, border-color 0.2s',
              animation: m.completed ? 'pgCheckIn 0.3s ease' : 'none',
            }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              background: m.completed ? K.gn : 'transparent',
              border: `2px solid ${m.completed ? K.gn : K.bd2}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.25s',
            }}>
              {m.completed && <span style={{ fontSize: 10, color: K.ink, fontWeight: 700 }}>✓</span>}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: m.completed ? K.mt : K.tx, textDecoration: m.completed ? 'line-through' : 'none' }}>
                {m.label}
              </div>
              <div style={{ fontSize: 10, color: K.mt, marginTop: 1 }}>{m.desc}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: m.completed ? K.mt : K.yl, whiteSpace: 'nowrap' }}>+{m.xp} XP</span>
          </button>
        ))}
      </div>
    </div>
    </>
  );
}
