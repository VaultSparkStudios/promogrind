import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppDataCtx } from "../../contexts.jsx";
import { PROMO_SCHED } from "../../data/promoSchedule.js";
import { K, font, fontD } from "../../lib/shared.js";
import { getDashboardSnapshot, getTodayContext } from "../../dashboard/today.js";

export default function DailyBriefPage() {
  const navigate = useNavigate();
  const { appData = {} } = useContext(AppDataCtx) || {};
  const today = new Date();
  const { dayName } = getTodayContext(today);
  const fullDate = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem("pg_daily_brief") === "1");
  const snapshot = getDashboardSnapshot(appData, PROMO_SCHED, today, localStorage.getItem("pg_bankroll") || "");

  const toggleNotif = async () => {
    if (notifEnabled) {
      localStorage.removeItem("pg_daily_brief");
      setNotifEnabled(false);
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem("pg_daily_brief", "1");
      setNotifEnabled(true);
    }
  };

  const actions = [
    { icon: "🧮", label: "Calculate a promo", slug: "/bonus-bet" },
    { icon: "📋", label: "Log a bet", slug: "/bet-tracker" },
    { icon: "💰", label: "Check P/L", slug: "/ledger" },
    { icon: "🎯", label: "Find promos", slug: "/promo-finder" },
  ];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px", fontFamily: font }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: K.tx, fontFamily: fontD, letterSpacing: -0.5, marginBottom: 2 }}>{fullDate}</div>
        <div style={{ fontSize: 13, color: K.dm, marginBottom: 4 }}>{dayName}</div>
        <div style={{ fontSize: 13, color: K.mt }}>Your daily PromoGrind briefing</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 14 }}>
        <div style={{ background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: K.tx, fontFamily: fontD, marginBottom: 12 }}>Today&apos;s Promos</div>
          {snapshot.todayPromos.length === 0 ? (
            <div style={{ fontSize: 12, color: K.mt }}>No recurring promos found for today.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {snapshot.todayPromos.slice(0, 8).map((promo, index) => (
                <div key={`${promo.book}-${promo.promo}-${index}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: index < Math.min(snapshot.todayPromos.length, 8) - 1 ? `1px solid ${K.bd}` : "none" }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: K.tx }}>{promo.promo}</span>
                    <span style={{ fontSize: 11, color: K.dm, marginLeft: 6 }}>{promo.book}</span>
                  </div>
                  <span style={{ fontSize: 11, color: K.gn, fontFamily: font }}>{promo.value}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigate("/promo-calendar")} style={{ marginTop: 14, padding: "6px 14px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.ac, fontSize: 12, cursor: "pointer", fontFamily: font }}>
            View full calendar →
          </button>
        </div>

        <div style={{ background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: K.tx, fontFamily: fontD, marginBottom: 12 }}>Quick Actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {actions.map((action) => (
              <button key={action.slug} onClick={() => navigate(action.slug)} style={{ padding: "12px 10px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, color: K.tx, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}>
                <span style={{ fontSize: 18 }}>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: K.tx, fontFamily: fontD, marginBottom: 6 }}>9am Briefing</div>
          <div style={{ fontSize: 12, color: K.mt, marginBottom: 14 }}>Get a daily notification at 9am with your promo rundown.</div>
          <button onClick={toggleNotif} style={{ padding: "8px 16px", background: notifEnabled ? `${K.gn}15` : "transparent", border: `1px solid ${notifEnabled ? K.gn : K.bd2}`, borderRadius: 6, color: notifEnabled ? K.gn : K.dm, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
            {notifEnabled ? "Notifications on — tap to disable" : "Enable daily briefing"}
          </button>
        </div>

        <div style={{ background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: K.tx, fontFamily: fontD, marginBottom: 6 }}>Open Bets</div>
          {snapshot.openBets.length === 0 ? (
            <div style={{ fontSize: 12, color: K.gn }}>No open bets — you&apos;re clear.</div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: K.tx, marginBottom: 12 }}>
                <span style={{ fontWeight: 700, color: K.yl }}>{snapshot.openBets.length}</span> bet{snapshot.openBets.length !== 1 ? "s" : ""} pending
              </div>
              <button onClick={() => navigate("/bet-tracker")} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.ac, fontSize: 12, cursor: "pointer", fontFamily: font }}>
                View tracker →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
