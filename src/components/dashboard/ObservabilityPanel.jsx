import React from "react";
import { K, S, font, fontD } from "../../lib/shared.js";
import { buildObservabilitySnapshot } from "../../observability.js";
import { supabase } from "../../auth.js";

const AI_EVENT_TYPES = ["promo_advisor", "promo_chat", "ai_action_plan", "stack_builder"];

function metric(label, value, note, color = K.tx) {
  return (
    <div style={{ padding: 12, background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
      <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5 }}>{note}</div>
    </div>
  );
}

export default function ObservabilityPanel({ appData = {}, snapshot = {}, syncDiagnostics, usageLog = {} }) {
  const [aiEvents, setAiEvents] = React.useState([]);
  const [aiTelemetry, setAiTelemetry] = React.useState({ state: "loading", source: "vault-events", observedAt: null });
  const [telemetryAttempt, setTelemetryAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    async function loadAiEvents() {
      try {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) setAiTelemetry({ state: "unknown", source: "vault-events", observedAt: new Date().toISOString(), reason: "signed-out" });
          return;
        }
        const { data, error } = await supabase
          .from("vault_events")
          .select("event_type,created_at,metadata")
          .in("event_type", AI_EVENT_TYPES)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(500);
        if (!cancelled) {
          if (error || !Array.isArray(data)) {
            setAiEvents([]);
            setAiTelemetry({ state: "degraded", source: "vault-events", observedAt: new Date().toISOString(), reason: "query-failed" });
          } else {
            setAiEvents(data);
            setAiTelemetry({ state: "healthy", source: "vault-events", observedAt: new Date().toISOString(), reason: null });
          }
        }
      } catch {
        if (!cancelled) {
          setAiEvents([]);
          setAiTelemetry({ state: "degraded", source: "vault-events", observedAt: new Date().toISOString(), reason: "request-failed" });
        }
      }
    }
    loadAiEvents();
    return () => { cancelled = true; };
  }, [telemetryAttempt]);

  const obs = buildObservabilitySnapshot({ appData, dashboardSnapshot: snapshot, syncDiagnostics, usageLog, aiEvents, aiTelemetry });
  const syncTone = obs.syncHealth.state === "healthy" ? K.gn : obs.syncHealth.state === "degraded" ? K.yl : K.mt;
  const aiTone = obs.aiTelemetry.state === "degraded" ? K.rd : obs.aiTelemetry.state !== "healthy" ? K.mt : obs.aiUsage.risk === "high" ? K.rd : obs.aiUsage.risk === "watch" ? K.yl : K.gn;
  const microNpsLabel = obs.latestMicroNps
    ? (obs.latestMicroNps === "yes" ? "Worth it" : obs.latestMicroNps === "mixed" ? "Mixed" : "Not worth it")
    : "No signal";
  const missingLaunchBooks = obs.launchProofSummary.missingLaunchBooks.join(", ");

  return (
    <div style={{ ...S.card, border: `1px solid ${K.pp}35`, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: K.pp, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 5 }}>
            Observability
          </div>
          <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: K.tx, marginBottom: 4 }}>
            Activation, return loop, monetization, and sync health
          </div>
          <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.6, maxWidth: 760 }}>
            This is the operator readout for whether users are activating, returning, and syncing cleanly enough to trust growth work.
          </div>
        </div>
        <div style={{ padding: "10px 12px", background: K.s2, border: `1px solid ${syncTone}35`, borderRadius: 8, minWidth: 180 }}>
          <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>Sync State</div>
          <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 800, color: syncTone }}>
            {obs.syncHealth.label}
          </div>
          <div style={{ fontSize: 10, color: K.mt }}>
            {obs.syncHealth.detail}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginBottom: 10 }}>
        {metric("Activation", `${obs.activationScore}/100`, `${obs.calculatorsUsed} calculators used · ${snapshot.booksComplete || 0}/${snapshot.booksRemaining !== undefined ? (snapshot.booksComplete || 0) + snapshot.booksRemaining : 0} books activated`, obs.activationScore >= 70 ? K.gn : K.yl)}
        {metric("Funnel", `${obs.activationFunnel.completion}%`, `${obs.activationFunnel.firstWorkflowQueued ? "workflow queued" : "no workflow yet"} · ${obs.activationFunnel.firstSettlement ? "settled" : "no settlement yet"}`, obs.activationFunnel.completion >= 60 ? K.gn : K.yl)}
        {metric("Return Loop", `${obs.recentSettledCount}`, `${obs.recentSettledProfit >= 0 ? "+" : "-"}$${Math.abs(obs.recentSettledProfit || 0).toFixed(2)} settled in the last 7 days`, obs.recentSettledCount > 0 ? K.gn : K.ac)}
        {metric("Workflow Load", `${obs.openWorkflows}`, `${obs.waitingWorkflows} waiting/placed · ${obs.settledFeedback} settled feedback rows`, obs.openWorkflows > 0 ? K.ac : K.mt)}
        {metric("Monetization", `${obs.monetizationCoverage}%`, `${obs.monetizedBooks} of ${snapshot.booksComplete !== undefined ? "tracked" : "total"} books have monetized links configured`, obs.monetizationCoverage >= 60 ? K.gn : K.yl)}
        {metric("Launch Links", obs.launchProofSummary.affiliateLinksReady ? "Ready" : "Blocked", obs.launchProofSummary.affiliateLinksReady ? "Required launch books have tracked links." : `Missing ${missingLaunchBooks || "required books"}`, obs.launchProofSummary.affiliateLinksReady ? K.gn : K.yl)}
        {metric("Usage Volume", `${obs.totalCalculations}`, `${obs.calculatorsUsed} distinct calculators used from local usage log`, obs.totalCalculations > 0 ? K.gn : K.mt)}
        {metric("AI Load", obs.aiTelemetry.state === "healthy" ? `${obs.aiUsage.today}` : obs.aiTelemetry.state === "loading" ? "…" : "Unknown", obs.aiTelemetry.state === "healthy" ? `${obs.aiUsage.week} in 7d · ${obs.aiUsage.recentBurst} in 10m${obs.aiUsage.topFeature ? ` · top: ${obs.aiUsage.topFeature}` : ""}` : `Telemetry ${obs.aiTelemetry.reason || obs.aiTelemetry.state}; no health inference.`, aiTone)}
        {metric("Micro-NPS", microNpsLabel, obs.latestMicroNps ? `Captured after ${obs.latestMicroNpsSettledCount} settled workflows` : "Waiting for post-settlement feedback", obs.latestMicroNps === "no" ? K.rd : obs.latestMicroNps === "mixed" ? K.yl : K.gn)}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ padding: "4px 8px", background: `${obs.hasPendingWrites ? K.yl : K.gn}12`, border: `1px solid ${obs.hasPendingWrites ? K.yl : K.gn}25`, borderRadius: 999, fontSize: 10, color: obs.hasPendingWrites ? K.yl : K.gn, fontFamily: font }}>
          {obs.syncHealth.state === "healthy" ? "Remote sync caught up" : obs.syncHealth.state === "degraded" ? obs.syncHealth.label : "Sync state unknown"}
        </span>
        <span style={{ padding: "4px 8px", background: `${obs.monetizationCoverage >= 60 ? K.gn : K.ac}12`, border: `1px solid ${obs.monetizationCoverage >= 60 ? K.gn : K.ac}25`, borderRadius: 999, fontSize: 10, color: obs.monetizationCoverage >= 60 ? K.gn : K.ac, fontFamily: font }}>
          Monetization coverage {obs.monetizationCoverage}%
        </span>
        <span style={{ padding: "4px 8px", background: `${obs.activationScore >= 70 ? K.gn : K.yl}12`, border: `1px solid ${obs.activationScore >= 70 ? K.gn : K.yl}25`, borderRadius: 999, fontSize: 10, color: obs.activationScore >= 70 ? K.gn : K.yl, fontFamily: font }}>
          Activation score {obs.activationScore}/100
        </span>
        <span style={{ padding: "4px 8px", background: `${obs.launchProofSummary.affiliateLinksReady ? K.gn : K.yl}12`, border: `1px solid ${obs.launchProofSummary.affiliateLinksReady ? K.gn : K.yl}25`, borderRadius: 999, fontSize: 10, color: obs.launchProofSummary.affiliateLinksReady ? K.gn : K.yl, fontFamily: font }}>
          Required launch links {obs.launchProofSummary.affiliateLinksReady ? "ready" : "missing"}
        </span>
        <span style={{ padding: "4px 8px", background: `${aiTone}12`, border: `1px solid ${aiTone}25`, borderRadius: 999, fontSize: 10, color: aiTone, fontFamily: font }}>
          {obs.aiTelemetry.state === "healthy" ? `AI abuse risk ${obs.aiUsage.risk}` : "AI telemetry unavailable"}
        </span>
        {obs.aiTelemetry.state !== "healthy" && obs.aiTelemetry.state !== "loading" && (
          <button
            type="button"
            onClick={() => {
              setAiTelemetry({ state: "loading", source: "vault-events", observedAt: null });
              setTelemetryAttempt((attempt) => attempt + 1);
            }}
            style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 999, fontSize: 10, color: K.ac, fontFamily: font, cursor: "pointer" }}
          >
            Retry AI telemetry
          </button>
        )}
        {obs.hotLanes.hotPromoTypes.slice(0, 2).map((lane) => (
          <span key={lane.key} style={{ padding: "4px 8px", background: `${K.gn}12`, border: `1px solid ${K.gn}25`, borderRadius: 999, fontSize: 10, color: K.gn, fontFamily: font }}>
            {lane.badge} · {lane.label}
          </span>
        ))}
        {obs.latestMicroNps && obs.latestMicroNps !== "yes" && (
          <span style={{ padding: "4px 8px", background: `${obs.latestMicroNps === "no" ? K.rd : K.yl}12`, border: `1px solid ${obs.latestMicroNps === "no" ? K.rd : K.yl}25`, borderRadius: 999, fontSize: 10, color: obs.latestMicroNps === "no" ? K.rd : K.yl, fontFamily: font }}>
            Micro-NPS requires follow-up
          </span>
        )}
      </div>
    </div>
  );
}
