import React, { useState, useEffect, useContext, useMemo } from "react";
import { K, font, S } from "../lib/shared.js";
import { BOOKS } from "../books.js";
import { supabase } from "../auth.js";
import { In, Nt } from "../ui.jsx";
import { AppDataCtx, useToast } from "../contexts.jsx";
import { buildHotLanes } from "../track/insights.js";
import { appendWorkflow } from "../workflows/store.js";
import { communityPromoToWorkflow } from "../workflows/suggestions.js";

const PROMO_BOARD_STATES = ["All States","AL","AZ","CO","CT","DC","IL","IN","IA","KS","KY","LA","MA","MD","ME","MI","MS","MO","NC","NJ","NY","OH","OR","PA","TN","VA","VT","WV","WY"];

function parseBoardState(description = "") {
  const match = /^\[([A-Z]{2,3})\]\s*/.exec(description || "");
  return match ? match[1] : null;
}

function stripBoardState(description = "") {
  return (description || "").replace(/^\[[A-Z]{2,3}\]\s*/, "");
}

function promoAge(createdAt) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function isPromoExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt).setHours(23, 59, 59, 999) < Date.now();
}

const typeColor = {
  "Profit Boost": K.yl, "Bonus Bet": K.gn, "Deposit Match": K.ac,
  "Safety Net": K.pp, "Odds Boost": K.rd, "Parlay Insurance": K.dm, "Other": K.mt,
};

function resolveInitialState(userState) {
  if (!userState) return "All States";
  const code = String(userState).trim().toUpperCase().slice(0, 2);
  return PROMO_BOARD_STATES.includes(code) ? code : "All States";
}

const CommunityPromoBoard = () => {
  const { appData, syncAppData } = useContext(AppDataCtx) || {};
  const toast = useToast();
  const hotLanes = useMemo(() => buildHotLanes(appData || {}), [appData]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ book: "DraftKings", promo_type: "Profit Boost", description: "", value: "", expires_at: "", region: "" });
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const [stateFilter, setStateFilter] = useState(() => resolveInitialState(appData?.userState));
  const [hideExpired, setHideExpired] = useState(false);
  const [flagged, setFlagged] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pg_promo_flagged") || "[]"); } catch { return []; }
  });

  const load = async () => {
    const { data } = await supabase.from("promo_submissions")
      .select("*").eq("active", true).order("created_at", { ascending: false }).limit(100);
    if (data) setPromos(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.description || !form.book) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const description = form.region ? `[${form.region}] ${form.description}` : form.description;
      await supabase.from("promo_submissions").insert({ ...form, description, user_id: user.id });
      setShowForm(false);
      setForm(f => ({ ...f, description: "", value: "", expires_at: "", region: "" }));
      await load();
    } catch {}
    setSubmitting(false);
  };

  const upvote = async (id) => {
    await supabase.from("promo_submissions").update({ upvotes: supabase.rpc("increment_upvotes", { row_id: id }) }).eq("id", id);
    setPromos(p => p.map(x => x.id === id ? { ...x, upvotes: (x.upvotes || 0) + 1 } : x));
  };

  const flagPromo = async (id) => {
    if (flagged.includes(id)) return;
    const next = [...flagged, id];
    setFlagged(next);
    try { localStorage.setItem("pg_promo_flagged", JSON.stringify(next)); } catch {}
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("vault_events").insert({ user_id: user.id, event_type: "promo_flagged", metadata: { promo_id: id } });
    } catch {}
  };
  const queuePromo = (promo) => {
    if (!syncAppData) return;
    const workflow = communityPromoToWorkflow(promo, { now: new Date() });
    syncAppData(appendWorkflow(appData || {}, workflow));
    if (toast) toast("Community promo saved to workflow inbox.", K.gn);
  };

  const filtered = promos.filter(p => {
    if (hideExpired && isPromoExpired(p.expires_at)) return false;
    if (filter !== "All" && p.book !== filter && p.promo_type !== filter) return false;
    if (stateFilter !== "All States") {
      const pState = parseBoardState(p.description);
      if (pState && pState !== stateFilter) return false;
    }
    return true;
  });

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: K.tx }}>Community Promo Board <span style={{ ...S.tag(K.gn) }}>LIVE</span></div>
        <button
          onClick={() => setShowForm(s => !s)}
          aria-expanded={showForm}
          aria-controls="promo-submit-form"
          style={{ padding: "7px 14px", background: showForm ? "transparent" : K.gn, border: `1px solid ${K.gn}`, borderRadius: 6, color: showForm ? K.gn : K.bg, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: font, flexShrink: 0 }}
        >
          {showForm ? "Cancel" : "+ Share a Promo"}
        </button>
      </div>

      {showForm && (
        <div id="promo-submit-form" style={{ ...S.card, background: K.s2, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: K.gn, marginBottom: 10 }}>Share what you&apos;re seeing</div>
          <div style={S.row}>
            <div style={S.col}><label style={S.label} htmlFor="pb-book">Book</label><select id="pb-book" style={S.input} value={form.book} onChange={e => setForm(f => ({ ...f, book: e.target.value }))}>{BOOKS.map(b => <option key={b.name}>{b.name}</option>)}</select></div>
            <div style={S.col}><label style={S.label} htmlFor="pb-type">Type</label><select id="pb-type" style={S.input} value={form.promo_type} onChange={e => setForm(f => ({ ...f, promo_type: e.target.value }))}>{["Profit Boost", "Bonus Bet", "Deposit Match", "Safety Net", "Odds Boost", "Parlay Insurance", "Other"].map(t => <option key={t}>{t}</option>)}</select></div>
            <In l="Value (e.g. 50%)" v={form.value} set={v => setForm(f => ({ ...f, value: v }))} ph="50%" />
            <div style={S.col}><label style={S.label} htmlFor="pb-expires">Expires</label><input id="pb-expires" style={S.input} type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} /></div>
            <div style={S.col}><label style={S.label} htmlFor="pb-region">State (optional)</label>
              <select id="pb-region" style={S.input} value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
                <option value="">All States</option>
                {PROMO_BOARD_STATES.filter(s => s !== "All States").map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}><label style={S.label} htmlFor="pb-desc">Description</label><input id="pb-desc" style={S.input} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. 50% profit boost on NBA, max $250 extra, all game types" /></div>
          <button onClick={submit} disabled={submitting || !form.description} style={{ padding: "8px 18px", background: K.gn, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: font, opacity: submitting ? 0.7 : 1 }}>{submitting ? "Submitting…" : "Submit Promo"}</button>
          <Nt c={K.yl}>Only share promos you have personally verified. Do not submit expired or inaccurate promos.</Nt>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }} role="group" aria-label="Filter by book or type">
        {["All", "DraftKings", "FanDuel", "BetMGM", "Caesars", "Profit Boost", "Bonus Bet", "Deposit Match"].map(f => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} style={{ padding: "3px 10px", background: filter === f ? K.gn : "transparent", border: `1px solid ${filter === f ? K.gn : K.bd2}`, borderRadius: 50, color: filter === f ? K.bg : K.dm, fontSize: 10, cursor: "pointer", fontFamily: font }}>{f}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
        <select aria-label="Filter by state" style={{ ...S.input, padding: "3px 8px", fontSize: 10, height: "auto", width: "auto" }} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
          {PROMO_BOARD_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setHideExpired(x => !x)} aria-pressed={hideExpired} style={{ padding: "3px 10px", background: hideExpired ? K.ac : "transparent", border: `1px solid ${hideExpired ? K.ac : K.bd2}`, borderRadius: 50, color: hideExpired ? K.bg : K.dm, fontSize: 10, cursor: "pointer", fontFamily: font }}>Hide expired</button>
      </div>

      {/* Hot lane banner — shown when personal win data shows a strong lane */}
      {hotLanes.hasHotLanes && (
        <div style={{ marginBottom: 8, padding: "8px 12px", background: `${K.yl}10`, border: `1px solid ${K.yl}25`, borderRadius: 6, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: K.yl }}>🔥 Hot Lanes (your last 48h)</span>
          {hotLanes.hotPromoTypes.slice(0, 3).map((lane) => (
            <span key={lane.key} style={{ fontSize: 10, color: K.yl, padding: "1px 6px", border: `1px solid ${K.yl}35`, borderRadius: 99 }}>{lane.label} {lane.badge}</span>
          ))}
          {hotLanes.hotBooks.slice(0, 2).map((lane) => (
            <span key={lane.key} style={{ fontSize: 10, color: K.yl, padding: "1px 6px", border: `1px solid ${K.yl}35`, borderRadius: 99 }}>{lane.label} {lane.badge}</span>
          ))}
        </div>
      )}

      {loading && <div role="status" aria-live="polite" style={{ textAlign: "center", padding: 32, color: K.mt, fontSize: 11 }}>Loading promos…</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }} aria-hidden="true">📋</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: K.dm, marginBottom: 6 }}>No promos yet — be the first</div>
          <div style={{ fontSize: 11, color: K.mt, marginBottom: 14 }}>Share a promo you&apos;re seeing at your sportsbook and help the community.</div>
          <button onClick={() => setShowForm(true)} style={{ padding: "7px 18px", background: K.gn, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: font }}>+ Share a Promo</button>
        </div>
      )}
      {filtered.map(p => {
        const expired = isPromoExpired(p.expires_at);
        const verified = (p.upvotes || 0) >= 3;
        const alreadyFlagged = flagged.includes(p.id);
        const pState = parseBoardState(p.description);
        const cleanDesc = stripBoardState(p.description);
        const promoTypeKey = (p.promo_type || "").toLowerCase().replace(/\s+/g, "_");
        const isHotBook = hotLanes.hotBooks.some((l) => l.key === p.book);
        const isHotType = hotLanes.hotPromoTypes.some((l) => l.key === promoTypeKey);
        return (
          <div key={p.id} style={{ ...S.res(true), marginBottom: 8, padding: "12px 14px", opacity: expired ? 0.55 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: K.tx }}>{p.book}</span>
                  <span style={S.tag(typeColor[p.promo_type] || K.mt)}>{p.promo_type}</span>
                  {p.value && <span style={S.tag(K.gn)}>{p.value}</span>}
                  {pState && <span style={S.tag(K.ac)}>{pState}</span>}
                  {verified && <span style={{ ...S.tag(K.gn), background: `${K.gn}18`, color: K.gn }}>✓ Verified</span>}
                  {(isHotBook || isHotType) && <span style={{ ...S.tag(K.yl), background: `${K.yl}15`, color: K.yl }}>🔥 Hot Lane</span>}
                  {expired && <span style={S.tag(K.rd)}>Expired</span>}
                </div>
                <div style={{ fontSize: 12, color: K.dm, marginBottom: 2 }}>{cleanDesc}</div>
                <div style={{ fontSize: 10, color: K.mt, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span>{promoAge(p.created_at)}</span>
                  {p.expires_at && !expired && <span>Expires {new Date(p.expires_at).toLocaleDateString()}</span>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                <button
                  onClick={() => upvote(p.id)}
                  aria-label={`Upvote (${p.upvotes || 0})`}
                  style={{ background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.yl, fontSize: 11, padding: "4px 10px", cursor: "pointer", fontFamily: font }}
                >
                  ▲ {p.upvotes || 0}
                </button>
                <button
                  onClick={() => flagPromo(p.id)}
                  aria-label={alreadyFlagged ? "Flagged" : "Flag as incorrect"}
                  disabled={alreadyFlagged}
                  style={{ background: "transparent", border: `1px solid ${alreadyFlagged ? K.rd : K.bd2}`, borderRadius: 6, color: alreadyFlagged ? K.rd : K.mt, fontSize: 9, padding: "3px 8px", cursor: alreadyFlagged ? "default" : "pointer", fontFamily: font, opacity: alreadyFlagged ? 0.7 : 1 }}
                >
                  {alreadyFlagged ? "🚩 Flagged" : "🚩 Flag"}
                </button>
                <button
                  onClick={() => queuePromo(p)}
                  aria-label="Save promo to workflow inbox"
                  style={{ background: "transparent", border: `1px solid ${K.gn}30`, borderRadius: 6, color: K.gn, fontSize: 9, padding: "3px 8px", cursor: "pointer", fontFamily: font }}
                >
                  Queue
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CommunityPromoBoard;
