import React, { useMemo, useState } from "react";
import { AppDataCtx } from "../contexts.jsx";
import { K, font, fontD } from "../lib/shared.js";
import { updateResultFeedback, upsertResultFeedback } from "../track/insights.js";
import { normalizePromoType } from "../promograph/index.js";
import { patchWorkflowState, writeWorkflowFeedback } from "../workflows/store.js";

export default function ResultFeedbackCard({
  calculatorKey,
  calculatorLabel,
  promoType,
  expectedProfit,
  suggestedBook = "",
}) {
  const { appData, syncAppData } = React.useContext(AppDataCtx) || {};
  const entries = appData?.resultFeedback || [];
  const roundedExpected = useMemo(() => {
    const parsed = Number.parseFloat(expectedProfit);
    return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
  }, [expectedProfit]);

  const [entryId, setEntryId] = useState(null);
  const [book, setBook] = useState(suggestedBook);
  const [actualProfit, setActualProfit] = useState("");
  const [accuracy, setAccuracy] = useState("yes");
  const [skipReason, setSkipReason] = useState("");
  const [frictionReason, setFrictionReason] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(null);

  const skipReasons = [
    ["odds_moved", "Odds moved"],
    ["ev_too_low", "EV too low"],
    ["bankroll", "Bankroll"],
    ["stake_limited", "Stake limited"],
    ["terms_unclear", "Terms unclear"],
    ["not_available", "Not available"],
  ];

  const frictionReasons = [
    ["odds_moved", "Odds moved"],
    ["stake_limited", "Stake limited"],
    ["book_issue", "Book issue"],
    ["timing", "Timing"],
    ["manual_error", "Manual error"],
  ];

  if (!syncAppData || roundedExpected === null) return null;

  const writeEntries = (nextEntries, workflowEntry = null) => {
    if (!workflowEntry) {
      syncAppData({ ...appData, resultFeedback: nextEntries });
      return;
    }
    syncAppData(writeWorkflowFeedback(
      { ...appData, resultFeedback: nextEntries },
      nextEntries.find((entry) => entry?.id === workflowEntry.id) || workflowEntry,
      workflowEntry,
    ));
  };

  const record = (nextStatus) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const entry = {
      id,
      calculatorKey,
      calculatorLabel,
      promoType: normalizePromoType(promoType),
      status: nextStatus,
      expectedProfit: roundedExpected,
      book,
      skipReason: nextStatus === "skipped" ? skipReason : "",
      frictionReason: nextStatus === "placed" ? frictionReason : "",
      note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeEntries(upsertResultFeedback(entries, entry), {
      ...entry,
      id,
      title: calculatorLabel || "Calculator workflow",
      summary: `Expected profit ${roundedExpected.toFixed(2)} from ${calculatorLabel || "calculator"} workflow.`,
      source: "calculator_result",
      actionability: nextStatus === "skipped" ? 20 : 72,
    });
    setEntryId(id);
    setStatus(nextStatus);
  };

  const settle = () => {
    if (!entryId) return;
    const patch = {
      status: "settled",
      actualProfit,
      calculatorAccurate: accuracy,
      book,
      frictionReason,
      note,
      updatedAt: new Date().toISOString(),
    };
    syncAppData(patchWorkflowState({
      ...appData,
      resultFeedback: updateResultFeedback(entries, entryId, patch),
    }, {
      id: entryId,
      calculatorKey,
      calculatorLabel,
      promoType: normalizePromoType(promoType),
      status: "placed",
      expectedProfit: roundedExpected,
      title: calculatorLabel || "Calculator workflow",
      summary: `Settled from ${calculatorLabel || "calculator"} workflow.`,
      source: "calculator_result",
    }, patch));
    setStatus("settled");
  };

  return (
    <div style={{ marginTop: 10, padding: 14, background: `${K.ac}08`, border: `1px solid ${K.ac}22`, borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 10, color: K.ac, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 4 }}>
            Result Feedback Loop
          </div>
          <div style={{ fontFamily: fontD, fontSize: 15, fontWeight: 700, color: K.tx, marginBottom: 4 }}>
            What happened next?
          </div>
          <div style={{ fontSize: 11, color: K.mt, lineHeight: 1.6, maxWidth: 560 }}>
            Capture whether you placed, skipped, or settled this workflow so Track can compare expected profit against real outcomes.
          </div>
        </div>
        <div style={{ fontSize: 12, color: K.gn, fontWeight: 700 }}>
          Est. profit: ${roundedExpected.toFixed(2)}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, marginBottom: 10 }}>
        {[
          ["placed", "Placed it"],
          ["skipped", "Skipped it"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => record(value)}
            style={{
              padding: "7px 12px",
              background: status === value ? `${K.gn}18` : "transparent",
              border: `1px solid ${status === value ? K.gn : K.bd2}`,
              borderRadius: 8,
              color: status === value ? K.gn : K.dm,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: K.mt, marginBottom: 4 }}>Sportsbook</div>
          <input
            value={book}
            onChange={(event) => setBook(event.target.value)}
            placeholder="DraftKings"
            style={{ width: "100%", padding: "8px 10px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, color: K.tx, fontFamily: font, fontSize: 12 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 10, color: K.mt, marginBottom: 4 }}>Actual profit</div>
          <input
            value={actualProfit}
            onChange={(event) => setActualProfit(event.target.value)}
            placeholder="$12.40"
            style={{ width: "100%", padding: "8px 10px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, color: K.tx, fontFamily: font, fontSize: 12 }}
          />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 10, color: K.mt, marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" }}>Why skip?</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {skipReasons.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setSkipReason(skipReason === value ? "" : value)}
              style={{
                padding: "5px 10px",
                background: skipReason === value ? `${K.yl}18` : "transparent",
                border: `1px solid ${skipReason === value ? K.yl : K.bd2}`,
                borderRadius: 999,
                color: skipReason === value ? K.yl : K.dm,
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 10, color: K.mt, marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" }}>Execution friction</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {frictionReasons.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFrictionReason(frictionReason === value ? "" : value)}
              style={{
                padding: "5px 10px",
                background: frictionReason === value ? `${K.ac}18` : "transparent",
                border: `1px solid ${frictionReason === value ? K.ac : K.bd2}`,
                borderRadius: 999,
                color: frictionReason === value ? K.ac : K.dm,
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 10, color: K.mt, marginBottom: 4 }}>Notes</div>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What blocked this or what mattered?"
          style={{ width: "100%", padding: "8px 10px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, color: K.tx, fontFamily: font, fontSize: 12 }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <span style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1px" }}>Calculator accurate?</span>
        {[
          ["yes", "Yes"],
          ["close", "Close"],
          ["no", "No"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setAccuracy(value)}
            style={{
              padding: "6px 10px",
              background: accuracy === value ? `${K.ac}18` : "transparent",
              border: `1px solid ${accuracy === value ? K.ac : K.bd2}`,
              borderRadius: 999,
              color: accuracy === value ? K.ac : K.dm,
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={settle}
          disabled={!entryId || !actualProfit.trim() || status === "skipped"}
          style={{
            marginLeft: "auto",
            padding: "8px 14px",
            background: !entryId || !actualProfit.trim() || status === "skipped" ? K.bd : K.ac,
            border: "none",
            borderRadius: 8,
            color: K.bg,
            fontSize: 11,
            fontWeight: 800,
            cursor: !entryId || !actualProfit.trim() || status === "skipped" ? "not-allowed" : "pointer",
            fontFamily: font,
          }}
        >
          Mark Settled
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 10, color: status === "settled" ? K.gn : status === "skipped" ? K.yl : K.mt }}>
        {status === "settled" && "Settled result saved. It now feeds the Track analytics dashboard."}
        {status === "placed" && "Placed result saved. Settle it now or later in Track → Edge."}
        {status === "skipped" && "Skipped result saved with reason data so PromoGrind can measure opportunity loss and friction."}
        {!status && "Use this after you run the math so the app learns what converted and what stayed theoretical."}
      </div>
    </div>
  );
}
