import React, { useState } from "react";
import { K, font, fontD, f, toD, downloadFile, S } from "../lib/shared.js";
import { In, Tl } from "../ui.jsx";
import { AppDataCtx, useToast } from "../contexts.jsx";
import { BOOKS } from "../books.js";
import { BET_TRACKER_UI } from "../app/appText.js";
import { parseBetSlip } from "../app/parseBetSlip.js";

const CSVImportModal = ({ onImport, onClose }) => {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);

  const parseRows = (lines) => {
    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim().toLowerCase());
    return lines.slice(1).map((line, i) => {
      const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
      const obj = {};
      headers.forEach((h, j) => { obj[h] = (cols[j] || "").replace(/"/g, "").trim(); });
      return {
        id: Date.now() + i,
        date: obj.date || obj["settled date"] || obj["place date"] || new Date().toISOString().split("T")[0],
        book: obj.book || obj.sportsbook || "Imported",
        type: obj.type || obj["bet type"] || "Moneyline",
        odds: obj.odds || obj.price || obj["bet odds"] || "+100",
        stake: (obj.stake || obj["risk"] || obj["wager"] || "0").replace("$", ""),
        toWin: (obj["to win"] || obj.towin || obj.profit || "0").replace("$", ""),
        status: (obj.status || obj.result || "open").toLowerCase().replace("win", "won").replace("loss", "lost"),
        notes: obj.description || obj.notes || obj.event || "",
      };
    });
  };

  const parse = () => {
    try {
      const lines = raw.trim().split("\n").filter(Boolean);
      if (lines.length < 2) { setError("Need at least a header row and one data row"); return; }
      setPreview(parseRows(lines).slice(0, 5));
      setError(null);
    } catch (e) { setError("Parse error: " + e.message); }
  };

  const confirm = () => {
    try {
      const lines = raw.trim().split("\n").filter(Boolean);
      onImport(parseRows(lines));
      onClose();
    } catch (e) { setError("Import failed: " + e.message); }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div style={{ background: K.s1, border: `1px solid ${K.bd2}`, borderRadius: 12, padding: 24, width: "100%", maxWidth: 560, maxHeight: "80vh", overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: K.tx, marginBottom: 4, fontFamily: fontD }}>Import Bets from CSV</div>
        <div style={{ fontSize: 11, color: K.dm, marginBottom: 16 }}>Paste your DraftKings, FanDuel, or any sportsbook CSV export below. Headers are auto-detected.</div>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"date,book,odds,stake,status\n2026-03-01,DraftKings,+150,50,won"}
          style={{ ...S.input, height: 120, resize: "vertical", marginBottom: 8, fontFamily: "monospace", fontSize: 11 }}
        />
        {error && <div style={{ fontSize: 11, color: K.rd, marginBottom: 8 }}>{error}</div>}
        {preview.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: K.mt, marginBottom: 6, textTransform: "uppercase", letterSpacing: "1.5px" }}>
              Preview ({preview.length} of {raw.trim().split("\n").length - 1} rows)
            </div>
            {preview.map((r, i) => (
              <div key={i} style={{ fontSize: 11, color: K.dm, padding: "4px 0", borderBottom: `1px solid ${K.bd}` }}>
                {r.date} · {r.book} · {r.odds} · ${r.stake} ·{" "}
                <span style={{ color: r.status === "won" ? K.gn : r.status === "lost" ? K.rd : K.yl }}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={parse} style={{ flex: 1, padding: 9, background: K.ac, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, cursor: "pointer", fontFamily: font }}>
            Parse CSV
          </button>
          {preview.length > 0 && (
            <button onClick={confirm} style={{ flex: 1, padding: 9, background: K.gn, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, cursor: "pointer", fontFamily: font }}>
              Import {raw.trim().split("\n").length - 1} Bets
            </button>
          )}
          <button onClick={onClose} style={{ padding: "9px 16px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.mt, cursor: "pointer", fontFamily: font }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const BetTracker = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const bets = data.bets || [];
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    book: "DraftKings", type: "Moneyline", odds: "+110",
    stake: "", toWin: "", status: "open", notes: "",
  });
  const [showImport, setShowImport] = useState(false);
  const [showPasteSlip, setShowPasteSlip] = useState(false);
  const [slipText, setSlipText] = useState("");
  const [slipParsed, setSlipParsed] = useState(null);
  const toast = useToast();

  const calcToWin = (odds, stake) => {
    const d = toD(odds), s = parseFloat(stake);
    if (d <= 1 || !s) return "";
    return f(s * (d - 1));
  };
  const save = (newBets) => syncAppData({ ...data, bets: newBets });

  const add = () => {
    if (!form.stake || !form.odds) return;
    const toWin = calcToWin(form.odds, form.stake);
    save([{ ...form, toWin, id: Date.now() }, ...bets]);
    setForm((prev) => ({ ...prev, stake: "", odds: "+110", toWin: "", notes: "" }));
    if (toast) toast("Bet added");
  };

  const setStatus = (id, status) => save(bets.map((b) => (b.id === id ? { ...b, status } : b)));
  const del = (id) => {
    const snapshot = [...bets];
    save(bets.filter((b) => b.id !== id));
    if (toast) toast("Bet deleted", K.rd, { label: "UNDO", fn: () => save(snapshot) });
  };

  const exportBets = () => {
    const headers = ["Date", "Book", "Type", "Odds", "Stake", "To Win", "Status", "Notes"];
    const rows = bets.map((e) => [e.date, e.book, e.type, e.odds, e.stake, e.toWin || "", e.status, e.notes || ""]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile(csv, `promogrind-bets-${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
  };

  const betGrade = (bet) => {
    if (bet.status === "open" || bet.status === "void") return null;
    const d = toD(bet.odds);
    if (bet.status === "won" && d > toD("+100")) return { g: "A", c: K.gn };
    if (bet.status === "won") return { g: "B", c: K.ac };
    if (bet.status === "lost" && d >= toD("-110")) return { g: "C", c: K.yl };
    return { g: "D", c: K.rd };
  };

  const open = bets.filter((b) => b.status === "open");
  const atRisk = open.reduce((s, b) => s + (parseFloat(b.stake) || 0), 0);
  const potentialWin = open.reduce((s, b) => s + (parseFloat(b.toWin) || 0), 0);
  const settled = bets.filter((b) => b.status === "won" || b.status === "lost");
  const winRate = settled.length ? (bets.filter((b) => b.status === "won").length / settled.length) * 100 : null;
  const statusColor = { open: K.yl, won: K.gn, lost: K.rd, void: K.mt };

  return (
    <div style={S.card}>
      <Tl t="Pending Bet Tracker" badge="OPEN BETS" bc={K.yl} />
      <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div><div style={{ fontSize: 10, color: K.mt }}>OPEN BETS</div><div style={S.big(K.yl)}>{open.length}</div></div>
        <div><div style={{ fontSize: 10, color: K.mt }}>AT RISK</div><div style={S.big(K.rd)}>${f(atRisk)}</div></div>
        <div><div style={{ fontSize: 10, color: K.mt }}>TO WIN</div><div style={S.big(K.gn)}>${f(potentialWin)}</div></div>
        {winRate !== null && (
          <div>
            <div style={{ fontSize: 10, color: K.mt }}>WIN RATE</div>
            <div style={{ ...S.big(winRate >= 55 ? K.gn : winRate >= 45 ? K.yl : K.rd), fontSize: 22 }}>{f(winRate, 1)}%</div>
            <div style={{ fontSize: 9, color: K.mt }}>{settled.length} settled</div>
          </div>
        )}
        {open.length > 0 && (() => {
          const ev = open.reduce((s, b) => {
            const d = toD(b.odds); if (d <= 1) return s;
            const p = 1 / d;
            return s + (parseFloat(b.toWin) || 0) * p - (parseFloat(b.stake) || 0) * (1 - p);
          }, 0);
          return (
            <div>
              <div style={{ fontSize: 10, color: K.mt }}>PORTFOLIO EV</div>
              <div style={{ ...S.big(ev >= 0 ? K.gn : K.rd), fontSize: 22 }}>{ev >= 0 ? "+" : ""}${f(ev)}</div>
              <div style={{ fontSize: 9, color: K.mt }}>book-implied</div>
            </div>
          );
        })()}
        <button onClick={() => setShowPasteSlip((s) => !s)} style={{ marginLeft: "auto", padding: "7px 14px", background: "transparent", border: `1px solid ${K.pp}`, borderRadius: 6, color: K.pp, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
          {BET_TRACKER_UI.pasteSlipButton}
        </button>
        <button onClick={() => setShowImport(true)} style={{ padding: "7px 14px", background: "transparent", border: `1px solid ${K.ac}`, borderRadius: 6, color: K.ac, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
          {BET_TRACKER_UI.importCsvButton}
        </button>
        {bets.length > 0 && (
          <button onClick={exportBets} style={{ padding: "7px 14px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.dm, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
            {BET_TRACKER_UI.exportCsvButton}
          </button>
        )}
        {showPasteSlip && (
          <div style={{ width: "100%", marginTop: 8, padding: "12px 14px", background: K.s2, borderRadius: 6, border: `1px solid ${K.bd}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: K.pp, marginBottom: 8 }}>Paste Bet Slip Text</div>
            <textarea style={{ ...S.input, height: 80, resize: "vertical", marginBottom: 8, fontSize: 11 }} value={slipText} onChange={(e) => setSlipText(e.target.value)} placeholder={BET_TRACKER_UI.slipPlaceholder} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { const p = parseBetSlip(slipText); setSlipParsed(p); }} style={{ padding: "6px 14px", background: K.pp, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, cursor: "pointer", fontFamily: font, fontSize: 11 }}>Parse</button>
              {slipParsed && (
                <button
                  onClick={() => {
                    setForm((prev) => ({ ...prev, ...slipParsed, toWin: slipParsed.stake && slipParsed.odds ? f((parseFloat(slipParsed.stake || 0)) * (toD(slipParsed.odds || "+100") - 1)) : "" }));
                    setShowPasteSlip(false); setSlipParsed(null); setSlipText("");
                  }}
                  style={{ padding: "6px 14px", background: K.gn, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, cursor: "pointer", fontFamily: font, fontSize: 11 }}
                >
                  Use Parsed Values
                </button>
              )}
            </div>
            {slipParsed && <div style={{ fontSize: 10, color: K.gn, marginTop: 6 }}>Parsed: {Object.entries(slipParsed).map(([k, v]) => `${k}=${v}`).join(", ")}</div>}
          </div>
        )}
      </div>

      <div style={{ ...S.row, alignItems: "flex-end" }}>
        <div style={S.col}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
        <div style={{ ...S.col, minWidth: 140 }}>
          <label style={S.label}>Book</label>
          <select style={S.input} value={form.book} onChange={(e) => setForm((f) => ({ ...f, book: e.target.value }))}>
            {BOOKS.map((b) => <option key={b.name}>{b.name}</option>)}
          </select>
        </div>
        <div style={{ ...S.col, minWidth: 140 }}>
          <label style={S.label}>Bet Type</label>
          <select style={S.input} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            {["Moneyline", "Spread", "Total", "Parlay", "Prop", "Bonus Bet", "Other"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ ...S.row, alignItems: "flex-end" }}>
        <In l="Odds" v={form.odds} set={(v) => { setForm((f) => ({ ...f, odds: v, toWin: calcToWin(v, f.stake) })); }} ph="+110" />
        <In l="Stake" v={form.stake} set={(v) => { setForm((f) => ({ ...f, stake: v, toWin: calcToWin(f.odds, v) })); }} pre="$" ph="100" />
        <In l="To Win (auto)" v={form.toWin} set={(v) => setForm((f) => ({ ...f, toWin: v }))} pre="$" ph="auto" />
        <div style={{ ...S.col, minWidth: 80 }}>
          <label style={S.label}>&nbsp;</label>
          <button onClick={add} style={{ padding: "8px 16px", background: K.yl, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, cursor: "pointer", fontFamily: font, fontSize: 12, width: "100%" }}>+ ADD</button>
        </div>
      </div>

      {bets.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: K.mt }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "1px", marginBottom: 8, color: K.mt }}>{BET_TRACKER_UI.noBetsGlyph}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: K.dm, marginBottom: 4 }}>{BET_TRACKER_UI.noBetsTitle}</div>
          <div style={{ fontSize: 11, color: K.mt }}>Add your first pending bet above to track your open action.</div>
        </div>
      )}

      {bets.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Date", "Book", "Type", "Odds", "Stake", "To Win", "Status", "Grade", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${K.bd2}`, color: K.mt, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bets.map((e) => {
                const gr = betGrade(e);
                return (
                  <tr key={e.id} style={{ opacity: e.status === "void" ? 0.4 : 1 }}>
                    <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}` }}>{e.date}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}`, fontWeight: 600 }}>{e.book}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}` }}><span style={S.tag(K.ac)}>{e.type}</span></td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}`, color: K.pp, fontWeight: 600 }}>{e.odds}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}` }}>${e.stake}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}`, color: K.gn, fontWeight: 600 }}>{e.toWin ? `$${e.toWin}` : "-"}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}` }}>
                      <select value={e.status} onChange={(ev) => setStatus(e.id, ev.target.value)} style={{ ...S.input, width: 80, padding: "3px 6px", fontSize: 10, color: statusColor[e.status] || K.tx }}>
                        {["open", "won", "lost", "void"].map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}` }}>
                      {gr ? <span style={S.tag(gr.c)}>{gr.g}</span> : <span style={{ color: K.mt }}>-</span>}
                    </td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${K.bd}` }}>
                      <span onClick={() => del(e.id)} style={{ cursor: "pointer", color: K.rd, fontSize: 10 }}>✕</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showImport && (
        <CSVImportModal
          onImport={(rows) => { save([...rows, ...bets]); if (toast) toast(`Imported ${rows.length} bets`, K.gn); }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
};

export default BetTracker;
