import React from "react";
import { BOOKS, getConfiguredAffiliateCount, getConfiguredMonetizationCount, hasConfiguredMonetizationLinks } from "../../books.js";
import { FEATURE_KEYS, getFeatureState, getLaunchCommandCenter, getLaunchSummary, resolveLaunchValidation } from "../../launchState.js";
import { K, S, fontD } from "../../lib/shared.js";
import { AppDataCtx } from "../../contexts.jsx";
import { appendStudioContractHistory, buildStudioSnapshot } from "../../studio/export.js";
import { buildTargetedAlertPlan } from "../../operator/briefing.js";

export default function LaunchCommandCenterPanel() {
  const { appData, syncAppData } = React.useContext(AppDataCtx) || {};
  const summary = getLaunchSummary();
  const configuredAffiliates = getConfiguredAffiliateCount();
  const configuredMonetization = getConfiguredMonetizationCount();
  const affiliateReady = hasConfiguredMonetizationLinks();
  const validation = resolveLaunchValidation();
  const snapshot = buildStudioSnapshot(appData || {}, {
    bankroll: typeof window !== "undefined" ? localStorage.getItem("pg_bankroll") || "" : "",
  });
  const alertPlan = buildTargetedAlertPlan({ snapshot });
  const commandCenter = getLaunchCommandCenter({
    configuredAffiliateCount: configuredAffiliates,
    configuredMonetizationCount: configuredMonetization,
    totalBooks: BOOKS.length,
    validation,
  });
  const scoreColor =
    commandCenter.posture === "ready" ? K.gn :
    commandCenter.posture === "advancing" ? K.ac :
    commandCenter.posture === "blocked" ? K.yl :
    K.rd;
  const exportSnapshot = async () => {
    const nextHistory = appendStudioContractHistory(appData?.studioContractHistory || [], snapshot);
    if (syncAppData) {
      syncAppData({ ...appData, studioContractHistory: nextHistory });
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    } catch {}
  };
  const latestPublished = Array.isArray(appData?.studioContractHistory) ? appData.studioContractHistory[0] : null;

  return (
    <div style={{ ...S.card, border: `1px solid ${K.ac}35`, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: K.ac, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 6 }}>Launch Command Center</div>
          <div style={{ fontFamily: fontD, fontSize: 17, fontWeight: 700, color: K.tx, marginBottom: 6 }}>Current launch posture</div>
          <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.7, maxWidth: 760 }}>
            PromoGrind&apos;s core calculators are live. The main bottlenecks are now deployment truthfulness, monetization coverage, and proof that the friend-facing loop actually converts.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={exportSnapshot} style={{ padding: "8px 10px", background: "transparent", border: `1px solid ${K.ac}35`, borderRadius: 8, color: K.ac, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            Publish Studio Contract
          </button>
          <div style={{ padding: "8px 10px", background: K.s2, border: `1px solid ${scoreColor}45`, borderRadius: 8, minWidth: 118 }}>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>Readiness Score</div>
            <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 700, color: scoreColor }}>{commandCenter.readinessScore}/100</div>
          </div>
          <div style={{ padding: "8px 10px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, minWidth: 108 }}>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>Flags Live</div>
            <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 700, color: K.gn }}>{summary.enabledCount}/{summary.totalCount}</div>
          </div>
          <div style={{ padding: "8px 10px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, minWidth: 108 }}>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>Monetized Links</div>
            <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 700, color: configuredMonetization ? K.gn : K.yl }}>{configuredMonetization}/{BOOKS.length}</div>
          </div>
          <div style={{ padding: "8px 10px", background: K.s2, border: `1px solid ${snapshot.intelligence.driftAlerts.length ? K.yl : K.bd}`, borderRadius: 8, minWidth: 108 }}>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>Drift Alerts</div>
            <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 700, color: snapshot.intelligence.driftAlerts.length ? K.yl : K.gn }}>{snapshot.intelligence.driftAlerts.length}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 12 }}>
        <div style={{ padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: K.tx, marginBottom: 8 }}>Validation</div>
          {Object.values(validation).map((check) => (
            <div key={check.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11, color: K.dm, marginBottom: 6 }}>
              <span>{check.label}</span>
              <span style={{ color: check.signal === "passing" ? K.gn : check.signal === "failing" ? K.rd : K.yl, fontWeight: 700 }}>{check.lastKnown}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: K.tx, marginBottom: 8 }}>Operator priorities</div>
          <div style={{ fontSize: 10, color: affiliateReady ? K.gn : K.yl, marginBottom: 8 }}>
            Monetization readiness: {affiliateReady ? `${configuredMonetization}/${BOOKS.length} books monetized` : "not configured yet"}
          </div>
          <div style={{ fontSize: 10, color: configuredAffiliates ? K.gn : K.mt, marginBottom: 8 }}>
            Affiliate-approved links: {configuredAffiliates}/{BOOKS.length}
          </div>
          {commandCenter.nextActions.map((blocker) => (
            <div key={blocker.key} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: blocker.status === "manual" ? K.yl : K.ac, fontWeight: 700 }}>{blocker.label}</div>
              <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5 }}>{blocker.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 12 }}>
        <div style={{ padding: "12px", background: `${K.ac}08`, border: `1px solid ${K.ac}25`, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: K.ac, marginBottom: 8 }}>Daily Command Brief</div>
          <div style={{ fontSize: 12, color: K.tx, fontWeight: 700, marginBottom: 6 }}>{snapshot.brief.headline}</div>
          <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.6, marginBottom: 8 }}>{snapshot.brief.body}</div>
          <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.6 }}>
            {snapshot.brief.followUps.length ? snapshot.brief.followUps.join(" · ") : "The operator loop will deepen as more workflows and settlements land."}
          </div>
        </div>
        <div style={{ padding: "12px", background: `${K.gn}08`, border: `1px solid ${K.gn}25`, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: K.gn, marginBottom: 8 }}>Targeted Alert Queue</div>
          <div style={{ fontSize: 12, color: K.tx, fontWeight: 700, marginBottom: 6 }}>{alertPlan.primary.headline}</div>
          <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.6, marginBottom: 8 }}>{alertPlan.primary.body}</div>
          <div style={{ display: "grid", gap: 6 }}>
            {alertPlan.queue.slice(0, 4).map((item) => (
              <div key={`${item.kind}:${item.headline}`} style={{ padding: "8px 10px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: K.tx, fontWeight: 700 }}>{item.headline}</div>
                <div style={{ fontSize: 10, color: K.mt }}>{item.ctaLabel} · {item.tags.join(", ")}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: K.tx, marginBottom: 8 }}>Studio priorities</div>
          {(snapshot.feeds.priorities.length ? snapshot.feeds.priorities : [{
            type: "none",
            priority: "low",
            title: "No machine priorities yet",
            detail: "Run more workflows and settlements to deepen the operator feed.",
          }]).map((item) => (
            <div key={`${item.type}:${item.title}`} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: item.priority === "high" ? K.ac : K.gn, fontWeight: 700 }}>{item.title}</div>
              <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5 }}>{item.detail}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: K.tx, marginBottom: 8 }}>Anomalies and drift</div>
          {(snapshot.feeds.anomalies.length ? snapshot.feeds.anomalies : [{
            type: "none",
            severity: "low",
            label: "No anomaly feed yet",
            detail: "Once the workflow loop deepens, PromoGrind will surface cold lanes and operational anomalies here.",
          }]).map((item) => (
            <div key={`${item.type}:${item.label}`} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: item.severity === "high" ? K.yl : item.severity === "positive" ? K.gn : K.dm, fontWeight: 700 }}>{item.label}</div>
              <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: K.tx, marginBottom: 8 }}>Workflow Command Deck</div>
        {snapshot.workflows.top.length === 0 && <div style={{ fontSize: 11, color: K.mt }}>No live workflows yet. Save more workflows from calculators or AI surfaces to populate the cockpit.</div>}
        {snapshot.workflows.top.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            {snapshot.workflows.top.slice(0, 4).map((workflow) => (
              <div key={workflow.id} style={{ padding: "10px 12px", background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: K.tx }}>{workflow.title}</div>
                  <div style={{ fontSize: 10, color: workflow.score >= 90 ? K.gn : K.ac, fontWeight: 700 }}>Score {workflow.score}</div>
                </div>
                <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5, marginBottom: 4 }}>{workflow.scoreSummary || `${workflow.status} workflow.`}</div>
                <div style={{ fontSize: 10, color: K.dm }}>{workflow.status} · {String(workflow.source || "").replace(/_/g, " ")}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: K.tx, marginBottom: 8 }}>Published contract history</div>
        {!latestPublished && <div style={{ fontSize: 11, color: K.mt }}>No published contract snapshots yet. Publishing captures the current contract plus a delta summary for downstream Studio tools.</div>}
        {latestPublished && (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: K.tx, fontWeight: 700 }}>{latestPublished.brief?.headline || "Latest published contract"}</div>
            <div style={{ fontSize: 10, color: K.mt }}>
              Published {new Date(latestPublished.publishedAt).toLocaleString()} · {latestPublished.delta?.summary}
            </div>
            <div style={{ fontSize: 10, color: K.dm, lineHeight: 1.6 }}>
              Readiness {latestPublished.summary?.readinessScore ?? "—"} · Open workflows {latestPublished.summary?.workflowCount ?? 0} · Drift alerts {latestPublished.summary?.driftAlertCount ?? 0}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 12 }}>
        {[
          ["Validation", `${commandCenter.validationPassingCount}/${commandCenter.validationTotal}`, commandCenter.validationScore >= 100 ? K.gn : K.yl],
          ["Monetization", `${commandCenter.monetizationScore}%`, commandCenter.monetizationScore >= 60 ? K.gn : K.yl],
          ["Affiliate Ready", `${commandCenter.affiliateScore}%`, commandCenter.affiliateScore >= 40 ? K.gn : K.yl],
          ["Manual Blockers", `${commandCenter.unresolvedBlockerCount}`, commandCenter.unresolvedBlockerCount <= 1 ? K.gn : K.yl],
        ].map(([label, value, color]) => (
          <div key={label} style={{ padding: "10px 12px", background: K.s2, border: `1px solid ${color}30`, borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>{label}</div>
            <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: K.tx, marginBottom: 8 }}>Feature rollout</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
          {FEATURE_KEYS.map((key) => {
            const feature = getFeatureState(key);
            return (
              <div key={key} style={{ padding: "10px 12px", background: K.s2, border: `1px solid ${feature.enabled ? K.gn : K.bd}`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: feature.enabled ? K.gn : K.tx, marginBottom: 4 }}>{feature.label}</div>
                <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5 }}>{feature.enabled ? "Enabled" : feature.shortReason}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
