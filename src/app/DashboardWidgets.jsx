import React, { useEffect, useMemo, useState } from "react";
import { disableDailyBriefPush, enableDailyBriefPush, isDailyBriefEnabled } from "../sw-register.js";
import { AppDataCtx } from "../contexts.jsx";
import { K, S, f, font, fontD } from "../lib/shared.js";

export function DailyRoutinePanel({ openBetsCount, expiringCount }) {
  const hour = new Date().getHours();
  const [checks, setChecks] = useState({});
  let tasks = [];
  if (hour < 12) {
    tasks = ["Check DK/FD daily profit boosts", "Run No-Vig on today's best line", "Log yesterday's settled bets"];
  } else if (hour < 17) {
    tasks = ["Check live scanner for +EV", "Review open parlay exposure", "Update book health statuses"];
  } else {
    tasks = ["Settle today's open bets", "Log profits to ledger", "Check tomorrow's promos"];
  }
  const alerts = [];
  if (openBetsCount > 3) alerts.push(`${openBetsCount} open bets need attention`);
  if (expiringCount > 0) alerts.push(`${expiringCount} promos expiring soon`);

  return (
    <div style={{ ...S.card, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: K.tx, marginBottom: 10, fontFamily: fontD }}>Today's Grind</div>
      {alerts.map((alert, index) => <div key={index} style={{ fontSize: 11, color: K.yl, fontWeight: 600, marginBottom: 6 }}>{alert}</div>)}
      {tasks.map((task, index) => (
        <div key={index} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${K.bd}` }}>
          <div role="checkbox" aria-checked={!!checks[index]} onClick={() => setChecks((current) => ({ ...current, [index]: !current[index] }))} style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${checks[index] ? K.gn : K.bd2}`, background: checks[index] ? K.gn : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {checks[index] && <span style={{ color: K.bg, fontSize: 10, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ fontSize: 12, color: checks[index] ? K.mt : K.tx, textDecoration: checks[index] ? "line-through" : "none" }}>{index + 1}. {task}</span>
        </div>
      ))}
    </div>
  );
}

export function ProfitGoalTracker({ totalProfit }) {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const [showInput, setShowInput] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const goal = parseFloat(data.profitGoal) || 0;
  const pct = goal > 0 ? Math.min(100, totalProfit / goal * 100) : 0;
  const remaining = goal > 0 ? Math.max(0, goal - totalProfit) : 0;
  const barColor = pct >= 100 ? K.gn : pct >= 60 ? K.yl : K.ac;
  const setGoal = () => {
    const nextGoal = parseFloat(inputVal);
    if (!Number.isNaN(nextGoal) && nextGoal > 0) {
      syncAppData({ ...data, profitGoal: nextGoal });
      setShowInput(false);
      setInputVal("");
    }
  };

  return (
    <div style={{ ...S.card, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: K.tx, fontFamily: fontD }}>Profit Goal</div>
        <button onClick={() => setShowInput((value) => !value)} style={{ padding: "3px 10px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 10, cursor: "pointer", fontFamily: font }}>{showInput ? "Cancel" : "Set Goal"}</button>
      </div>
      {showInput && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input style={{ ...S.input, flex: 1 }} value={inputVal} onChange={(event) => setInputVal(event.target.value)} placeholder="Enter goal $" />
          <button onClick={setGoal} style={{ padding: "6px 14px", background: K.gn, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, cursor: "pointer", fontFamily: font, fontSize: 11 }}>Save</button>
        </div>
      )}
      {goal > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: K.mt, marginBottom: 6 }}>
            <span>Progress: {f(pct, 1)}% of ${f(goal, 0)} goal</span>
            {pct < 100 && <span>Remaining: ${f(remaining)}</span>}
          </div>
          <div style={{ height: 8, background: K.s3, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ height: 8, borderRadius: 4, background: barColor, width: `${pct}%`, transition: "width 0.5s" }} />
          </div>
          {pct >= 100 && <div style={{ textAlign: "center", padding: "10px", background: `${K.gn}15`, border: `1px solid ${K.gn}30`, borderRadius: 6, fontSize: 14, fontWeight: 700, color: K.gn }}>Goal reached</div>}
        </>
      )}
      {!goal && !showInput && <div style={{ fontSize: 11, color: K.mt }}>Set a profit goal to track your progress.</div>}
    </div>
  );
}

function useDailyBriefing(openBets, todayPromos) {
  useEffect(() => {
    try {
      if (!isDailyBriefEnabled()) return;
      const now = new Date();
      const hour = now.getHours();
      const min = now.getMinutes();
      if (hour !== 9 || min > 15) return;
      const todayStr = now.toISOString().split("T")[0];
      if (localStorage.getItem("pg_brief_shown_today") === todayStr) return;
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const openCount = openBets?.length || 0;
        const body = `${openCount} open bet${openCount !== 1 ? "s" : ""} pending. ${todayPromos?.length || 0} promos available today.`;
        new Notification("PromoGrind Daily Briefing", { body, icon: "/favicon.svg" });
        localStorage.setItem("pg_brief_shown_today", todayStr);
      }
    } catch {}
  }, [openBets, todayPromos]);
}

export function DailyBriefingBtn({ openBets, todayPromos }) {
  useDailyBriefing(openBets, todayPromos);
  const [enabled, setEnabled] = useState(() => isDailyBriefEnabled());
  const isPro = () => {
    try { return ["vault_sparked", "pro"].includes(localStorage.getItem("pg_pro_status") || ""); } catch { return false; }
  };
  if (!isPro() && !enabled) return null;
  const toggle = async () => {
    if (!enabled) {
      const result = await enableDailyBriefPush();
      if (result.ok) setEnabled(true);
    } else {
      await disableDailyBriefPush();
      setEnabled(false);
    }
  };
  return (
    <button onClick={toggle} style={{ padding: "5px 12px", background: enabled ? `${K.gn}15` : "transparent", border: `1px solid ${enabled ? K.gn : K.bd2}`, borderRadius: 6, color: enabled ? K.gn : K.mt, fontSize: 10, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap" }}>
      {enabled ? "9am Briefing ON" : "Enable 9am Briefing"}
    </button>
  );
}

export function OpenExposurePanel({ bets }) {
  const openBets = (bets || []).filter((bet) => bet.status === "open");
  if (!openBets.length) return null;
  const byBook = {};
  openBets.forEach((bet) => {
    if (!byBook[bet.book]) byBook[bet.book] = { bets: 0, atRisk: 0, potWin: 0 };
    byBook[bet.book].bets += 1;
    byBook[bet.book].atRisk += parseFloat(bet.stake) || 0;
    byBook[bet.book].potWin += parseFloat(bet.toWin) || 0;
  });
  const books = Object.entries(byBook);
  const totRisk = books.reduce((sum, [, value]) => sum + value.atRisk, 0);
  const totWin = books.reduce((sum, [, value]) => sum + value.potWin, 0);

  return (
    <div style={{ ...S.card, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: K.tx, marginBottom: 10, fontFamily: fontD }}>Open Exposure</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr>{["Book", "Bets", "At Risk", "Potential Win"].map((header) => <th key={header} style={{ textAlign: "left", padding: "5px 8px", borderBottom: `1px solid ${K.bd2}`, color: K.mt, fontSize: 10, textTransform: "uppercase" }}>{header}</th>)}</tr></thead>
          <tbody>
            {books.map(([book, value]) => (
              <tr key={book}>
                <td style={{ padding: "6px 8px", borderBottom: `1px solid ${K.bd}`, fontWeight: 600, color: K.tx }}>{book}</td>
                <td style={{ padding: "6px 8px", borderBottom: `1px solid ${K.bd}`, color: K.ac }}>{value.bets}</td>
                <td style={{ padding: "6px 8px", borderBottom: `1px solid ${K.bd}`, color: K.rd, fontWeight: 600 }}>${f(value.atRisk)}</td>
                <td style={{ padding: "6px 8px", borderBottom: `1px solid ${K.bd}`, color: K.gn, fontWeight: 600 }}>${f(value.potWin)}</td>
              </tr>
            ))}
            <tr style={{ background: K.s3 }}>
              <td style={{ padding: "6px 8px", fontWeight: 700, color: K.tx }}>TOTAL</td>
              <td style={{ padding: "6px 8px", color: K.ac, fontWeight: 700 }}>{openBets.length}</td>
              <td style={{ padding: "6px 8px", color: K.rd, fontWeight: 700 }}>${f(totRisk)}</td>
              <td style={{ padding: "6px 8px", color: K.gn, fontWeight: 700 }}>${f(totWin)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TopToolsPanel({ navigate, tabs }) {
  const usage = useMemo(() => { try { return JSON.parse(localStorage.getItem("pg_usage_log") || "{}"); } catch { return {}; } }, []);
  const top5 = Object.entries(usage).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!top5.length) return null;
  const nameMap = {};
  tabs.forEach((group) => group.items.forEach((item) => { nameMap[item.slug] = item.n; }));
  return (
    <div style={{ ...S.card, marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: K.tx, marginBottom: 8, fontFamily: fontD }}>Your Top Tools</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {top5.map(([slug, count]) => (
          <button key={slug} onClick={() => navigate(`/${slug}`)} style={{ padding: "5px 12px", background: K.s2, border: `1px solid ${K.bd2}`, borderRadius: 50, color: K.ac, fontSize: 11, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 6 }}>
            <span>{nameMap[slug] || slug}</span>
            <span style={{ fontSize: 9, color: K.mt, background: K.s3, padding: "1px 5px", borderRadius: 10 }}>{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
