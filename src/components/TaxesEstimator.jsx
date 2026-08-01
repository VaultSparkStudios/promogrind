import React from "react";
import { AppDataCtx } from "../contexts.jsx";

function TaxesEstimatorWrapper() {
  const { appData } = React.useContext(AppDataCtx) || {};
  return <TaxesEstimator appData={appData} />;
}

function TaxesEstimator({ appData }) {
  const ledger = appData?.ledger || [];

  const grossProfit = React.useMemo(() =>
    ledger.reduce((s, e) => s + (parseFloat(e.profit) || 0), 0), [ledger]);
  const w2gEvents = React.useMemo(() =>
    ledger.filter(e => (parseFloat(e.payout) || 0) >= 600), [ledger]);

  const [manualProfit, setManualProfit] = React.useState('');
  const [filingStatus, setFilingStatus] = React.useState('single');
  const [stateRate, setStateRate] = React.useState('5');

  const income = parseFloat(manualProfit) || grossProfit;

  const fedTax = React.useMemo(() => {
    if (!income || income <= 0) return 0;
    const brackets = filingStatus === 'single'
      ? [[11925,0.10],[48475,0.12],[103350,0.22],[197300,0.24],[250525,0.32],[626350,0.35],[Infinity,0.37]]
      : [[23850,0.10],[96950,0.12],[206700,0.22],[394600,0.24],[501050,0.32],[751600,0.35],[Infinity,0.37]];
    let tax = 0, prev = 0;
    for (const [cap, rate] of brackets) {
      if (income <= prev) break;
      tax += (Math.min(income, cap) - prev) * rate;
      prev = cap;
    }
    return tax;
  }, [income, filingStatus]);

  const stateTax = income * (parseFloat(stateRate) / 100);
  const totalTax = fedTax + stateTax;
  const netProfit = income - totalTax;
  const effectiveRate = income > 0 ? (totalTax / income * 100) : 0;
  const quarterlyPayment = totalTax / 4;

  const fv = (n) => isNaN(n) ? '$0' : '$' + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2});

  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:16}}>
      <div style={{fontWeight:700,color:'#e2e8f0',fontSize:18,marginBottom:4}}>Taxes Estimator</div>
      <div style={{color:'#64748b',fontSize:12,marginBottom:20}}>Estimate your tax liability on sports betting profits. Not tax advice — consult a CPA for filings.</div>

      {ledger.length > 0 && (
        <div style={{padding:10,background:'#0f1724',border:'1px solid #1e3a2f',borderRadius:8,marginBottom:16,fontSize:13}}>
          <span style={{color:'#94a3b8'}}>Auto-loaded from your Ledger: </span>
          <strong style={{color:'#4ade80'}}>{fv(grossProfit)} gross profit</strong>
          <span style={{color:'#64748b'}}> across {ledger.length} entries</span>
        </div>
      )}

      <div style={{display:'grid',gap:12,marginBottom:20}}>
        <div>
          <label htmlFor="tax-gross-profit" style={{display:'block',color:'#94a3b8',fontSize:12,marginBottom:4}}>Gross Betting Profit ($)</label>
          <input id="tax-gross-profit" type="number" value={manualProfit} onChange={e => setManualProfit(e.target.value)}
            placeholder={grossProfit ? grossProfit.toFixed(2) : '0.00'}
            style={{width:'100%',padding:'9px 12px',background:'#0a0e17',border:'1px solid #1e293b',color:'#e2e8f0',borderRadius:6,fontSize:14,boxSizing:'border-box'}} />
          {ledger.length > 0 && !manualProfit && <div style={{fontSize:11,color:'#475569',marginTop:3}}>Using ledger total. Enter a value to override.</div>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <label htmlFor="tax-filing-status" style={{display:'block',color:'#94a3b8',fontSize:12,marginBottom:4}}>Filing Status</label>
            <select id="tax-filing-status" value={filingStatus} onChange={e => setFilingStatus(e.target.value)}
              style={{width:'100%',padding:'9px 12px',background:'#0a0e17',border:'1px solid #1e293b',color:'#e2e8f0',borderRadius:6,fontSize:13}}>
              <option value="single">Single</option>
              <option value="married">Married Filing Jointly</option>
            </select>
          </div>
          <div>
            <label htmlFor="tax-state-rate" style={{display:'block',color:'#94a3b8',fontSize:12,marginBottom:4}}>State Tax Rate (%)</label>
            <input id="tax-state-rate" type="number" value={stateRate} onChange={e => setStateRate(e.target.value)} min="0" max="15" step="0.1"
              style={{width:'100%',padding:'9px 12px',background:'#0a0e17',border:'1px solid #1e293b',color:'#e2e8f0',borderRadius:6,fontSize:14,boxSizing:'border-box'}} />
          </div>
        </div>
      </div>

      {income > 0 && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            {[
              ['Federal Tax (est.)', fv(fedTax), '#ef4444'],
              ['State Tax (est.)', fv(stateTax), '#ef4444'],
              ['Total Tax Liability', fv(totalTax), '#ef4444'],
              ['Net After-Tax Profit', fv(netProfit), '#4ade80'],
              ['Effective Tax Rate', effectiveRate.toFixed(1) + '%', '#f59e0b'],
              ['Quarterly Payment', fv(quarterlyPayment), '#94a3b8'],
            ].map(([label, val, color]) => (
              <div key={label} style={{padding:12,background:'#0f1724',border:'1px solid #1e293b',borderRadius:8}}>
                <div style={{fontSize:11,color:'#64748b',marginBottom:4}}>{label}</div>
                <div style={{fontSize:20,fontWeight:700,color}}>{val}</div>
              </div>
            ))}
          </div>

          {w2gEvents.length > 0 && (
            <div style={{padding:12,background:'#1a0f0f',border:'1px solid #ef4444',borderRadius:8,marginBottom:16}}>
              <div style={{fontWeight:600,color:'#ef4444',fontSize:13,marginBottom:4}}>⚠️ W-2G Events ({w2gEvents.length})</div>
              <div style={{color:'#94a3b8',fontSize:12}}>You have {w2gEvents.length} ledger entries with payouts ≥$600. These may require W-2G forms from your sportsbooks. Keep records.</div>
            </div>
          )}

          <div style={{padding:12,background:'#0f1724',border:'1px solid #1e293b',borderRadius:8,marginBottom:16}}>
            <div style={{fontWeight:600,color:'#e2e8f0',fontSize:13,marginBottom:8}}>Quarterly Payment Schedule (Est.)</div>
            {['Q1 (Apr 15)', 'Q2 (Jun 15)', 'Q3 (Sep 15)', 'Q4 (Jan 15)'].map((q, i) => (
              <div key={q} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom: i < 3 ? '1px solid #0a0e17' : 'none'}}>
                <span style={{color:'#94a3b8',fontSize:13}}>{q}</span>
                <span style={{color:'#e2e8f0',fontSize:13,fontWeight:600}}>{fv(quarterlyPayment)}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => window.print()}
            style={{width:'100%',padding:'11px 0',background:'#1e293b',border:'1px solid #334155',color:'#e2e8f0',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:600}}
          >
            🖨️ Print / Save as PDF
          </button>
        </>
      )}

      <div style={{marginTop:16,padding:12,background:'#0a0e17',border:'1px solid #1e293b',borderRadius:8,fontSize:11,color:'#475569',lineHeight:1.6}}>
        Estimates only. Tax rates simplified — does not account for deductions, itemized losses, AGI phase-outs, or alternative minimum tax. Consult a licensed CPA or tax professional for actual filings. Sports betting losses may be deductible if you itemize.
      </div>
    </div>
  );
}

export default TaxesEstimatorWrapper;
