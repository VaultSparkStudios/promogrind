import React, { useEffect, useRef, useState, useContext, useMemo } from "react";
import { BOOKS } from "../../books.js";
import { f, K, font, fontD } from "../../lib/shared.js";
import { S } from "../../ui.jsx";
import { streakEmoji, streakLabel, streakMilestone } from "../../lib/streaks.js";
import { computeMastery, MASTERY_COLOR } from "../../lib/mastery.js";
import { AppDataCtx } from "../../contexts.jsx";

function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  const raf = useRef(null);
  useEffect(() => {
    const from = prev.current;
    if (from === target) return;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(from + (target - from) * ease);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else { setVal(target); prev.current = target; }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

function MasteryBar({ label, level, levelPct, accuracy }) {
  const color = MASTERY_COLOR[level] || K.mt;
  return (
    <div style={{ flex: 1, minWidth: 72 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 9, color: K.mt }}>{label}</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {accuracy != null && <span style={{ fontSize: 8, color: K.mt, background: `${K.mt}15`, padding: '0 4px', borderRadius: 3 }}>{accuracy}% acc</span>}
          <span style={{ fontSize: 9, fontWeight: 700, color }}>{level}</span>
        </div>
      </div>
      <div style={{ height: 3, background: K.s3, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: 3, borderRadius: 2, background: color, width: `${levelPct}%`, transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
    </div>
  );
}

export default function DashboardHero({ totalProfit, openBetsCount, booksComplete, navigate, streak = 0 }) {
  const ctx = useContext(AppDataCtx);
  const mastery = useMemo(() => ctx?.appData ? computeMastery(ctx.appData) : null, [ctx?.appData]);

  const percent = Math.min(100, Math.round((booksComplete / BOOKS.length) * 100));
  const emoji = streakEmoji(streak);
  const label = streakLabel(streak);
  const milestone = streakMilestone(streak);
  const animatedProfit = useCountUp(totalProfit);
  const globalRank = mastery?.globalRank;

  const activeLanes = mastery
    ? Object.entries(mastery.perType).filter(([, d]) => d.xp > 0).sort(([, a], [, b]) => b.xp - a.xp).slice(0, 4)
    : [];
  const allLanes = mastery ? Object.entries(mastery.perType) : [];
  const weakLane = allLanes.length > 0
    ? allLanes
        .filter(([, d]) => d.xp < 15)  // not yet at Closer level
        .sort(([, a], [, b]) => a.xp - b.xp)[0]
    : null;

  return (
    <div style={{ ...S.card, background: `linear-gradient(135deg,${K.s1},${K.s2})`, border: `1px solid ${K.bd2}`, marginBottom: 12, padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            {globalRank && (
              <span style={{ fontSize: 10, fontWeight: 700, color: globalRank.color, background: `${globalRank.color}18`, border: `1px solid ${globalRank.color}35`, padding: '2px 10px', borderRadius: 99, fontFamily: font, animation: 'pgFadeIn 0.4s ease' }}>
                {globalRank.name}
              </span>
            )}
            {label && (
              <div style={{ padding: '2px 8px', background: streak >= 3 ? `${K.yl}20` : `${K.mt}15`, border: `1px solid ${streak >= 3 ? K.yl : K.mt}40`, borderRadius: 99, fontSize: 10, fontWeight: 700, color: streak >= 3 ? K.yl : K.mt, whiteSpace: 'nowrap' }}>
                {emoji ? `${emoji} ` : ''}{label}
              </div>
            )}
          </div>
          {milestone && (
            <div style={{ fontSize: 10, color: K.yl, fontWeight: 700, marginBottom: 4 }}>🎉 {milestone}-day milestone reached!</div>
          )}
          <div style={{ fontFamily: fontD, fontSize: 26, fontWeight: 800, color: totalProfit >= 0 ? K.gn : K.rd, marginBottom: 4 }}>
            {totalProfit >= 0 ? '+' : '-'}${f(Math.abs(animatedProfit))}
          </div>
          <div style={{ fontSize: 11, color: K.mt }}>Total profit extracted · {booksComplete}/{BOOKS.length} books done</div>
          <div style={{ height: 4, background: K.s3, borderRadius: 2, marginTop: 8, width: 220 }}>
            <div style={{ height: 4, borderRadius: 2, background: K.gn, width: `${percent}%`, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {openBetsCount > 0 && (
            <div style={{ padding: '10px 16px', background: `${K.yl}10`, border: `1px solid ${K.yl}30`, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: K.yl }}>{openBetsCount}</div>
              <div style={{ fontSize: 9, color: K.mt, textTransform: 'uppercase', letterSpacing: '1px' }}>Open Bets</div>
            </div>
          )}
          {streak > 0 && (
            <div style={{ padding: '10px 16px', background: streak >= 3 ? `${K.yl}10` : `${K.mt}10`, border: `1px solid ${streak >= 3 ? K.yl : K.mt}30`, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: streak >= 3 ? K.yl : K.mt }}>{streak}</div>
              <div style={{ fontSize: 9, color: K.mt, textTransform: 'uppercase', letterSpacing: '1px' }}>Day Streak</div>
            </div>
          )}
          <button onClick={() => navigate('/ledger')} style={{ padding: '10px 16px', background: `${K.ac}15`, border: `1px solid ${K.ac}30`, borderRadius: 8, color: K.ac, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' }}>
            Log Profit →
          </button>
        </div>
      </div>

      {activeLanes.length > 0 && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${K.bd}`, paddingTop: 10 }}>
          <div style={{ fontSize: 9, color: K.mt, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8, fontFamily: font }}>Lane Mastery</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {activeLanes.map(([key, d]) => <MasteryBar key={key} label={d.label} level={d.level} levelPct={d.levelPct} accuracy={d.accuracy} />)}
          </div>
        </div>
      )}
      {weakLane && (
        <div
          onClick={() => navigate && navigate('/dashboard')}
          style={{ marginTop: 10, padding: '8px 12px', background: `${MASTERY_COLOR[weakLane[1].level] || K.mt}0d`, border: `1px solid ${MASTERY_COLOR[weakLane[1].level] || K.mt}25`, borderRadius: 7, cursor: navigate ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <div style={{ fontSize: 10, color: K.mt, marginBottom: 1 }}>Weakest Lane · Boost it →</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MASTERY_COLOR[weakLane[1].level] || K.mt }}>
              {weakLane[1].label} · {weakLane[1].level} · {weakLane[1].nextXp != null ? `${weakLane[1].nextXp - weakLane[1].xp} XP to next level` : 'Max level'}
            </div>
          </div>
          <span style={{ fontSize: 9, color: K.mt }}>▸</span>
        </div>
      )}
    </div>
  );
}
