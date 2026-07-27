import React from "react";
import { BOOKS, getConfiguredAffiliateCount, getConfiguredMonetizationCount, getRequiredLaunchMonetizationStatus, hasConfiguredMonetizationLinks } from "../../books.js";
import { FEATURE_KEYS, getFeatureState, getLaunchCommandCenter, getLaunchProofCommandItems, getLaunchProofSummary, getLaunchSummary, resolveLaunchValidation } from "../../launchState.js";
import { K, S, fontD } from "../../lib/shared.js";
import { AppDataCtx } from "../../contexts.jsx";
import { appendStudioContractHistory } from "../../studio/export.js";
import { buildOperatorSurfaceState } from "../../dashboard/operatorSurfaces.js";
import { getWorkflowActionSlug, normalizeAppRoute } from "../../workflows/actionGraph.js";
import { appendWorkflow } from "../../workflows/store.js";
import { launchBlockerToWorkflow } from "../../workflows/suggestions.js";

export default function LaunchCommandCenterPanel({ navigate: navigateProp = null }) {
  const { appData, syncAppData } = React.useContext(AppDataCtx) || {};
  const navigate = typeof navigateProp === "function" ? navigateProp : null;
  const summary = getLaunchSummary();
  const configuredAffiliates = getConfiguredAffiliateCount();
  const configuredMonetization = getConfiguredMonetizationCount();
  const affiliateReady = hasConfiguredMonetizationLinks();
  const requiredLaunchMonetization = getRequiredLaunchMonetizationStatus();
  const validation = resolveLaunchValidation();
  const launchProofSummary = getLaunchProofSummary();
  const launchProofBlockers = getLaunchProofCommandItems();
  const { bankroll, studioSnapshot: snapshot, dashboardSnapshot, alertPlan } = buildOperatorSurfaceState({
    appData: appData || {},
    now: new Date(),
  });
  const commandCenter = getLaunchCommandCenter({
    configuredAffiliateCount: configuredAffiliates,
    configuredMonetizationCount: configuredMonetization,
    totalBooks: BOOKS.length,
    validation,
    blockers: launchProofBlockers,
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
  const queueLaunchBlocker = (blocker, index) => {
    if (!syncAppData) return;
    const workflow = launchBlockerToWorkflow(blocker, { index, nextStep: blocker.nextStep, now: new Date() });
    syncAppData(appendWorkflow(appData || {}, workflow));
  };

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
          <a href="/feature-flags" style={{ padding: "8px 10px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 8, color: K.dm, fontSize: 10, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center" }}>
            Feature Flags →
          </a>
          <div style={{ padding: "8px 10px", background: K.s2, border: `1px solid ${scoreColor}45`, borderRadius: 8, minWidth: 118 }}>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>Readiness Score</div>
            <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 700, color: scoreColor }}>{commandCenter.readinessScore}/100</div>
          </div>
          <div style={{ padding: "8px 10px", background: K.s2, border: `1px solid ${launchProofSummary.blocking ? K.yl : K.gn}45`, borderRadius: 8, minWidth: 118 }}>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>Manual Proofs</div>
            <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 700, color: launchProofSummary.blocking ? K.yl : K.gn }}>{launchProofSummary.complete}/{launchProofSummary.total}</div>
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

      <div style={{ padding: "12px", background: `${launchProofSummary.blocking ? K.yl : K.gn}08`, border: `1px solid ${launchProofSummary.blocking ? K.yl : K.gn}25`, borderRadius: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: launchProofSummary.blocking ? K.yl : K.gn, marginBottom: 5 }}>Canonical launch proofs</div>
            <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.6, maxWidth: 760 }}>
              This panel mirrors the canonical evidence requirements for affiliate coverage, Stripe smoke, and friend beta proof.
            </div>
          </div>
          <div style={{ fontSize: 10, color: K.mt, textAlign: "right" }}>
            {launchProofSummary.lastUpdated ? `Updated ${launchProofSummary.lastUpdated}` : "No update date"} · {launchProofSummary.evidenceCount} evidence item{launchProofSummary.evidenceCount === 1 ? "" : "s"}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 8 }}>
          {launchProofSummary.proofs.map((proof, index) => {
            const tone = proof.isComplete ? K.gn : proof.isBlocking ? K.yl : K.ac;
            return (
              <div key={proof.key} style={{ padding: "10px 12px", background: K.s2, border: `1px solid ${tone}30`, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", marginBottom: 5 }}>
                  <div style={{ fontSize: 11, color: K.tx, fontWeight: 700 }}>{proof.label}</div>
                  <span style={{ padding: "2px 7px", borderRadius: 999, background: `${tone}16`, color: tone, fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{proof.status}</span>
                </div>
                <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5, marginBottom: 7 }}>{proof.details}</div>
                {proof.nextStep && <div style={{ fontSize: 10, color: K.dm, lineHeight: 1.5, marginBottom: 7 }}><strong style={{ color: tone }}>Next:</strong> {proof.nextStep}</div>}
                {proof.evidenceRequired.length > 0 && (
                  <div style={{ fontSize: 9, color: K.mt, lineHeight: 1.6, marginBottom: 7 }}>
                    Evidence: {proof.evidenceCount}/{proof.evidenceRequired.length} · {proof.missingEvidence.length ? `Missing next: ${proof.missingEvidence[0]}` : "quorum satisfied"}
                  </div>
                )}
                {!proof.isComplete && (
                  <button
                    onClick={() => queueLaunchBlocker(proof, index)}
                    style={{ padding: "5px 8px", background: "transparent", border: `1px solid ${tone}35`, borderRadius: 6, color: tone, fontSize: 10, cursor: "pointer" }}
                  >
                    Queue proof work →
                  </button>
                )}
              </div>
            );
          })}
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
          <div style={{ fontSize: 10, color: requiredLaunchMonetization.missingBooks.length ? K.yl : K.gn, marginBottom: 8, lineHeight: 1.5 }}>
            Required launch books: {requiredLaunchMonetization.configuredBooks.length}/{requiredLaunchMonetization.requiredBooks.length}
            {requiredLaunchMonetization.missingBooks.length ? ` (${requiredLaunchMonetization.missingBooks.join(", ")} pending)` : " (complete)"}
          </div>
          {commandCenter.nextActions.map((blocker) => (
            <div key={blocker.key} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: blocker.status === "manual" ? K.yl : K.ac, fontWeight: 700 }}>{blocker.label}</div>
              <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5 }}>{blocker.detail}</div>
              <button
                onClick={() => queueLaunchBlocker(blocker, commandCenter.nextActions.findIndex((item) => item.key === blocker.key))}
                style={{ marginTop: 6, padding: "5px 8px", background: "transparent", border: `1px solid ${K.ac}30`, borderRadius: 6, color: K.ac, fontSize: 10, cursor: "pointer" }}
              >
                Queue blocker →
              </button>
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
          {navigate && snapshot.brief.focus?.type && (
            <button
              onClick={() => navigate(normalizeAppRoute(snapshot.brief.focus.type === "workflow" ? getWorkflowActionSlug(snapshot.workflows.top[0]) : "/dashboard"))}
              style={{ marginTop: 10, padding: "6px 12px", background: "transparent", border: `1px solid ${K.ac}35`, borderRadius: 6, color: K.ac, fontSize: 11, cursor: "pointer" }}
            >
              Open brief focus →
            </button>
          )}
          {dashboardSnapshot.topPlaybook?.applicable && dashboardSnapshot.topPlaybook.playbook && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${K.gn}25` }}>
              <div style={{ fontSize: 10, color: K.gn, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "1px" }}>Top Matched Playbook</div>
              <div style={{ fontSize: 11, color: K.tx, fontWeight: 700, marginBottom: 2 }}>{dashboardSnapshot.topPlaybook.playbook.name}</div>
              <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5 }}>
                {dashboardSnapshot.topPlaybook.reasons?.map((r) => r.text).join(" · ") || `Fit score ${dashboardSnapshot.topPlaybook.fitScore}`}
              </div>
            </div>
          )}
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
              <div
                key={workflow.id}
                onClick={() => navigate && navigate(getWorkflowActionSlug(workflow))}
                style={{ padding: "10px 12px", background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 8, cursor: navigate ? "pointer" : "default" }}
              >
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
