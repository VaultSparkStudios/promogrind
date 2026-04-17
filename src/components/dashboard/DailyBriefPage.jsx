import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppDataCtx } from "../../contexts.jsx";
import { PROMO_SCHED } from "../../data/promoSchedule.js";
import { K, font, fontD } from "../../lib/shared.js";
import { getDashboardSnapshot, getTodayContext } from "../../dashboard/today.js";
import { buildStudioSnapshot } from "../../studio/export.js";
import { buildTargetedAlertPlan } from "../../operator/briefing.js";
import { disableDailyBriefPush, enableDailyBriefPush, isDailyBriefEnabled } from "../../sw-register.js";
import { FEATURE_FLAGS } from "../../launchState.js";

export default function DailyBriefPage() {
  const navigate = useNavigate();
  const { appData = {} } = useContext(AppDataCtx) || {};
  const today = new Date();
  const { dayName } = getTodayContext(today);
  const fullDate = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const [notifEnabled, setNotifEnabled] = useState(() => isDailyBriefEnabled());
  const [notifPending, setNotifPending] = useState(false);
  const [notifMessage, setNotifMessage] = useState("");
  const snapshot = getDashboardSnapshot(appData, PROMO_SCHED, today, localStorage.getItem("pg_bankroll") || "", { includePlaybooks: true });
  const studioSnapshot = buildStudioSnapshot(appData, { now: today, bankroll: localStorage.getItem("pg_bankroll") || "" });
  const alertPlan = buildTargetedAlertPlan({ snapshot: studioSnapshot, dashboard: snapshot });

  const toggleNotif = async () => {
    setNotifPending(true);
    setNotifMessage("");
    if (notifEnabled) {
      await disableDailyBriefPush();
      setNotifEnabled(false);
      setNotifPending(false);
      return;
    }
    const result = await enableDailyBriefPush();
    if (result.ok) {
      setNotifEnabled(true);
      setNotifMessage(`Targeting: ${alertPlan.primary.headline}`);
    } else {
      const reasonMap = {
        unsupported: "This browser does not support push notifications.",
        missing_vapid: "Push alerts are not configured in this build yet.",
        permission_denied: "Notification permission was denied.",
        auth_required: "Sign in to a PromoGrind account before enabling push alerts.",
        subscribe_failed: "The browser subscription failed. Reload and try again.",
        invalid_subscription: "The browser returned an invalid push subscription.",
        save_failed: "The browser subscribed, but PromoGrind could not save it yet.",
      };
      setNotifMessage(reasonMap[result.reason] || "Push alerts could not be enabled.");
    }
    setNotifPending(false);
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
        <div style={{ background: `${K.ac}08`, border: `1px solid ${K.ac}25`, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: K.tx, fontFamily: fontD, marginBottom: 6 }}>Targeted Alert</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: K.ac, marginBottom: 8 }}>{alertPlan.primary.headline}</div>
          <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.7, marginBottom: 12 }}>{alertPlan.primary.body}</div>
          <button onClick={() => navigate(alertPlan.primary.ctaSlug)} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.ac, fontSize: 12, cursor: "pointer", fontFamily: font }}>
            {alertPlan.primary.ctaLabel} →
          </button>
          <div style={{ fontSize: 10, color: K.mt, marginTop: 10 }}>
            Queue: {alertPlan.queue.slice(0, 3).map((item) => item.kind).join(" · ")}
          </div>
        </div>

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
          <div style={{ fontSize: 12, color: K.mt, marginBottom: 14 }}>
            Get a state-aware push notification at 9am with the highest-value promo, workflow, or settlement action for today.
          </div>
          {!FEATURE_FLAGS.pushAlerts && (
            <div style={{ fontSize: 11, color: K.yl, marginBottom: 10 }}>
              Push alerts stay beta-gated until the VAPID key and scheduled Edge Function are enabled in this build.
            </div>
          )}
          <button
            onClick={toggleNotif}
            disabled={notifPending}
            style={{ padding: "8px 16px", background: notifEnabled ? `${K.gn}15` : "transparent", border: `1px solid ${notifEnabled ? K.gn : K.bd2}`, borderRadius: 6, color: notifEnabled ? K.gn : K.dm, fontSize: 12, fontWeight: 600, cursor: notifPending ? "wait" : "pointer", fontFamily: font }}
          >
            {notifPending ? "Working…" : notifEnabled ? "Push briefing on — tap to disable" : "Enable daily push briefing"}
          </button>
          {notifMessage && <div style={{ fontSize: 11, color: K.yl, marginTop: 10, lineHeight: 1.5 }}>{notifMessage}</div>}
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

        <div style={{ background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: K.tx, fontFamily: fontD, marginBottom: 8 }}>Workflow Focus</div>
          {studioSnapshot.workflows.top.length === 0 ? (
            <div style={{ fontSize: 12, color: K.mt }}>No active workflows yet. Save one from calculators, Promo Advisor, or AI Action Plan.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {studioSnapshot.workflows.top.slice(0, 3).map((workflow) => (
                <button key={workflow.id} onClick={() => navigate(workflow.status === "waiting" || workflow.status === "placed" ? "/track" : `/${workflow.calculatorSlug || "track"}`)} style={{ textAlign: "left", padding: "10px 12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, color: K.tx, cursor: "pointer", fontFamily: font }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{workflow.title}</div>
                  <div style={{ fontSize: 10, color: K.ac, marginBottom: 4 }}>{workflow.scoreSummary || `${workflow.status} workflow scored ${workflow.score}.`}</div>
                  <div style={{ fontSize: 10, color: K.mt }}>{workflow.status} · {workflow.source.replace(/_/g, " ")}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {snapshot.topPlaybook?.applicable && snapshot.topPlaybook.playbook && (() => {
          const pb = snapshot.topPlaybook.playbook;
          const fitLine = snapshot.topPlaybook.reasons?.map((r) => r.text).join(" · ") || `fit score ${snapshot.topPlaybook.fitScore}`;
          return (
            <div style={{ background: `${K.gn}08`, border: `1px solid ${K.gn}25`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>📋</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: K.tx, fontFamily: fontD }}>Top Matched Playbook</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: K.gn, marginBottom: 6 }}>{pb.name}</div>
              <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.7, marginBottom: 4 }}>{pb.summary}</div>
              <div style={{ fontSize: 11, color: K.mt, marginBottom: 12 }}>
                {pb.steps.length} step{pb.steps.length === 1 ? "" : "s"} · {fitLine}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => navigate(`/${pb.steps[0]?.calculatorSlug || "bonus-bet"}`)}
                  style={{ padding: "6px 14px", background: `${K.gn}15`, border: `1px solid ${K.gn}40`, borderRadius: 6, color: K.gn, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font }}
                >
                  Run playbook →
                </button>
                <span style={{ fontSize: 11, color: K.mt, alignSelf: "center" }}>
                  via {pb.steps[0]?.title}
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
