import React from "react";
import { AppDataCtx } from "../../contexts.jsx";
import { K, font } from "../../lib/shared.js";
import {
  DEFAULT_POLICY,
  POLICY_BOUNDS,
  loadBankrollPolicy,
  resetBankrollPolicy,
  saveBankrollPolicy,
} from "../../lib/bankrollPolicy.js";

function policyDollar(pct, bankroll) {
  if (!bankroll || bankroll <= 0) return null;
  return `$${((pct / 100) * bankroll).toFixed(2)}`;
}

function PolicySlider({ label, field, value, bounds, onChange, bankroll, hint }) {
  const dollar = policyDollar(value, bankroll);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <label htmlFor={`pg-policy-${field}`} style={{ fontSize: 10, fontWeight: 700, color: K.dm }}>
          {label}
        </label>
        <div style={{ fontSize: 10, color: K.ac, fontWeight: 700 }}>
          {value}%{dollar ? ` · ${dollar}` : ""}
        </div>
      </div>
      <input
        id={`pg-policy-${field}`}
        type="range"
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        value={value}
        onChange={(e) => onChange(field, Number(e.target.value))}
        style={{ width: "100%", accentColor: K.ac, cursor: "pointer" }}
        aria-label={label}
      />
      {hint && <div style={{ fontSize: 9, color: K.mt, lineHeight: 1.5, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

export default function BankrollPolicySection() {
  const ctx = React.useContext(AppDataCtx);
  const bankroll = Number.parseFloat(
    ctx?.appData?.bankroll || (() => { try { return localStorage.getItem("pg_bankroll") || ""; } catch { return ""; } })()
  ) || 0;

  const [policy, setPolicy] = React.useState(() => loadBankrollPolicy());
  const [saved, setSaved] = React.useState(false);
  const [message, setMessage] = React.useState("");

  function handleChange(field, value) {
    setPolicy((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setMessage("");
  }

  function handleSave() {
    saveBankrollPolicy(policy);
    setSaved(true);
    setMessage("Policy saved to this device.");
  }

  function handleReset() {
    resetBankrollPolicy();
    setPolicy({ ...DEFAULT_POLICY });
    setSaved(false);
    setMessage("Reset to defaults.");
  }

  const availableCapital = bankroll > 0 ? bankroll - (policy.reservePct / 100) * bankroll : null;

  return (
    <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.bd}` }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: K.dm,
          textTransform: "uppercase",
          letterSpacing: "1.5px",
          marginBottom: 6,
        }}
      >
        Bankroll Policy
      </div>
      <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5, marginBottom: 12 }}>
        Set guardrails for open exposure. Violations appear in the dashboard before they compound.
        {bankroll > 0 && availableCapital !== null && (
          <span style={{ color: K.ac, fontWeight: 700 }}>
            {" "}Available capital at current bankroll: ${availableCapital.toFixed(2)}
          </span>
        )}
      </div>

      <PolicySlider
        label="Reserve floor"
        field="reservePct"
        value={policy.reservePct}
        bounds={POLICY_BOUNDS.reservePct}
        onChange={handleChange}
        bankroll={bankroll}
        hint="Keep this % of your bankroll unallocated at all times."
      />
      <PolicySlider
        label="Max single bet"
        field="maxSingleBetPct"
        value={policy.maxSingleBetPct}
        bounds={POLICY_BOUNDS.maxSingleBetPct}
        onChange={handleChange}
        bankroll={bankroll}
        hint="Alert when any one open bet exceeds this % of bankroll."
      />
      <PolicySlider
        label="Max per sportsbook"
        field="maxBookPct"
        value={policy.maxBookPct}
        bounds={POLICY_BOUNDS.maxBookPct}
        onChange={handleChange}
        bankroll={bankroll}
        hint="Alert when your combined exposure on one book exceeds this %."
      />

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={handleSave}
          style={{
            flex: 2,
            padding: "8px 0",
            borderRadius: 6,
            cursor: "pointer",
            background: saved ? `${K.gn}12` : `${K.ac}12`,
            border: `1px solid ${saved ? K.gn + "40" : K.ac + "40"}`,
            color: saved ? K.gn : K.ac,
            fontSize: 10,
            fontWeight: 700,
            fontFamily: font,
          }}
        >
          {saved ? "Saved" : "Save Policy"}
        </button>
        <button
          onClick={handleReset}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 6,
            cursor: "pointer",
            background: "transparent",
            border: `1px solid ${K.bd2}`,
            color: K.mt,
            fontSize: 10,
            fontWeight: 700,
            fontFamily: font,
          }}
        >
          Reset
        </button>
      </div>

      {message && (
        <div
          role="status"
          style={{ fontSize: 9, color: K.dm, marginTop: 8, lineHeight: 1.5 }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
