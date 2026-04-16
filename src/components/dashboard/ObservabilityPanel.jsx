import React from "react";
import { K, S, font, fontD } from "../../lib/shared.js";
import { buildObservabilitySnapshot } from "../../observability.js";

function metric(label, value, note, color = K.tx) {
  return (
    <div style={{ padding: 12, background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
      <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5 }}>{note}</div>
    </div>
  );
}

export default function ObservabilityPanel({ appData = {}, snapshot = {}, syncDiagnostics = {}, usageLog = {} }) {
  const obs = buildObservabilitySnapshot({ appData, dashboardSnapshot: snapshot, syncDiagnostics, usageLog });
  const syncTone = syncDiagnostics.online === false ? K.rd : obs.hasPendingWrites ? K.yl : K.gn;
  const microNpsLabel = obs.latestMicroNps
    ? (obs.latestMicroNps === "yes" ? "Worth it" : obs.latestMicroNps === "mixed" ? "Mixed" : "Not worth it")
    : "No signal";

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
            {syncDiagnostics.online === false ? "Offline" : obs.hasPendingWrites ? `${obs.queueDepth} queued` : (syncDiagnostics.syncStatus === "saved" ? "Saved" : "Clean")}
          </div>
          <div style={{ fontSize: 10, color: K.mt }}>
            {syncDiagnostics.online === false ? "Writes stay local until connection returns." : obs.hasPendingWrites ? "Queued writes will flush on the next successful sync." : "Remote sync is caught up."}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginBottom: 10 }}>
        {metric("Activation", `${obs.activationScore}/100`, `${obs.calculatorsUsed} calculators used · ${snapshot.booksComplete || 0}/${snapshot.booksRemaining !== undefined ? (snapshot.booksComplete || 0) + snapshot.booksRemaining : 0} books activated`, obs.activationScore >= 70 ? K.gn : K.yl)}
        {metric("Return Loop", `${obs.recentSettledCount}`, `${obs.recentSettledProfit >= 0 ? "+" : "-"}$${Math.abs(obs.recentSettledProfit || 0).toFixed(2)} settled in the last 7 days`, obs.recentSettledCount > 0 ? K.gn : K.ac)}
        {metric("Workflow Load", `${obs.openWorkflows}`, `${obs.waitingWorkflows} waiting/placed · ${obs.settledFeedback} settled feedback rows`, obs.openWorkflows > 0 ? K.ac : K.mt)}
        {metric("Monetization", `${obs.monetizationCoverage}%`, `${obs.monetizedBooks} of ${snapshot.booksComplete !== undefined ? "tracked" : "total"} books have monetized links configured`, obs.monetizationCoverage >= 60 ? K.gn : K.yl)}
        {metric("Usage Volume", `${obs.totalCalculations}`, `${obs.calculatorsUsed} distinct calculators used from local usage log`, obs.totalCalculations > 0 ? K.gn : K.mt)}
        {metric("Micro-NPS", microNpsLabel, obs.latestMicroNps ? `Captured after ${obs.latestMicroNpsSettledCount} settled workflows` : "Waiting for post-settlement feedback", obs.latestMicroNps === "no" ? K.rd : obs.latestMicroNps === "mixed" ? K.yl : K.gn)}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ padding: "4px 8px", background: `${obs.hasPendingWrites ? K.yl : K.gn}12`, border: `1px solid ${obs.hasPendingWrites ? K.yl : K.gn}25`, borderRadius: 999, fontSize: 10, color: obs.hasPendingWrites ? K.yl : K.gn, fontFamily: font }}>
          {obs.hasPendingWrites ? "Pending sync backlog" : "Remote sync caught up"}
        </span>
        <span style={{ padding: "4px 8px", background: `${obs.monetizationCoverage >= 60 ? K.gn : K.ac}12`, border: `1px solid ${obs.monetizationCoverage >= 60 ? K.gn : K.ac}25`, borderRadius: 999, fontSize: 10, color: obs.monetizationCoverage >= 60 ? K.gn : K.ac, fontFamily: font }}>
          Monetization coverage {obs.monetizationCoverage}%
        </span>
        <span style={{ padding: "4px 8px", background: `${obs.activationScore >= 70 ? K.gn : K.yl}12`, border: `1px solid ${obs.activationScore >= 70 ? K.gn : K.yl}25`, borderRadius: 999, fontSize: 10, color: obs.activationScore >= 70 ? K.gn : K.yl, fontFamily: font }}>
          Activation score {obs.activationScore}/100
        </span>
      </div>
    </div>
  );
}
