import React, { useRef } from "react";
import { CANONICAL_APP_URL } from "../launchState.js";

const RECEIPT_STYLE = `
  @media print {
    body > *:not(#pg-receipt-root) { display: none !important; }
    #pg-receipt-root { display: block !important; }
    @page { margin: 0.5in; size: 3.5in auto; }
  }
  #pg-receipt-root {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 11px;
    color: #1a1a1a;
    max-width: 320px;
    margin: 0 auto;
  }
`;

export default function CalculatorReceipt({ calcName, inputs = [], outputs = [], disclaimer, onClose, onTrack }) {
  const ref = useRef(null);
  const ts = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const handlePrint = () => {
    const style = document.createElement("style");
    style.innerHTML = RECEIPT_STYLE;
    document.head.appendChild(style);
    const root = document.createElement("div");
    root.id = "pg-receipt-root";
    root.innerHTML = ref.current.innerHTML;
    document.body.appendChild(root);
    window.print();
    document.head.removeChild(style);
    document.body.removeChild(root);
  };

  const handleCopy = () => {
    const lines = [
      `── ${calcName} Receipt ──`,
      `${ts}`,
      "",
      "INPUTS",
      ...inputs.map(({ label, value }) => `  ${label.padEnd(20)} ${value}`),
      "",
      "RESULTS",
      ...outputs.map(({ label, value, highlight }) => `  ${(highlight ? "▶ " : "  ") + label.padEnd(18)} ${value}`),
      "",
      disclaimer || "Results are estimates. Verify odds before placing bets.",
      `promogrind.bet — free calculator suite`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 8, padding: 24, maxWidth: 360, width: "100%",
          fontFamily: "'JetBrains Mono','Courier New',monospace", color: "#1a1a1a", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#475569" }}
        >×</button>

        <div ref={ref}>
          {/* Receipt header */}
          <div style={{ textAlign: "center", borderBottom: "1px dashed #ccc", paddingBottom: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#64748b", marginBottom: 2 }}>PromoGrind Calculator</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{calcName}</div>
            <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{ts}</div>
          </div>

          {/* Inputs */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 8, letterSpacing: "1.5px", textTransform: "uppercase", color: "#94a3b8", marginBottom: 6 }}>Inputs</div>
            {inputs.map(({ label, value }, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                <span style={{ color: "#475569" }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Outputs */}
          <div style={{ borderTop: "1px dashed #ccc", paddingTop: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 8, letterSpacing: "1.5px", textTransform: "uppercase", color: "#94a3b8", marginBottom: 6 }}>Results</div>
            {outputs.map(({ label, value, highlight }, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", fontSize: highlight ? 14 : 11,
                fontWeight: highlight ? 800 : 400, color: highlight ? "#16a34a" : "#1a1a1a", marginBottom: highlight ? 6 : 2,
              }}>
                <span>{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{ borderTop: "1px dashed #ccc", paddingTop: 8, fontSize: 8, color: "#94a3b8", lineHeight: 1.5, textAlign: "center" }}>
            {disclaimer || "Estimates only. Verify all odds before placing bets. Results do not model a return."}
            <br />
            {CANONICAL_APP_URL.replace(/^https?:\/\//, "")} — free sportsbook promo tools
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button
            onClick={handleCopy}
            style={{ flex: 1, padding: "8px 0", background: "#1e293b", border: "none", borderRadius: 6, color: "#e2e8f0", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            📋 Copy
          </button>
          <button
            onClick={handlePrint}
            style={{ flex: 1, padding: "8px 0", background: "#4ade80", border: "none", borderRadius: 6, color: "#0a0e17", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            🖨 Print / Save PDF
          </button>
          {typeof onTrack === "function" && (
            <button
              data-testid="receipt-track-play"
              onClick={onTrack}
              style={{ flex: "1 0 100%", padding: "8px 0", background: "#0ea5e9", border: "none", borderRadius: 6, color: "#0a0e17", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 4 }}
            >
              📌 Track this play
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
