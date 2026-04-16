import React from "react";
import { PROMO_SCHED } from "../../data/promoSchedule.js";
import { getDashboardSnapshot, getNextBestAction } from "../../dashboard/today.js";
import { trackEvent } from "../../analytics.js";
import { K, font, fontD } from "../../lib/shared.js";
import { S } from "../../ui.jsx";

export default function ActivationNextAction({ data, totalProfit, openBets, booksComplete, navigate }) {
  const usageLog = (() => { try { return JSON.parse(localStorage.getItem("pg_usage_log") || "{}"); } catch { return {}; } })();
  const bankroll = (() => { try { return localStorage.getItem("pg_bankroll") || ""; } catch { return ""; } })();
  const snapshot = getDashboardSnapshot(data || {}, PROMO_SCHED, new Date(), bankroll);
  const openWorkflowCount = Array.isArray(data?.resultFeedback)
    ? data.resultFeedback.filter((entry) => ["queued", "ready", "placed", "waiting", "open", "pending"].includes(String(entry?.status || "").toLowerCase())).length
    : 0;
  const action = getNextBestAction({
    usageLog,
    bankroll,
    totalProfit,
    openBets,
    booksComplete,
    openWorkflowCount: snapshot.openWorkflowCount || openWorkflowCount,
    topWorkflow: snapshot.topWorkflow,
    userState: data?.userState || "",
    done: data?.done || {},
    bookStatus: data?.bookStatus || {},
    recommendedBooks: snapshot.recommendedBooks,
  });
  const actionColor = { info: K.ac, positive: K.gn, watch: K.yl, risk: K.rd }[action.tone] || K.ac;

  return (
    <div style={{ ...S.card, border: `1px solid ${actionColor}40`, background: `${actionColor}08`, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 10, color: actionColor, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 5 }}>Next Best Action</div>
          <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: K.tx, marginBottom: 4 }}>{action.title}</div>
          <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.6 }}>{action.body}</div>
        </div>
        <button
          onClick={() => { trackEvent("next_best_action_clicked", { key: action.key }); navigate("/" + action.slug); }}
          style={{ padding: "9px 14px", background: actionColor, border: "none", borderRadius: 8, color: K.bg, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap" }}
        >
          {action.cta} →
        </button>
      </div>
    </div>
  );
}
