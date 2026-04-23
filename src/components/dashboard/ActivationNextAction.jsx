import React, { useMemo } from "react";
import { PROMO_SCHED } from "../../data/promoSchedule.js";
import { getDashboardSnapshot, getNextBestAction } from "../../dashboard/today.js";
import { matchPlaybooks } from "../../playbooks/index.js";
import { trackEvent } from "../../analytics.js";
import { K, font, fontD } from "../../lib/shared.js";
import { S } from "../../ui.jsx";
import { normalizeAppRoute } from "../../workflows/actionGraph.js";
import { getUserProfile } from "../../lib/userProfile.js";

function PlayStyleCard({ navigate }) {
  const profile = useMemo(() => getUserProfile(), []);
  if (profile.count < 3) return null;
  return (
    <div style={{ ...S.card, border: `1px solid ${K.pp}30`, background: `${K.pp}06`, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 10, color: K.pp, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 }}>
            {profile.icon} Your Play Style
          </div>
          <div style={{ fontFamily: fontD, fontSize: 15, fontWeight: 800, color: K.tx, marginBottom: 3 }}>{profile.label}</div>
          <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.6 }}>{profile.tip}</div>
        </div>
        <button
          onClick={() => navigate(`/${profile.nextCalc}`)}
          style={{ padding: "8px 14px", background: `${K.pp}20`, border: `1px solid ${K.pp}40`, borderRadius: 8, color: K.pp, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap" }}
        >
          {profile.nextLabel} →
        </button>
      </div>
    </div>
  );
}

export default function ActivationNextAction({ data, totalProfit, openBets, booksComplete, navigate }) {
  const usageLog = (() => { try { return JSON.parse(localStorage.getItem("pg_usage_log") || "{}"); } catch { return {}; } })();
  const bankroll = (() => { try { return localStorage.getItem("pg_bankroll") || ""; } catch { return ""; } })();
  const snapshot = getDashboardSnapshot(data || {}, PROMO_SCHED, new Date(), bankroll);
  const openWorkflowCount = Array.isArray(data?.resultFeedback)
    ? data.resultFeedback.filter((entry) => ["queued", "ready", "placed", "waiting", "open", "pending"].includes(String(entry?.status || "").toLowerCase())).length
    : 0;
  const playbookResults = React.useMemo(
    () => matchPlaybooks(data || {}, { bankroll }),
    [data, bankroll],
  );
  const topPlaybook = playbookResults.top[0] || null;
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
    topPlaybook,
  });
  const isPlaybook = action.focus?.type === "playbook";
  const actionColor = { info: K.ac, positive: K.gn, watch: K.yl, risk: K.rd }[action.tone] || K.ac;

  if (isPlaybook && topPlaybook) {
    const { playbook, fitScore, reasons } = topPlaybook;
    const fitReason = reasons.find((r) => r.tone === "positive")?.text || reasons[0]?.text || "";
    return (
      <div style={{ ...S.card, border: `1px solid ${K.gn}40`, background: `${K.gn}06`, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 16 }} aria-hidden="true">▶</span>
              <div style={{ fontSize: 10, color: K.gn, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase" }}>Recommended Playbook</div>
            </div>
            <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: K.tx, marginBottom: 4 }}>
              Try: {playbook.name}
            </div>
            <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.6, marginBottom: 6 }}>{playbook.summary}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: K.gn, background: `${K.gn}12`, border: `1px solid ${K.gn}30`, borderRadius: 50, padding: "2px 8px" }}>
                {playbook.steps.length} step{playbook.steps.length === 1 ? "" : "s"}
              </span>
              {fitReason && (
                <span style={{ fontSize: 10, color: K.ac, background: `${K.ac}10`, border: `1px solid ${K.ac}25`, borderRadius: 50, padding: "2px 8px" }}>
                  {fitReason}
                </span>
              )}
              <span style={{ fontSize: 10, color: K.mt }}>fit {fitScore}/100</span>
            </div>
          </div>
          <button
            onClick={() => {
              trackEvent("next_best_action_clicked", { key: action.key, playbookId: playbook.id });
              navigate(normalizeAppRoute(playbook.steps[0]?.calculatorSlug || "dashboard"));
            }}
            style={{ padding: "9px 14px", background: K.gn, border: "none", borderRadius: 8, color: K.bg, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap" }}
          >
            Run playbook →
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ ...S.card, border: `1px solid ${actionColor}40`, background: `${actionColor}08`, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 10, color: actionColor, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 5 }}>Next Best Action</div>
            <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: K.tx, marginBottom: 4 }}>{action.title}</div>
            <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.6 }}>{action.body}</div>
          </div>
          <button
            onClick={() => { trackEvent("next_best_action_clicked", { key: action.key }); navigate(normalizeAppRoute(action.slug)); }}
            style={{ padding: "9px 14px", background: actionColor, border: "none", borderRadius: 8, color: K.bg, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap" }}
          >
            {action.cta} →
          </button>
        </div>
      </div>
      <PlayStyleCard navigate={navigate} />
    </>
  );
}
