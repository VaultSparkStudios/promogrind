import React, { useState } from "react";
import { supabase } from "../auth.js";
import { AppDataCtx, ToastCtx } from "../contexts.jsx";
import { CANONICAL_APP_URL } from "../launchState.js";
import { trackLaunchEvent } from "../launchTelemetry.js";
import { f, K, font, fontD } from "../lib/shared.js";
import { S } from "../ui.jsx";

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
  const total = filtered.reduce((sum, entry) => sum + (parseFloat(entry.profit) || 0), 0);
  const count = filtered.length;
  const books = [...new Set(filtered.map((entry) => entry.book).filter(Boolean))];
  const bestDay = filtered.reduce((best, entry) => {
    const profit = parseFloat(entry.profit) || 0;
    return profit > best.profit ? { date: entry.date, profit } : best;
  }, { date: "", profit: 0 });
  const periodLabel = period === "week"
    ? "This Week"
    : period === "month"
      ? new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : String(now.getFullYear());

  const shareText = () => [
    `Profit Certificate - ${periodLabel}`,
    `Total Profit: $${f(total)}`,
    `${count} conversions across ${books.length} book${books.length !== 1 ? "s" : ""}`,
    bestDay.date ? `Best day: ${bestDay.date} (+$${f(bestDay.profit)})` : "",
    "",
    "Tracked with PromoGrind - free sportsbook promo tools",
    CANONICAL_APP_URL,
  ].filter(Boolean).join("\n");

  const copy = () => {
    try { navigator.clipboard.writeText(shareText()); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (toast) toast("Certificate copied!", K.gn);
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title: "PromoGrind Profit Certificate", text: shareText() }).catch(() => {});
      return;
    }
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText())}`;
    window.open(url, "_blank");
  };

  const addToWinsWall = async () => {
    const entry = {
      id: `${period}-${Date.now()}`,
      period,
      periodLabel,
      total: f(total),
      count,
      books: books.length,
    };
    try {
      const prev = JSON.parse(localStorage.getItem("pg_wins_wall") || "[]");
      const next = [entry, ...prev.filter((item) => item.period !== period)].slice(0, 12);
      localStorage.setItem("pg_wins_wall", JSON.stringify(next));
    } catch {}
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("wins_wall").upsert({
          user_id: session.user.id,
          period,
          period_label: periodLabel,
          total: parseFloat(f(total)) || 0,
          entry_count: count,
          book_count: books.length,
          metadata: { best_day: bestDay.date || null, best_day_profit: bestDay.profit || 0 },
        }, { onConflict: "user_id,period,period_label" });
      }
    } catch {}
    trackLaunchEvent("wins_wall_opt_in", { period, total: f(total) });
    if (toast) toast("Added to Wins Wall", K.pp);
  };

  if (entries.length === 0) {
    return (
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: K.tx, fontFamily: fontD, marginBottom: 8 }}>Profit Certificate</div>
        <div style={{ fontSize: 12, color: K.mt }}>Log entries in the P/L Ledger to generate your shareable profit certificate.</div>
      </div>
    );
  }

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: K.tx, fontFamily: fontD }}>Profit Certificate</div>
        <div style={{ display: "flex", gap: 4 }}>
          {["week", "month", "year"].map((option) => (
            <button key={option} onClick={() => setPeriod(option)} style={{ padding: "3px 10px", background: period === option ? K.gn : "transparent", border: `1px solid ${period === option ? K.gn : K.bd2}`, borderRadius: 50, color: period === option ? K.bg : K.dm, fontSize: 9, cursor: "pointer", fontFamily: font, textTransform: "uppercase" }}>{option}</button>
          ))}
        </div>
      </div>
      <div style={{ background: `linear-gradient(135deg,${K.s2},${K.s1})`, border: `1px solid ${K.bd}`, borderRadius: 12, padding: 24, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${K.gn},${K.ac},${K.pp})` }} />
        <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Verified by PromoGrind</div>
        <div style={{ fontFamily: fontD, fontSize: 36, fontWeight: 800, color: total >= 0 ? K.gn : K.rd, lineHeight: 1 }}>${f(Math.abs(total))}</div>
        <div style={{ fontSize: 11, color: K.mt, marginTop: 6 }}>{total >= 0 ? "PROFIT" : "LOSS"} - {periodLabel}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16 }}>
          <div><div style={{ fontSize: 18, fontWeight: 700, color: K.ac, fontFamily: fontD }}>{count}</div><div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase" }}>Conversions</div></div>
          <div><div style={{ fontSize: 18, fontWeight: 700, color: K.pp, fontFamily: fontD }}>{books.length}</div><div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase" }}>Books</div></div>
          {bestDay.date && <div><div style={{ fontSize: 18, fontWeight: 700, color: K.yl, fontFamily: fontD }}>${f(bestDay.profit)}</div><div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase" }}>Best Day</div></div>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          <button onClick={copy} style={{ padding: "6px 14px", background: copied ? K.gn : K.ac, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, fontSize: 10, cursor: "pointer", fontFamily: font }}>{copied ? "Copied!" : "Copy"}</button>
          <button onClick={shareNative} style={{ padding: "6px 14px", background: K.pp, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, fontSize: 10, cursor: "pointer", fontFamily: font }}>Share</button>
          <button onClick={addToWinsWall} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.dm, fontWeight: 700, fontSize: 10, cursor: "pointer", fontFamily: font }}>Add to Wins Wall</button>
        </div>
      </div>
    </div>
  );
}

