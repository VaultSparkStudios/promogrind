import React, { useState, useEffect } from "react";
import { K, font, fontD, f } from "../../lib/shared.js";

const STORAGE_KEY = "pg_promo_expirations";

function loadExpirations() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveExpirations(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

function msUntil(dateStr) {
  return new Date(dateStr).getTime() - Date.now();
}

function fmtCountdown(ms) {
  if (ms <= 0) return "EXPIRED";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h >= 1) return `${h}h ${m}m`;
  return `${m}m`;
}

function urgencyColor(ms) {
  if (ms <= 0) return "#f87171";
  if (ms < 86400000) return "#f87171";      // < 24h → red
  if (ms < 259200000) return "#fbbf24";     // < 72h → yellow
  return "#4ade80";                          // > 72h → green
}

export default function PromoExpiryWidget() {
  const [items, setItems] = useState(loadExpirations);
  const [showForm, setShowForm] = useState(false);
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState({ book: "", promo: "", expiresAt: "" });

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const add = () => {
    if (!form.expiresAt || !form.promo) return;
    const next = [...items, { id: Date.now(), ...form }];
    saveExpirations(next);
    setItems(next);
    setForm({ book: "", promo: "", expiresAt: "" });
    setShowForm(false);
  };

  const remove = (id) => {
    const next = items.filter(x => x.id !== id);
    saveExpirations(next);
    setItems(next);
  };

  const active = items.filter(x => msUntil(x.expiresAt) > -86400000 * 3).sort((a, b) => msUntil(a.expiresAt) - msUntil(b.expiresAt));

  return (
    <div style={{ background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: active.length > 0 || showForm ? 10 : 0 }}>
        <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700, fontFamily: font }}>
          ⏱ Promo Expirations
          {active.length > 0 && <span style={{ marginLeft: 8, padding: "1px 7px", background: `${K.rd}18`, color: K.rd, borderRadius: 99, fontSize: 9 }}>{active.filter(x => msUntil(x.expiresAt) < 86400000 && msUntil(x.expiresAt) > 0).length > 0 ? "URGENT" : `${active.length}`}</span>}
        </div>
        <button onClick={() => setShowForm(f => !f)} style={{ padding: "3px 10px", background: showForm ? `${K.rd}15` : `${K.gn}15`, border: `1px solid ${showForm ? K.rd : K.gn}30`, borderRadius: 4, color: showForm ? K.rd : K.gn, fontSize: 10, cursor: "pointer", fontFamily: font }}>
          {showForm ? "✕ Cancel" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: "10px", background: K.s2, borderRadius: 8, marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 100 }}>
            <div style={{ fontSize: 9, color: K.mt, marginBottom: 3, textTransform: "uppercase", letterSpacing: "1px" }}>Sportsbook</div>
            <input value={form.book} onChange={e => setForm(f => ({ ...f, book: e.target.value }))} placeholder="DraftKings" style={{ width: "100%", padding: "7px 10px", background: K.s3, border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.tx, fontSize: 12, fontFamily: font, boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: 2, minWidth: 140 }}>
            <div style={{ fontSize: 9, color: K.mt, marginBottom: 3, textTransform: "uppercase", letterSpacing: "1px" }}>Promo</div>
            <input value={form.promo} onChange={e => setForm(f => ({ ...f, promo: e.target.value }))} placeholder="$200 first bet safety net" style={{ width: "100%", padding: "7px 10px", background: K.s3, border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.tx, fontSize: 12, fontFamily: font, boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 9, color: K.mt, marginBottom: 3, textTransform: "uppercase", letterSpacing: "1px" }}>Expires</div>
            <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} style={{ width: "100%", padding: "7px 10px", background: K.s3, border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.tx, fontSize: 12, fontFamily: font, boxSizing: "border-box" }} />
          </div>
          <button onClick={add} disabled={!form.promo || !form.expiresAt} style={{ padding: "8px 14px", background: `${K.gn}20`, border: `1px solid ${K.gn}40`, borderRadius: 6, color: K.gn, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap" }}>Save →</button>
        </div>
      )}

      {active.length === 0 && !showForm && (
        <div style={{ fontSize: 11, color: K.mt, padding: "4px 0" }}>No tracked expirations — add one to stay on deadline.</div>
      )}

      {active.map(item => {
        const ms = msUntil(item.expiresAt);
        const color = urgencyColor(ms);
        const expired = ms <= 0;
        return (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${K.bd}` }}>
            <div style={{ minWidth: 52, textAlign: "center" }}>
              <div style={{ fontFamily: fontD, fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>{fmtCountdown(ms)}</div>
              {expired && <div style={{ fontSize: 8, color: K.rd, textTransform: "uppercase", letterSpacing: "1px" }}>expired</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: K.tx, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.promo}</div>
              {item.book && <div style={{ fontSize: 9, color: K.mt }}>{item.book}</div>}
            </div>
            <div style={{ width: 4, height: 28, background: color, borderRadius: 2, flexShrink: 0 }} />
            <button onClick={() => remove(item.id)} style={{ background: "transparent", border: "none", color: K.mt, cursor: "pointer", fontSize: 14, padding: "0 2px", lineHeight: 1 }} title="Remove">×</button>
          </div>
        );
      })}
    </div>
  );
}
