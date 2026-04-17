import React, { useState, useEffect } from "react";
import { supabase } from "../../auth.js";
import { K, fontD } from "../../lib/shared.js";
import { S } from "../../ui.jsx";

export default function CommunityWinsWall() {
  const [localEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pg_wins_wall") || "[]"); } catch { return []; }
  });
  const [serverEntries, setServerEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchWall = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("wins_wall")
          .select("id, period_label, total, entry_count, book_count, display_name, created_at")
          .order("created_at", { ascending: false })
          .limit(12);
        if (!error && data && !cancelled) setServerEntries(data);
      } catch {}
      if (!cancelled) setLoading(false);
    };
    fetchWall();
    return () => { cancelled = true; };
  }, []);

  const serverPeriods = new Set(serverEntries.map((e) => e.period_label));
  const merged = [
    ...serverEntries.map((e) => ({
      id: e.id, periodLabel: e.period_label, total: e.total,
      count: e.entry_count, books: e.book_count,
      displayName: e.display_name, source: "server",
    })),
    ...localEntries.filter((e) => !serverPeriods.has(e.periodLabel)).map((e) => ({ ...e, source: "local" })),
  ].slice(0, 12);

  if (!merged.length && !loading) return null;

  return (
    <div style={{ ...S.card, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: K.pp, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 4 }}>Wins Wall</div>
          <div style={{ fontFamily: fontD, fontSize: 16, fontWeight: 700, color: K.tx }}>Community profit opt-ins</div>
        </div>
      </div>
      {loading && !merged.length && <div style={{ fontSize: 11, color: K.mt, padding: 12 }}>Loading wins wall…</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
        {merged.slice(0, 6).map((entry) => (
          <div key={entry.id} style={{ padding: "12px", background: `${K.gn}08`, border: `1px solid ${K.gn}20`, borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>{entry.periodLabel}</span>
              {entry.source === "server" && <span style={{ fontSize: 8, color: K.ac, textTransform: "uppercase", letterSpacing: "1px" }}>verified</span>}
            </div>
            <div style={{ fontFamily: fontD, fontSize: 24, fontWeight: 800, color: K.gn, marginBottom: 4 }}>+${entry.total}</div>
            <div style={{ fontSize: 10, color: K.dm, lineHeight: 1.5 }}>
              {entry.count} conversions across {entry.books} books
              {entry.displayName && <span style={{ display: "block", fontSize: 9, color: K.mt, marginTop: 2 }}>— {entry.displayName}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
