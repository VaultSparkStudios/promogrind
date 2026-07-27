import React, { useState } from "react";
import { K, S, font, fontD } from "../lib/shared.js";

function splitCsvLine(line) {
  return line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
}

function normalizeCsvRecord(record, index, today) {
  return {
    id: Date.now() + index,
    date: record.date || record["settled date"] || record["place date"] || today,
    book: record.book || record.sportsbook || "Imported",
    type: record.type || record["bet type"] || "Moneyline",
    odds: record.odds || record.price || record["bet odds"] || "+100",
    stake: (record.stake || record.risk || record.wager || "0").replace("$", ""),
    toWin: (record["to win"] || record.towin || record.profit || "0").replace("$", ""),
    status: (record.status || record.result || "open").toLowerCase().replace("win", "won").replace("loss", "lost"),
    notes: record.description || record.notes || record.event || "",
  };
}

export function parseBetCsvRows(raw, today = new Date().toISOString().split("T")[0]) {
  const lines = raw.trim().split("\n").filter(Boolean);
  if (lines.length < 2) throw new Error("Need at least a header row and one data row");

  const headers = splitCsvLine(lines[0]).map((header) => header.replace(/"/g, "").trim().toLowerCase());
  if (!headers.length) throw new Error("Missing header row");

  return lines.slice(1).map((line, index) => {
    const columns = splitCsvLine(line);
    const record = {};
    headers.forEach((header, columnIndex) => {
      record[header] = (columns[columnIndex] || "").replace(/"/g, "").trim();
    });
    return normalizeCsvRecord(record, index, today);
  });
}

export function CSVImportModal({ onImport, onClose }) {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);

  const parse = () => {
    try {
      setPreview(parseBetCsvRows(raw).slice(0, 5));
      setError(null);
    } catch (err) {
      setError(`Parse error: ${err.message}`);
    }
  };

  const confirm = () => {
    try {
      onImport(parseBetCsvRows(raw));
      onClose();
    } catch (err) {
      setError(`Import failed: ${err.message}`);
    }
  };

  const rowCount = Math.max(0, raw.trim().split("\n").filter(Boolean).length - 1);

  return (
    <div onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: K.s1, border: `1px solid ${K.bd2}`, borderRadius: 12, padding: 24, width: "100%", maxWidth: 560, maxHeight: "80vh", overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: K.tx, marginBottom: 4, fontFamily: fontD }}>Import Bets from CSV</div>
        <div style={{ fontSize: 11, color: K.dm, marginBottom: 16 }}>Paste your DraftKings, FanDuel, or any sportsbook CSV export below. Headers are auto-detected.</div>
        <textarea value={raw} onChange={(event) => setRaw(event.target.value)} placeholder={"date,book,odds,stake,status\n2026-03-01,DraftKings,+150,50,won"} style={{ ...S.input, height: 120, resize: "vertical", marginBottom: 8, fontFamily: "monospace", fontSize: 11 }} />
        {error && <div style={{ fontSize: 11, color: K.rd, marginBottom: 8 }}>{error}</div>}
        {preview.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: K.mt, marginBottom: 6, textTransform: "uppercase", letterSpacing: "1.5px" }}>Preview ({preview.length} of {rowCount} rows)</div>
            {preview.map((row, index) => (
              <div key={index} style={{ fontSize: 11, color: K.dm, padding: "4px 0", borderBottom: `1px solid ${K.bd}` }}>{row.date} - {row.book} - {row.odds} - ${row.stake} - <span style={{ color: row.status === "won" ? K.gn : row.status === "lost" ? K.rd : K.yl }}>{row.status}</span></div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={parse} style={{ flex: 1, padding: "9px", background: K.ac, border: "none", borderRadius: 6, color: K.ink, fontWeight: 700, cursor: "pointer", fontFamily: font }}>Parse CSV</button>
          {preview.length > 0 && <button onClick={confirm} style={{ flex: 1, padding: "9px", background: K.gn, border: "none", borderRadius: 6, color: K.ink, fontWeight: 700, cursor: "pointer", fontFamily: font }}>Import {rowCount} Bets</button>}
          <button onClick={onClose} style={{ padding: "9px 16px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.mt, cursor: "pointer", fontFamily: font }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
