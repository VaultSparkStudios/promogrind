import React from "react";
import { AppDataCtx, useToast } from "../../contexts.jsx";
import { K, S, f, font, fontD } from "../../lib/shared.js";
import { getBankrollPosture, getUnfinishedWork } from "../../dashboard/today.js";
import { getOnboardingProgress } from "../../onboarding.js";
import { matchPlaybooks, playbookToWorkflows } from "../../playbooks/index.js";
// matchPlaybooks is called here as a fallback when snapshot.topPlaybook is not pre-computed
import { upsertWorkflowEntry } from "../../promograph/index.js";
import ObservabilityPanel from "./ObservabilityPanel.jsx";
import WorkflowInboxPanel from "./WorkflowInboxPanel.jsx";

const TONE = {
  healthy: K.gn,
  positive: K.gn,
  watch: K.yl,
  risk: K.rd,
  missing: K.ac,
  info: K.ac,
};

export default function TodayDashboardPanel({ snapshot, navigate, appData = {}, isProActive = false, syncDiagnostics = {}, usageLog = {} }) {
  const posture = getBankrollPosture(snapshot);
  const unfinished = getUnfinishedWork(snapshot);
  const onboarding = getOnboardingProgress({ appData, isProActive });
  const tone = TONE[posture.tone] || K.ac;
  const recentTone = snapshot.recentSettledProfit >= 0 ? K.gn : K.rd;
  const toast = useToast();
  const { syncAppData } = React.useContext(AppDataCtx) || {};
  const playbookResults = React.useMemo(
    () => snapshot?.topPlaybook
      ? { top: [snapshot.topPlaybook], matches: [snapshot.topPlaybook] }
      : matchPlaybooks(appData, { bankroll: snapshot?.bankroll }),
    [snapshot?.topPlaybook, appData, snapshot?.bankroll],
  );

  const queuePlaybook = (playbook) => {
    if (!syncAppData) return;
    const steps = playbookToWorkflows(playbook, {});
    const nextInbox = steps.reduce((inbox, step) => upsertWorkflowEntry(inbox, step), appData?.workflowInbox || []);
    syncAppData({ ...(appData || {}), workflowInbox: nextInbox });
    if (toast) toast(`Queued ${steps.length} playbook steps: ${playbook.name}`, K.gn);
  };

  return (
    <div style={{ ...S.card, border: `1px solid ${K.ac}35`, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: K.ac, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 5 }}>
            Today Dashboard
          </div>
          <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: K.tx, marginBottom: 4 }}>
            What needs attention right now
          </div>
          <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.6, maxWidth: 760 }}>
            Focus on expiring promos, unfinished work, bankroll posture, and recent settled profit before adding more volume.
          </div>
        </div>
        <div style={{ padding: "10px 12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, minWidth: 150 }}>
          <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>Recent Settled Profit</div>
          <div style={{ fontFamily: fontD, fontSize: 24, fontWeight: 800, color: recentTone }}>
            {snapshot.recentSettledProfit >= 0 ? "+" : "-"}${f(Math.abs(snapshot.recentSettledProfit))}
          </div>
          <div style={{ fontSize: 10, color: K.mt }}>
            Last 7 days · {snapshot.recentSettledCount} entr{snapshot.recentSettledCount === 1 ? "y" : "ies"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 12 }}>
        <div style={{ padding: "12px", background: K.s2, border: `1px solid ${onboarding.doneCount === onboarding.totalCount ? K.gn : K.ac}35`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Onboarding</div>
          <div style={{ fontFamily: fontD, fontSize: 24, fontWeight: 800, color: onboarding.doneCount === onboarding.totalCount ? K.gn : K.ac, marginBottom: 6 }}>
            {onboarding.doneCount}/{onboarding.totalCount}
          </div>
          <div style={{ height: 6, background: K.s1, borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ width: `${onboarding.pct}%`, height: "100%", background: onboarding.doneCount === onboarding.totalCount ? K.gn : K.ac, borderRadius: 999 }} />
          </div>
          <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.6, marginBottom: 10 }}>
            {onboarding.remaining[0]
              ? `Next: ${onboarding.remaining[0].label}.`
              : "Core launch setup is complete for this account."}
          </div>
          <button onClick={() => navigate("/get-started")} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.ac, fontSize: 11, cursor: "pointer", fontFamily: font }}>
            Open setup guide →
          </button>
        </div>

        <div style={{ padding: "12px", background: K.s2, border: `1px solid ${snapshot.expiringBooks.length ? K.yl : K.bd}`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Expiring Promos</div>
          {snapshot.expiringBooks.length ? (
            <>
              <div style={{ fontFamily: fontD, fontSize: 24, fontWeight: 800, color: K.yl, marginBottom: 6 }}>{snapshot.expiringBooks.length}</div>
              <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.6, marginBottom: 10 }}>
                {snapshot.expiringBooks.map((book) => `${book.name} (${book.bonus})`).join(", ")}
              </div>
              <button onClick={() => navigate("/sportsbooks")} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.ac, fontSize: 11, cursor: "pointer", fontFamily: font }}>
                Review books →
              </button>
            </>
          ) : (
            <div style={{ fontSize: 11, color: K.gn, lineHeight: 1.6 }}>No tracked welcome offers are expiring in the next 72 hours.</div>
          )}
        </div>

        <div style={{ padding: "12px", background: K.s2, border: `1px solid ${tone}35`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Bankroll Posture</div>
          <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: tone, marginBottom: 6 }}>{posture.title}</div>
          <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.6 }}>{posture.body}</div>
        </div>

        <div style={{ padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Today&apos;s Promo Volume</div>
          <div style={{ fontFamily: fontD, fontSize: 24, fontWeight: 800, color: K.gn, marginBottom: 6 }}>{snapshot.todayPromos.length}</div>
          <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.6, marginBottom: 10 }}>
            {snapshot.todayPromos.length ? "Recurring promos match today’s schedule." : "No recurring promos matched today’s schedule."}
          </div>
          <button onClick={() => navigate("/promo-calendar")} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.ac, fontSize: 11, cursor: "pointer", fontFamily: font }}>
            Open promo calendar →
          </button>
        </div>
      </div>

      <div style={{ padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
        <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Unfinished Work</div>
        {unfinished.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            {unfinished.map((item) => (
              <button
                key={item.key}
                onClick={() => navigate(`/${item.slug}`)}
                style={{ textAlign: "left", padding: "10px 12px", background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 8, cursor: "pointer", fontFamily: font }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: K.tx, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.6 }}>{item.detail}</div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: K.gn }}>No urgent unfinished work is surfaced from your current tracker and ledger state.</div>
        )}
      </div>

      {playbookResults.top.length > 0 && (
        <div style={{ marginTop: 12, padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Matching Playbooks</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
            {playbookResults.top.map(({ playbook, fitScore, reasons }) => (
              <div key={playbook.id} style={{ padding: "10px 12px", background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: K.tx }}>{playbook.name}</div>
                  <div style={{ fontSize: 10, color: K.ac, fontFamily: fontD, fontWeight: 700 }}>{fitScore}</div>
                </div>
                <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.6, marginBottom: 6 }}>{playbook.summary}</div>
                <div style={{ fontSize: 10, color: K.dm, marginBottom: 8 }}>{reasons.slice(0, 2).map((r) => r.text).join(" · ")}</div>
                <button
                  onClick={() => queuePlaybook(playbook)}
                  disabled={!syncAppData}
                  style={{ padding: "6px 10px", background: K.gn, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, fontSize: 11, cursor: syncAppData ? "pointer" : "default", fontFamily: font }}
                >
                  Queue {playbook.steps.length} steps →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ObservabilityPanel appData={appData} snapshot={snapshot} syncDiagnostics={syncDiagnostics} usageLog={usageLog} />

      <div style={{ marginTop: 12 }}>
        <WorkflowInboxPanel appData={appData} navigate={navigate} bankroll={snapshot.bankroll ?? ""} />
      </div>
    </div>
  );
}
