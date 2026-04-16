import React from "react";
import { AppDataCtx, useToast } from "../../contexts.jsx";
import { K, font, fontD } from "../../lib/shared.js";
import { buildWorkflowInbox } from "../../workflows/inbox.js";
import { formatPromoTypeLabel, upsertWorkflowEntry } from "../../promograph/index.js";
import { updateResultFeedback } from "../../track/insights.js";

export default function WorkflowInboxPanel({ appData = {}, navigate, bankroll = "" }) {
  const { syncAppData } = React.useContext(AppDataCtx) || {};
  const toast = useToast();
  const inbox = React.useMemo(() => buildWorkflowInbox(appData, { bankroll, now: new Date() }), [appData, bankroll]);

  const patchWorkflow = (workflow, patch = {}) => {
    if (!syncAppData) return;
    const nextTimestamp = new Date().toISOString();
    const nextWorkflow = { ...workflow, ...patch, updatedAt: nextTimestamp };
    const nextInbox = upsertWorkflowEntry(appData.workflowInbox || [], nextWorkflow);
    const hasFeedbackEntry = Array.isArray(appData.resultFeedback) && appData.resultFeedback.some((entry) => entry?.id === workflow.id);
    const nextFeedback = hasFeedbackEntry
      ? updateResultFeedback(appData.resultFeedback || [], workflow.id, { ...patch, updatedAt: nextTimestamp })
      : appData.resultFeedback || [];
    syncAppData({ ...appData, workflowInbox: nextInbox, resultFeedback: nextFeedback });
    if (toast) toast(`Workflow moved to ${String(patch.status || workflow.status).replace(/_/g, " ")}.`, K.gn);
  };

  const nextActions = (workflow) => {
    switch (workflow.status) {
      case "queued":
        return [{ label: "Mark ready", patch: { status: "ready" } }];
      case "ready":
        return [{ label: "Mark placed", patch: { status: "placed" } }];
      case "placed":
        return [{ label: "Mark waiting", patch: { status: "waiting" } }];
      case "waiting":
        return [{ label: "Open Track", navigateTo: "/track" }];
      default:
        return [];
    }
  };

  return (
    <div style={{ padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 4 }}>Workflow Inbox</div>
          <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: K.tx }}>{inbox.open.length} live workflow{inbox.open.length === 1 ? "" : "s"}</div>
        </div>
        <div style={{ fontSize: 11, color: K.mt }}>
          Queued: <strong style={{ color: K.tx }}>{inbox.queuedCount}</strong> · Waiting: <strong style={{ color: K.tx }}>{inbox.waitingCount}</strong>
        </div>
      </div>

      {inbox.top.length === 0 && (
        <div style={{ fontSize: 11, color: K.mt, lineHeight: 1.6 }}>
          Save workflows from Promo Advisor, AI Action Plan, or calculator feedback to build a real inbox instead of a one-off result trail.
        </div>
      )}

      {inbox.top.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {inbox.top.map((workflow) => (
            <div
              key={workflow.id}
              onClick={() => navigate(workflow.status === "waiting" || workflow.status === "placed" ? "/track" : `/${workflow.calculatorSlug || "track"}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(workflow.status === "waiting" || workflow.status === "placed" ? "/track" : `/${workflow.calculatorSlug || "track"}`);
                }
              }}
              style={{ textAlign: "left", padding: "10px 12px", background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 8, cursor: "pointer", fontFamily: font }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: K.tx }}>{workflow.title}</div>
                <div style={{ fontSize: 10, color: workflow.score >= 90 ? K.gn : workflow.score >= 75 ? K.ac : K.yl, fontWeight: 700 }}>
                  Score {workflow.score}
                </div>
              </div>
              <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.6, marginBottom: 4 }}>
                {workflow.summary || "Workflow saved without summary."}
              </div>
              {workflow.scoreSummary && (
                <div style={{ fontSize: 10, color: K.ac, lineHeight: 1.6, marginBottom: 6 }}>
                  Why now: {workflow.scoreSummary}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10, color: K.dm }}>
                <span>Status: <strong style={{ color: K.tx }}>{workflow.status}</strong></span>
                <span>Type: <strong style={{ color: K.tx }}>{formatPromoTypeLabel(workflow.promoType)}</strong></span>
                {workflow.expectedProfit !== null && <span>Est: <strong style={{ color: K.gn }}>${workflow.expectedProfit.toFixed(2)}</strong></span>}
                {workflow.book && <span>Book: <strong style={{ color: K.tx }}>{workflow.book}</strong></span>}
                <span>Source: <strong style={{ color: K.tx }}>{workflow.source.replace(/_/g, " ")}</strong></span>
              </div>
              {workflow.nextStep && (
                <div style={{ marginTop: 6, fontSize: 10, color: K.mt }}>
                  Next: <strong style={{ color: K.tx }}>{workflow.nextStep}</strong>
                </div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {nextActions(workflow).map((action) => (
                  <button
                    key={action.label}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (action.navigateTo) {
                        navigate(action.navigateTo);
                        return;
                      }
                      patchWorkflow(workflow, action.patch);
                    }}
                    style={{
                      padding: "5px 8px",
                      background: "transparent",
                      borderRadius: 999,
                      border: `1px solid ${K.ac}35`,
                      color: K.ac,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {action.label}
                  </button>
                ))}
                {workflow.status !== "skipped" && workflow.status !== "settled" && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      patchWorkflow(workflow, { status: "skipped", skipReason: workflow.skipReason || "manual_skip" });
                    }}
                    style={{
                      padding: "5px 8px",
                      background: "transparent",
                      borderRadius: 999,
                      border: `1px solid ${K.yl}35`,
                      color: K.yl,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Skip
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
