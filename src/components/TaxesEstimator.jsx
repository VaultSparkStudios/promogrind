import React from "react";
import { AppDataCtx } from "../contexts.jsx";
import { K, f } from "../lib/shared.js";
import { S, Tl } from "../ui.jsx";

export function TaxesEstimator({ appData }) {
  const ledger = appData?.ledger || [];
  const recordedNet = ledger.reduce((sum, entry) => sum + (Number(entry.profit) || 0), 0);
  const [amount, setAmount] = React.useState("");
  const [federalRate, setFederalRate] = React.useState("");
  const [stateRate, setStateRate] = React.useState("");
  const validAmount = amount.trim() !== "" && Number.isFinite(Number(amount)) && Number(amount) >= 0;
  const validRate = value => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
  const ready = validAmount && validRate(federalRate) && validRate(stateRate);
  const federal = ready ? Number(amount) * Number(federalRate) / 100 : 0;
  const state = ready ? Number(amount) * Number(stateRate) / 100 : 0;
  const panel = { padding: 16, background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 };
  return <div style={{ ...S.card, maxWidth: 680, margin: "0 auto" }}>
    <Tl t="Tax planning worksheet" />
    <p style={{ color: K.mt, lineHeight: 1.7 }}>Explore an amount using rates you enter. This worksheet does not calculate your tax return or determine what you owe.</p>
    {ledger.length > 0 && <div style={{ ...panel, marginBottom: 16 }}>
      <strong style={{ color: K.tx }}>Recorded ledger net: ${f(recordedNet)}</strong>
      <p style={{ color: K.mt }}>Across {ledger.length} entries. Net betting profit is not the same as taxable gambling income. It is shown for reference and is never copied into the calculation.</p>
    </div>}
    <p style={{ color: K.mt, lineHeight: 1.7 }}>Determine the taxable amount and applicable rates with a qualified tax professional. Winnings, losses, other income, deductions, filing status and state rules affect the result. For U.S. tax years after 2025, federal gambling loss deductions are generally limited to 90% of losses and cannot exceed gambling gains.</p>
    <div style={{ display: "grid", gap: 16 }}>
      {[
        ["tax-amount", "Amount to model ($)", amount, setAmount, undefined],
        ["tax-federal-rate", "Federal rate to model (%)", federalRate, setFederalRate, 100],
        ["tax-state-rate", "State rate to model (%)", stateRate, setStateRate, 100],
      ].map(([id, label, value, setter, max]) => <label key={id} htmlFor={id} style={S.label}>
        {label}<input id={id} type="number" min="0" max={max} step="any" value={value} onChange={event => setter(event.target.value)} style={{ ...S.input, display: "block", width: "100%", marginTop: 6 }} />
      </label>)}
    </div>
    {ready ? <div aria-live="polite" style={{ ...panel, marginTop: 20 }}>
      <h2 style={{ color: K.tx, fontSize: 18 }}>Illustrative amounts</h2>
      <p style={{ color: K.tx }}>Federal: ${f(federal)} · State: ${f(state)}</p>
      <p style={{ color: K.gn, fontWeight: 700 }}>Combined: ${f(federal + state)}</p>
      <p style={{ color: K.mt }}>Each amount is your entered amount multiplied by your entered rate. This is a simple scenario, not a progressive tax calculation or a payment recommendation.</p>
      <button style={{ padding: 12, minHeight: 44, color: K.tx, background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 6 }} onClick={() => window.print()}>Print worksheet</button>
    </div> : <p role="status" style={{ color: K.mt }}>Enter a nonnegative amount and both rates from 0 to 100%. Enter 0 explicitly if a rate does not apply.</p>}
    <p style={{ color: K.mt, lineHeight: 1.7, marginTop: 20 }}>Keep sportsbook statements, wagers, payouts and loss records. A reporting form threshold does not determine whether winnings are taxable. Read the <a href="https://www.irs.gov/taxtopics/tc419" target="_blank" rel="noopener noreferrer" style={{ color: K.gn }}>IRS gambling income guidance</a> and <a href="/blog/sports-betting-taxes-guide/" style={{ color: K.gn }}>our records guide</a>.</p>
  </div>;
}

export default function TaxesEstimatorWrapper() {
  const { appData } = React.useContext(AppDataCtx) || {};
  return <TaxesEstimator appData={appData} />;
}
