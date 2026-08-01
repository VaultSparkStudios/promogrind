import React, { useState } from "react";
import { AppDataCtx, ToastCtx } from "../contexts.jsx";
import { CANONICAL_APP_URL } from "../launchState.js";
import { trackLaunchEvent } from "../launchTelemetry.js";
import { createEntityId } from "../lib/entityId.js";
import { f, K, font, fontD } from "../lib/shared.js";
import { S } from "../ui.jsx";

const REVIEW_CARD_KEY = "pg_outcome_review_cards_v1";

function useToast() {
  return React.useContext(ToastCtx);
}

export default function ProfitCertificate({ entries: entriesProp } = {}) {
  const { appData } = React.useContext(AppDataCtx);
  const entries = entriesProp ?? appData?.ledger ?? [];
  const toast = useToast();
  const [period, setPeriod] = useState("month");
  const [copied, setCopied] = useState(false);
  const now = new Date();
  const cutoff = period === "week"
    ? new Date(now - 7 * 86400000)
    : period === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), 0, 1);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const filtered = entries.filter((entry) => entry.date >= cutoffStr);
  const total = filtered.reduce((sum, entry) => sum + (Number.parseFloat(entry.profit) || 0), 0);
  const count = filtered.length;
  const books = [...new Set(filtered.map((entry) => entry.book).filter(Boolean))];
  const periodLabel = period === "week"
    ? "Last 7 days"
    : period === "month"
      ? new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : String(now.getFullYear());

  const shareText = () => [
    `PromoGrind Outcome Review — ${periodLabel}`,
    `Recorded realized P/L: ${total >= 0 ? "+" : "-"}$${f(Math.abs(total))}`,
    `${count} local ledger row${count === 1 ? "" : "s"} across ${books.length} book${books.length === 1 ? "" : "s"}`,
    "Self-reported from the operator's local ledger; not independently verified.",
    CANONICAL_APP_URL,
  ].join("\n");

  const copy = () => {
    try { navigator.clipboard.writeText(shareText()); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (toast) toast("Outcome review copied", K.ac);
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title: "PromoGrind Outcome Review", text: shareText() }).catch(() => {});
      return;
    }
    copy();
  };

  const addToReviewBoard = () => {
    const entry = {
      id: createEntityId("review"),
      period,
      periodLabel,
      realizedProfit: Number(total.toFixed(2)),
      reviewedRows: count,
      books: books.length,
      attestation: "self-reported-local",
      createdAt: new Date().toISOString(),
    };
    try {
      const previous = JSON.parse(localStorage.getItem(REVIEW_CARD_KEY) || "[]");
      const next = [entry, ...previous.filter((item) => item.period !== period)].slice(0, 12);
      localStorage.setItem(REVIEW_CARD_KEY, JSON.stringify(next));
    } catch {
      if (toast) toast("Local review card could not be saved", K.rd);
      return;
    }
    trackLaunchEvent("outcome_review_card_saved", { period, reviewedRows: count });
    if (toast) toast("Saved to your local Outcome Review Board", K.ac);
  };

  if (entries.length === 0) {
    return (
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: K.tx, fontFamily: fontD, marginBottom: 8 }}>Outcome Review</div>
        <div style={{ fontSize: 12, color: K.mt }}>Log realized results to create a self-reported review card. Activity alone does not create a badge or rank.</div>
      </div>
    );
  }

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: K.tx, fontFamily: fontD }}>Outcome Review</div>
          <div style={{ fontSize: 10, color: K.mt, marginTop: 3 }}>A local, self-reported summary—not a certificate, verification, or performance claim.</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["week", "month", "year"].map((option) => (
            <button key={option} onClick={() => setPeriod(option)} style={{ padding: "3px 10px", background: period === option ? K.ac : "transparent", border: `1px solid ${period === option ? K.ac : K.bd2}`, borderRadius: 50, color: period === option ? K.ink : K.dm, fontSize: 9, cursor: "pointer", fontFamily: font, textTransform: "uppercase" }}>{option}</button>
          ))}
        </div>
      </div>
      <div style={{ background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 12, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Self-reported local ledger</div>
        <div style={{ fontFamily: fontD, fontSize: 36, fontWeight: 800, color: total >= 0 ? K.ac : K.rd, lineHeight: 1 }}>{total >= 0 ? "+" : "-"}${f(Math.abs(total))}</div>
        <div style={{ fontSize: 11, color: K.mt, marginTop: 6 }}>RECORDED REALIZED P/L · {periodLabel}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16 }}>
          <div><div style={{ fontSize: 18, fontWeight: 700, color: K.ac, fontFamily: fontD }}>{count}</div><div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase" }}>Ledger rows</div></div>
          <div><div style={{ fontSize: 18, fontWeight: 700, color: K.pp, fontFamily: fontD }}>{books.length}</div><div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase" }}>Book labels</div></div>
        </div>
        <div style={{ fontSize: 9, color: K.mt, lineHeight: 1.5, marginTop: 14 }}>PromoGrind did not verify sportsbook execution, deposits, withdrawals, or account identity.</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={copy} style={{ padding: "6px 14px", background: copied ? K.gn : K.ac, border: "none", borderRadius: 6, color: K.ink, fontWeight: 700, fontSize: 10, cursor: "pointer", fontFamily: font }}>{copied ? "Copied" : "Copy review"}</button>
          <button onClick={shareNative} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.dm, fontWeight: 700, fontSize: 10, cursor: "pointer", fontFamily: font }}>Share self-report</button>
          <button onClick={addToReviewBoard} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${K.ac}50`, borderRadius: 6, color: K.ac, fontWeight: 700, fontSize: 10, cursor: "pointer", fontFamily: font }}>Save local review card</button>
        </div>
      </div>
    </div>
  );
}

